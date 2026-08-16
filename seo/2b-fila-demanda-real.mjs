#!/usr/bin/env node
// ============================================================================
// 2b) FILA — funde a demanda REAL (dentro do próprio app) na fila
// ============================================================================
// O passo 1-minerar.mjs adivinha demanda a partir do autocomplete do Google e
// do YouTube. Este passo usa um sinal mais forte: toda vez que um assinante
// gera um estudo dentro do app, o termo é registrado (anônimo, sem custo) na
// tabela `demanda_seo` (ver supabase/functions/gerar/index.ts,
// registrarDemandaSeo). Se pessoas de verdade estão pedindo aquilo dentro da
// plataforma, é o candidato mais forte para virar uma página pública que o
// Google indexa — exatamente o objetivo: cada tema buscado abre um caminho
// para alguém encontrar a Bíblia Expositiva no Google.
//
// Este script:
//   1. Lê a fila atual (seo/data/fila.json), se existir.
//   2. Busca em `demanda_seo` os termos mais repetidos.
//   3. Descarta o que já virou página (seo_pages, qualquer status).
//   4. Insere o restante NO TOPO da fila, com prioridade acima da camada 1
//      (demanda minerada) — é demanda confirmada, não estimada.
//   5. Reordena e regrava seo/data/fila.json no mesmo formato.
//
// Rode depois de `node seo/2-fila.mjs` (ou sozinho: sem fila.json, ele cria
// uma só com a demanda real). Não chama IA nem gasta nada — é só leitura de
// banco + escrita de JSON local.
//
//   node seo/2b-fila-demanda-real.mjs                → funde tudo (contagem >= 1)
//   node seo/2b-fila-demanda-real.mjs --minimo 2      → só termos buscados 2+ vezes
//   node seo/2b-fila-demanda-real.mjs --limite 100    → só os 100 mais buscados
//
// Depois:  node seo/3-gerar.mjs --limite 20
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV, exigirEnv } from './config.mjs';
import { slugificar, carregarEnv } from './lib/util.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_FILA = path.join(AQUI, 'data', 'fila.json');

carregarEnv(path.join(AQUI, '..', '.env.seo'));
Object.assign(ENV, {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
exigirEnv(['supabaseUrl', 'serviceKey']);

const H = { 'content-type': 'application/json', apikey: ENV.serviceKey, authorization: `Bearer ${ENV.serviceKey}` };

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  const v = i === -1 ? null : Number(process.argv[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : padrao;
};
const minimo = arg('--minimo', 1);
const limite = arg('--limite', Infinity);

// --- 1. fila atual ------------------------------------------------------------
let fila = { geradoEm: new Date().toISOString(), total: 0, itens: [] };
if (fs.existsSync(ARQUIVO_FILA)) {
  fila = JSON.parse(fs.readFileSync(ARQUIVO_FILA, 'utf8'));
} else {
  console.warn('  Aviso: seo/data/fila.json ainda não existe — criando uma só com demanda real.');
  console.warn('  O ideal é rodar `node seo/2-fila.mjs` primeiro.\n');
}

// --- 2. demanda real registrada -----------------------------------------------
async function buscarDemanda() {
  const linhas = [];
  let de = 0;
  for (;;) {
    const r = await fetch(
      `${ENV.supabaseUrl}/rest/v1/demanda_seo?select=termo,modo_id,publico_id,contagem&contagem=gte.${minimo}&order=contagem.desc&limit=1000&offset=${de}`,
      { headers: H },
    );
    if (!r.ok) throw new Error(`Falha ao ler demanda_seo: ${r.status} ${await r.text()}`);
    const pagina = await r.json();
    linhas.push(...pagina);
    if (pagina.length < 1000) break;
    de += 1000;
  }
  return linhas;
}

// --- 3. o que já virou página (qualquer status) -------------------------------
async function termosJaPublicados() {
  const termos = new Set();
  let de = 0;
  for (;;) {
    const r = await fetch(`${ENV.supabaseUrl}/rest/v1/seo_pages?select=termo&limit=1000&offset=${de}`, { headers: H });
    if (!r.ok) throw new Error(`Falha ao ler seo_pages: ${r.status} ${await r.text()}`);
    const pagina = await r.json();
    pagina.forEach((l) => { if (l.termo) termos.add(normalizar(l.termo)); });
    if (pagina.length < 1000) break;
    de += 1000;
  }
  return termos;
}

function normalizar(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// modo_id -> tipo de página (mesmo critério do passo 2-fila.mjs).
function tipoDoModo(modoId) {
  return modoId === 'sermao' ? 'sermao' : 'tema';
}

const [demanda, publicados] = await Promise.all([buscarDemanda(), termosJaPublicados()]);

const jaNaFila = new Set(fila.itens.map((i) => `${i.tipo}/${i.slug}`));
const novos = [];
let puladosPublicados = 0;
let puladosNaFila = 0;

for (const d of demanda) {
  const termo = String(d.termo ?? '').trim();
  if (!termo) continue;
  if (publicados.has(normalizar(termo))) { puladosPublicados++; continue; }

  const modo_id = d.modo_id || 'estudo';
  const tipo = tipoDoModo(modo_id);
  const slug = slugificar(termo);
  const chave = `${tipo}/${slug}`;
  if (jaNaFila.has(chave)) { puladosNaFila++; continue; }
  jaNaFila.add(chave);

  novos.push({
    camada: 0, // acima da camada 1: é demanda confirmada, não estimada
    intencao: modo_id === 'sermao' || modo_id === 'curso' || modo_id === 'pequeno_grupo' || modo_id === 'discipulado' ? 'artefato' : 'resposta',
    // contagem alta empurra mais para cima dentro da própria camada 0
    prioridade: 110 + Math.min(Number(d.contagem) || 1, 50),
    tipo,
    slug,
    termo,
    referencia: termo,
    modo_id,
    publico_id: d.publico_id || 'igreja',
    grupo: 'demanda-real',
    ordem: 0,
    relacionados: [],
  });
}

novos.sort((a, b) => b.prioridade - a.prioridade);
const cortados = novos.slice(0, limite);

const itensFinais = [...cortados, ...fila.itens];
itensFinais.sort((a, b) => (b.prioridade ?? 0) - (a.prioridade ?? 0) || (a.camada ?? 9) - (b.camada ?? 9) || (a.ordem ?? 0) - (b.ordem ?? 0));

fs.mkdirSync(path.dirname(ARQUIVO_FILA), { recursive: true });
fs.writeFileSync(
  ARQUIVO_FILA,
  JSON.stringify({ geradoEm: new Date().toISOString(), total: itensFinais.length, itens: itensFinais }, null, 2),
);

console.log(`\n  ${demanda.length} termos com demanda real registrada (contagem >= ${minimo})`);
console.log(`  ${puladosPublicados} já tinham virado página · ${puladosNaFila} já estavam na fila`);
if (novos.length > cortados.length) console.log(`  ${novos.length - cortados.length} deixados de fora por --limite`);
console.log(`  ${cortados.length} termos novos inseridos no topo da fila\n`);
if (cortados.length) {
  console.log('  Os mais buscados:');
  cortados.slice(0, 10).forEach((i) => console.log(`    ${String(i.prioridade).padStart(3)}  ${i.tipo}/${i.slug}  (${i.termo})`));
  if (cortados.length > 10) console.log(`    … e mais ${cortados.length - 10}`);
}
console.log(`\n  Fila total: ${itensFinais.length} páginas em seo/data/fila.json`);
console.log('  Próximo passo: node seo/3-gerar.mjs --limite 20\n');
