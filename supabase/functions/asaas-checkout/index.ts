// Edge Function: asaas-checkout
// Cria (ou reaproveita) o cliente no Asaas e abre uma assinatura recorrente.
// Body: { plan: 'individual' | 'igreja', cpfCnpj: string, billingType: 'PIX' | 'CREDIT_CARD' }
// Retorna: { url } — página de cobrança do Asaas (invoiceUrl da 1ª cobrança).
//
// Secrets: ASAAS_API_KEY, ASAAS_ENV ('sandbox' | 'production'), APP_URL
//
// NOTA: o Asaas EXIGE cpfCnpj para criar cliente. Não guardamos o CPF no nosso
// banco (menos exposição LGPD) — ele vai direto para o Asaas.

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
  if (plan === 'individual') return { valor: 29.90, tier: 'premium', nome: 'Bíblia Expositiva — Individual' };
  if (plan === 'igreja') return { valor: 99.90, tier: 'church', nome: 'Bíblia Expositiva — Igreja' };
  return null;
}

/** Valida CPF (11) ou CNPJ (14) com dígitos verificadores. */
function documentoValido(doc: string): boolean {
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    for (const [len, peso] of [[9, 10], [10, 11]] as const) {
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
      const pesos = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
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
  const chave = Deno.env.get('ASAAS_API_KEY') ?? '';
  return await fetch(`${API}${caminho}`, {
    ...init,
    headers: { 'content-type': 'application/json', access_token: chave, ...(init?.headers ?? {}) },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  if (!Deno.env.get('ASAAS_API_KEY')) return json({ error: 'ASAAS_API_KEY não configurada.' }, 500);

  try {
    const { plan, cpfCnpj, billingType } = (await req.json().catch(() => ({}))) ?? {};

    const cfg = planoConfig(String(plan));
    if (!cfg) return json({ error: 'Plano inválido.' }, 400);

    const doc = String(cpfCnpj ?? '').replace(/\D/g, '');
    if (!documentoValido(doc)) return json({ error: 'CPF ou CNPJ inválido. Confira os números.' }, 400);

    const forma = billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';

    // Usuário a partir do JWT (nunca confiar em id vindo do cliente).
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

    // Já existe assinatura ativa? Evita cobrança duplicada.
    const { data: jaAtiva } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle();
    if (jaAtiva) return json({ error: 'Você já possui uma assinatura ativa.' }, 409);

    // Reaproveita o customer do Asaas se já houver.
    const { data: existente } = await admin
      .from('subscriptions')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .not('asaas_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    let customerId = existente?.asaas_customer_id as string | undefined;

    if (!customerId) {
      const nome = (user.user_metadata?.full_name as string) || user.email || 'Assinante';
      const rc = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: nome,
          cpfCnpj: doc,
          email: user.email,
          externalReference: user.id, // conciliação com o nosso banco
          notificationDisabled: false,
        }),
      });
      const cJson = await rc.json();
      if (!rc.ok) {
        console.error('[asaas-checkout] erro ao criar cliente', cJson);
        const msg = cJson?.errors?.[0]?.description ?? 'Não foi possível criar seu cadastro de cobrança.';
        return json({ error: msg }, 400);
      }
      customerId = cJson.id;
    }

    // Cria a assinatura (1ª cobrança vence hoje).
    const hoje = new Date().toISOString().slice(0, 10);
    const rs = await asaas('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: forma,
        value: cfg.valor,
        nextDueDate: hoje,
        cycle: 'MONTHLY',
        description: cfg.nome,
        externalReference: user.id,
      }),
    });
    const sJson = await rs.json();
    if (!rs.ok) {
      console.error('[asaas-checkout] erro ao criar assinatura', sJson);
      const msg = sJson?.errors?.[0]?.description ?? 'Não foi possível iniciar a assinatura.';
      return json({ error: msg }, 400);
    }

    // Registra como "incomplete": só vira ativa quando o webhook confirmar o pagamento.
    const { error: upErr } = await admin.from('subscriptions').upsert({
      user_id: user.id,
      tier: cfg.tier,
      status: 'incomplete',
      billing_type: forma === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
      value: cfg.valor,
      cycle: 'MONTHLY',
      asaas_customer_id: customerId,
      asaas_subscription_id: sJson.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'asaas_subscription_id' });
    if (upErr) console.error('[asaas-checkout] falha ao gravar assinatura', upErr.message);

    // Busca a 1ª cobrança para mandar o usuário à página de pagamento.
    const rp = await asaas(`/subscriptions/${sJson.id}/payments`);
    const pJson = await rp.json();
    const cobranca = Array.isArray(pJson?.data) ? pJson.data[0] : null;
    const url = cobranca?.invoiceUrl ?? null;

    if (!url) {
      console.error('[asaas-checkout] assinatura criada sem invoiceUrl', pJson);
      return json({ error: 'Assinatura criada, mas a página de pagamento não ficou pronta. Tente novamente em instantes.' }, 502);
    }

    return json({ url });
  } catch (err) {
    console.error('[asaas-checkout]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao iniciar assinatura.' }, 500);
  }
});
