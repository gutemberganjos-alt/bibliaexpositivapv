// Configuração de MODOS e PÚBLICOS da geração de estudos.
// Mantido em sincronia com a edge function `gerar` (supabase/functions/gerar/prompts.ts).
// Os `id` DEVEM bater exatamente com as chaves de MODOS/PUBLICOS do servidor.

export interface OpcaoModo {
  id: string;
  nome: string;
  descricao: string;
}

export interface OpcaoPublico {
  id: string;
  nome: string;
  descricao: string;
}

export const MODOS: OpcaoModo[] = [
  {
    id: 'devocional',
    nome: 'Devocional',
    descricao: 'Reflexão curta centrada em Cristo, com aplicação pessoal e oração.',
  },
  {
    id: 'estudo',
    nome: 'Estudo Bíblico',
    descricao: 'Estudo completo: contexto, exegese resumida, teologia e aplicação.',
  },
  {
    id: 'sermao',
    nome: 'Sermão',
    descricao: 'Esboço homilético com introdução, pontos, ilustrações e apelo.',
  },
  {
    id: 'exegese',
    nome: 'Exegese',
    descricao: 'Análise versículo por versículo com idiomas originais e variantes.',
  },
  {
    id: 'curso',
    nome: 'Curso de 1h',
    descricao: 'Aula de 60 min com cronograma, objetivos e atividades de fixação.',
  },
  {
    id: 'pergunte_texto',
    nome: 'Pergunte ao Texto',
    descricao: 'Estudo indutivo: observar, compreender e aplicar a passagem.',
  },
  {
    id: 'pequeno_grupo',
    nome: 'Pequeno Grupo',
    descricao: 'Roteiro de encontro com perguntas, dinâmica e oração final.',
  },
  {
    id: 'discipulado',
    nome: 'Discipulado',
    descricao: 'Caminho prático de crescimento com conversa e próximos passos.',
  },
  {
    id: 'apologetica',
    nome: 'Apologética',
    descricao: 'Resposta respeitosa, bíblica e bem fundamentada a dúvidas difíceis.',
  },
];

export const PUBLICOS: OpcaoPublico[] = [
  { id: 'criancas', nome: 'Crianças', descricao: 'Narrativa e vocabulário concreto.' },
  { id: 'adolescentes', nome: 'Adolescentes', descricao: 'Direto, atual e visual.' },
  { id: 'jovens', nome: 'Jovens', descricao: 'Linguagem contemporânea e prática.' },
  { id: 'igreja', nome: 'Igreja', descricao: 'Acessível e pastoral, todas as idades.' },
  { id: 'professores', nome: 'Professores', descricao: 'Didático, para Escola Dominical.' },
  { id: 'pastores', nome: 'Pastores', descricao: 'Técnico, foco em pregação e pastoreio.' },
  { id: 'teologia', nome: 'Teologia', descricao: 'Acadêmico, com bibliografia.' },
];

export const MODO_PADRAO = 'estudo';
export const PUBLICO_PADRAO = 'igreja';

export function nomeDoModo(id: string): string {
  return MODOS.find((m) => m.id === id)?.nome ?? id;
}

export function nomeDoPublico(id: string): string {
  return PUBLICOS.find((p) => p.id === id)?.nome ?? id;
}
