# Auditoria pré-lançamento — Bíblia Expositiva PV

Varredura procurando a classe de erro que quebra para o usuário real mas passa despercebida
em verificações feitas "por dentro" (como admin, ou só olhando HTML).

## Bugs encontrados e CORRIGIDOS

### 1. Cliente pagava e o site dizia que ele não tinha assinatura (crítico)
`Membership.tsx` — o `navigate()` que limpava a URL de retorno alterava a dependência do
`useEffect`, e a limpeza do efeito **cancelava imediatamente** as verificações de 3s e 8s.
Sobrava uma única checagem, executada antes do webhook da Stripe chegar.

Efeito real: o cliente paga, volta ao site e lê "você não tem assinatura ativa".

**Correção:** o estado agora é derivado da URL (não é mais `setState` em efeito) e há uma
confirmação que consulta repetidamente por ~40s, com aviso visível
("Pagamento recebido. Confirmando sua assinatura…"). O acesso libera sozinho.

### 2. Tela branca em visitantes recorrentes (crítico)
`public/sw.js` — o service worker usava *cache-first para tudo*, com nome de cache fixo
(`v1`) e sem limpeza de versões antigas. O `index.html` velho ficava preso no cache
apontando para bundles JS que não existiam mais após o deploy → tela branca.

**Correção:** HTML/navegação agora é *network-first* (sempre pega a versão nova, cache só
como reserva offline); assets versionados seguem em cache; e o `activate` apaga caches
antigos e assume o controle na hora.

### 3. Rotas diretas retornavam 404 (crítico)
Faltava `vercel.json`. Qualquer link direto ou refresh (`/login`, `/assinatura`) dava 404.
**Isso atingia o retorno do pagamento** (`/assinatura?status=sucesso`) — o cliente pagaria
e cairia numa página de erro.

**Correção:** `vercel.json` com rewrite para `index.html`. Verificado: `/login` carrega e
os arquivos estáticos (`manifest.json`, ícones) continuam sendo servidos corretamente.

### 4. Landing podia ficar em branco se o Supabase estivesse lento
`App.tsx` — as rotas pública e de login retornavam `null` enquanto a autenticação carregava.
Se o Supabase demorasse ou caísse, o **visitante via tela branca na página de vendas**.

**Correção:** a landing e o login agora renderizam sempre; só há redirecionamento quando há
certeza de usuário logado. A página pública não depende mais do Supabase para aparecer.

### 5. Assinante perdia geração quando a IA falhava
A franquia era debitada antes de chamar o Gemini (correto, evita corrida), mas **não era
devolvida** se a geração falhasse. O assinante perdia 1 das 30 sem receber nada.

**Correção:** função `refund_quota` no banco + devolução automática em todos os pontos de
falha (erro do Gemini, resposta vazia, formato inválido, validação reprovada, erro no
streaming). Testado: devolve corretamente e nunca fica negativo.

### 6. Rede de segurança contra tela branca
Não havia `ErrorBoundary`: qualquer erro de JavaScript derrubava o app inteiro para branco,
sem mensagem e sem saída.

**Correção:** `ErrorBoundary` global com mensagem clara, botão de recarregar (que limpa
caches antes, caso a falha venha de bundle velho) e link para o início.

### 7. Erros menores
- `ToastContext`: `removeToast` era usado antes de ser declarado.
- `Bible.tsx` e `ForgotPassword.tsx`: variáveis de erro não usadas e `any` desnecessário.
- Lint saiu de 13 para 5 problemas — os 5 restantes são convenções de desenvolvimento
  (Fast Refresh) e um padrão comum de busca de dados, sem impacto em produção.

## Verificado e APROVADO

**Segurança (testada como usuário autenticado real, não como admin):**
- Usuário não consegue se auto-promover: tentativa de virar `church`/`pastor` foi revertida.
- Não consegue criar assinatura do nada (bloqueado).
- Não consegue zerar a própria franquia (bloqueado).
- Não há vazamento entre contas: cada um enxerga apenas o próprio perfil.
- Edição legítima de perfil (nome) continua funcionando.
- Sem recursão nas políticas RLS.

**Outros:**
- O streaming envia corretamente o token do usuário (paywall e franquia valem também nele).
- A franquia é consumida **antes** de chamar a IA — nunca se gasta IA além do plano.
- Tratamento de erro na geração está completo (rede, IA sobrecarregada, resposta truncada).
- O app não faz nenhuma escrita direta no banco pelo cliente.

## Pendências conhecidas (não são bugs, são decisões)

1. **Nunca houve um pagamento real.** Modo Live está configurado, mas não testado com dinheiro.
2. **Termos de Uso e Política de Privacidade não existem** (LGPD).
3. **Nota fiscal / CNPJ** — obrigação fiscal a definir com um contador.
4. **Biblioteca não sincroniza entre aparelhos** (`localStorage`): o assinante perde os
   estudos salvos ao trocar de celular ou limpar o navegador.
5. **Sem canal de suporte visível** no site.
6. **Sessão expirada** mostra mensagem técnica em vez de convidar a entrar de novo.

## Como testar depois do deploy

- Abrir a home e um **link direto** (ex.: `/login`) — nenhum deve dar 404.
- **Recarregar** dentro de uma página interna (ex.: `/assinatura`).
- Abrir em **aba anônima** e em **aba normal** (visitante novo vs recorrente).
- Testar no **celular**.
- Fazer uma **compra real** e confirmar que aparece "Confirmando sua assinatura…" e que o
  acesso libera sozinho, sem precisar recarregar.
