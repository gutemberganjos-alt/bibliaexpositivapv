import { supabase } from './supabase';
import type { EstudoResultado } from './gerar';

/**
 * Biblioteca do assinante.
 *
 * Antes vivia só no localStorage: trocar de celular, usar outro navegador ou
 * limpar o cache apagava tudo. Agora a fonte da verdade é o banco (tabela
 * `studies`, protegida por RLS), e o localStorage vira só um espelho para a
 * tela abrir instantaneamente e continuar legível offline.
 */

const STORAGE_KEY = 'biblia-expositiva:estudos';
const MIGRACAO_KEY = 'biblia-expositiva:estudos-migrados';
const MAX_STUDIES = 200;

export interface SavedStudy extends EstudoResultado {
  id: string;
  createdAt: string;
  modoId: string;
  publicoId: string;
  referencia: string;
}

// ---------- espelho local (cache) ----------

function lerCache(): SavedStudy[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const studies = value ? JSON.parse(value) : [];
    return Array.isArray(studies) ? studies : [];
  } catch {
    return [];
  }
}

function gravarCache(studies: SavedStudy[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studies.slice(0, MAX_STUDIES)));
  } catch {
    // Cota do navegador estourada: o cache é dispensável, o banco não.
  }
}

/** Leitura síncrona do espelho — usada para pintar a tela antes da rede responder. */
export function getCachedStudies(): SavedStudy[] {
  return lerCache();
}

// ---------- conversão banco <-> app ----------

interface LinhaEstudo {
  id: string;
  titulo: string;
  html: string;
  meta: EstudoResultado['meta'] | null;
  modo_id: string | null;
  publico_id: string | null;
  referencia: string | null;
  created_at: string;
}

function daLinha(l: LinhaEstudo): SavedStudy {
  return {
    id: l.id,
    titulo: l.titulo,
    html: l.html,
    meta: (l.meta ?? {}) as EstudoResultado['meta'],
    modoId: l.modo_id ?? '',
    publicoId: l.publico_id ?? '',
    referencia: l.referencia ?? '',
    createdAt: l.created_at,
  };
}

// ---------- operações ----------

/**
 * Busca a biblioteca no banco. Se a rede falhar, devolve o espelho local em vez
 * de mostrar biblioteca vazia — dizer "você não tem nada" para quem tem é pior
 * do que mostrar conteúdo levemente desatualizado.
 */
export async function fetchStudies(): Promise<SavedStudy[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return lerCache();

  await migrarDoLocalStorage(user.id);

  const { data, error } = await supabase
    .from('studies')
    .select('id, titulo, html, meta, modo_id, publico_id, referencia, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_STUDIES);

  if (error) {
    console.error('[biblioteca] falha ao carregar', error.message);
    return lerCache();
  }

  const estudos = (data as LinhaEstudo[]).map(daLinha);
  gravarCache(estudos);
  return estudos;
}

/** Salva no banco e atualiza o espelho. Lança erro se não conseguir gravar. */
export async function saveStudy(
  study: Omit<SavedStudy, 'id' | 'createdAt'>,
): Promise<SavedStudy> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para salvar na biblioteca.');

  const { data, error } = await supabase
    .from('studies')
    .insert({
      user_id: user.id,
      titulo: study.titulo,
      html: study.html,
      meta: study.meta ?? null,
      modo_id: study.modoId,
      publico_id: study.publicoId,
      referencia: study.referencia,
    })
    .select('id, titulo, html, meta, modo_id, publico_id, referencia, created_at')
    .single();

  // Sem checar o erro, o usuário veria "salvo!" e perderia o estudo.
  if (error || !data) {
    console.error('[biblioteca] falha ao salvar', error?.message);
    throw new Error('Não consegui salvar o estudo. Verifique sua conexão e tente de novo.');
  }

  const salvo = daLinha(data as LinhaEstudo);
  gravarCache([salvo, ...lerCache().filter((e) => e.id !== salvo.id)]);
  return salvo;
}

export async function deleteStudy(id: string): Promise<void> {
  gravarCache(lerCache().filter((e) => e.id !== id));
  const { error } = await supabase.from('studies').delete().eq('id', id);
  if (error) {
    console.error('[biblioteca] falha ao excluir', error.message);
    throw new Error('Não consegui excluir agora. Tente de novo em instantes.');
  }
}

/**
 * Sobe uma única vez os estudos que ficaram presos no localStorage antes da
 * sincronização existir. Sem isso, quem já usava o app abriria a biblioteca
 * nova e acharia que perdeu tudo.
 */
async function migrarDoLocalStorage(userId: string): Promise<void> {
  let jaMigrou = false;
  try {
    jaMigrou = localStorage.getItem(MIGRACAO_KEY) === '1';
  } catch {
    return;
  }
  if (jaMigrou) return;

  const antigos = lerCache();
  if (!antigos.length) {
    try { localStorage.setItem(MIGRACAO_KEY, '1'); } catch { /* sem espaço */ }
    return;
  }

  const { error } = await supabase.from('studies').insert(
    antigos.map((e) => ({
      user_id: userId,
      titulo: e.titulo,
      html: e.html,
      meta: e.meta ?? null,
      modo_id: e.modoId,
      publico_id: e.publicoId,
      referencia: e.referencia,
      created_at: e.createdAt,
    })),
  );

  // Só marcamos como migrado se realmente gravou — senão tentamos de novo depois.
  if (error) {
    console.error('[biblioteca] falha ao migrar estudos locais', error.message);
    return;
  }
  try { localStorage.setItem(MIGRACAO_KEY, '1'); } catch { /* sem espaço */ }
}
