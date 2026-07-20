// Edge Function: asaas-checkout
// Body: { plan, cpfCnpj, billingType: 'PIX'|'CREDIT_CARD' } -> { url }
//
// REGRAS DO ASAAS APRENDIDAS NA MARRA:
//  1) Em operacoes RECURRENT o Checkout aceita SOMENTE CREDIT_CARD.
//     CARTAO -> /checkouts (tela limpa, renova sozinho)
//     PIX    -> /subscriptions + fatura com QR code
//  2) items[].name tem limite de 30 caracteres.
//  3) As URLs de callback NAO podem ter query string ("?status=...") -> o Asaas
//     responde "successUrl invalido". Por isso o status vai no CAMINHO:
//     /assinatura/sucesso | /assinatura/cancelado | /assinatura/expirado
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

// Precos definidos AQUI (nunca vindos do navegador, que o cliente pode adulterar).
// nome <= 30 caracteres (limite do Asaas).
type Cfg = { valor: number; tier: 'premium' | 'church'; nome: string; cycle: 'MONTHLY' | 'YEARLY'; meses: number };

function planoConfig(plan: string, ciclo: string): Cfg | null {
  const anual = ciclo === 'ANUAL';
  const cycle = anual ? 'YEARLY' : 'MONTHLY';
  const meses = anual ? 12 : 1;
  if (plan === 'individual') {
    return { valor: anual ? 295.90 : 29.90, tier: 'premium', nome: 'Biblia Expositiva Individual', cycle, meses };
  }
  if (plan === 'igreja') {
    return { valor: anual ? 1019.90 : 99.90, tier: 'church', nome: 'Biblia Expositiva Igreja', cycle, meses };
  }
  return null;
}

/**
 * Base do site: sempre https, sem barra no fim, sem caminho/query herdados.
 * Também tolera o secret colado como "APP_URL=https://..." (erro comum no painel)
 * e aspas em volta — em vez de mandar lixo pro Asaas e quebrar o pagamento.
 */
