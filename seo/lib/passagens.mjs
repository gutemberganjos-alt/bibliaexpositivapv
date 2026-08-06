// Passagens de alta demanda no meio evangélico brasileiro.
//
// Estas recebem tratamento múltiplo: a mesma passagem vira estudo, esboço de
// sermão E aula de escola dominical. Três páginas, três buscas diferentes,
// três materiais genuinamente distintos — não conteúdo duplicado.
//
// Por que só estas e não os 1.189 capítulos:
// gerar 3 formatos para tudo daria 3.567 páginas, custaria 3x e diluiria o
// esforço em capítulos que ninguém procura. Salmos 88 não precisa de esboço de
// sermão; Salmos 23 precisa, e de aula de EBD também.
//
// A lista é uma hipótese inicial. Depois de 90 dias no Search Console, troque-a
// pelos dados reais: as passagens que aparecerem em "Desempenho" mandam mais que
// qualquer intuição — inclusive a minha.

export const PASSAGENS_FORTES = [
  // Evangelhos — o coração da pregação expositiva
  'João 1', 'João 3', 'João 8', 'João 10', 'João 11', 'João 14', 'João 15',
  'Mateus 5', 'Mateus 6', 'Mateus 7', 'Mateus 11', 'Mateus 25', 'Mateus 28',
  'Marcos 4', 'Marcos 10', 'Lucas 10', 'Lucas 15', 'Lucas 18', 'Lucas 24',

  // Salmos mais buscados
  'Salmos 1', 'Salmos 23', 'Salmos 27', 'Salmos 34', 'Salmos 37', 'Salmos 42',
  'Salmos 46', 'Salmos 51', 'Salmos 63', 'Salmos 91', 'Salmos 103', 'Salmos 119',
  'Salmos 121', 'Salmos 127', 'Salmos 133', 'Salmos 139',

  // Paulo — doutrina e vida cristã
  'Romanos 5', 'Romanos 6', 'Romanos 8', 'Romanos 12',
  '1 Coríntios 12', '1 Coríntios 13', '1 Coríntios 15',
  '2 Coríntios 4', '2 Coríntios 5', '2 Coríntios 12',
  'Gálatas 5', 'Efésios 2', 'Efésios 4', 'Efésios 5', 'Efésios 6',
  'Filipenses 1', 'Filipenses 2', 'Filipenses 3', 'Filipenses 4',
  'Colossenses 3', '1 Tessalonicenses 4', '1 Timóteo 4', '2 Timóteo 2', '2 Timóteo 3',

  // Cartas gerais e Apocalipse
  'Hebreus 11', 'Hebreus 12', 'Tiago 1', 'Tiago 2', 'Tiago 4',
  '1 Pedro 2', '1 Pedro 5', '1 João 1', '1 João 4',
  'Apocalipse 2', 'Apocalipse 3', 'Apocalipse 21', 'Apocalipse 22',

  // Antigo Testamento — narrativa e profetas
  'Gênesis 1', 'Gênesis 3', 'Gênesis 12', 'Gênesis 22', 'Gênesis 37', 'Gênesis 39',
  'Êxodo 3', 'Êxodo 14', 'Êxodo 20',
  'Josué 1', 'Josué 24', 'Rute 1', '1 Samuel 17', '2 Reis 5',
  'Provérbios 3', 'Provérbios 4', 'Provérbios 22', 'Provérbios 31',
  'Eclesiastes 3', 'Isaías 6', 'Isaías 40', 'Isaías 53', 'Isaías 55',
  'Jeremias 29', 'Ezequiel 37', 'Daniel 3', 'Daniel 6',
  'Oseias 6', 'Joel 2', 'Jonas 1', 'Miqueias 6', 'Habacuque 3', 'Malaquias 3',
  'Jó 1', 'Jó 38', 'Neemias 1', 'Ester 4',
];

/**
 * Os três formatos que cada passagem forte recebe.
 *
 * A ordem importa: os dois primeiros são "intenção de artefato" — a pessoa quer
 * levar alguma coisa embora (um esboço, um plano de aula). Esses são os que
 * resistem à resposta automática do Google, porque nenhum resumo na tela de busca
 * entrega um plano de aula com dinâmica e gabarito.
 */
export const FORMATOS_POR_PASSAGEM = [
  {
    tipo: 'sermao',
    modo: 'sermao',
    publico: 'igreja',
    termo: (ref) => `esboço de sermão sobre ${ref}`,
    slug: (ref) => `esboco-${ref}`,
    intencao: 'artefato',
  },
  {
    tipo: 'tema',
    modo: 'curso',
    publico: 'professores',
    termo: (ref) => `aula de escola dominical sobre ${ref}`,
    slug: (ref) => `aula-ebd-${ref}`,
    intencao: 'artefato',
  },
  {
    tipo: 'estudo',
    modo: 'estudo',
    publico: 'igreja',
    termo: (ref) => `estudo bíblico de ${ref}`,
    slug: (ref) => ref,
    intencao: 'resposta',
  },
];
