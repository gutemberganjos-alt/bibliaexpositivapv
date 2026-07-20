// Edge Function: asaas-cancel
// Cancela a assinatura do usuário logado. Se estiver dentro de 7 dias do primeiro
// pagamento (direito de arrependimento — CDC art. 49), estorna automaticamente.
//
// Secrets: ASAAS_API_KEY, ASAAS_ENV

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API = (Deno.env.get('ASAAS_ENV') ?? 'sandbox') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

const JANELA_REEMBOLSO_DIAS = 7;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
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

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, asaas_subscription_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.asaas_subscription_id) return json({ error: 'Nenhuma assinatura encontrada.' }, 404);

    // Primeiro pagamento recebido: base para a janela de 7 dias.
    const { data: primeiro } = await admin
      .from('payments')
      .select('asaas_payment_id, paid_at')
      .eq('subscription_id', sub.id)
      .eq('status', 'received')
      .order('paid_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const dentroDaJanela = primeiro?.paid_at
      ? (Date.now() - new Date(primeiro.paid_at).getTime()) <= JANELA_REEMBOLSO_DIAS * 86400000
      : false;

    let reembolsado = false;
    if (dentroDaJanela && primeiro?.asaas_payment_id) {
      const r = await asaas(`/payments/${primeiro.asaas_payment_id}/refund`, {
        method: 'POST',
        body: JSON.stringify({ description: 'Cancelamento dentro do prazo de arrependimento (7 dias).' }),
      });
      if (r.ok) reembolsado = true;
      else console.error('[asaas-cancel] falha no estorno', await r.text());
    }

    // Remove a assinatura no Asaas: para de gerar novas cobranças.
    const rc = await asaas(`/subscriptions/${sub.asaas_subscription_id}`, { method: 'DELETE' });
    if (!rc.ok) {
      console.error('[asaas-cancel] falha ao cancelar', await rc.text());
      return json({ error: 'Não foi possível cancelar agora. Tente novamente em instantes.' }, 502);
    }

    // Com estorno: acesso encerra na hora. Sem estorno: mantém até o fim do período pago.
    const { error: upErr } = await admin.from('subscriptions').update({
      status: reembolsado ? 'canceled' : sub.status,
      cancel_at_period_end: !reembolsado,
      canceled_at: reembolsado ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    if (upErr) console.error('[asaas-cancel] falha ao atualizar assinatura', upErr.message);

    if (reembolsado) {
      await admin.from('profiles').update({ subscription_tier: 'free' }).eq('id', user.id);
    }

    return json({
      canceled: true,
      refunded: reembolsado,
      message: reembolsado
        ? 'Assinatura cancelada e reembolso solicitado (dentro dos 7 dias).'
        : 'Assinatura cancelada. Você mantém o acesso até o fim do período já pago.',
    });
  } catch (err) {
    console.error('[asaas-cancel]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao cancelar.' }, 500);
  }
});
