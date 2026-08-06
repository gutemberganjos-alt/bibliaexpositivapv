#!/usr/bin/env node
// ============================================================================
// 2) FILA — transforma demanda em um plano de páginas
// ============================================================================
// A fila tem QUATRO camadas, e a ordem entre elas é a decisão mais importante
// deste arquivo. Ela é gerada e publicada de cima para baixo:
//
//   1. DEMANDA MINERADA  ← o que as pessoas realmente digitam
//      Vem do autocomplete do Google e do YouTube. Dentro dela, intenção de
//      artefato ("esboço de pregação sobre gratidão") vem antes de intenção de
//      resposta ("o que significa…"). O Google pode resumir uma explicação na
//      própria tela de busca, mas não entrega um plano de aula com dinâmica e
//      gabarito — para isso a pessoa precisa clicar.
//
//   2. TEMAS E PERSONAGENS  ← onde está o maior volume
//      Ansiedade, casamento, propósito, fim dos tempos, Davi, José do Egito.
//      Ninguém digita "Filipenses 4:6" às duas da manhã com medo; digita
//      "versículo para ansiedade". Cada tema vira 3 ou 4 páginas, uma por
//      formato, porque atende pessoas diferentes.
//
//   3. PASSAGENS FORTES EM 3 FORMATOS
//      As ~109 passagens mais pregadas viram sermão + aula de EBD + estudo.
//      Mesma passagem, três materiais diferentes, três buscas diferentes.
//
//   4. COBERTURA — os 1.189 capítulos como estudo
//      Volume individual baixíssimo, soma relevante, e é o esqueleto que
//      sustenta os links internos. Mas é a camada MAIS exposta à resposta
//      automática do Google, então vem por último de propósito.
//
// A primeira versão era só a camada 4: 1.189 páginas, todas do mesmo formato,
// todas de "intenção de resposta". Era o pior arranjo possível para 2026.
//
//   node seo/2-fila.mjs                  → fila completa, na ordem certa
//   node seo/2-fila.mjs --limite 50      → só as 50 primeiras (as melhores)
//   node seo/2-fila.mjs --so-demanda     → ignora a cobertura de capítulos
//
// Saída: seo/data/fila.json
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugificar } from './lib/util.mjs';
import { PASSAGENS_FORTES, FORMATOS_POR_PASSAGEM } from './lib/passagens.mjs';
import { PILARES } from './lib/temas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SAIDA = path.join(AQUI, 'data', 'fila.json');

// ---------------------------------------------------------------------------
// Livros: lidos de src/lib/bible-data.ts para não duplicar a fonte da verdade.
// ---------------------------------------------------------------------------
function lerLivros() {
  const src = fs.readFileSync(path.join(RAIZ, 'src', 'lib', 'bible-data.ts'), 'utf8');
  const livros = [];
  const re = /\{\s*name:\s*'([^']+)',\s*apiName:\s*'[^']*',\s*chapters:\s*(\d+),\s*testament:\s*'(AT|NT)'/g;
  let m;
  while ((m = re.exec(src))) livros.push({ nome: m[1], capitulos: Number(m[2]), testamento: m[3] });
  if (!livros.length) throw new Error('Não consegui ler BIBLE_BOOKS de src/lib/bible-data.ts');
  return livros;
}

// Ordem da cobertura: livros mais pregados primeiro.
const PRIORIDADE = ['João', 'Salmos', 'Romanos', 'Gênesis', 'Provérbios', 'Mateus',
  'Atos', 'Efésios', 'Isaías', 'Filipenses', 'Tiago', 'Apocalipse', '1 Coríntios', 'Hebreus'];

/**
 * Classifica o termo minerado em formato + intenção.
 *
 * `intencao` é o que decide a posição na fila:
 *   'artefato' — a pessoa quer levar algo pronto (esboço, plano de aula, roteiro)
 *   'resposta' — a pessoa quer entender algo ("o que significa…")
 * Páginas de resposta são as que o Google mais consegue substituir respondendo
 * na própria tela de busca. Continuam valendo, só não vêm primeiro.
 */
