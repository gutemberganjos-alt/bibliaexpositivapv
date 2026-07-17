# Bíblia Expositiva PV — Resumo para novo chat

## O que é
App de estudos bíblicos. Usuário escolhe **formato** + **público** + **texto/tema** e a IA gera o material (com selos de confiabilidade). "Bíblia Expositiva".

## Stack
- Frontend: Vite + React 19 + TypeScript + Tailwind CSS 4. App local em `~/bibliaexpositivapv`, roda com `npm run dev` (localhost:5173). Origem Lovable + GitHub.
- Backend: Supabase, projeto `nrizmanwdipuowpkmqqm`.
- Pasta já conectada ao Cowork (Claude tem acesso Read/Write/Edit/Grep direto — não precisa reconectar).

## IA de geração (ESTADO ATUAL — funcionando)
- Edge function **`gerar`** (Supabase). Contrato: recebe `{ modoId, publicoId, referencia }` → retorna `{ titulo, html, meta }`.
- Provedor trocado de Anthropic (Claude) para **Google Gemini**.
- Modelo principal: **`gemini-3.5-flash`** (o `gemini-2.5-flash` foi descontinuado p/ novas contas — deu 404).
- Modelo reserva automático: **`gemini-3.1-flash-lite`** (usado se o principal der 503/429).
- Função tem retry automático em erros transitórios (429/500/502/503/504) + fallback de modelo. Versão atual: **v8** (streaming SSE).
- **Streaming (v8):** a função aceita `stream: true` no body (ou `Accept: text/event-stream`) e responde via SSE usando `streamGenerateContent?alt=sse`. Eventos emitidos: `{type:'titulo'}`, `{type:'delta', html}` (HTML acumulado até o momento), `{type:'done', result}` (resultado final limpo com meta) e `{type:'error', error}`. O caminho não-stream (JSON único via `supabase.functions.invoke`) continua funcionando igual. Fonte da função agora versionada em `supabase/functions/gerar/` (index.ts + prompts.ts).
- Config por env (secrets Supabase): `GEMINI_API_KEY` (obrigatório, JÁ CONFIGURADO), `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_THINKING_BUDGET` (0 = thinking desligado, padrão).
- Chave da API só no servidor. `prompts.ts` (na função) define MODOS e PUBLICOS e pede saída JSON com HTML restrito (`<p><h4><ul><li><blockquote><cite><strong><em>` + spans de selo).

### Modos e públicos
- Modos: `devocional`, `estudo`, `sermao`, `exegese`, `curso`.
- Públicos: `criancas`, `adolescentes`, `jovens`, `igreja`, `professores`, `pastores`, `teologia`.

## Frontend criado nesta sessão
- `src/lib/ai-config.ts` — MODOS/PUBLICOS (espelham o servidor).
- `src/lib/gerar.ts` — `gerarEstudo()` via `supabase.functions.invoke('gerar')`.
- `src/components/StudyGenerator.tsx` — form (formato + público + referência) e render do HTML gerado. Reutilizável.
- `src/pages/Estudos.tsx` — usa o gerador (era placeholder).
- `src/pages/Exegese.tsx` e `src/pages/Interpretacao.tsx` — reusam o gerador com modo fixo (`exegese` / `estudo`) e recebem a referência via navigation state da tela da Bíblia.
- `src/index.css` — estilos dos selos (`.selo-*`) e tipografia do conteúdo (`.estudo-conteudo`).
- `src/App.tsx` — rotas `/estudos`, `/exegese`, `/interpretacao` ligadas.
- `src/pages/Dashboard.tsx` — botão "Começar Estudo" agora vai para `/estudos`.
- Build: `tsc -b` compila limpo. (No sandbox Linux o `vite build` falha só por binário nativo do rolldown/macOS — rodar `npm run build` no Mac.)

