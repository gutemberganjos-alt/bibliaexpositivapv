// Edge Function: stripe-checkout
// Cria uma Stripe Checkout Session (mode=subscription) para o plano escolhido.
// Requer JWT do usuário (verify_jwt = true). Reutiliza/cria o customer Stripe.
//
// Body: { plan: 'individual' | 'igreja' }
// Retorna: { url } (URL do Checkout hospedado da Stripe)
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY        sk_test_... / sk_live_...
//   STRIPE_PRICE_INDIVIDUAL  price_...  (plano Individual — R$29,90/mês)
//   STRIPE_PRICE_IGREJA      price_...  (plano Igreja — R$99,90/mês)
//   APP_URL                  ex.: http://localhost:5173 (fallback: origin do request)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente das functions.)

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// plano -> { price, tier }
function planConfig(plan: string): { price: string; tier: 'premium' | 'church' } | null {
  if (plan === 'individual') {
    const price = Deno.env.get('STRIPE_PRICE_INDIVIDUAL');
    return price ? { price, tier: 'premium' } : null;
  }
  if (plan === 'igreja') {
    const price = Deno.env.get('STRIPE_PRICE_IGREJA');
    return price ? { price, tier: 'church' } : null;
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) return json({ error: 'STRIPE_SECRET_KEY não configurada.' }, 500);

  try {
    const { plan } = (await req.json().catch(() => ({}))) ?? {};
    const cfg = planConfig(String(plan));
    if (!cfg) return json({ error: 'Plano inválido ou Price não configurado.' }, 400);

    // Identifica o usuário a partir do JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Não autenticado.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Sessão inválida.' }, 401);
    const user = userData.user;

    const stripe = new Stripe(secretKey, { apiVersion: '2025-03-31.basil' as unknown as Stripe.LatestApiVersion });

    // Reutiliza customer Stripe se já houver assinatura registrada para este usuário.
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (user.user_metadata?.full_name as string) ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: cfg.price, quantity: 1 }],
      // payment_method_types omitido de propósito: respeita os métodos habilitados
      // no Dashboard (Cartão + PIX/Pix Automático). Ative PIX em Settings → Payment methods.
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: String(plan), tier: cfg.tier },
      },
      metadata: { supabase_user_id: user.id, plan: String(plan), tier: cfg.tier },
      allow_promotion_codes: true,
      locale: 'pt-BR',
      success_url: `${appUrl}/assinatura?status=sucesso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/assinatura?status=cancelado`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout]', err);
    return json({ error: (err as Error)?.message ?? 'Erro ao criar checkout.' }, 500);
  }
});