function classificar(termo) {
  const t = termo.toLowerCase();
  if (/serm(ã|a)o|prega(ç|c)(ã|a)o|esbo(ç|c)o|pregar/.test(t))
    return { modo: 'sermao', tipo: 'sermao', publico: 'igreja', intencao: 'artefato' };
  if (/escola dominical|ebd|aula|professor|din(â|a)mica/.test(t))
    return { modo: 'curso', tipo: 'tema', publico: 'professores', intencao: 'artefato' };
  if (/c(é|e)lula|pequeno grupo|grupo pequeno|encontro/.test(t))
    return { modo: 'pequeno_grupo', tipo: 'tema', publico: 'igreja', intencao: 'artefato' };
  if (/discipulado|disciplar/.test(t))
    return { modo: 'discipulado', tipo: 'tema', publico: 'igreja', intencao: 'artefato' };
  if (/jovens|adolescent/.test(t))
    return { modo: 'estudo', tipo: 'tema', publico: 'jovens', intencao: 'artefato' };
  // Devocional vira ESTUDO: 250–400 palavras dariam página rasa e entregariam
  // quase tudo na prévia (medido: 87% aberto).
  if (/devocional|reflex(ã|a)o|medita(ç|c)(ã|a)o/.test(t))
    return { modo: 'estudo', tipo: 'tema', publico: 'igreja', intencao: 'resposta' };
  if (/grego|hebraico|ex(e|é)gese|original/.test(t))
    return { modo: 'exegese', tipo: 'tema', publico: 'pastores', intencao: 'resposta' };
  if (/por que|como (deus|jesus|cristo)|objeç|ateu|defender/.test(t))
    return { modo: 'apologetica', tipo: 'tema', publico: 'igreja', intencao: 'resposta' };
  return { modo: 'estudo', tipo: 'tema', publico: 'igreja', intencao: 'resposta' };
}

const limiteArg = Number(process.argv[process.argv.indexOf('--limite') + 1]);
const limite = Number.isFinite(limiteArg) && limiteArg > 0 ? limiteArg : Infinity;
const soDemanda = process.argv.includes('--so-demanda');
const soCapitulos = process.argv.includes('--so-capitulos');

const fila = [];
const vistos = new Set();

function adicionar(item) {
  const chave = `${item.tipo}/${item.slug}`;
  if (vistos.has(chave)) return;
  vistos.add(chave);
  fila.push(item);
}

// === CAMADA 1: demanda minerada ============================================
const arquivoTermos = path.join(AQUI, 'data', 'palavras-chave.json');
let termos = [];
if (!soCapitulos) {
  if (!fs.existsSync(arquivoTermos)) {
    console.warn('  Aviso: seo/data/palavras-chave.json não existe.');
    console.warn('  Rode `npm run seo:minerar` — sem ele a fila fica só com cobertura,');
    console.warn('  que é a camada de MENOR valor.\n');
  } else {
    termos = JSON.parse(fs.readFileSync(arquivoTermos, 'utf8')).termos ?? [];
  }
}

for (const t of termos) {
  const c = classificar(t.termo);
  adicionar({
    camada: 1,
    intencao: c.intencao,
    prioridade: c.intencao === 'artefato' ? 100 : 70,
    tipo: c.tipo,
    slug: slugificar(t.termo),
    termo: t.termo,
    referencia: t.termo,
    modo_id: c.modo,
    publico_id: c.publico,
    grupo: `demanda:${t.semente}`,
    ordem: 0,
  });
}

// === CAMADA 2: TEMAS E PERSONAGENS =========================================
// Onde está o maior volume de busca. Ninguém digita "Filipenses 4:6" às duas da
// manhã com medo — digita "versículo para ansiedade". Cada tema vira várias
// páginas porque atende pessoas diferentes: quem sofre, quem vai pregar sobre
// aquilo e quem vai conduzir a conversa na célula.
if (!soCapitulos) {
  for (const pilar of PILARES) {
    for (const tema of pilar.temas) {
      for (const f of pilar.formatos) {
        adicionar({
          camada: 2,
          pilar: pilar.id,
          intencao: f.intencao,
          cuidado: pilar.cuidado === true,
          prioridade: pilar.prioridade + (f.intencao === 'artefato' ? 5 : 0),
          tipo: f.tipo,
          slug: slugificar(f.slug(tema)),
          termo: f.termo(tema),
          referencia: tema,
          modo_id: f.modo,
          publico_id: f.publico,
          grupo: `pilar:${pilar.id}`,
          ordem: 0,
        });
      }
    }
  }
}

