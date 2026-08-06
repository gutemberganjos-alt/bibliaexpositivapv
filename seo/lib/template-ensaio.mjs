// Renderizador das páginas fixas (ensaios).
//
// Reaproveita o CSS das páginas de estudo e acrescenta só o que é próprio de um
// texto longo: hierarquia de h2/h3, caixa de teste e a lista de perguntas.
//
// O schema FAQPage é o motivo principal desta página existir tecnicamente: ele
// faz o Google exibir as perguntas e respostas direto no resultado de busca,
// ocupando muito mais espaço na tela que um link comum.

import { SITE, NOME_SITE } from '../config.mjs';
import { escapar } from './util.mjs';
import { CSS } from './template.mjs';

const CSS_ENSAIO = `
.ensaio{max-width:720px}
.ensaio .abertura{font-size:1.16rem;line-height:1.68;color:var(--navy);
  padding-bottom:1.4rem;border-bottom:1px solid var(--borda);margin-bottom:2rem}
.ensaio h2{font-family:'Playfair Display',Georgia,serif;font-size:1.55rem;color:var(--navy);
  margin:2.8rem 0 .9rem;font-weight:600;line-height:1.25}
.ensaio h3{font-family:Manrope,system-ui,sans-serif;font-size:.95rem;color:var(--ouro);
  margin:2rem 0 .8rem;font-weight:700;letter-spacing:.02em}
.ensaio p{margin:0 0 1.15rem}
.ensaio ul{margin:0 0 1.4rem;padding:0;list-style:none}
.ensaio ul li{position:relative;padding:0 0 0 1.6rem;margin-bottom:.85rem;line-height:1.68}
.ensaio ul li::before{content:"";position:absolute;left:.35rem;top:.72em;
  width:5px;height:5px;border-radius:50%;background:var(--ouro)}
.ensaio strong{color:var(--navy)}
.teste{margin:1.8rem 0!important;padding:1.4rem 1.5rem;background:var(--card);
  border:1px solid var(--borda);border-left:3px solid var(--ouro);border-radius:0 10px 10px 0}
.teste p{margin:0 0 .7rem!important;font-size:1.06rem;line-height:1.5;color:var(--navy)}
.teste p:last-child{margin-bottom:0!important}
.teste strong{color:var(--ouro)}
.versiculo-ensaio{margin:2.2rem 0!important;padding:1.5rem 0;background:none;border:none;
  border-top:1px solid var(--borda);border-bottom:1px solid var(--borda);
  font-family:'Playfair Display',Georgia,serif;font-style:italic;
  font-size:1.28rem;color:var(--navy);text-align:center;line-height:1.45}
.versiculo-ensaio cite{display:block;margin-top:.6rem;font-style:normal;
  font-family:Manrope,system-ui,sans-serif;font-size:.76rem;
  letter-spacing:.08em;text-transform:uppercase;color:var(--ouro)}
.perguntas{margin-top:3.5rem;padding-top:2rem;border-top:1px solid var(--borda)}
.perguntas h2{margin-top:0}
.perguntas details{border-bottom:1px solid var(--borda);padding:.2rem 0}
.perguntas summary{cursor:pointer;list-style:none;padding:.95rem 1.8rem .95rem 0;
  font-family:Manrope,system-ui,sans-serif;font-weight:600;font-size:1rem;
  color:var(--navy);position:relative}
.perguntas summary::-webkit-details-marker{display:none}
.perguntas summary::after{content:"+";position:absolute;right:.2rem;top:.85rem;
  font-size:1.3rem;color:var(--ouro);font-weight:400;line-height:1}
.perguntas details[open] summary::after{content:"–"}
.perguntas details p{margin:0 0 1.1rem;font-size:.99rem;color:var(--texto)}
.cta-ensaio{margin-top:3rem;padding:1.8rem;background:var(--navy);border-radius:14px;color:#C7D2E2}
.cta-ensaio h2{font-family:Manrope,system-ui,sans-serif!important;font-size:.78rem!important;
  text-transform:uppercase;letter-spacing:.1em;color:#8FA0B8!important;
  margin:0 0 .9rem!important;font-weight:700}
.cta-ensaio p{font-size:1rem;line-height:1.72;margin-bottom:1.4rem}
.cta-ensaio strong{color:#fff}
.data-ensaio{font-family:Manrope,system-ui,sans-serif;font-size:.78rem;color:var(--medio);
  margin-bottom:1.8rem}
@media(max-width:640px){
  .ensaio h2{font-size:1.3rem}
  .ensaio .abertura{font-size:1.08rem}
  .versiculo-ensaio{font-size:1.1rem}
}
`.trim();

