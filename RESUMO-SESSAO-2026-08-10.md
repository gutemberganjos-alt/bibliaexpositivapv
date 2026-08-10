# Bíblia Expositiva PV — resumo da sessão de 10/08/2026

Documento para abrir um chat novo já com contexto. Tudo abaixo foi verificado
nesta sessão, não é suposição.

---

## 1. O diagnóstico que mudou tudo

A conversa começou como "avaliar criativos de anúncio" e terminou em outro lugar.

**A campanha estava otimizada para o evento errado.** Objetivo de Vendas, mas
evento de conversão = **"Concluir inscrição"** (cadastro grátis). O algoritmo do
Meta fez exatamente o que foi pedido: foi caçar gente que se cadastra em coisa
grátis, e achou 9 delas a R$ 3,82 cada. Zero venda não era falha — era o
resultado esperado dessa configuração.

**O funil real medido:**

| Etapa | Número |
|---|---|
| Cliques no link | ~19 |
| Visualizações da página | 12 |
| Cadastros | 9 |
| **Cliques em plano (InitiateCheckout)** | **0** |
| Vendas | 0 |

Nove pessoas se cadastraram e **nenhuma clicou num plano**. O evento
"Iniciar finalização da compra" aparecia como *inativo* no pixel.

**Causa:** o paywall estava ativo, mas batia na pessoa **antes** dela gerar
qualquer coisa. Estava sendo pedido R$ 29,90 por algo que ela nunca viu
funcionar.

**Erro meu que vale registrar:** critiquei o "Anúncio D — Demonstração do App"
por critério de design (print de landing page, botão falso, texto pequeno) sem
olhar o desempenho. Era justamente o anúncio que estava entregando os 9
registros com CTR de 3,54% — acima da média. O criativo nunca foi o gargalo.

---

## 2. O que foi implementado e está NO AR

### Teste grátis de 3 gerações

- **Banco (Supabase, projeto `nrizmanwdipuowpkmqqm`):** `consume_quota` libera
  3 gerações **vitalícias** para quem não assinou, guardadas em
  `usage_counters` com `period='trial'` (não renovam por mês). `refund_quota`
  devolve no balde certo. Nova RPC `quota_status()` para o app ler o saldo sem
  consumir.
- **Edge function `gerar` (versão 47):** aceita o teste e devolve o código
  `trial_exhausted` quando acaba. A contagem é no servidor — não dá para burlar
  pelo navegador.
- **Frontend (commit `7e9b691`, deploy Vercel READY):**
  - contador visível antes do limite ("Restam 2 de 3 gerações gratuitas")
  - na 4ª tentativa abre `TrialPaywall.tsx` com o **plano anual em destaque**
    (R$ 295,90, economia de R$ 62,90) e o mensal abaixo
  - os dois botões disparam `InitiateCheckout`

**Testado no banco:** 3 liberadas, 4ª bloqueia, refund correto, assinante ativo
segue no limite mensal de 30 intacto.

**Arquivos novos:** `src/components/TrialPaywall.tsx`, `src/lib/quota.ts`.
**Alterados:** `RequireSubscription.tsx`, `StudyGenerator.tsx`,
`SubscriptionContext.tsx`, `lib/gerar.ts`, `pages/Membership.tsx`.

### Logo nova

Todos os ícones regerados a partir de `logo-icone.png/logo BEPV.PNG`, tirando os
cantos pretos que apareciam como moldura: `icon-512`, `icon-192`,
`apple-touch-icon`, `favicon-32`, `favicon.svg` (raster embutido) e `og-image`
(1200x630, emblema recortado sobre navy). Service worker subiu para `v6` —
sem isso o cache continuaria servindo o ícone velho.

> ⚠️ **PENDENTE:** falta `git add public && git commit && git push`.

---

## 3. Conta de anúncios (act 1025857570346525)

**Estrutura atual — limpa:**
- 1 campanha: "Bíblia Expositiva PV — Vendas — Individual" (Ativo)
- Orçamento: R$ 20,00/dia (CBO)
- 1 conjunto ativo: "Conjunto — Individual — Brasil"
- 1 anúncio ativo: "Anúncio D — Demonstração do App"
- Público estimado: 163,3 a 192,1 milhões (**largo demais** para o nicho)
- Advantage+ vendas: Ativado

**Ações executadas:**
- **Teste A/B de posicionamento cancelado.** Rachava o orçamento em dois
  conjuntos e travava a edição do conjunto.
- **8 rascunhos descartados.** Eu havia duplicado o conjunto para trocar o
  evento de conversão; ficou um botão "Conferir e publicar (8)" armado que
  publicaria um conjunto duplicado. Descartado.

**Limitação descoberta:** o Meta **não deixa trocar o evento de conversão** de um
conjunto já publicado. Só criando conjunto novo.

**Por que NÃO troquei o evento:** "Iniciar finalização da compra" estava
*inativo* no pixel. Otimizar por um evento que nunca disparou derruba a entrega
a zero. Precisa de dado primeiro.

---

## 4. Criativos

**Rodando:** Anúncio D (o print da landing page). Mantido — está entregando.

**Corrigidos e salvos em `anuncios-meta/corrigidos/`** (não subiram ainda):
- `ad-01-menos-organizacao.png` — celular completo, 9 cards, encostando na borda
- `ad-03-venca-bloqueio-1x1.png` — mockup completo
- `ad-04-pregar-autoridade.png` — removida a linha dourada que cortava
  "autoridade"
- `ad-05-estrutura-completa.png` — respiro entre título e subtítulo
- `ad-06-clareza-ministerio.png` — corpo dourado trocado por creme (contraste)
- `ad-video-exegese-1080.mp4` — 1080x1920, 12,4s, loop sem trecho morto

**Vídeos originais:** `bibliaexpositivapv004.mp4` é o bom (mostra o app, tem
movimento). `bibliaexpositivapv003video.mp4` é estático disfarçado — texto
parado 8s com brilho no fundo. Não subir.

**Nenhum dos vídeos tem faixa de áudio.** A recomendação do Meta (custo por
resultado 8% menor) pede 9:16 **com áudio** — isso exige trilha ou narração de
verdade, não dá para resolver por edição.

---

## 5. Próximos passos, em ordem

1. **Push da logo** (o commit que ficou pendente).
2. **Testar o teste grátis** com conta sem assinatura: contador → 3 gerações →
   tela de bloqueio na 4ª.
3. **Verificação da conta de anúncios** — havia aviso "necessária a partir de
   2026-08-10"; o banner sumiu, confirmar se foi concluída.
4. **Em 24–48h: conferir se "Iniciar finalização da compra" saiu de inativo** no
   Gerenciador de Eventos. É o termômetro. Se continuar zerado mesmo com gente
   usando o teste, o problema mudou de lugar.
5. **Só quando ele estiver disparando com regularidade:** duplicar o conjunto e
   publicar otimizando por esse evento.
6. **Estreitar o público.** 163 milhões é largo demais — o comprador (pastor,
   professor de EBD) é algo entre 1 e 3 milhões no Brasil.
7. Testar o vídeo e as artes corrigidas como **acréscimo**, não substituição.

---

## 6. Números de referência

- Preços: Individual R$ 29,90/mês ou R$ 295,90/ano · Igreja R$ 99,90/mês ou
  R$ 1.019,90/ano
- CPC do link: R$ 0,46 · CTR do link: 3,54% (bom)
- Custo por resultado atual: R$ 3,82 (por cadastro)
- **Ponto de decisão: 200 cliques (~R$ 92).** Abaixo disso, zero venda é ruído
  estatístico, não sinal.