function baseDoApp(bruto: string): string {
  let v = (bruto ?? '').trim().replace(/^APP_URL\s*=\s*/i, '').replace(/^["']|["']$/g, '').trim();
  if (!v) return 'https://www.bibliaexpositivapv.com.br';
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return `https://${u.host}`;
  } catch {
    return 'https://www.bibliaexpositivapv.com.br';
  }
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
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);
  if (!Deno.env.get('ASAAS_API_KEY')) return json({ error: 'ASAAS_API_KEY nao configurada.' }, 500);

  try {
    const { plan, cpfCnpj, billingType, telefone, ciclo } = (await req.json().catch(() => ({}))) ?? {};
    const forma: 'PIX' | 'CREDIT_CARD' = billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';

    const cfg = planoConfig(String(plan), String(ciclo ?? 'MENSAL'));
    if (!cfg) return json({ error: 'Plano invalido.' }, 400);

    const doc = String(cpfCnpj ?? '').replace(/\D/g, '');
    if (!documentoValido(doc)) return json({ error: 'CPF ou CNPJ invalido. Confira os numeros.' }, 400);

    // O Asaas exige telefone no cliente para liberar o checkout de cartao.
    const fone = String(telefone ?? '').replace(/\D/g, '');
    if (fone.length !== 10 && fone.length !== 11) {
      return json({ error: 'Informe um telefone com DDD.' }, 400);
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Nao autenticado.' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Sessao invalida.' }, 401);
    const user = userData.user;

    const { data: jaAtiva } = await admin
      .from('subscriptions').select('id').eq('user_id', user.id)
      .in('status', ['active', 'trialing']).limit(1).maybeSingle();
    if (jaAtiva) return json({ error: 'Voce ja possui uma assinatura ativa.' }, 409);

    const { data: existente } = await admin
      .from('subscriptions').select('id, asaas_customer_id').eq('user_id', user.id)
      .not('asaas_customer_id', 'is', null).limit(1).maybeSingle();

    const nome = (user.user_metadata?.full_name as string) || user.email || 'Assinante';
    const dadosCliente = {
      name: nome,
      cpfCnpj: doc,
      email: user.email,
      // O Asaas recusa o checkout se o cliente nao tiver telefone. Mandamos nos
      // dois campos: celular (11 digitos) tambem serve como fixo.
      phone: fone,
      mobilePhone: fone.length === 11 ? fone : undefined,
      externalReference: user.id,
      notificationDisabled: false,
    };

    let customerId = existente?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const rc = await asaas('/customers', { method: 'POST', body: JSON.stringify(dadosCliente) });
      const cJson = await rc.json();
      if (!rc.ok) {
        console.error('[asaas-checkout] erro ao criar cliente', JSON.stringify(cJson));
        return json({ error: cJson?.errors?.[0]?.description ?? 'Nao foi possivel criar seu cadastro de cobranca.' }, 400);
      }
      customerId = cJson.id;
    } else {
      // Cliente antigo pode ter sido criado sem telefone (versoes anteriores):
      // atualiza antes de seguir, senao o checkout de cartao falha.
      const ru = await asaas(`/customers/${customerId}`, { method: 'POST', body: JSON.stringify(dadosCliente) });
      if (!ru.ok) {
        const uJson = await ru.json().catch(() => null);
        console.error('[asaas-checkout] erro ao atualizar cliente', JSON.stringify(uJson));
      }
    }

    const appUrl = baseDoApp(Deno.env.get('APP_URL') || req.headers.get('origin') || '');
    const hoje = new Date().toISOString().slice(0, 10);

    let url: string | null = null;
    let asaasSubId: string | null = null;

    if (forma === 'CREDIT_CARD') {
      const corpo = {
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: 60,
        customer: customerId,
        externalReference: user.id,
        callback: {
          successUrl: `${appUrl}/assinatura/sucesso`,
          cancelUrl: `${appUrl}/assinatura/cancelado`,
          expiredUrl: `${appUrl}/assinatura/expirado`,
        },
        items: [{
          name: cfg.nome,
          description: cfg.cycle === 'YEARLY' ? 'Assinatura anual' : 'Assinatura mensal',
          quantity: 1,
          value: cfg.valor,
        }],
        subscription: { cycle: cfg.cycle, nextDueDate: hoje },
      };
      const rk = await asaas('/checkouts', { method: 'POST', body: JSON.stringify(corpo) });
      const kJson = await rk.json();
      if (!rk.ok) {
        console.error('[asaas-checkout] erro no checkout cartao', JSON.stringify(kJson), 'enviado:', JSON.stringify(corpo));
        return json({ error: kJson?.errors?.[0]?.description ?? 'Nao foi possivel abrir o pagamento.' }, 400);
      }
      url = kJson?.link ?? kJson?.checkoutUrl ?? kJson?.url ?? null;
    } else {
      const rs = await asaas('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: cfg.valor,
          nextDueDate: hoje,
          cycle: cfg.cycle,
          description: cfg.nome,
          externalReference: user.id,
        }),
      });
      const sJson = await rs.json();
      if (!rs.ok) {
        console.error('[asaas-checkout] erro na assinatura pix', JSON.stringify(sJson));
        return json({ error: sJson?.errors?.[0]?.description ?? 'Nao foi possivel iniciar a assinatura.' }, 400);
      }
      asaasSubId = sJson?.id ?? null;

      const rp = await asaas(`/subscriptions/${sJson.id}/payments`);
      const pJson = await rp.json();
      const cobranca = Array.isArray(pJson?.data) ? pJson.data[0] : null;
      url = cobranca?.invoiceUrl ?? null;
    }

    const linhaBase = {
      user_id: user.id,
      tier: cfg.tier,
      status: 'incomplete',
      value: cfg.valor,
      cycle: cfg.cycle,
      billing_type: forma,
      asaas_customer_id: customerId,
      ...(asaasSubId ? { asaas_subscription_id: asaasSubId } : {}),
      updated_at: new Date().toISOString(),
    };
    if (existente?.id) {
      const { error } = await admin.from('subscriptions').update(linhaBase).eq('id', existente.id);
      if (error) console.error('[asaas-checkout] falha ao atualizar intencao', error.message);
    } else {
      const { error } = await admin.from('subscriptions').insert(linhaBase);
      if (error) console.error('[asaas-checkout] falha ao criar intencao', error.message);
    }

    if (!url) {
      console.error('[asaas-checkout] sem link de pagamento');
      return json({ error: 'Pagamento criado, mas o link nao veio. Tente novamente em instantes.' }, 502);
    }

    return json({ url });
  } catch (err) {
    console.error('[asaas-checkout]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao iniciar assinatura.' }, 500);
  }
});
