import type { EstudoResultado, GerarEstudoParams } from './gerar';

const STORAGE_KEY = 'biblia-expositiva:cache-geracoes';
const LIMIT = 30;

interface CacheItem {
  key: string;
  result: EstudoResultado;
  createdAt: string;
}

function keyFor({ modoId, publicoId, referencia, perfilId }: GerarEstudoParams) {
  const texto = referencia.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  return `${modoId}:${publicoId}:${perfilId ?? 'membro'}:${texto}`;
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
