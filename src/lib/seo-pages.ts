import { supabase } from './supabase';

/** Uma página pública já publicada pelo pipeline seo/ (ver seo/README.md). */
export interface PaginaPublica {
  slug: string;
  tipo: 'estudo' | 'tema' | 'sermao';
  titulo: string;
  meta_description: string;
}

function normalizar(s: string): string {
  return s.trim().toLowerCase();
}

/** Prefixo de URL igual ao seo/config.mjs (singular — não colide com /estudos autenticado). */
function prefixoDoTipo(tipo: string): string {
  return tipo === 'sermao' ? '/sermao' : tipo === 'tema' ? '/tema' : '/estudo';
}

export function urlPaginaPublica(p: PaginaPublica): string {
  return `${prefixoDoTipo(p.tipo)}/${p.slug}/`;
}

/**
 * Procura, entre as páginas já publicadas (view pública `seo_pages_publicas`),
 * uma que atenda exatamente o termo digitado — usado para sugerir "já existe
 * uma versão pública disto" em vez de gastar uma geração à toa. Best-effort:
 * qualquer falha de rede simplesmente não mostra a sugestão.
 */
export async function buscarPaginaPublicaExata(termo: string): Promise<PaginaPublica | null> {
  const alvo = normalizar(termo);
  if (!alvo) return null;
  try {
    const { data, error } = await supabase
      .from('seo_pages_publicas')
      .select('slug, tipo, termo, titulo, meta_description')
      .eq('termo', alvo)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as PaginaPublica;
  } catch {
    return null;
  }
}