// === CAMADA 3: passagens fortes em 3 formatos ==============================
if (!soCapitulos) {
  for (const ref of PASSAGENS_FORTES) {
    for (const f of FORMATOS_POR_PASSAGEM) {
      adicionar({
        camada: 3,
        intencao: f.intencao,
        prioridade: f.intencao === 'artefato' ? 80 : 55,
        tipo: f.tipo,
        slug: slugificar(f.slug(ref)),
        termo: f.termo(ref),
        referencia: ref,
        modo_id: f.modo,
        publico_id: f.publico,
        grupo: `forte:${ref.replace(/\s+\d+$/, '')}`,
        ordem: Number(ref.match(/\d+$/)?.[0] ?? 0),
      });
    }
  }
}

// === CAMADA 4: cobertura dos 1.189 capítulos ===============================
if (!soDemanda) {
  const ordenados = [...lerLivros()].sort((a, b) => {
    const ia = PRIORIDADE.indexOf(a.nome), ib = PRIORIDADE.indexOf(b.nome);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  for (const livro of ordenados) {
    for (let c = 1; c <= livro.capitulos; c++) {
      const referencia = `${livro.nome} ${c}`;
      adicionar({
        camada: 4,
        intencao: 'resposta',
        prioridade: PRIORIDADE.includes(livro.nome) ? 40 : 20,
        tipo: 'estudo',
        slug: slugificar(referencia),
        termo: `estudo bíblico de ${referencia}`,
        referencia,
        modo_id: 'estudo',
        publico_id: 'igreja',
        grupo: `livro:${livro.nome}`,
        ordem: c,
      });
    }
  }
}

// Ordena por prioridade: o que gera receita primeiro. Se você parar no meio do
// caminho — e é provável —, terá parado tendo feito o que mais importa.
fila.sort((a, b) => b.prioridade - a.prioridade || a.camada - b.camada || a.ordem - b.ordem);

const final = fila.slice(0, limite);

// Links internos entre vizinhos do mesmo grupo. Página órfã não recebe
// autoridade — é o erro que mata a maioria dos projetos de conteúdo em escala.
const porGrupo = new Map();
for (const item of final) {
  if (!porGrupo.has(item.grupo)) porGrupo.set(item.grupo, []);
  porGrupo.get(item.grupo).push(item);
}
for (const [, itens] of porGrupo) {
  itens.forEach((item, i) => {
    const vizinhos = [];
    for (let d = 1; vizinhos.length < 6 && d < itens.length; d++) {
      if (itens[i - d]) vizinhos.push(itens[i - d]);
      if (itens[i + d] && vizinhos.length < 6) vizinhos.push(itens[i + d]);
    }
    item.relacionados = vizinhos.map((v) => `${v.tipo}:${v.slug}`);
  });
}

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify({ geradoEm: new Date().toISOString(), total: final.length, itens: final }, null, 2));

// --- relatório --------------------------------------------------------------
const conta = (campo) => final.reduce((a, i) => ({ ...a, [i[campo]]: (a[i[campo]] ?? 0) + 1 }), {});
const porCamada = conta('camada'), porIntencao = conta('intencao'), porModo = conta('modo_id');
const artefato = porIntencao.artefato ?? 0;
const pct = final.length ? Math.round((artefato / final.length) * 100) : 0;

console.log(`\n  ${final.length} páginas planejadas\n`);
console.log('  Camada                                  páginas');
console.log(`   1. demanda minerada                     ${String(porCamada[1] ?? 0).padStart(5)}`);
console.log(`   2. temas e personagens                  ${String(porCamada[2] ?? 0).padStart(5)}`);
console.log(`   3. passagens fortes (3 formatos)        ${String(porCamada[3] ?? 0).padStart(5)}`);
console.log(`   4. cobertura de capítulos               ${String(porCamada[4] ?? 0).padStart(5)}`);
console.log('\n  Intenção');
console.log(`   artefato (esboço, aula, roteiro)        ${String(artefato).padStart(5)}   ${pct}%`);
console.log(`   resposta ("o que significa…")           ${String(porIntencao.resposta ?? 0).padStart(5)}   ${100 - pct}%`);
console.log('\n  Formato');
for (const [m, n] of Object.entries(porModo).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${m.padEnd(38)} ${String(n).padStart(5)}`);
}

if (pct < 25) {
  console.log('\n   Menos de 25% da fila é intenção de artefato.');
  console.log('     Páginas de "resposta" são as que o Google mais substitui respondendo');
  console.log('     na própria tela de busca. Rode `npm run seo:minerar` para trazer mais');
  console.log('     demanda real de esboço, aula e roteiro.');
}
console.log('\n  Próximo passo: npm run seo:gerar -- --limite 20   (as 20 melhores primeiro)\n');
