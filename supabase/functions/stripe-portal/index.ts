// Edge Function: stripe-portal
// Duas ações para o usuário autenticado (verify_jwt = true):
//   { action: 'portal' }  -> abre o Billing Portal da Stripe (gerenciar/cancelar/atualizar cartão)
//   { action: 'cancel' }  -> cancela a assinatura. Se estiver dentro de 7 dias do 1º pagamento,
//                            emite reembolso automático (direito de arrependimento — CDC art. 49).
//
// Secrets: STRIPE_SECRET_KEY, APP_URL (fallback: origin)

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REFUND_WINDOW_DAYS = 7;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) return json({ error: 'STRIPE_SECRET_KEY não configurada.' }, 500);

  try {
    const { action } = (await req.json().catch(() => ({}))) ?? {};

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

    const stripe = new Stripe(secretKey, { apiVersion: '2025-03-31.basil' as unknown as Stripe.LatestApiVersion });

    // Assinatura mais recente do usuário.
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id, stripe_subscription_id, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return json({ error: 'Nenhuma assinatura encontrada.' }, 404);

    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || 'http://localhost:5173';

    if (action === 'portal') {
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${appUrl}/minha-conta`,
      });
      return json({ url: portal.url });
    }

    if (action === 'cancel') {
      if (!sub.stripe_subscription_id) return json({ error: 'Assinatura sem ID Stripe.' }, 400);

      // 1º pagamento recebido desta assinatura.
      const { data: firstPayment } = await admin
        .from('payments')
        .select('paid_at, stripe_payment_intent_id, value')
        .eq('subscription_id', sub.id)
        .eq('status', 'received')
        .order('paid_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let refunded = false;
      const withinWindow = firstPayment?.paid_at
        ? (Date.now() - new Date(firstPayment.paid_at).getTime()) <= REFUND_WINDOW_DAYS * 86400_000
        : false;

      if (withinWindow && firstPayment?.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({ payment_intent: firstPayment.stripe_payment_intent_id });
          refunded = true;
        } catch (e) {
          console.error('[stripe-portal] falha no reembolso', (e as Error).message);
        }
      }

      // Reembolso => cancela imediatamente; caso contrário, ao fim do período pago.
      if (refunded) {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } else {
        await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
      }

      // O webhook fará a sincronização final; refletimos o estado imediato aqui também.
      await admin.from('subscriptions').update({
        cancel_at_period_end: !refunded,
        status: refunded ? 'canceled' : sub.status,
        canceled_at: refunded ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', sub.id);
      if (refunded) {
        await admin.from('profiles').update({ subscription_tier: 'free' }).eq('id', user.id);
      }

      return json({
        canceled: true,
        refunded,
        message: refunded
          ? 'Assinatura cancelada e reembolso emitido (dentro dos 7 dias).'
          : 'Assinatura será cancelada ao fim do período já pago.',
      });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (err) {
    console.error('[stripe-portal]', err);
    return json({ error: (err as Error)?.message ?? 'Erro no portal.' }, 500);
  }
});
