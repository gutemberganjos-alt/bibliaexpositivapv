# HANDOFF — Bíblia Expositiva PV

Estado do projeto em **20/07/2026**. Leia este arquivo antes de continuar.

## O que é
App de estudos bíblicos por assinatura. O usuário escolhe **formato** (modo) +
**público** + **texto/tema**, e a IA gera o material com selos de confiabilidade.

---

## Onde o projeto está

Publicado e funcional em `https://www.bibliaexpositivapv.com.br`.
O fluxo de assinatura foi testado ponta a ponta no sandbox e **funciona**: cobrança
criada → pagamento confirmado → acesso liberado automaticamente.

**O único bloqueador para vender de verdade é o cadastro do Asaas de produção**,
que depende da análise deles (documentos + dados bancários do titular).

---

## Stack

- Vite + React 19 + TypeScript + Tailwind 4, React Router v7, PWA com service worker.
  App local em `~/bibliaexpositivapv`, `npm run dev` (localhost:5173).
- Supabase (projeto `nrizmanwdipuowpkmqqm`): Postgres + RLS, Auth, Edge Functions (Deno)
- Vercel (hospedagem) · Hostinger (DNS) · Google Gemini (geração) · **Asaas** (pagamentos)
- Repo: `github.com/gutemberganjos-alt/bibliaexpositivapv` — branch `main`
- Pasta já conectada ao Cowork (acesso Read/Write/Edit direto).

### IA de geração
Edge function **`gerar`**: recebe `{ modoId, publicoId, referencia }` → `{ titulo, html, meta }`.
Modelo principal `gemini-3.5-flash`, reserva `gemini-3.1-flash-lite` (usada em 503/429).

---

## Pagamentos (Asaas) — migrado da Stripe

A Stripe foi abandonada porque não liberou PIX. Funções ativas:

| Função | verify_jwt | O que faz |
|---|---|---|
| `asaas-checkout` | true | Cria cliente + cobrança. Cartão → Checkout do Asaas. PIX → assinatura + QR code devolvido ao app. |
| `asaas-webhook` | **false** | Recebe eventos de pagamento e ativa/derruba o acesso. |
| `asaas-cancel` | true | Cancela e reembolsa automaticamente dentro de 7 dias. |

### Regras do Asaas descobertas testando a API (não estão óbvias na doc)

Custaram horas. **Não repita:**

1. Em `chargeTypes: RECURRENT`, o Checkout aceita **somente CREDIT_CARD**. Por isso
   cartão e PIX seguem caminhos diferentes.
2. `items[].name` tem limite de **30 caracteres**.
3. O objeto `callback` é **obrigatório** e exige `successUrl` **e** `cancelUrl` juntos.
   As URLs **não podem ter query string** — por isso o retorno é `/assinatura/sucesso`
   (caminho), não `?status=sucesso`.
4. O cliente precisa ter **phone, address, addressNumber, postalCode, province e city**.
   Enviando `postalCode` + `addressNumber`, o Asaas completa rua, bairro e cidade.
5. O webhook **desativa sozinho** após falhas seguidas. Se pagamentos pararem de
   confirmar, cheque Integrações → Webhooks → situação **Ativo** antes de qualquer coisa.
6. O token do webhook exige **mínimo de 32 caracteres**.

### Secrets no Supabase (Edge Functions → Manage secrets)

`ASAAS_API_KEY` · `ASAAS_ENV` (hoje `sandbox`) · `ASAAS_WEBHOOK_TOKEN` · `APP_URL` ·
`GEMINI_API_KEY` · `ENFORCE_SUBSCRIPTION`

> **Armadilha real:** um secret foi salvo como `APP_URL=https://...` (com o nome dentro
> do valor) e quebrou o checkout de cartão por horas. O código hoje tolera isso, mas
> confira sempre: no campo *Value* vai **só** o valor.

### Para ir a produção

1. Criar conta em `www.asaas.com` (é **outra conta**, separada do sandbox) e aguardar aprovação
2. Trocar `ASAAS_ENV` → `production` e `ASAAS_API_KEY` → chave da conta real
3. Cadastrar o webhook na conta de produção (mesma URL, mesmo token)
4. Fazer uma cobrança real de teste e estornar

URL do webhook: `https://nrizmanwdipuowpkmqqm.supabase.co/functions/v1/asaas-webhook`

---

## Planos

| Plano | Mensal | Anual | Economia |
|---|---|---|---|
| Individual (`premium`) | R$ 29,90 | R$ 295,90 | R$ 62,90 |
| Igreja (`church`) | R$ 99,90 | R$ 1.019,90 | R$ 178,90 |

Preços definidos **no servidor** (`asaas-checkout`), nunca aceitos do navegador.
Se mudar valor, mude nos **dois** lugares: `src/lib/subscription.ts` (vitrine) e a função.

---

## Qualidade dos estudos — corrigido, NÃO VALIDADO

