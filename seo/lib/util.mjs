// Utilidades compartilhadas do pipeline de SEO.

import fs from 'node:fs';

/** Slug estável em português: sem acento, sem pontuação, hífens simples. */
export function slugificar(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Escapa texto para inserção segura em HTML/XML. */
export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Remove tags e conta palavras — usado para medir densidade da prévia. */
export function contarPalavras(html) {
  const texto = String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return texto ? texto.split(' ').length : 0;
}

/** Texto puro a partir de HTML, para meta description. */
export function textoPuro(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Meta description: 150-160 caracteres, cortada em fronteira de palavra.
 * Descrição truncada no meio de uma palavra é o erro mais comum e o Google
 * simplesmente reescreve a sua — perdendo o controle da mensagem.
 *
 * Duas coisas precisam sair antes de cortar, descobertas no primeiro teste real:
 *  - o título da seção (<h4>), que virava "Resposta objetiva O primeiro capítulo…"
 *  - os selos de confiabilidade, que viravam "Resposta objetiva ESCRITURA O…"
 * Ambos são marcação, não frase — e ocupavam os primeiros caracteres, justamente
 * os que decidem o clique no resultado de busca.
 */
export function montarDescricao(html, limite = 158) {
  const limpo = String(html ?? '')
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ')                 // títulos de seção
    .replace(/<span class="selo[^"]*">[\s\S]*?<\/span>/gi, ' ')        // selos
    .replace(/<cite[^>]*>[\s\S]*?<\/cite>/gi, ' ');                    // referências de citação

  const texto = textoPuro(limpo) || textoPuro(html);
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  const ultimo = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimo > 80 ? ultimo : limite).replace(/[.,;:\s]+$/, '')}…`;
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Executa tarefas com concorrência limitada, preservando a ordem dos resultados. */
export async function emLotes(itens, concorrencia, tarefa) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(concorrencia, itens.length) }, async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await tarefa(itens[i], i);
    }
  });
  await Promise.all(trabalhadores);
  return resultados;
}

/** Carrega .env.seo sem dependência externa. */
export function carregarEnv(caminho) {
  try {
    if (!fs.existsSync(caminho)) return;
    for (const linha of fs.readFileSync(caminho, 'utf8').split('\n')) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* opcional */ }
}
