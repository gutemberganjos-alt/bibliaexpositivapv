import type { EstudoResultado } from './gerar';

const STORAGE_KEY = 'biblia-expositiva:estudos';
const MAX_STUDIES = 50;

export interface SavedStudy extends EstudoResultado {
  id: string;
  createdAt: string;
  modoId: string;
  publicoId: string;
  referencia: string;
}

function read(): SavedStudy[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const studies = value ? JSON.parse(value) : [];
    return Array.isArray(studies) ? studies : [];
  } catch {
    return [];
  }
}

function write(studies: SavedStudy[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(studies.slice(0, MAX_STUDIES)));
}

export function getSavedStudies() {
  return read();
}

export function saveStudy(study: Omit<SavedStudy, 'id' | 'createdAt'>): SavedStudy {
  const saved: SavedStudy = {
    ...study,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  write([saved, ...read()]);
  return saved;
}

export function deleteStudy(id: string) {
  write(read().filter((study) => study.id !== id));
}