O dono reclamou que os estudos vinham rasos ("a exegese não tem nada de exegese").
O problema não era o modelo, era o prompt. Cinco causas corrigidas:

1. `thinkingBudget` estava **0** (raciocínio desligado) → agora 3000
2. Metade dos modos **não tinha meta de tamanho** (curso, sermão, pequeno grupo,
   discipulado, apologética, pergunte ao texto) → todos ganharam mínimo de palavras
3. Exegese pedia "**máximo** 3.500 palavras" (só teto, sem piso) → agora 3.000–4.500
4. `maxOutputTokens` menor que o texto pedido → regra nova: tokens ≥ palavras × 3
5. Público "adolescentes" impunha "máximo 600 palavras" **a todos os modos**

Também subiram as exigências por seção (exegese: mínimo 5 termos originais com
transliteração, morfologia e campo semântico; curso: plano de aula executável com
falas, 6 perguntas com respostas e gabarito).

> **PUBLICADO** (verificado em 21/07/2026 na versão 35 da função, em produção):
> as cinco correções estão no ar — `thinkingBudget` 3000, metas de tamanho em todos
> os modos, exegese com piso de 3.000 palavras, `maxOutputTokens` ≥ palavras × 3 e
> o público "adolescentes" sem teto de palavras.
>
> **AINDA PENDENTE: testar o resultado.** O código está no ar, a qualidade não foi
> validada por leitura. Teste exegese de texto denso (Rm 3:21-26) e Curso de 1h.
> Esperado: mais lento e mais caro em tokens — é o preço do material denso.
> Isso vira bloqueador antes de gerar conteúdo em massa para SEO: material raso
> multiplicado por 2.000 páginas é dívida, não ativo.

---

## Biblioteca na nuvem (feito, não validado por uso real)

Antes vivia só no `localStorage` — trocar de celular apagava tudo. Agora existe a
tabela `studies` com RLS por usuário. O `localStorage` virou espelho (tela abre
instantânea e sobrevive a queda de rede). Estudos antigos sobem automaticamente na
primeira abertura, uma única vez.

> **PENDENTE:** testar salvando num aparelho e abrindo em outro com a mesma conta.

---

## Legal e SEO

- `/termos` e `/privacidade` — públicos, sem login, linkados no rodapé. CNPJ
  **41.350.395/0001-30**. Contato: **suporte@grupo-soares.com**
- A política lista fornecedores **por categoria** (decisão do dono), com lista nominal
  disponível por e-mail sob pedido. Os Termos ainda nomeiam o Asaas — de propósito,
  porque o nome aparece na fatura do cliente e omitir gera chargeback.
- SEO técnico: canonical, OG, sitemap e robots **padronizados em `www`** (estavam sem
  `www` enquanto o site responde com — o Google era mandado a uma URL que redirecionava)
- Google Search Console: domínio **verificado** via TXT.
  Falta **enviar o sitemap** e pedir indexação da home.

---

## Admin, painel de usuários, reset de senha e login com Google (feito em 06/08/2026)

- **Admin**: coluna `profiles.is_admin` + função `public.is_admin()` (SECURITY
  DEFINER) + políticas SELECT para admin em `profiles`, `subscriptions`,
  `payments`, `usage_counters`, `studies`, `lessons`, `churches`. Admin atual:
  `gutemberg.anjos@gmail.com`. Para promover outra conta:
  `update public.profiles set is_admin = true where email = '...';`
- **Painel `/admin/usuarios`**: KPIs (usuários, assinantes ativos, novos 30d,
  MRR estimado) + busca + lista com plano/status/consumo do mês. Entrada em
  Minha Conta → "Painel Admin" (só aparece pra quem é admin). Código:
  `src/lib/admin.ts`, `src/contexts/AdminContext.tsx`,
  `src/components/AdminRoute.tsx`, `src/pages/admin/Usuarios.tsx`.
- **Reset de senha**: faltava a página que o link do e-mail abre. Criada
  `src/pages/auth/ResetPassword.tsx`, rota pública `/resetar-senha` **fora**
  do `PublicRoute` (importante: a sessão de recuperação do Supabase não pode
  ser redirecionada embora antes do usuário trocar a senha). `ForgotPassword.tsx`
  já existia e já funcionava.
- **Login com Google**: botão "Continuar com Google" em Login e Cadastro
  (`supabase.auth.signInWithOAuth`). O gatilho `handle_new_user` já populava
  `full_name`/`avatar_url` a partir de `raw_user_meta_data`, que é exatamente
  o que o Google manda — não precisou mudar o trigger.
  **PENDENTE (só o dono consegue fazer):** ativar o provedor Google no painel
  do Supabase (Authentication → Providers) com Client ID/Secret do Google
  Cloud Console. Passo a passo completo em `SETUP-GOOGLE.md`.

---

## O que falta (em ordem de impacto)