export function renderizarEnsaio(ensaio) {
  const url = `${SITE}/${ensaio.slug}`;
  const titulo = `${ensaio.tituloSeo} — ${NOME_SITE}`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: ensaio.tituloSeo,
        description: ensaio.descricao,
        inLanguage: 'pt-BR',
        datePublished: ensaio.atualizado,
        dateModified: ensaio.atualizado,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: NOME_SITE, url: `${SITE}/` },
        publisher: {
          '@type': 'Organization', name: NOME_SITE, url: `${SITE}/`,
          logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
        },
        isAccessibleForFree: true,
      },
      {
        '@type': 'FAQPage',
        mainEntity: (ensaio.faq ?? []).map((f) => ({
          '@type': 'Question',
          name: f.p,
          acceptedAnswer: { '@type': 'Answer', text: f.r },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: ensaio.tituloSeo, item: url },
        ],
      },
    ],
  };

  const perguntas = (ensaio.faq ?? []).length
    ? `
  <section class="perguntas">
    <h2>Perguntas frequentes</h2>
    ${ensaio.faq.map((f, i) => `
    <details${i === 0 ? ' open' : ''}>
      <summary>${escapar(f.p)}</summary>
      <p>${escapar(f.r)}</p>
    </details>`).join('')}
  </section>`
    : '';

  const cta = ensaio.cta
    ? `
  <section class="cta-ensaio">
    <h2>${escapar(ensaio.cta.titulo)}</h2>
    <p>${ensaio.cta.texto}</p>
    <a class="botao" href="${ensaio.cta.href}">${escapar(ensaio.cta.botao)}</a>
  </section>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(ensaio.descricao)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="theme-color" content="#0E2038">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${NOME_SITE}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${escapar(ensaio.tituloSeo)}">
<meta property="og:description" content="${escapar(ensaio.descricao)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapar(ensaio.tituloSeo)}">
<meta name="twitter:description" content="${escapar(ensaio.descricao)}">
<meta name="twitter:image" content="${SITE}/icons/og-image.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;600;700&family=Literata:opsz,wght@7..72,400;7..72,600&display=swap" rel="stylesheet">
<style>${CSS}
${CSS_ENSAIO}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>

<header class="topo">
  <div class="interno">
    <a class="marca" href="/">${NOME_SITE}</a>
    <a class="botao" href="/cadastro">Gerar meu estudo</a>
  </div>
</header>

<main class="ensaio">
  <nav class="trilha" aria-label="Você está em">
    <a href="/">Início</a> › ${escapar(ensaio.tituloSeo)}
  </nav>

  <h1>${escapar(ensaio.h1)}</h1>
  <p class="data-ensaio">Atualizado em ${new Date(`${ensaio.atualizado}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

  <article>
${ensaio.corpo}
  </article>

${perguntas}
${cta}
</main>

<footer>
  <div class="interno">
    <p><strong style="color:#fff">${NOME_SITE}</strong> — estudos, sermões e exegeses com selos de confiabilidade.</p>
    <p><a href="/">Início</a> · <a href="/estudo/">Estudos por capítulo</a> · <a href="/tema/">Estudos por tema</a> · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></p>
  </div>
</footer>

</body>
</html>`;
}
