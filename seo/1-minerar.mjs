#!/usr/bin/env node
// ============================================================================
// 1) MINERAR — descobre o que o mercado realmente digita
// ============================================================================
// Lê o autocomplete do Google e do YouTube. Isso não é "estimativa de volume":
// são as buscas que as pessoas de fato completam, ordenadas por frequência real.
// É a fonte gratuita mais honesta de demanda que existe.
//
// Estratégia: cada semente é expandida com o alfabeto ("como pregar sobre a",
// "...b", "...c"). Uma semente vira ~250 consultas e centenas de termos reais.
//
//   node seo/1-minerar.mjs                 → mina tudo
//   node seo/1-minerar.mjs --sementes 5    → só as 5 primeiras (teste rápido)
//
// Saída: seo/data/palavras-chave.json
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dormir, emLotes } from './lib/util.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'data', 'palavras-chave.json');

// Sementes: os começos de frase que revelam intenção de quem prepara ensino.
// A ordem importa — as primeiras são as de maior intenção comercial.
const SEMENTES = [
  'como fazer um sermão sobre',
  'esboço de pregação sobre',
  'estudo bíblico sobre',
  'como preparar uma aula de escola dominical sobre',
  'o que significa',
  'o que a bíblia diz sobre',
  'versículo sobre',
  'como pregar sobre',
  'estudo bíblico para jovens sobre',
  'estudo bíblico para células sobre',
  'devocional sobre',
  'sermão para culto de',
  'qual o significado de',
  'dinâmica para escola dominical sobre',
  'estudo bíblico para mulheres sobre',
  'pregação sobre',
  'reflexão bíblica sobre',
  'estudo sobre o livro de',
  'quem foi',
  'por que jesus',
];

const SUFIXOS = [
  '', ...'abcdefghijlmnopqrstuv'.split(''),
  ' a', ' o', ' que', ' um', ' na', ' no', ' para', ' de',
];

const ALVOS = [
  { fonte: 'google', url: (q) => `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(q)}` },
  { fonte: 'youtube', url: (q) => `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=pt-BR&gl=br&q=${encodeURIComponent(q)}` },
];

async function sugestoes(alvo, consulta) {
  try {
    const r = await fetch(alvo.url(consulta), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; BibliaExpositivaSEO/1.0)' },
    });
    if (!r.ok) return [];
    const dados = JSON.parse(await r.text());
    return Array.isArray(dados?.[1]) ? dados[1] : [];
  } catch {
    return [];
  }
}

/**
 * Filtra ruído. Sem isto, metade da colheita é lixo: nomes de canais,
 * letras de música, termos de uma palavra que não são microproblema nenhum.
 */
function aproveitavel(termo, semente) {
  const t = termo.toLowerCase().trim();
  if (t === semente.toLowerCase().trim()) return false;
  if (t.length < 12 || t.length > 90) return false;
  if (t.split(' ').length < 4) return false;                 // cauda curta demais
  if (/[<>{}[\]|@#$%^*=~`\\]/.test(t)) return false;
  if (/\b(letra|playback|cifra|baixar|download|pdf grátis|torrent|filme|novela)\b/.test(t)) return false;
  return true;
}

const argSementes = Number(process.argv[process.argv.indexOf('--sementes') + 1]);
const sementes = Number.isFinite(argSementes) && argSementes > 0
  ? SEMENTES.slice(0, argSementes)
  : SEMENTES;

const consultas = [];
for (const s of sementes) for (const suf of SUFIXOS) consultas.push({ semente: s, consulta: `${s}${suf}` });

console.log(`Minerando ${consultas.length} consultas × ${ALVOS.length} fontes…\n`);

const colhido = new Map();  // termo → { termo, semente, fontes:Set, posicoes:[] }
let feitas = 0;

await emLotes(consultas, 4, async ({ semente, consulta }) => {
  for (const alvo of ALVOS) {
    const lista = await sugestoes(alvo, consulta);
    lista.forEach((termo, i) => {
      if (!aproveitavel(termo, semente)) return;
      const chave = termo.toLowerCase().trim();
      if (!colhido.has(chave)) colhido.set(chave, { termo: chave, semente, fontes: new Set(), posicoes: [] });
      const item = colhido.get(chave);
      item.fontes.add(alvo.fonte);
      item.posicoes.push(i);
    });
    await dormir(120);   // educação com o endpoint; sem isso vem 429
  }
  feitas++;
  if (feitas % 25 === 0) process.stdout.write(`  ${feitas}/${consultas.length} — ${colhido.size} termos\r`);
});

// Pontuação: aparecer nas duas fontes e aparecer no topo da lista são os dois
// sinais reais de frequência que o autocomplete nos dá de graça.
const termos = [...colhido.values()]
  .map((t) => {
    const posMedia = t.posicoes.reduce((a, b) => a + b, 0) / t.posicoes.length;
    return {
      termo: t.termo,
      semente: t.semente,
      fontes: [...t.fontes],
      pontuacao: Number(((t.fontes.size * 10) + (10 - Math.min(posMedia, 9))).toFixed(2)),
    };
  })
  .sort((a, b) => b.pontuacao - a.pontuacao);

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify({ mineradoEm: new Date().toISOString(), total: termos.length, termos }, null, 2));

console.log(`\n\n  ${termos.length} termos com demanda real salvos em seo/data/palavras-chave.json`);
console.log('\n  Os 15 mais fortes:');
termos.slice(0, 15).forEach((t, i) => console.log(`   ${String(i + 1).padStart(2)}. ${t.termo}`));
console.log('\n  Próximo passo: node seo/2-fila.mjs');
