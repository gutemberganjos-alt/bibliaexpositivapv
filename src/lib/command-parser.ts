import { MODOS, PUBLICOS } from './ai-config';

/** Sinônimos que as pessoas realmente digitam, além do nome oficial de cada MODO/PÚBLICO. */
const SINONIMOS_MODO: Record<string, string> = {
  sermao: 'sermao', 'esboço': 'sermao', pregacao: 'sermao', mensagem: 'sermao',
  estudo: 'estudo',
  exegese: 'exegese', exegético: 'exegese',
  curso: 'curso', aula: 'curso',
  pergunte_texto: 'pergunte_texto', indutivo: 'pergunte_texto',
  pequeno_grupo: 'pequeno_grupo', 'pequeno grupo': 'pequeno_grupo', celula: 'pequeno_grupo', 'célula': 'pequeno_grupo',
  discipulado: 'discipulado',
  apologetica: 'apologetica', 'apologética': 'apologetica',
  devocional: 'devocional',
};

const SINONIMOS_PUBLICO: Record<string, string> = {
  criancas: 'criancas', 'crianças': 'criancas', infantil: 'criancas',
  adolescentes: 'adolescentes',
  jovens: 'jovens',
  igreja: 'igreja', congregacao: 'igreja', 'congregação': 'igreja',
  professores: 'professores', 'escola dominical': 'professores', ebd: 'professores',
  pastores: 'pastores',
  teologia: 'teologia', seminario: 'teologia', 'seminário': 'teologia',
};

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface ComandoInterpretado {
  modoId?: string;
  publicoId?: string;
  referencia: string;
}

/**
 * Interpretação local (sem IA) de um comando em linguagem natural, tipo
 * "sermão sobre Romanos 8 para jovens" → { modoId: 'sermao', publicoId: 'jovens',
 * referencia: 'Romanos 8' }. Não precisa ser perfeito — é um atalho, o
 * formulário completo continua disponível para ajustar qualquer coisa.
 */
export function interpretarComando(texto: string): ComandoInterpretado {
  const alvo = normalizar(texto);
  let modoId: string | undefined;
  let publicoId: string | undefined;
  let restante = texto;

  for (const [chave, id] of Object.entries(SINONIMOS_MODO)) {
    if (alvo.includes(normalizar(chave))) { modoId = id; break; }
  }
  if (!modoId) {
    for (const m of MODOS) {
      if (alvo.includes(normalizar(m.nome))) { modoId = m.id; break; }
    }
  }

  for (const [chave, id] of Object.entries(SINONIMOS_PUBLICO)) {
    if (alvo.includes(normalizar(chave))) { publicoId = id; break; }
  }
  if (!publicoId) {
    for (const p of PUBLICOS) {
      if (alvo.includes(normalizar(p.nome))) { publicoId = p.id; break; }
    }
  }

  // Remove as palavras que já viraram modo/público + conectores comuns,
  // sobrando só o texto/tema/referência.
  const termosParaRemover: string[] = [];
  if (modoId) termosParaRemover.push(...Object.keys(SINONIMOS_MODO).filter((k) => SINONIMOS_MODO[k] === modoId));
  if (publicoId) termosParaRemover.push(...Object.keys(SINONIMOS_PUBLICO).filter((k) => SINONIMOS_PUBLICO[k] === publicoId));
  termosParaRemover.push('sobre', 'para', 'de', 'um', 'uma', 'sermao', 'sermão', 'estudo');

  const partes = restante.split(/\s+/).filter((palavra) => {
    const p = normalizar(palavra);
    return !termosParaRemover.some((t) => normalizar(t) === p);
  });
  restante = partes.join(' ').replace(/\s{2,}/g, ' ').trim();

  return { modoId, publicoId, referencia: restante || texto.trim() };
}
