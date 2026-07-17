export interface StudyProfile {
  id: string;
  name: string;
  description: string;
}

export const STUDY_PROFILES: StudyProfile[] = [
  { id: 'novo_convertido', name: 'Novo convertido', description: 'Linguagem simples, fundamentos e próximos passos.' },
  { id: 'membro', name: 'Membro da igreja', description: 'Crescimento bíblico sólido para a vida diária.' },
  { id: 'lider', name: 'Líder', description: 'Aplicação para discipulado e condução de pessoas.' },
  { id: 'professor', name: 'Professor', description: 'Didática, perguntas e organização para ensinar.' },
  { id: 'pastor', name: 'Pastor', description: 'Preparação de mensagem, cuidado e profundidade.' },
  { id: 'seminarista', name: 'Seminarista', description: 'Método, contexto e linguagem acadêmica acessível.' },
  { id: 'teologo', name: 'Teólogo', description: 'Análise técnica, debates e referências especializadas.' },
];

const KEY = 'biblia-expositiva:perfil-estudo';

export function getStudyProfileId() {
  try { return localStorage.getItem(KEY) || 'membro'; } catch { return 'membro'; }
}

export function saveStudyProfileId(id: string) {
  localStorage.setItem(KEY, id);
}

export function profileName(id: string) {
  return STUDY_PROFILES.find((profile) => profile.id === id)?.name ?? 'Membro da igreja';
}
