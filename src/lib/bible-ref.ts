import { BIBLE_BOOKS } from './bible-data';
import type { BibleBook } from './bible-data';

/** Referência bíblica já resolvida contra a lista de livros do app. */
export interface RefResolvida {
  livro: BibleBook;
  capitulo: number;
  versiculo?: number;
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .trim();
}

/**
 * Interpreta uma referência no formato "Livro Cap:Vers" (o mesmo que o modelo
 * usa nos selos com data-ref e no cabeçalho — ver REGRA DE OURO DOS VERSÍCULOS
 * em supabase/functions/gerar/prompts.ts) e resolve contra BIBLE_BOOKS.
 * Tolerante a pequenas variações de acentuação/maiúsculas do texto gerado.
 */
export function parseReferencia(ref: string): RefResolvida | null {
  const m = ref.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!m) return null;
  const [, nomeBruto, capStr, versStr] = m;
  const alvo = normalizar(nomeBruto);

  let livro = BIBLE_BOOKS.find((b) => normalizar(b.name) === alvo);
  if (!livro) livro = BIBLE_BOOKS.find((b) => normalizar(b.name).startsWith(alvo) || alvo.startsWith(normalizar(b.name)));
  if (!livro) return null;

  const capitulo = Math.max(1, Math.min(livro.chapters, parseInt(capStr, 10) || 1));
  const versiculo = versStr ? parseInt(versStr, 10) : undefined;
  return { livro, capitulo, versiculo };
}