1. **Asaas de produção** — único bloqueador de venda
2. **Publicar e testar a função `gerar`** — a correção de qualidade está no código, não no ar
3. **Testar biblioteca entre aparelhos** e o PIX com QR dentro do app
4. **Nota fiscal / configuração fiscal** — com contador
5. **Indicador de consumo** ("X de 30 estudos este mês") — hoje o assinante bate no
   limite sem aviso; gera suporte
6. ~~**Conteúdo público para SEO**~~ — **infraestrutura pronta em `seo/`** (21/07/2026).
   Pipeline de 5 passos: minera autocomplete → monta fila → gera pela função `gerar`
   → publica em lotes → emite HTML estático pré-renderizado em `dist/`. Tabela
   `seo_pages` já criada em produção. Leia `seo/README.md`.
   Falta: `SEO_TOKEN` nos secrets, redeploy do `gerar`, e as variáveis no Vercel.
7. Apagar as funções antigas da Stripe no painel do Supabase
8. Proteção contra senha vazada (só no plano Pro do Supabase) — opcional

---

## Correções pós-deploy (06/08/2026, tarde)

- **404 em `/resetar-senha` e no retorno do login Google** — causa: `vercel.json`
  tinha `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]`
  junto com `"cleanUrls": true`. Essa combinação quebra a resolução do destino
  na Vercel (ele existe se acessado direto, mas o rewrite não resolve) e
  qualquer rota que não seja `/` dá 404 real da Vercel (`x-vercel-error:
  NOT_FOUND`, `content-type: text/plain`) — nem chega a carregar o React.
  **Correção**: trocar o destino para `"/"` (commit `6b9fbaa`). Confirmado via
  `web_fetch_vercel_url` (ferramenta que lê status/headers reais, diferente do
  WebFetch normal que não mostra bem 404 da Vercel).
- **Logo/favicon errados** — o ícone com texto "BE PV" estava incorreto. Logo
  certo: chama dourada sobre livro aberto, sem texto, fundo azul-marinho. Como
  a imagem enviada pelo usuário não ficou disponível como arquivo (só teria
  chegado inline na conversa), recriei como SVG próprio (`public/favicon.svg`)
  fiel à composição e gerei os PNGs (32/180/192/512) a partir dele (commit
  `8ac219c`). Se um dia o usuário mandar o arquivo original em alta resolução,
  vale substituir pelo original.
- **E-mail de reset de senha sem cara do app** — o Supabase manda o template
  padrão em inglês, remetente `noreply@mail.app.supabase.io`. Não dá para
  editar via API/MCP, só pelo Dashboard (Authentication → Email Templates).
  Guia com o HTML pronto para colar: `SETUP-EMAIL.md`. Trocar o remetente
  exigiria SMTP próprio (fora de escopo por agora).

## Painel admin: prorrogar, dar bônus e cancelar assinaturas (06/08/2026, noite)

No `/admin/usuarios`, cada usuário agora tem dois botões:

- **Prorrogar / bônus** — escolhe plano (Individual/Igreja) e dias (atalhos
  7/30/90/365 ou número livre). Chama a RPC `admin_grant_access` (SECURITY
  DEFINER, só roda se `is_admin()`), que soma os dias a partir de hoje ou do
  fim do período atual (o que for maior) e reativa a assinatura. Não mexe no
  Asaas — é só um ajuste no nosso banco, por isso é seguro pra cortesia/bônus
  e pra segurar um usuário que teve algum problema.
- **Cancelar assinatura** — chama a edge function `admin-cancel`. Se a
  assinatura for de verdade (tem `asaas_subscription_id`), também cancela lá
  para parar a cobrança recorrente. Nunca reembolsa sozinho — isso é decisão
  manual. Tem checkbox "encerrar agora" (senão mantém acesso até o fim do
  período já pago, igual ao autoatendimento).

Toda ação fica em `audit_log` (`action`, `metadata` com `target_user_id` e
`motivo`), visível para admins via a policy `audit_select_admin`.

## Lições desta rodada (evite repetir)

- **Pergunte à API, não adivinhe.** Três erros seguidos do Asaas foram resolvidos em
  minutos com uma função temporária que testava variantes e lia a resposta real.
- **Mostre TODOS os erros da API, não só o primeiro.** O Asaas devolvia 5 campos
  faltando; exibir `errors[0]` fez o dono descobrir um por vez, em tentativas
  separadas. Hoje `mensagemErro()` junta todos.
- **Nunca diga "salvo" antes de confirmar a gravação.** O botão da biblioteca ficava
  verde sem checar o erro.
- **Teste como usuário real, em aba anônima.** O service worker serve versão antiga e
  faz parecer que o deploy não saiu.
- **`git push` é do dono.** O ambiente do agente não tem credenciais e sobram
  `.lock`; quando travar: `find .git -name "*.lock" -delete`.
