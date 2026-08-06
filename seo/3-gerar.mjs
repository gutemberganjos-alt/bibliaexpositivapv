#!/usr/bin/env node
// ============================================================================
// 3) GERAR — a fila vira conteúdo no banco
// ============================================================================
// Chama a edge function `gerar` (a mesma que os assinantes usam, mesma qualidade),
// corta a prévia e grava em seo_pages como RASCUNHO.
//
// Autenticação: header x-seo-token. A função reconhece o robô e não consome a
// franquia de nenhum assinante. Sem o secret SEO_TOKEN configurado nas Edge
// Functions, este caminho não existe.
//
// É retomável: o que já está no banco é pulado. Pode interromper à vontade.
//
//   node seo/3-gerar.mjs --limite 20     → comece por aqui e LEIA o resultado
//   node seo/3-gerar.mjs --limite 200
//   node seo/3-gerar.mjs --refazer joao-3
//
// Custo: some os tokens. Um estudo denso custa centavos; 2.000 páginas custam
// dezenas de reais, uma única vez. É o marketing mais barato que você vai comprar.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV, exigirEnv, SECOES_ABERTAS, MINIMO_PALAVRAS_PREVIA, PROPORCAO_PREVIA, CONCORRENCIA, PAUSA_MS, MAX_TENTATIVAS } from './config.mjs';
import { contarPalavras, montarDescricao, dormir, emLotes, carregarEnv } from './lib/util.mjs';
import { montarPrevia } from './lib/previa.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
carregarEnv(path.join(AQUI, '..', '.env.seo'));
Object.assign(ENV, {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  seoToken: process.env.SEO_TOKEN,
});
exigirEnv(['supabaseUrl', 'serviceKey', 'seoToken']);

const cabecalhosDb = {
  'content-type': 'application/json',
  apikey: ENV.serviceKey,
  authorization: `Bearer ${ENV.serviceKey}`,
};

// --- carrega a fila ---------------------------------------------------------
const arquivoFila = path.join(AQUI, 'data', 'fila.json');
if (!fs.existsSync(arquivoFila)) {
  console.error('  seo/data/fila.json não existe. Rode `node seo/2-fila.mjs` antes.');
  process.exit(1);
}
const { itens } = JSON.parse(fs.readFileSync(arquivoFila, 'utf8'));

const limArg = Number(process.argv[process.argv.indexOf('--limite') + 1]);
const limite = Number.isFinite(limArg) && limArg > 0 ? limArg : Infinity;
const refazer = process.argv.includes('--refazer')
  ? process.argv[process.argv.indexOf('--refazer') + 1]
  : null;

// --- o que já existe (retomada) ---------------------------------------------
async function slugsExistentes() {
  const existentes = new Set();
  let de = 0;
  for (;;) {
    const r = await fetch(`${ENV.supabaseUrl}/rest/v1/seo_pages?select=tipo,slug&limit=1000&offset=${de}`, { headers: cabecalhosDb });
    if (!r.ok) throw new Error(`Falha ao ler seo_pages: ${r.status} ${await r.text()}`);
    const linhas = await r.json();
    linhas.forEach((l) => existentes.add(`${l.tipo}/${l.slug}`));
    if (linhas.length < 1000) break;
    de += 1000;
  }
  return existentes;
}

const jaTem = await slugsExistentes();

let pendentes = refazer
  ? itens.filter((i) => i.slug === refazer)
  : itens.filter((i) => !jaTem.has(`${i.tipo}/${i.slug}`));

pendentes = pendentes.slice(0, limite);

if (!pendentes.length) {
  console.log(`  Nada a gerar. ${jaTem.size} páginas já estão no banco.`);
  process.exit(0);
}

console.log(`  ${jaTem.size} páginas no banco · gerando ${pendentes.length} novas\n`);

