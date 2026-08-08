# Setup da integração Logos Academy — PENDENTE (07/08/2026)

Leia isto se o assunto for "Logos", "logos-webhook", "logos-sso" ou "LOGOS_WEBHOOK_TOKEN".

## Contexto rápido

A Logos Academy Online é um marketplace externo que também vende o Bíblia
Expositiva PV. Quando alguém compra por lá, a Logos deveria chamar um webhook
neste projeto Supabase para liberar o acesso automaticamente — e, quando o
assinante clica em "abrir o app" dentro da Logos, ela chama outro endpoint
para gerar um link de login automático (magic link).

**Importante, já apurado nesta mesma investigação:** o Asaas (PIX/cartão
nativo do próprio site bibliaexpositivapv.com.br) é o único canal de
pagamento realmente ativo hoje — a Logos é um canal paralelo, secundário,
ainda em configuração.

## Falha de segurança encontrada e corrigida (07/08/2026)

O dono relatou "qualquer pessoa que for direto pro site entra sem pagar".
Investigação encontrou: as funções `logos-webhook` e `logos-sso` só validavam
o header `x-logos-token` **se** o secret `LOGOS_WEBHOOK_TOKEN` existisse. Como
esse secret nunca foi configurado, a validação inteira era pulada:

- `logos-webhook` (ação `grant`): qualquer pessoa na internet podia conceder
  assinatura premium grátis para qualquer e-mail, criando a conta na hora
  (`email_confirm: true`, sem precisar confirmar nada).
- `logos-sso`: qualquer pessoa podia gerar um magic link de login válido para
  o e-mail de **qualquer assinante real que já paga** — sequestro de conta.

**Já corrigido e publicado** (`logos-webhook` v8, `logos-sso` v8): as duas
funções agora falham FECHADO — se `LOGOS_WEBHOOK_TOKEN` não estiver
configurado, recusam todas as chamadas com 503, em vez de deixar passar.
Código-fonte versionado em `supabase/functions/logos-webhook/index.ts` e
`supabase/functions/logos-sso/index.ts` (antes não existiam no repo).

## O que falta fazer (dono, manual)

1. **No Supabase deste projeto** (`nrizmanwdipuowpkmqqm`): Edge Functions →
   Manage secrets → criar `LOGOS_WEBHOOK_TOKEN` com uma senha longa aleatória
   (40+ caracteres). Sem isso, as duas funções ficam bloqueando tudo — seguro,
   mas a integração com a Logos não funciona.
2. **No lado da Logos Academy** (painel/projeto deles — o dono administra em
   outro lugar, possivelmente outro Supabase não conectado a este ambiente):
   configurar o **mesmo valor** de token no que quer que dispare a chamada do
   webhook para `https://nrizmanwdipuowpkmqqm.supabase.co/functions/v1/logos-webhook`
   e para `.../logos-sso`, enviando o header `x-logos-token`.
3. Depois de configurado nos dois lados, testar: uma compra de teste na Logos
   deveria liberar o acesso automaticamente no Bíblia Expositiva PV.

**Adiado a pedido do dono em 07/08/2026** — retomar quando ele pedir.

## Contrato técnico (para referência rápida)

- `logos-webhook` — POST, header `x-logos-token`, body:
  `{ action: 'grant'|'revoke', email, name?, tier?, cycle?, currentPeriodEnd?, logosSubscriptionId }`
- `logos-sso` — POST, header `x-logos-token`, body: `{ email }` → retorna
  `{ ok: true, url }` (magic link) só se a assinatura estiver ativa.
