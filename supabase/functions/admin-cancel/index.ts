// Edge Function: admin-cancel
// Cancela a assinatura de QUALQUER usuário, a pedido de um admin. Diferente de
// asaas-cancel (self-service), aqui NUNCA reembolsa automaticamente — reembolso
// é decisão de negócio, não algo pra disparar sozinho.
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
    const caller = userData.user;

    const { data: callerProfile } = await admin
      .from('profiles').select('is_admin').eq('id', caller.id).maybeSingle();
    if (!callerProfile?.is_admin) return json({ error: 'Apenas administradores podem cancelar assinaturas de outros usuários.' }, 403);

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.target_user_id ?? '');
    const motivo = body?.motivo ? String(body.motivo) : null;
    const imediato = Boolean(body?.imediato);
    if (!targetUserId) return json({ error: 'target_user_id é obrigatório.' }, 400);

    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, asaas_subscription_id, status')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return json({ error: 'Este usuário não tem assinatura.' }, 404);

    // Só chama o Asaas se a assinatura for de verdade (tem id lá). Concessões
    // manuais (bônus/cortesia) não têm asaas_subscription_id.
    if (sub.asaas_subscription_id && Deno.env.get('ASAAS_API_KEY')) {
      const rc = await asaas(`/subscriptions/${sub.asaas_subscription_id}`, { method: 'DELETE' });
      if (!rc.ok) {
        const detalhe = await rc.text();
        console.error('[admin-cancel] falha ao cancelar no Asaas', detalhe);
        return json({ error: 'Não foi possível cancelar no Asaas agora. Tente novamente em instantes.' }, 502);
      }
    }

    const { error: upErr } = await admin.from('subscriptions').update({
      status: imediato ? 'canceled' : sub.status,
      cancel_at_period_end: !imediato,
      canceled_at: imediato ? new Date().toISOString() : null,
      ...(imediato ? { current_period_end: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    if (upErr) console.error('[admin-cancel] falha ao atualizar assinatura', upErr.message);

    if (imediato) {
      await admin.from('profiles').update({ subscription_tier: 'free' }).eq('id', targetUserId);
    }

    await admin.from('audit_log').insert({
      actor_id: caller.id,
      action: 'admin_cancel_subscription',
      entity: 'subscription',
      entity_id: sub.id,
      metadata: { target_user_id: targetUserId, motivo, imediato, tinha_asaas: Boolean(sub.asaas_subscription_id) },
    });

    return json({
      canceled: true,
      message: imediato
        ? 'Assinatura cancelada e acesso encerrado imediatamente.'
        : 'Assinatura cancelada. O acesso continua até o fim do período já pago.',
    });
  } catch (err) {
    console.error('[admin-cancel]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao cancelar.' }, 500);
  }
});
