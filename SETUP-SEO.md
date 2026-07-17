# SEO — Bíblia Expositiva PV

## O que foi feito nesta rodada

**1. Rota "/" agora é pública e indexável.**
Antes, todo o app (inclusive a home) exigia login — o Google só via a tela de login. Agora:
- `/` → **Landing page** pública (visitante não logado vê o site institucional).
- Usuário logado que acessa `/` é redirecionado automaticamente para `/inicio` (o antigo Dashboard, que mudou de endereço).
- Todas as demais rotas do app (`/biblia`, `/estudos`, `/biblioteca`, `/assinatura`, `/perfil`, `/minha-conta`, `/exegese`, `/interpretacao`) continuam nos mesmos endereços de antes — nenhum link interno quebrou.

**2. Landing page (`src/pages/Landing.tsx`).**
Hero, "como funciona" (3 passos), formatos de estudo, públicos, selos de confiabilidade (o diferencial do produto), planos com preços reais (Individual R$29,90 / Igreja R$99,90), CTA de cadastro. Todo o conteúdo reaproveita os dados reais do app (`ai-config.ts`, `subscription.ts`) — não é texto solto, então se você mudar um preço ou modo lá, a landing acompanha.

**3. SEO técnico (`index.html`, `public/robots.txt`, `public/sitemap.xml`).**
- `<title>` e `<meta description>` reais (antes: só "Bíblia Expositiva PV", sem descrição).
- Open Graph e Twitter Card (como o link aparece quando compartilhado no WhatsApp/redes).
- `canonical` apontando para `https://bibliaexpositiva.com.br/`.
- Dados estruturados (JSON-LD `SoftwareApplication`) com os planos e preços — ajuda o Google a entender o que é o produto.
- `robots.txt` liberando `/` e bloqueando as rotas autenticadas (que não têm conteúdo pra indexar mesmo, pois exigem login).
- `sitemap.xml` com a página pública.

## O que falta você fazer (fora do meu alcance)

1. **Registrar e apontar o domínio `bibliaexpositiva.com.br`.** Todo o SEO técnico (canonical, OG, sitemap) já está escrito assumindo esse domínio. Se registrar outro, me avise para eu trocar.
2. **Gerar os ícones reais do app.** O `manifest.json` e a tag OG referenciam `/icons/icon-192.png` e `/icons/icon-512.png`, mas esses arquivos **não existem** na pasta `public/icons` (isso já era assim antes, eu só percebi agora ao mexer no OG). Sem eles: ícone de instalação do PWA quebrado e preview de link nas redes sem imagem. Preciso de uma logo/ícone quadrado (ideal 512×512px) para gerar os dois tamanhos.
3. **Google Search Console.** Depois do domínio no ar: cadastrar a propriedade, enviar o `sitemap.xml`, pedir indexação da home.
4. **Testar o preview de compartilhamento** (Facebook Sharing Debugger / cartão do Twitter) depois do domínio publicado, pra conferir se o OG está puxando certo.

## Próximo passo natural (não feito ainda): conteúdo programático

O maior alavancador de tráfego orgânico a médio prazo é ter páginas públicas indexáveis para buscas de cauda longa — "estudo bíblico de João 3:16", "sermão sobre fé", etc. Isso exigiria:
- Um conjunto de páginas públicas geradas a partir de estudos (prévia gratuita, com CTA de assinatura para o material completo).
- Pré-renderização (SSG) dessas páginas, já que hoje o app é 100% client-side rendered (Vite/React puro) — o Google indexa JS, mas pior e mais devagar que HTML pronto.

Não construí isso agora porque é um projeto à parte (arquitetura de conteúdo + geração + pré-renderização), mas é o item natural depois que o domínio estiver no ar e a landing validada. Posso detalhar esse plano quando quiser.