## JÁ FEITO nesta rodada
- ✅ **Streaming do texto** — Edge function v8 com SSE (`streamGenerateContent?alt=sse`), extração tolerante do JSON parcial no servidor, e `StudyGenerator.tsx` renderizando progressivamente com cursor. Cliente: `gerarEstudoStream()` em `src/lib/gerar.ts`. Fonte da função versionada em `supabase/functions/gerar/`. Falta só validar no navegador (`npm run dev`).
- ✅ **Dashboard ao vivo** — artifact do Cowork `painel-biblia-expositiva-pv` (HTML em `outputs/painel-ao-vivo.html`) que consulta o Supabase (`execute_sql`) a cada abertura: KPIs (usuários, assinaturas ativas, MRR, receita recebida, estudos, tokens), gráfico 14 dias, distribuição por plano/perfil/status e cadastros recentes. Banco hoje quase vazio (1 usuário).

## ROADMAP até vender com segurança (ordem de prioridade acordada)
**Fazer 1→2→3 antes de qualquer função nova.** Base boa, mas ainda não é vendável.
1. **Assinatura real** — checkout, PIX/cartão, webhooks, renovação, cancelamento, reembolso 7 dias e **bloqueio de quem não tem assinatura ativa**. Obs.: o schema já é **Asaas-first** (colunas `asaas_customer_id/subscription_id/payment_id`, `billing_type`, `pix_*` em `subscriptions`/`payments`). Decisão pendente: Asaas primeiro (recomendado, schema pronto) ou Stripe junto.
2. **Franquia e proteção de custo** — limites por plano (Individual, Ministério, Igreja) com contador de gerações. **CRÍTICO: aplicar no servidor** (edge `gerar` verifica assinatura ativa + incrementa `usage_counters` antes de chamar o Gemini; recusa ao estourar). Cache/kit/PDF não consomem franquia (são client-side, já não contam).
3. **Biblioteca na nuvem** — hoje `study-library.ts` e `study-cache.ts` são `localStorage` (só no aparelho). Sincronizar por conta em `lessons`/`lesson_materials` com RLS; organizar por coleção/ministério/série, pesquisar, editar notas.
4. **Experiência premium** — Dashboard com continuidade real, histórico, recentes, uso do plano, favoritos, atalhos por perfil.
5. **Recursos derivados** — quiz, flashcards, plano de leitura, roteiro de vídeo, resumo, slides; devem **reusar o estudo salvo** p/ não gastar IA.
6. **Pesquisa bíblica de verdade** — base bíblica indexada (busca por tema/pessoa/doutrina/lugar/palavra; "Pergunte ao Texto" já existe como MODO de geração, falta o índice). `bible-data.ts` hoje é só lista de livros + fetch de `bible-api.com`.
7. **Confiança teológica** — fontes verificáveis, referências clicáveis. Selos já existem (visual), mas não há verificação externa.
8. **Design final + responsivo** — testar cada tela em celular/tablet/desktop.

## Limpeza pendente
- **Apagar o secret antigo `ANTHROPIC_API_KEY`** no painel Supabase (Edge Functions → Secrets). Inativo; só limpeza manual (sem MCP p/ isso).
- Página **Mensagens** ainda é placeholder.

## Estrutura atual do frontend (src)
Páginas: `Dashboard`, `Bible`, `Estudos`, `Exegese`, `Interpretacao`, `Library`, `Membership` (preços prontos, checkout só dispara toast placeholder), `StudyProfile`, `Account` (Editar Perfil/Assinatura = toast "em breve"), `auth/*`, `PlaceholderPage`. Componentes: `StudyGenerator`, `LessonKit` (imprime/PDF via `window.print`), `Layout`, `ProtectedRoute` (só checa login, **não** assinatura). Lib: `ai-config`, `gerar`, `study-cache` (localStorage, 30), `study-library` (localStorage), `profile` (localStorage), `bible-data`, `supabase`. `prompts.ts` agora tem 9 MODOS + PERFIS + `SECOES_OBRIGATORIAS` (validação de entrega).

## Banco (tabelas públicas relevantes)
`profiles` (role: professor/pastor/leader/student; subscription_tier: free/premium/church), `churches`, `subscriptions`, `payments`, `lessons`, `lesson_materials`, `usage_counters`, `audit_log`. RLS habilitado em todas.

## Notas de custo
`gemini-3.5-flash` é o Flash de ponta (mais caro que o 2.5 antigo, ainda muito abaixo do Claude). Para economizar, definir secret `GEMINI_MODEL=gemini-3.1-flash-lite` (sem deploy).
