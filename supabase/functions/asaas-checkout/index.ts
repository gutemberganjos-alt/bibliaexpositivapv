// Edge Function: asaas-checkout
// Usa o ASAAS CHECKOUT (não mais a fatura/boleto), com PIX e cartão na MESMA tela.
// Body: { plan: 'individual' | 'igreja', cpfCnpj: string } -> { url }
//
// POR QUE ASSIM: criar a assinatura direto gerava uma fatura com cara de "boleto
// bancário", confundindo quem escolheu PIX. O Checkout deixa escolher billingTypes,
// então mostramos só PIX e cartão, numa tela limpa.
//
// IMPORTANTE: no Checkout, a ASSINATURA só nasce DEPOIS do pagamento. Por isso
// gravamos aqui uma linha 'incomplete' com externalReference = id do usuário, e o
// webhook completa (asaas_subscription_id, status ativo) quando o pagamento chega.
//
// Secrets: ASAAS_API_KEY, ASAAS_ENV ('sandbox'|'production'), APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API = (Deno.env.get('ASAAS_ENV') ?? 'sandbox') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

function planoConfig(plan: string): { valor: number; tier: 'premium' | 'church'; nome: string } | null {
  if (plan === 'individual') return { valor: 29.90, tier: 'premium', nome: 'Bíblia Expositiva — Plano Individual' };
  if (plan === 'igreja') return { valor: 99.90, tier: 'church', nome: 'Bíblia Expositiva — Plano Igreja' };
  return null;
}

function documentoValido(doc: string): boolean {
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    const pares: Array<[number, number]> = [[9, 10], [10, 11]];
    for (const [len, peso] of pares) {
      let soma = 0;
      for (let i = 0; i < len; i++) soma += Number(d[i]) * (peso - i);
      let dig = (soma * 10) % 11;
      if (dig === 10) dig = 0;
      if (dig !== Number(d[len])) return false;
    }
    return true;
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (base: string) => {
      const pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = base.split('').reduce((s, n, i) => s + Number(n) * pesos[i], 0);
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    if (calc(d.slice(0, 12)) !== Number(d[12])) return false;
    if (calc(d.slice(0, 13)) !== Number(d[13])) return false;
    return true;
  }
  return false;
}

async function asaas(caminho: string, init?: RequestInit): Promise<Response> {
  return await fetch(`${API}${caminho}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      access_token: Deno.env.get('ASAAS_API_KEY') ?? '',
      ...(init?.headers ?? {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!Deno.env.get('ASAAS_API_KEY')) return json({ error: 'ASAAS_API_KEY não configurada.' }, 500);

  try {
    const { plan, cpfCnpj } = (await req.json().catch(() => ({}))) ?? {};

    const cfg = planoConfig(String(plan));
    if (!cfg) return json({ error: 'Plano inválido.' }, 400);

    const doc = String(cpfCnpj ?? '').replace(/\D/g, '');
    if (!documentoValido(doc)) return json({ error: 'CPF ou CNPJ inválido. Confira os números.' }, 400);

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Não autenticado.' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Sessão inválida.' }, 401);
    const user = userData.user;

    const { data: jaAtiva } = await admin
      .from('subscriptions').select('id').eq('user_id', user.id)
      .in('status', ['active', 'trialing']).limit(1).maybeSingle();
    if (jaAtiva) return json({ error: 'Você já possui uma assinatura ativa.' }, 409);

    // Cliente no Asaas (reaproveita se já existir).
    const { data: existente } = await admin
      .from('subscriptions').select('id, asaas_customer_id').eq('user_id', user.id)
      .not('asaas_customer_id', 'is', null).limit(1).maybeSingle();

    let customerId = existente?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const nome = (user.user_metadata?.full_name as string) || user.email || 'Assinante';
      const rc = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: nome, cpfCnpj: doc, email: user.email,
          externalReference: user.id, notificationDisabled: false,
        }),
      });
      const cJson = await rc.json();
      if (!rc.ok) {
        console.error('[asaas-checkout] erro ao criar cliente', cJson);
        return json({ error: cJson?.errors?.[0]?.description ?? 'Não foi possível criar seu cadastro de cobrança.' }, 400);
      }
      customerId = cJson.id;
    }

    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || 'https://www.bibliaexpositivapv.com.br';
    const hoje = new Date().toISOString().slice(0, 10);

    // Checkout: PIX + cartão na mesma tela, cobrança recorrente mensal.
    const rk = await asaas('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        billingTypes: ['PIX', 'CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: 60,
        customer: customerId,
        externalReference: user.id, // elo com o nosso banco (o webhook usa isto)
        callback: {
          successUrl: `${appUrl}/assinatura?status=sucesso`,
          cancelUrl: `${appUrl}/assinatura?status=cancelado`,
          expiredUrl: `${appUrl}/assinatura?status=expirado`,
        },
        items: [{ name: cfg.nome, description: 'Assinatura mensal', quantity: 1, value: cfg.valor }],
        subscription: { cycle: 'MONTHLY', nextDueDate: hoje },
      }),
    });
    const kJson = await rk.json();
    if (!rk.ok) {
      console.error('[asaas-checkout] erro ao criar checkout', kJson);
      return json({ error: kJson?.errors?.[0]?.description ?? 'Não foi possível abrir o pagamento.' }, 400);
    }

    // Marca a intenção de assinatura. Vira 'active' quando o webhook confirmar.
    const linhaBase = {
      user_id: user.id,
      tier: cfg.tier,
      status: 'incomplete',
      value: cfg.valor,
      cycle: 'MONTHLY',
      asaas_customer_id: customerId,
      updated_at: new Date().toISOString(),
    };
    if (existente?.id) {
      const { error } = await admin.from('subscriptions').update(linhaBase).eq('id', existente.id);
      if (error) console.error('[asaas-checkout] falha ao atualizar intenção', error.message);
    } else {
      const { error } = await admin.from('subscriptions').insert(linhaBase);
      if (error) console.error('[asaas-checkout] falha ao criar intenção', error.message);
    }

    // O link vem como link/checkoutUrl/url conforme a versão da API.
    const url = kJson?.link ?? kJson?.checkoutUrl ?? kJson?.url ?? null;
    if (!url) {
      console.error('[asaas-checkout] checkout criado sem link', kJson);
      return json({ error: 'Pagamento criado, mas o link não veio. Tente novamente.' }, 502);
    }

    return json({ url });
  } catch (err) {
    console.error('[asaas-checkout]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao iniciar assinatura.' }, 500);
  }
});
