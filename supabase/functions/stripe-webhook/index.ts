// Edge Function: stripe-webhook
// Recebe eventos da Stripe e sincroniza subscriptions / payments / profiles.
// verify_jwt = FALSE (a Stripe não envia JWT; autenticidade via assinatura HMAC).
//
// Secrets necessários:
//   STRIPE_SECRET_KEY       sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET   whsec_... (do endpoint criado no Dashboard/CLI)
//
// Eventos tratados:
//   checkout.session.completed         -> vincula customer + garante linha de assinatura
//   customer.subscription.created      -> upsert da assinatura
//   customer.subscription.updated      -> upsert (status, período, cancelamento agendado)
//   customer.subscription.deleted      -> marca cancelada + rebaixa profile p/ free
//   invoice.paid / invoice.payment_succeeded -> registra pagamento recebido
//   invoice.payment_failed             -> pagamento falho + assinatura past_due
//   charge.refunded                    -> pagamento reembolsado

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2025-03-31.basil' as unknown as Stripe.LatestApiVersion,
});
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// tier a partir do price/metadata
function tierFromMetadata(meta: Record<string, string> | null | undefined): 'premium' | 'church' | null {
  const t = meta?.tier;
  if (t === 'premium' || t === 'church') return t;
  return null;
}

function tsToIso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

// Lança erro se a gravação falhar (faz o handler retornar 500 e a Stripe reentregar).
function must(label: string, res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
}

// --- Normalização de campos que mudaram na API Basil/Dahlia (2025-03-31+) ---
// current_period_end saiu do topo da Subscription e foi para os itens.
function subPeriodEnd(sub: Stripe.Subscription): number | null {
  const anySub = sub as unknown as { current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } };
  return anySub.items?.data?.[0]?.current_period_end ?? anySub.current_period_end ?? null;
}
// invoice.subscription virou invoice.parent.subscription_details.subscription.
function invoiceSubId(inv: Stripe.Invoice): string | null {
  const anyInv = inv as unknown as { subscription?: string; parent?: { subscription_details?: { subscription?: string } } };
  return (anyInv.subscription as string) ?? anyInv.parent?.subscription_details?.subscription ?? null;
}
// invoice.payment_intent virou invoice.payments[].payment.payment_intent.
function invoicePaymentIntent(inv: Stripe.Invoice): string | null {
  const anyInv = inv as unknown as {
    payment_intent?: string;
    payments?: { data?: Array<{ payment?: { payment_intent?: string } }> };
  };
  return (anyInv.payment_intent as string) ?? anyInv.payments?.data?.[0]?.payment?.payment_intent ?? null;
}

// Descobre o supabase_user_id a partir do customer/metadata da assinatura.
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = (sub.metadata?.supabase_user_id as string) || null;
  if (fromMeta) return fromMeta;
  // fallback: customer metadata
  try {
    const customer = await stripe.customers.retrieve(sub.customer as string);
    if (customer && !(customer as Stripe.DeletedCustomer).deleted) {
      return ((customer as Stripe.Customer).metadata?.supabase_user_id as string) || null;
    }
  } catch { /* ignore */ }
  // fallback: linha existente
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', sub.customer as string)
    .limit(1)
    .maybeSingle();
  return (data?.user_id as string) ?? null;
}

function mapStatus(s: Stripe.Subscription.Status): string {
  // enum do banco: active, past_due, canceled, trialing, incomplete
  switch (s) {
    case 'active': return 'active';
    case 'trialing': return 'trialing';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete': return 'incomplete';
    case 'incomplete_expired': return 'incomplete';
    case 'paused': return 'past_due';
    default: return 'incomplete';
  }
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const userId = await resolveUserId(sub);
  if (!userId) {
    console.error('[webhook] sem user_id para subscription', sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const tier = tierFromMetadata(sub.metadata as Record<string, string>) ??
    (sub.metadata?.tier as 'premium' | 'church') ?? 'premium';
  const status = mapStatus(sub.status);

  const row = {
    user_id: userId,
    tier,
    status,
    billing_type: 'CREDIT_CARD', // método real chega no invoice; padrão aqui
    value: item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null,
    cycle: item?.price?.recurring?.interval ?? null,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    current_period_end: tsToIso(subPeriodEnd(sub)),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: tsToIso(sub.canceled_at),
    updated_at: new Date().toISOString(),
  };

  must('subscriptions.upsert', await admin.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' }));

  // Sincroniza o tier no profile (free quando não ativa).
  const active = status === 'active' || status === 'trialing';
  must('profiles.update', await admin.from('profiles').update({ subscription_tier: active ? tier : 'free' }).eq('id', userId));
}

async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = await resolveUserId(sub);
  must('subscriptions.cancel', await admin
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', sub.id));
  if (userId) {
    must('profiles.downgrade', await admin.from('profiles').update({ subscription_tier: 'free' }).eq('id', userId));
  }
}

async function findSubscriptionRow(stripeSubId: string | null) {
  if (!stripeSubId) return null;
  const { data } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle();
  return data ?? null;
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const subId = invoiceSubId(invoice);
  const subRow = await findSubscriptionRow(subId);
  // Garante que a lista de payments esteja presente para extrair o PaymentIntent.
  let pi = invoicePaymentIntent(invoice);
  if (!pi && invoice.id) {
    try {
      const full = await stripe.invoices.retrieve(invoice.id, { expand: ['payments'] });
      pi = invoicePaymentIntent(full);
    } catch { /* ignore */ }
  }
  const row = {
    subscription_id: subRow?.id ?? null,
    user_id: subRow?.user_id ?? null,
    status: 'received',
    billing_type: 'CREDIT_CARD' as const,
    value: invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
    paid_at: new Date().toISOString(),
    invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: pi,
    raw_payload: invoice as unknown as Record<string, unknown>,
  };
  must('payments.upsert', await admin.from('payments').upsert(row, { onConflict: 'stripe_invoice_id' }));
}

async function onInvoiceFailed(invoice: Stripe.Invoice) {
  const subId = invoiceSubId(invoice);
  const subRow = await findSubscriptionRow(subId);
  must('payments.failed', await admin.from('payments').upsert({
    subscription_id: subRow?.id ?? null,
    user_id: subRow?.user_id ?? null,
    status: 'failed',
    billing_type: 'CREDIT_CARD',
    value: invoice.amount_due != null ? invoice.amount_due / 100 : null,
    invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_invoice_id: invoice.id,
    raw_payload: invoice as unknown as Record<string, unknown>,
  }, { onConflict: 'stripe_invoice_id' }));

  if (subId) {
    must('subscriptions.past_due', await admin.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subId));
  }
}

async function onChargeRefunded(charge: Stripe.Charge) {
  const pi = charge.payment_intent as string | null;
  if (!pi) return;
  must('payments.refunded', await admin.from('payments').update({
    status: 'refunded',
    refunded_at: new Date().toISOString(),
    stripe_charge_id: charge.id,
  }).eq('stripe_payment_intent_id', pi));
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  if (!sig || !WEBHOOK_SECRET) return new Response('Assinatura ausente.', { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] assinatura inválida', (err as Error).message);
    return new Response(`Webhook inválido: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          // garante metadata do usuário na assinatura
          if (!sub.metadata?.supabase_user_id && session.client_reference_id) {
            sub.metadata = { ...(sub.metadata ?? {}), supabase_user_id: session.client_reference_id };
          }
          await upsertSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await onInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case 'charge.refunded':
        await onChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        // ignora demais eventos
        break;
    }
  } catch (err) {
    console.error('[webhook] erro ao processar', event.type, err);
    return new Response('Erro interno', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
