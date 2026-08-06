// Corte da prévia pública.
//
// O modelo devolve o material em HTML com as seções marcadas por <h4>.
// Abrimos as N primeiras seções e guardamos o resto atrás do cadastro.
//
// Por que o corte é feito na geração e gravado no banco (e não no build):
// se recalculássemos a cada build, uma mudança de regra alteraria de uma vez
// milhares de páginas já indexadas — o Google lê isso como instabilidade.

import { contarPalavras } from './util.mjs';

/**
 * Divide o HTML nas fronteiras <h4>. O primeiro pedaço é o texto de abertura
 * (antes da primeira seção), que sempre fica aberto.
 */
export function separarSecoes(html) {
  const partes = String(html ?? '').split(/(?=<h4[\s>])/i).filter((p) => p.trim());
  if (!partes.length) return { abertura: '', secoes: [] };
  const primeiraEhSecao = /^<h4[\s>]/i.test(partes[0]);
  return {
    abertura: primeiraEhSecao ? '' : partes[0],
    secoes: primeiraEhSecao ? partes : partes.slice(1),
  };
}

/** Título legível de uma seção, para listar o que está bloqueado. */
export function tituloDaSecao(trecho) {
  const m = String(trecho).match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

/**
 * Monta a prévia.
 *
 * Cortar num número fixo de seções produz páginas desiguais: no primeiro teste
 * real, João 1 abriu 1.140 palavras (50% do material) e João 3 abriu 461 (19%),
 * porque as seções têm tamanhos muito diferentes. Página de 461 palavras é fina
 * demais para ranquear; abrir 50% é generoso demais para converter.
 *
 * Então o alvo é proporcional, com piso absoluto: abre seções até cruzar
 * `max(minimoPalavras, proporcao × total)`. Assim toda página fica na mesma faixa,
 * independente de como o modelo distribuiu o conteúdo. A última seção nunca abre.
 */
export function montarPrevia(html, {
  secoesAbertas = 2,
  minimoPalavras = 700,
  proporcao = 0.40,
  tetoProporcao = 0.50,
} = {}) {
  const { abertura, secoes } = separarSecoes(html);
  if (!secoes.length) {
    return { previa: abertura || html, bloqueadas: [], completo: html };
  }

  const total = contarPalavras(html);
  const alvo = Math.max(minimoPalavras, Math.round(total * proporcao));
  const teto = Math.max(alvo, Math.round(total * tetoProporcao));

  let n = Math.min(secoesAbertas, secoes.length);
  let previa = abertura + secoes.slice(0, n).join('');

  while (contarPalavras(previa) < alvo && n < secoes.length - 1) {
    n++;
    previa = abertura + secoes.slice(0, n).join('');
  }

  // Seção grande no ponto errado faz a prévia estourar (num teste, João 3 abriu
  // 58% do material porque a 3ª seção sozinha tinha 900 palavras). Aqui a última
  // seção aberta é aparada parágrafo a parágrafo até caber no teto — o corte fica
  // numa fronteira natural de leitura, e o leitor vê que a seção continua.
  if (contarPalavras(previa) > teto && n > 0) {
    const fixas = abertura + secoes.slice(0, n - 1).join('');
    const aparada = apararSecao(secoes[n - 1], teto - contarPalavras(fixas));
    if (aparada) previa = fixas + aparada;
  }

  return {
    previa,
    bloqueadas: secoes.slice(n).map(tituloDaSecao).filter(Boolean),
    completo: html,
  };
}

/**
 * Corta uma seção em fronteira de parágrafo, mantendo o <h4> e pelo menos um
 * parágrafo. Devolve null se não der para cortar sem esvaziar a seção.
 */
function apararSecao(secao, orcamento) {
  const cabecalho = String(secao).match(/^<h4[^>]*>[\s\S]*?<\/h4>/i)?.[0] ?? '';
  const corpo = String(secao).slice(cabecalho.length);
  const paragrafos = corpo.split(/(?=<(?:p|ul|ol|blockquote)[\s>])/i).filter((x) => x.trim());
  if (paragrafos.length < 2) return null;

  let saida = '';
  for (const par of paragrafos) {
    const candidato = saida + par;
    if (saida && contarPalavras(cabecalho + candidato) > orcamento) break;
    saida = candidato;
  }
  return saida ? cabecalho + saida : null;
}
