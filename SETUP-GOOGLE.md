# Setup do login com Google — Bíblia Expositiva PV

O código já está pronto: o botão "Continuar com Google" já existe nas telas de
Login e Cadastro, e o cadastro automático de perfil (nome + foto vindos do
Google) já funciona, porque reaproveita o mesmo gatilho `handle_new_user` que
já existe no banco.

**Falta só uma coisa, e só você consegue fazer:** ativar o provedor Google no
painel do Supabase. Não existe ferramenta/API para eu fazer isso por você —
é uma decisão de credencial que só o dono da conta pode autorizar.

São dois lugares para mexer: o **Google Cloud Console** (criar a credencial) e
o **painel do Supabase** (colar a credencial). Leva uns 10 minutos.

---

## 1. Google Cloud Console — criar a credencial OAuth

1. Acesse **https://console.cloud.google.com/** e crie um projeto (ou use um
   existente) — pode chamar de "Biblia Expositiva PV".
2. Menu lateral → **APIs e serviços → Tela de consentimento OAuth**.
   - Tipo de usuário: **Externo**.
   - Preencha nome do app ("Bíblia Expositiva PV"), e-mail de suporte e e-mail
     de contato do desenvolvedor (pode usar `suporte@grupo-soares.com`).
   - Nos passos seguintes não precisa adicionar escopos extras — o padrão
     (nome, e-mail, foto) já é suficiente. Salve e continue até o fim.
   - Se pedir "usuários de teste" enquanto o app está em modo de teste, adicione
     os e-mails que forem testar o login antes de publicar o app.
3. Menu lateral → **APIs e serviços → Credenciais → Criar credenciais → ID do
   cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: "Bíblia Expositiva PV — Supabase".
   - **Origens JavaScript autorizadas** — adicione as três:
     ```
     https://www.bibliaexpositivapv.com.br
     https://nrizmanwdipuowpkmqqm.supabase.co
     http://localhost:5173
     ```
   - **URIs de redirecionamento autorizados** — adicione **exatamente** esta
     (é o endpoint fixo do Supabase, não muda):
     ```
     https://nrizmanwdipuowpkmqqm.supabase.co/auth/v1/callback
     ```
   - Clique em **Criar**. Uma janela mostra o **Client ID** e o **Client
     Secret** — copie os dois (o Secret só aparece essa vez, mas dá para gerar
     outro depois se perder).

## 2. Painel do Supabase — ativar o provedor

1. Acesse o projeto em **https://supabase.com/dashboard/project/nrizmanwdipuowpkmqqm**.
2. Menu lateral → **Authentication → Providers** (ou **Sign In / Providers**,
   dependendo da versão do painel) → encontre **Google** na lista.
3. Ative o toggle e cole:
   - **Client ID** (do passo 1)
   - **Client Secret** (do passo 1)
4. Salve.

Não precisa mexer em nenhum secret de Edge Function para isso — a
autenticação OAuth é tratada pelo Supabase Auth diretamente, o app só chama
`supabase.auth.signInWithOAuth({ provider: 'google' })`.

## 3. Testar

1. Abra o site (local `npm run dev` ou o publicado) deslogado.
2. Na tela de Login (ou Cadastro), clique em **Continuar com Google**.
3. Escolha uma conta Google → deve voltar logado direto em `/inicio`.
4. Confira no Supabase (Authentication → Users) que o usuário apareceu com
   `provider: google`, e no banco (`profiles`) que o perfil foi criado com o
   nome e a foto vindos da conta Google.

## Se der erro "redirect_uri_mismatch"

A URI de redirecionamento cadastrada no Google Cloud não bateu com a que o
Supabase mandou. Confirme que está **exatamente**
`https://nrizmanwdipuowpkmqqm.supabase.co/auth/v1/callback` (sem barra a
mais, sem `www`, sem porta) nas credenciais do Google Cloud.

## Publicar o app (sair do modo de teste)

Enquanto a Tela de Consentimento OAuth estiver em modo **Teste**, só os
e-mails cadastrados como "usuários de teste" conseguem logar. Para liberar
para qualquer pessoa, volte em **Tela de consentimento OAuth** e clique em
**Publicar app**. O Google pode pedir uma revisão se o app pedir escopos
sensíveis — o escopo básico (nome/e-mail/foto) normalmente não exige revisão.
