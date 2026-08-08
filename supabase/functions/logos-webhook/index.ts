// Edge Function: logos-webhook
// Recebe o aviso de compra/cancelamento vindo da Logos Academy (a Logos é a
// ÚNICA ligação com Stripe/Asaas para este produto — este app não cobra mais
// diretamente). Idempotente: pode ser chamado várias vezes com o mesmo evento.
//
// verify_jwt = FALSE (a Logos não manda JWT do Supabase; autenticidade pelo
// header x-logos-token, comparado ao secret LOGOS_WEBHOOK_TOKEN).
//
// SEGURANÇA (corrigido em 07/08/2026): a checagem do token era "if (TOKEN)" —
// ou seja, se o secret LOGOS_WEBHOOK_TOKEN não estivesse configurado, a validação
// inteira era pulada e QUALQUER pessoa podia conceder assinatura premium para
// qualquer e-mail, sem pagar nada. Agora falha fechado: sem secret configurado,
// a função recusa TODAS as chamadas.
//
// Secrets necessários:
//   LOGOS_WEBHOOK_TOKEN   (mesmo valor configurado no .env da Logos Academy)
//
// Contrato (POST):
//   {
//     action: 'grant' | 'revoke',
//     email: string,
//     name?: string,
//     tier?: 'premium' | 'church',       // default 'premium'
//     cycle?: 'MONTHLY' | 'YEARLY',      // default 'MONTHLY'
//     currentPeriodEnd?: string,         // ISO 8601
//     logosSubscriptionId: string,       // id da Subscription na Logos (rastreio)
//   }

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const TOKEN = Deno.env.get('LOGOS_WEBHOOK_TOKEN') ?? '';

type Body = {
  action?: 'grant' | 'revoke';
  email?: string;
  name?: string;
  tier?: 'premium' | 'church';
  cycle?: 'MONTHLY' | 'YEARLY';
  currentPeriodEnd?: string;
  logosSubscriptionId?: string;
};

/** Acha o usuário Supabase Auth pelo e-mail, criando se ainda não existir. */
async function ensureUser(email: string, name?: string): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (!error && created.user) return created.user.id;

  // Já existe (erro esperado) -> procura na lista. Base pequena, custo aceitável;
  // revisar para busca indexada se o volume de usuários crescer bastante.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`auth.listUsers: ${listErr.message}`);
  const found = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) throw new Error(`Não foi possível criar nem encontrar o usuário: ${email}`);
  return found.id;
}

/** Não existe unique constraint em subscriptions.user_id (mesmo padrão já usado
 * pela asaas-webhook), então fazemos manualmente: acha a linha mais recente do
 * usuário e atualiza; se não existir, insere. */
async function findLatestSubscription(userId: string) {
  const { data } = await admin.from('subscriptions')
    .select('id').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.id as string | undefined;
}

async function grant(body: Body) {
  if (!body.email) throw new Error('email é obrigatório');
  const userId = await ensureUser(body.email, body.name);
  const tier = body.tier ?? 'premium';
  const cycle = body.cycle ?? 'MONTHLY';

  const { error: profErr } = await admin.from('profiles').upsert({
    id: userId,
    email: body.email,
    subscription_tier: tier,
    ...(body.name ? { full_name: body.name } : {}),
  }, { onConflict: 'id' });
  if (profErr) throw new Error(`profiles.upsert: ${profErr.message}`);

  const row = {
    user_id: userId,
    tier,
    cycle,
    status: 'active' as const,
    billing_type: 'CREDIT_CARD' as const,
    logos_subscription_id: body.logosSubscriptionId ?? null,
    current_period_end: body.currentPeriodEnd ?? null,
    canceled_at: null,
    updated_at: new Date().toISOString(),
  };

  const existingId = await findLatestSubscription(userId);
  const { error: subErr } = existingId
    ? await admin.from('subscriptions').update(row).eq('id', existingId)
    : await admin.from('subscriptions').insert(row);
  if (subErr) throw new Error(`subscriptions.write: ${subErr.message}`);

  return { ok: true, userId };
}

async function revoke(body: Body) {
  if (!body.email) throw new Error('email é obrigatório');
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`auth.listUsers: ${listErr.message}`);
  const found = list.users.find(u => u.email?.toLowerCase() === body.email!.toLowerCase());
  if (!found) return { ok: true, note: 'usuário não encontrado, nada a revogar' };

  const existingId = await findLatestSubscription(found.id);
  if (existingId) {
    const { error: subErr } = await admin.from('subscriptions').update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', existingId);
    if (subErr) throw new Error(`subscriptions.cancel: ${subErr.message}`);
  }

  const { error: profErr } = await admin.from('profiles').update({ subscription_tier: 'free' }).eq('id', found.id);
  if (profErr) throw new Error(`profiles.downgrade: ${profErr.message}`);

  return { ok: true, userId: found.id };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  // Falha FECHADA: sem secret configurado, nenhuma chamada é aceita. Nunca pule
  // a validação por falta de configuração — isso já foi uma falha real (qualquer
  // pessoa podia conceder assinatura premium de graça pra qualquer e-mail).
  if (!TOKEN) {
    console.error('[logos-webhook] LOGOS_WEBHOOK_TOKEN não configurado — recusando todas as chamadas');
    return new Response(JSON.stringify({ ok: false, error: 'função não configurada' }), { status: 503 });
  }
  const recebido = req.headers.get('x-logos-token') ?? '';
  if (recebido !== TOKEN) {
    console.error('[logos-webhook] token inválido');
    return new Response(JSON.stringify({ ok: false, error: 'token inválido' }), { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), { status: 400 });
  }

  try {
    const result = body.action === 'revoke' ? await revoke(body) : await grant(body);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error('[logos-webhook] falha ao processar', err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
