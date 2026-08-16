import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

/**
 * Cliente da edge function `lexico` — análise das palavras-chave de um
 * versículo no idioma original (hebraico/grego/aramaico), sob demanda.
 * Alimenta o "Laboratório do Original" da tela da Bíblia.
 *
 * Diferente de gerarEstudo(): não consome a franquia paga de gerações — é
 * apoio de leitura, não geração de material — mas ainda exige sessão válida.
 */

export interface PalavraLexico {
  pt: string;
  idioma: 'Hebraico' | 'Grego' | 'Aramaico';
  original: string;
  translit: string;
  strong: string | null;
  classe: string;
  ocorrencias: number;
  raiz: string | null;
  significado: string;
  nota: string;
}

export interface LexicoResultado {
  referencia: string;
  traducaoId: string;
  palavras: PalavraLexico[];
}

// Cache em memória (dura a sessão da aba): evita cobrar uma nova chamada de IA
// toda vez que o usuário reabre o mesmo versículo.
const cache = new Map<string, LexicoResultado>();

function chaveCache(referencia: string, traducaoId: string): string {
  return `${referencia.trim().toLowerCase()}::${traducaoId}`;
}

export async function gerarLexico(
  referencia: string,
  texto: string,
  traducaoId = 'ARC',
): Promise<LexicoResultado> {
  const ref = referencia.trim();
  const txt = texto.trim();
  if (!ref || !txt) {
    throw new Error('Selecione um versículo para analisar.');
  }

  const chave = chaveCache(ref, traducaoId);
  const emCache = cache.get(chave);
  if (emCache) return emCache;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/functions/v1/lexico`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ referencia: ref, texto: txt, traducaoId }),
    });
  } catch {
    throw new Error('Falha de conexão ao analisar o original. Tente novamente.');
  }

  let body: { referencia?: string; traducaoId?: string; palavras?: PalavraLexico[]; error?: string } | null = null;
  try {
    body = await resp.json();
  } catch { /* corpo vazio/insperado tratado abaixo */ }

  if (!resp.ok || !body || body.error) {
    throw new Error(body?.error || 'Não foi possível analisar o original deste versículo. Tente novamente.');
  }

  const resultado: LexicoResultado = {
    referencia: body.referencia ?? ref,
    traducaoId: body.traducaoId ?? traducaoId,
    palavras: Array.isArray(body.palavras) ? body.palavras : [],
  };
  cache.set(chave, resultado);
  return resultado;
}
