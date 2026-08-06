#!/usr/bin/env node
// ============================================================================
// 4) PUBLICAR — o freio de mão
// ============================================================================
// Rascunho não vira página. Só o que você publicar entra no sitemap e no site.
//
// Existe por dois motivos:
//  1. Qualidade. Você lê algumas antes de soltar. Página ruim indexada é dívida.
//  2. Ritmo. 2.000 páginas publicadas no mesmo dia é o padrão clássico de spam
//     que o Google reconhece. 40 por dia parece um site que cresce.
//
//   node seo/4-publicar.mjs --ver 3        → lê 3 rascunhos no terminal
//   node seo/4-publicar.mjs --status       → quanto tem de cada coisa
//   node seo/4-publicar.mjs --lote 40      → publica as 40 mais antigas
//   node seo/4-publicar.mjs --slug joao-3  → publica uma específica
// ============================================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV, exigirEnv, PUBLICAR_POR_DIA } from './config.mjs';
import { carregarEnv, textoPuro } from './lib/util.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
carregarEnv(path.join(AQUI, '..', '.env.seo'));
Object.assign(ENV, {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
exigirEnv(['supabaseUrl', 'serviceKey']);

const H = { 'content-type': 'application/json', apikey: ENV.serviceKey, authorization: `Bearer ${ENV.serviceKey}` };
const arg = (nome) => {
  const i = process.argv.indexOf(nome);
  return i === -1 ? null : (process.argv[i + 1] ?? true);
};

// --- status -----------------------------------------------------------------
async function status() {
  const r = await fetch(`${ENV.supabaseUrl}/rest/v1/seo_pages?select=status,palavras_previa`, { headers: H });
  const linhas = await r.json();
  const conta = linhas.reduce((a, l) => ({ ...a, [l.status]: (a[l.status] ?? 0) + 1 }), {});
  const media = linhas.length ? Math.round(linhas.reduce((a, l) => a + (l.palavras_previa ?? 0), 0) / linhas.length) : 0;
  const finas = linhas.filter((l) => (l.palavras_previa ?? 0) < 400).length;

  console.log('\n  seo_pages');
  console.log(`    rascunho    ${conta.rascunho ?? 0}`);
  console.log(`    publicado   ${conta.publicado ?? 0}`);
  console.log(`    arquivado   ${conta.arquivado ?? 0}`);
  console.log(`\n    média de palavras na prévia: ${media}`);
  if (finas) console.log(`     ${finas} páginas com prévia abaixo de 400 palavras — risco de conteúdo raso`);
  console.log('');
}

// --- ler rascunhos ----------------------------------------------------------
async function ver(quantas) {
  const r = await fetch(
    `${ENV.supabaseUrl}/rest/v1/seo_pages?status=eq.rascunho&select=slug,tipo,titulo,meta_description,html_previa,palavras_previa,palavras_total,meta&order=criado_em.asc&limit=${quantas}`,
    { headers: H },
  );
  const linhas = await r.json();
  if (!linhas.length) return console.log('  Nenhum rascunho.');

  for (const l of linhas) {
    console.log(`\n${'─'.repeat(78)}`);
    console.log(`  /${l.tipo}/${l.slug}`);
    console.log(`  ${l.titulo}`);
    console.log(`  meta: ${l.meta_description}`);
    console.log(`  ${l.palavras_previa} palavras abertas de ${l.palavras_total}`);
    if (l.meta?.secoes_bloqueadas?.length) console.log(`  bloqueado: ${l.meta.secoes_bloqueadas.join(' · ')}`);
    console.log(`${'─'.repeat(78)}`);
    console.log(textoPuro(l.html_previa).slice(0, 1400) + '…\n');
  }
  console.log('  Isto é o que o Google e o visitante vão ver. Está bom o suficiente?');
}

// --- publicar ---------------------------------------------------------------
async function publicarLote(n) {
  const r = await fetch(`${ENV.supabaseUrl}/rest/v1/rpc/publicar_lote`, {
    method: 'POST', headers: H, body: JSON.stringify({ p_quantidade: n }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const linhas = await r.json();
  console.log(`  ${linhas.length} páginas publicadas:`);
  linhas.slice(0, 10).forEach((l) => console.log(`    /${l.tipo}/${l.slug}`));
  if (linhas.length > 10) console.log(`    … e mais ${linhas.length - 10}`);
  console.log('\n  Agora rode o build: npm run build  (o HTML estático sai junto)');
}

async function publicarSlug(slug) {
  const r = await fetch(`${ENV.supabaseUrl}/rest/v1/seo_pages?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { ...H, prefer: 'return=representation' },
    body: JSON.stringify({ status: 'publicado', publicado_em: new Date().toISOString() }),
  });
  const linhas = await r.json();
  console.log(linhas.length ? `  Publicada: /${linhas[0].tipo}/${linhas[0].slug}` : `  Slug não encontrado: ${slug}`);
}

// --- despacho ---------------------------------------------------------------
if (arg('--ver')) await ver(Number(arg('--ver')) || 3);
else if (arg('--slug')) await publicarSlug(String(arg('--slug')));
else if (arg('--lote')) await publicarLote(Number(arg('--lote')) || PUBLICAR_POR_DIA);
else await status();
