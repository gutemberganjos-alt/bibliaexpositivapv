// Edge Function: logos-sso
// Gera um link de acesso (magic link) na hora, para o botão "Abrir o app" da
// Logos Academy levar o assinante direto pra dentro — sem cadastro, sem senha.
// Só gera o link se a assinatura estiver ativa (evita login pra quem cancelou).
//
// verify_jwt = FALSE (chamada servidor-a-servidor da Logos; autenticidade pelo
// header x-logos-token).
//
// SEGURANÇA (corrigido em 07/08/2026): a checagem do token era "if (TOKEN)" —
// sem o secret LOGOS_WEBHOOK_TOKEN configurado, QUALQUER pessoa podia pedir um
// magic link válido para o e-mail de um assinante real e logar como ele (conta
// sequestrada). Agora falha fechado: sem secret configurado, recusa tudo.
//
// Secrets necessários:
//   LOGOS_WEBHOOK_TOKEN   (mesmo token do logos-webhook)
//   APP_URL               (para onde o magic link deve redirecionar após o login)
//
// Contrato (POST): { email: string } -> { ok: true, url: string } | { ok: false, error }

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const TOKEN = Deno.env.get('LOGOS_WEBHOOK_TOKEN') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://bibliaexpositivapv.vercel.app';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  // Falha FECHADA: sem secret configurado, nenhuma chamada é aceita (ver nota de
  // segurança no topo do arquivo).
  if (!TOKEN) {
    console.error('[logos-sso] LOGOS_WEBHOOK_TOKEN não configurado — recusando todas as chamadas');
    return new Response(JSON.stringify({ ok: false, error: 'função não configurada' }), { status: 503 });
  }
  const recebido = req.headers.get('x-logos-token') ?? '';
  if (recebido !== TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: 'token inválido' }), { status: 401 });
  }

  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), { status: 400 });
  }
  if (!email) return new Response(JSON.stringify({ ok: false, error: 'email é obrigatório' }), { status: 400 });

  // Só libera link se a assinatura estiver ativa — o front da Logos já checa
  // isso antes de chamar, mas o servidor é a defesa de verdade.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return new Response(JSON.stringify({ ok: false, error: listErr.message }), { status: 500 });
  const user = list.users.find(u => u.email?.toLowerCase() === email);
  if (!user) return new Response(JSON.stringify({ ok: false, error: 'usuário não encontrado' }), { status: 404 });

  const { data: subs } = await admin.from('subscriptions')
    .select('status').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1);
  const sub = subs?.[0];
  if (!sub || sub.status !== 'active') {
    return new Response(JSON.stringify({ ok: false, error: 'assinatura não está ativa' }), { status: 403 });
  }

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP_URL },
  });
  if (linkErr) return new Response(JSON.stringify({ ok: false, error: linkErr.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, url: link.properties.action_link }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