// --- geração ----------------------------------------------------------------
async function gerarUma(item) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const r = await fetch(`${ENV.supabaseUrl}/functions/v1/gerar`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-seo-token': ENV.seoToken,
          authorization: `Bearer ${ENV.serviceKey}`,
          apikey: ENV.serviceKey,
        },
        body: JSON.stringify({
          modoId: item.modo_id,
          publicoId: item.publico_id,
          referencia: item.referencia,
        }),
      });
      const dados = await r.json();
      if (!r.ok || dados?.error) throw new Error(dados?.error || `HTTP ${r.status}`);
      if (!dados?.html || !dados?.titulo) throw new Error('resposta sem html/titulo');
      return dados;
    } catch (e) {
      if (tentativa === MAX_TENTATIVAS) throw e;
      await dormir(PAUSA_MS * tentativa * 3);   // recuo progressivo: 429/503 do Gemini
    }
  }
}

async function gravar(item, gerado) {
  const { previa, bloqueadas } = montarPrevia(gerado.html, {
    secoesAbertas: SECOES_ABERTAS,
    minimoPalavras: MINIMO_PALAVRAS_PREVIA,
    proporcao: PROPORCAO_PREVIA,
  });

  const linha = {
    slug: item.slug,
    tipo: item.tipo,
    termo: item.termo,
    modo_id: item.modo_id,
    publico_id: item.publico_id,
    referencia: item.referencia,
    titulo: gerado.titulo,
    meta_description: montarDescricao(previa),
    html_previa: previa,
    html_completo: gerado.html,
    palavras_previa: contarPalavras(previa),
    palavras_total: contarPalavras(gerado.html),
    // `cuidado` marca páginas de sofrimento emocional (ansiedade, luto, depressão).
    // Viaja no meta porque não exige migração e o template precisa dele para
    // exibir o aviso de apoio ANTES de qualquer coisa comercial.
    meta: { ...(gerado.meta ?? {}), secoes_bloqueadas: bloqueadas, cuidado: item.cuidado === true },
    relacionados: item.relacionados ?? [],
    status: 'rascunho',
  };

  const r = await fetch(`${ENV.supabaseUrl}/rest/v1/seo_pages?on_conflict=tipo,slug`, {
    method: 'POST',
    headers: { ...cabecalhosDb, prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(linha),
  });
  if (!r.ok) throw new Error(`gravação falhou: ${r.status} ${await r.text()}`);
  return linha;
}

let ok = 0, falhas = 0;
const erros = [];

await emLotes(pendentes, CONCORRENCIA, async (item, i) => {
  try {
    const gerado = await gerarUma(item);
    const linha = await gravar(item, gerado);
    ok++;
    const pct = Math.round((linha.palavras_previa / Math.max(linha.palavras_total, 1)) * 100);
    // Material curto vira página rasa: não ranqueia E entrega quase tudo de graça.
    const alerta = linha.palavras_total < 900 ? '  ← RASO, revise antes de publicar' : '';
    console.log(`  ✓ ${String(i + 1).padStart(4)}  ${item.tipo}/${item.slug}  (${linha.palavras_previa}/${linha.palavras_total} palavras, ${pct}% aberto)${alerta}`);
  } catch (e) {
    falhas++;
    erros.push({ slug: item.slug, erro: String(e.message ?? e) });
    console.log(`  ✗ ${String(i + 1).padStart(4)}  ${item.tipo}/${item.slug}  — ${e.message ?? e}`);
  }
  await dormir(PAUSA_MS);
});

console.log(`\n  ${ok} geradas · ${falhas} falhas`);
if (erros.length) {
  const arq = path.join(AQUI, 'data', 'erros-geracao.json');
  fs.writeFileSync(arq, JSON.stringify(erros, null, 2));
  console.log(`  Detalhes em seo/data/erros-geracao.json (rode de novo: o que falhou continua na fila)`);
}
console.log('\n  Elas nascem como RASCUNHO, de propósito.');
console.log('  Leia algumas antes de publicar:  node seo/4-publicar.mjs --ver 3');
console.log('  Quando aprovar:                  node seo/4-publicar.mjs --lote 40');
