import type { EstudoResultado, GerarEstudoParams } from './gerar';

const STORAGE_KEY = 'biblia-expositiva:cache-geracoes';
const LIMIT = 30;

interface CacheItem {
  key: string;
  result: EstudoResultado;
  createdAt: string;
}

function keyFor({ modoId, publicoId, referencia, perfilId, correntes, mostrarTag, teologoId, traducaoId }: GerarEstudoParams) {
  const texto = referencia.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  // Corrente/tag/perspectiva/tradução mudam a resposta (ver briefing da tela de
  // Estudos) — precisam entrar na chave, senão o cache devolveria um material
  // gerado com outra lente teológica sem o usuário perceber.
  const correnteKey = [...(correntes ?? [])].sort().join('+') || '-';
  return `${modoId}:${publicoId}:${perfilId ?? 'membro'}:${texto}:${correnteKey}:${mostrarTag === false ? 0 : 1}:${teologoId ?? '-'}:${traducaoId ?? 'ARC'}`;
}

function read(): CacheItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cache = raw ? JSON.parse(raw) : [];
    return Array.isArray(cache) ? cache : [];
  } catch {
    return [];
  }
}

function write(items: CacheItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, LIMIT)));
}

export function getCachedStudy(params: GerarEstudoParams): EstudoResultado | null {
  return read().find((item) => item.key === keyFor(params))?.result ?? null;
}

export function cacheStudy(params: GerarEstudoParams, result: EstudoResultado) {
  const key = keyFor(params);
  const current = read().filter((item) => item.key !== key);
  write([{ key, result, createdAt: new Date().toISOString() }, ...current]);
}
