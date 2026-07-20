// Edge Function: asaas-webhook
// verify_jwt = FALSE (o Asaas não envia JWT; autenticidade pelo header asaas-access-token).
//
// REGRAS DO ASAAS QUE ESTE CÓDIGO RESPEITA:
//  1) Precisa responder 200 rápido. Se falhar 15x seguidas, o Asaas PAUSA a fila
//     e paramos de receber confirmação de pagamento. Por isso: qualquer erro
//     interno é registrado no log, mas ainda respondemos 200 (exceto token inválido).
//  2) Eventos podem chegar repetidos ("at least once") -> tudo é idempotente (upsert).
//
// Secrets: ASAAS_WEBHOOK_TOKEN (mesmo token configurado no painel do Asaas)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';

type Pagamento = {
  id?: string;
  subscription?: string;
  customer?: string;
  value?: number;
  billingType?: string;
  dueDate?: string;
  paymentDate?: string;
  invoiceUrl?: string;
  status?: string;
};

const RECEBIDO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const FALHOU = ['PAYMENT_OVERDUE', 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'];
const ESTORNADO = ['PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED'];

function mapBilling(b?: string): 'PIX' | 'CREDIT_CARD' | 'BOLETO' {
  if (b === 'CREDIT_CARD') return 'CREDIT_CARD';
  if (b === 'BOLETO') return 'BOLETO';
  return 'PIX';
}

async function acharAssinatura(asaasSubId: string | undefined) {
  if (!asaasSubId) return null;
  const { data } = await admin
    .from('subscriptions')
    .select('id, user_id, tier')
    .eq('asaas_subscription_id', asaasSubId)
    .maybeSingle();
  return data ?? null;
}

/** Pagamento confirmado: ativa a assinatura e registra o pagamento. */
async function aoReceber(p: Pagamento) {
  const sub = await acharAssinatura(p.subscription);

  // Próximo vencimento = +1 mês a partir de hoje (ciclo mensal).
  const fim = new Date();
  fim.setMonth(fim.getMonth() + 1);

  if (sub) {
    const { error } = await admin.from('subscriptions').update({
      status: 'active',
      current_period_end: fim.toISOString(),
      billing_type: mapBilling(p.billingType),
      canceled_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    if (error) throw new Error(`subscriptions.activate: ${error.message}`);

    const { error: pe } = await admin.from('profiles')
      .update({ subscription_tier: sub.tier ?? 'premium' })
      .eq('id', sub.user_id);
    if (pe) throw new Error(`profiles.update: ${pe.message}`);
  }

  const { error: payErr } = await admin.from('payments').upsert({
    subscription_id: sub?.id ?? null,
    user_id: sub?.user_id ?? null,
    asaas_payment_id: p.id,
    status: 'received',
    billing_type: mapBilling(p.billingType),
    value: p.value ?? null,
    due_date: p.dueDate ?? null,
    paid_at: new Date().toISOString(),
    invoice_url: p.invoiceUrl ?? null,
    raw_payload: p as unknown as Record<string, unknown>,
  }, { onConflict: 'asaas_payment_id' });
  if (payErr) throw new Error(`payments.upsert: ${payErr.message}`);
}

/** Pagamento vencido/recusado: marca inadimplência (o acesso cai). */
async function aoFalhar(p: Pagamento) {
  const sub = await acharAssinatura(p.subscription);
  if (sub) {
    const { error } = await admin.from('subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    if (error) throw new Error(`subscriptions.past_due: ${error.message}`);
    const { error: pe } = await admin.from('profiles')
      .update({ subscription_tier: 'free' }).eq('id', sub.user_id);
    if (pe) throw new Error(`profiles.downgrade: ${pe.message}`);
  }
  const { error: payErr } = await admin.from('payments').upsert({
    subscription_id: sub?.id ?? null,
    user_id: sub?.user_id ?? null,
    asaas_payment_id: p.id,
    status: 'overdue',
    billing_type: mapBilling(p.billingType),
    value: p.value ?? null,
    due_date: p.dueDate ?? null,
    invoice_url: p.invoiceUrl ?? null,
    raw_payload: p as unknown as Record<string, unknown>,
  }, { onConflict: 'asaas_payment_id' });
  if (payErr) throw new Error(`payments.overdue: ${payErr.message}`);
}

/** Estorno: encerra o acesso e marca o pagamento como reembolsado. */
async function aoEstornar(p: Pagamento) {
  const sub = await acharAssinatura(p.subscription);
  if (sub) {
    const { error } = await admin.from('subscriptions').update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    if (error) throw new Error(`subscriptions.refund_cancel: ${error.message}`);
    const { error: pe } = await admin.from('profiles')
      .update({ subscription_tier: 'free' }).eq('id', sub.user_id);
    if (pe) throw new Error(`profiles.downgrade: ${pe.message}`);
  }
  const { error: payErr } = await admin.from('payments').upsert({
    subscription_id: sub?.id ?? null,
    user_id: sub?.user_id ?? null,
    asaas_payment_id: p.id,
    status: 'refunded',
    billing_type: mapBilling(p.billingType),
    value: p.value ?? null,
    refunded_at: new Date().toISOString(),
    raw_payload: p as unknown as Record<string, unknown>,
  }, { onConflict: 'asaas_payment_id' });
  if (payErr) throw new Error(`payments.refunded: ${payErr.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Metodo nao permitido', { status: 405 });

  // Autenticidade: só recusamos (401) quando o token não bate. Recusar aqui é
  // seguro porque requisição legítima do Asaas sempre traz o token correto.
  if (TOKEN) {
    const recebido = req.headers.get('asaas-access-token') ?? '';
    if (recebido !== TOKEN) {
      console.error('[asaas-webhook] token invalido');
      return new Response('Token invalido', { status: 401 });
    }
  }

  let evento = '';
  try {
    const body = await req.json();
    evento = String(body?.event ?? '');
    const pagamento: Pagamento = body?.payment ?? {};

    if (RECEBIDO.includes(evento)) await aoReceber(pagamento);
    else if (FALHOU.includes(evento)) await aoFalhar(pagamento);
    else if (ESTORNADO.includes(evento)) await aoEstornar(pagamento);
    // demais eventos: ignorados de propósito
  } catch (err) {
    // IMPORTANTE: registramos o erro mas devolvemos 200. Repetir erro 15x faz o
    // Asaas pausar a fila inteira — aí pagamentos confirmados parariam de chegar.
    console.error('[asaas-webhook] falha ao processar', evento, err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
