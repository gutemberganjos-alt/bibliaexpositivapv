#!/usr/bin/env node
// ============================================================================
// 5) ESTÁTICO — o banco vira HTML pronto dentro de dist/
// ============================================================================
// Roda DEPOIS do `vite build` (já está encadeado no npm run build).
//
// Emite:
//   dist/estudo/<slug>/index.html      páginas de conteúdo
//   dist/estudo/index.html             índice do tipo (hub de links internos)
//   dist/sitemap.xml                   índice de sitemaps
//   dist/sitemap-*.xml                 fatias de até 5.000 URLs
//   dist/robots.txt                    reescrito com os novos caminhos
//
// Se as variáveis de ambiente não existirem, o script AVISA e sai com sucesso —
// um deploy do app nunca pode quebrar por causa do SEO.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, PREFIXOS, ENV } from './config.mjs';
import { carregarEnv, escapar } from './lib/util.mjs';
import { renderizarPagina, renderizarIndice } from './lib/template.mjs';
import { renderizarEnsaio } from './lib/template-ensaio.mjs';
import { ENSAIOS } from './lib/ensaios.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const DIST = path.join(RAIZ, 'dist');

carregarEnv(path.join(RAIZ, '.env.seo'));
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const POR_INDICE = 200;      // links por página de índice
const POR_SITEMAP = 5000;    // limite do protocolo é 50.000; 5.000 é mais fácil de depurar

if (!fs.existsSync(DIST)) {
  console.log('  [seo] dist/ não existe — rode o vite build antes.');
  process.exit(0);
}

function escrever(relativo, conteudo) {
  const destino = path.join(DIST, relativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, conteudo);
}

// --- ensaios (páginas fixas) ------------------------------------------------
// Escritos ANTES de qualquer coisa e sem tocar no banco: são texto autoral, não
// dependem de credencial nenhuma e precisam existir mesmo num deploy em que a
// geração de conteúdo falhe.
for (const ensaio of ENSAIOS) {
  escrever(path.join(ensaio.slug, 'index.html'), renderizarEnsaio(ensaio));
}
const urlsEnsaios = ENSAIOS.map((e) => ({
  loc: `${SITE}/${e.slug}`, prioridade: '0.9', freq: 'monthly', data: e.atualizado,
}));

// --- carrega tudo que está publicado ----------------------------------------
async function carregarPublicadas() {
  if (!supabaseUrl || !chave) {
    console.log('  [seo] sem SUPABASE_URL/chave — só os ensaios foram gerados.');
    return [];
  }
  const linhas = [];
  let de = 0;
  for (;;) {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/seo_pages?status=eq.publicado&select=slug,tipo,titulo,termo,meta_description,html_previa,palavras_previa,palavras_total,meta,relacionados,publicado_em,modo_id,publico_id&order=publicado_em.asc&limit=1000&offset=${de}`,
      { headers: { apikey: chave, authorization: `Bearer ${chave}` } },
    );
    if (!r.ok) {
      console.log(`  [seo] não consegui ler seo_pages (${r.status}) — só os ensaios foram gerados.`);
      return [];
    }
    const lote = await r.json();
    linhas.push(...lote);
    if (lote.length < 1000) break;
    de += 1000;
  }
  return linhas;
}

const paginas = (await carregarPublicadas()) ?? [];
if (!paginas.length) console.log('  [seo] nenhuma página de conteúdo publicada ainda.');

const mapa = new Map(paginas.map((p) => [`${p.tipo}/${p.slug}`, p]));

// --- páginas ----------------------------------------------------------------
let escritas = 0;
for (const pagina of paginas) {
  const prefixo = PREFIXOS[pagina.tipo];
  if (!prefixo) continue;
  escrever(path.join(prefixo.slice(1), pagina.slug, 'index.html'), renderizarPagina(pagina, mapa));
  escritas++;
}

// --- índices por tipo (hubs) ------------------------------------------------
const porTipo = new Map();
for (const p of paginas) {
  if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, []);
  porTipo.get(p.tipo).push(p);
}

const urlsIndice = [];
for (const [tipo, lista] of porTipo) {
  const prefixo = PREFIXOS[tipo].slice(1);
  const ordenada = [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  const total = Math.max(1, Math.ceil(ordenada.length / POR_INDICE));
  for (let p = 1; p <= total; p++) {
    const fatia = ordenada.slice((p - 1) * POR_INDICE, p * POR_INDICE);
    const destino = p === 1 ? path.join(prefixo, 'index.html') : path.join(prefixo, `pagina-${p}`, 'index.html');
    escrever(destino, renderizarIndice(tipo, fatia, p, total));
    urlsIndice.push(`${SITE}${PREFIXOS[tipo]}/${p > 1 ? `pagina-${p}` : ''}`);
  }
}

// --- sitemaps ---------------------------------------------------------------
const hoje = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${SITE}/`, prioridade: '1.0', freq: 'weekly', data: hoje },
  { loc: `${SITE}/termos`, prioridade: '0.3', freq: 'yearly', data: hoje },
  { loc: `${SITE}/privacidade`, prioridade: '0.3', freq: 'yearly', data: hoje },
  ...urlsEnsaios,
  ...urlsIndice.map((loc) => ({ loc, prioridade: '0.8', freq: 'weekly', data: hoje })),
  ...paginas.map((p) => ({
    loc: `${SITE}${PREFIXOS[p.tipo]}/${p.slug}`,
    prioridade: '0.7',
    freq: 'monthly',
    data: (p.publicado_em ?? hoje).slice(0, 10),
  })),
];

const fatias = [];
for (let i = 0; i < urls.length; i += POR_SITEMAP) fatias.push(urls.slice(i, i + POR_SITEMAP));

fatias.forEach((fatia, i) => {
  const corpo = fatia.map((u) => `  <url>
    <loc>${escapar(u.loc)}</loc>
    <lastmod>${u.data}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prioridade}</priority>
  </url>`).join('\n');
  escrever(`sitemap-${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${corpo}
</urlset>
`);
});

escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${fatias.map((_, i) => `  <sitemap>
    <loc>${SITE}/sitemap-${i + 1}.xml</loc>
    <lastmod>${hoje}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`);

// --- robots -----------------------------------------------------------------
// Reescrito aqui porque as rotas públicas mudam a cada rodada. As rotas do app
// continuam bloqueadas: são autenticadas e não têm nada para indexar.
escrever('robots.txt', `User-agent: *
Allow: /
Allow: /estudo/
Allow: /tema/
Allow: /sermao/
Allow: /termos
Allow: /privacidade
${ENSAIOS.map((e) => `Allow: /${e.slug}`).join('\n')}

Disallow: /inicio
Disallow: /biblia
Disallow: /biblioteca
Disallow: /assinatura
Disallow: /perfil
Disallow: /estudos
Disallow: /exegese
Disallow: /interpretacao
Disallow: /minha-conta
Disallow: /login
Disallow: /cadastro
Disallow: /recuperar-senha

Sitemap: ${SITE}/sitemap.xml
`);

console.log(`  [seo] ${escritas} páginas · ${ENSAIOS.length} ensaio(s) · ${urlsIndice.length} índices · ${fatias.length} sitemap(s) · ${urls.length} URLs`);
