// ============================================================================
// Temas e personagens — onde está o volume de busca de verdade
// ============================================================================
// A fila nasceu centrada em passagens ("João 3", "Salmos 23"). Isso cobre o
// pilar 5 (preparação ministerial) e parte do 4, mas ignora os pilares 1, 2 e 3 —
// que são justamente os de maior volume: emoção, família e vida cristã prática.
//
// Ninguém digita "Filipenses 4:6" quando está com medo às duas da manhã.
// Digita "versículo para ansiedade".
//
// Cada tema vira múltiplas páginas, uma por formato. "Ansiedade" atende três
// pessoas diferentes: quem está sofrendo (estudo), o pastor que vai pregar sobre
// isso (esboço) e o líder de célula que vai conduzir a conversa (roteiro).
// ============================================================================

/** Formatos por intenção — reutilizados pelos pilares. */
const F = {
  estudo:   { tipo: 'tema',   modo: 'estudo',        publico: 'igreja',      intencao: 'resposta', termo: (t) => `o que a bíblia diz sobre ${t}`,          slug: (t) => `${t}` },
  sermao:   { tipo: 'sermao', modo: 'sermao',        publico: 'igreja',      intencao: 'artefato', termo: (t) => `esboço de sermão sobre ${t}`,            slug: (t) => `esboco-${t}` },
  celula:   { tipo: 'tema',   modo: 'pequeno_grupo', publico: 'igreja',      intencao: 'artefato', termo: (t) => `estudo para célula sobre ${t}`,          slug: (t) => `celula-${t}` },
  ebd:      { tipo: 'tema',   modo: 'curso',         publico: 'professores', intencao: 'artefato', termo: (t) => `aula de escola dominical sobre ${t}`,    slug: (t) => `aula-ebd-${t}` },
  jovens:   { tipo: 'tema',   modo: 'estudo',        publico: 'jovens',      intencao: 'artefato', termo: (t) => `estudo bíblico para jovens sobre ${t}`,  slug: (t) => `jovens-${t}` },
  apolog:   { tipo: 'tema',   modo: 'apologetica',   publico: 'igreja',      intencao: 'resposta', termo: (t) => `o que a bíblia diz sobre ${t}`,          slug: (t) => `${t}` },
  personagem: { tipo: 'tema', modo: 'estudo',        publico: 'igreja',      intencao: 'resposta', termo: (t) => `estudo bíblico sobre ${t}`,              slug: (t) => `${t}` },
  personagemSermao: { tipo: 'sermao', modo: 'sermao', publico: 'igreja',     intencao: 'artefato', termo: (t) => `esboço de sermão sobre ${t}`,            slug: (t) => `esboco-${t}` },
};

export const PILARES = [
  // -------------------------------------------------------------------------
  {
    id: 'emocoes',
    nome: 'Vida prática, emoções e saúde mental',
    prioridade: 100,                 // maior volume de busca de todos
    formatos: [F.estudo, F.sermao, F.celula],
    // `cuidado` liga um aviso visível de apoio profissional na página.
    // Não é enfeite: quem procura isso pode estar em sofrimento real, e uma
    // página que só oferece versículo e um botão de assinatura é irresponsável.
    // O Google também trata saúde como YMYL e cobra padrão de qualidade maior.
    cuidado: true,
    temas: [
      'ansiedade', 'medo', 'depressão', 'tristeza', 'angústia', 'preocupação',
      'estresse', 'cansaço e esgotamento', 'insônia', 'solidão', 'rejeição',
      'baixa autoestima', 'culpa', 'vergonha', 'raiva', 'amargura',
      'luto e perda', 'saúde mental', 'paz de espírito', 'esperança',
      'força em momentos difíceis', 'provações e sofrimento', 'perdoar a si mesmo',
      'perdoar quem nos feriu', 'cura emocional', 'traumas do passado',
      'vício', 'gratidão', 'alegria', 'paciência', 'confiança em Deus',
    ],
  },
  // -------------------------------------------------------------------------
  {
    id: 'familia',
    nome: 'Relacionamentos e família',
    prioridade: 95,
    formatos: [F.estudo, F.sermao, F.ebd],
    temas: [
      'casamento', 'restauração do casamento', 'papel do marido',
      'papel da esposa', 'brigas no casamento', 'traição e adultério',
      'divórcio', 'submissão no casamento', 'amor no casamento',
      'criação de filhos', 'educar filhos na fé', 'filhos rebeldes',
      'disciplina de filhos', 'honrar pai e mãe', 'namoro cristão',
      'escolher a pessoa certa', 'santidade no namoro', 'noivado',
      'sogros e família estendida', 'perdão dentro da família',
      'família em crise', 'lar cristão', 'amizade', 'como tratar os inimigos',
    ],
  },
  // -------------------------------------------------------------------------
  {
    id: 'vida-crista',
    nome: 'Práticas da vida cristã',
    prioridade: 90,
    formatos: [F.estudo, F.sermao, F.celula, F.jovens],
    temas: [
      'oração', 'como orar', 'oração não respondida', 'jejum',
      'como fazer jejum', 'leitura da Bíblia', 'propósito de vida',
      'plano de Deus para minha vida', 'vontade de Deus', 'chamado ministerial',
      'dízimo', 'ofertas', 'finanças', 'dívidas', 'prosperidade',
      'trabalho', 'vocação', 'servir na igreja', 'evangelismo',
      'batismo', 'santa ceia', 'comunhão', 'discipulado', 'obediência',
      'arrependimento', 'santidade', 'tentação', 'pecado habitual',
      'frutos do Espírito', 'dons espirituais', 'jejum e oração juntos',
      'adoração', 'louvor', 'gratidão a Deus', 'esperar em Deus',
    ],
  },
  // -------------------------------------------------------------------------
  {
    id: 'teologia',
    nome: 'Teologia, escatologia e dúvidas frequentes',
    prioridade: 85,
    formatos: [F.apolog, F.sermao, F.ebd],
    temas: [
      'fim dos tempos', 'arrebatamento', 'segunda vinda de Cristo',
      'juízo final', 'grande tribulação', 'milênio', 'anticristo',
      'sinais dos tempos', 'céu', 'inferno', 'vida após a morte',
      'ressurreição dos mortos', 'armadura de Deus', 'batalha espiritual',
      'anjos', 'demônios', 'Satanás', 'possessão demoníaca',
      'graça', 'salvação', 'salvação pela fé ou pelas obras',
      'livre-arbítrio', 'predestinação', 'perdão dos pecados',
      'pecado imperdoável', 'perder a salvação', 'Jesus é Deus',
      'Trindade', 'divindade de Cristo', 'missão de Jesus',
      'Espírito Santo', 'quem é o Espírito Santo', 'batismo no Espírito Santo',
      'sofrimento e Deus', 'por que Deus permite o mal', 'criação e evolução',
      'existência de Deus', 'a Bíblia é confiável', 'lei e graça',
      'velho e novo testamento', 'Israel e a igreja',
    ],
  },
  // -------------------------------------------------------------------------
  {
    id: 'personagens',
    nome: 'Personagens bíblicos',
    prioridade: 88,
    formatos: [F.personagem, F.personagemSermao, F.ebd],
    temas: [
      'Abraão', 'Isaque', 'Jacó', 'José do Egito', 'Moisés', 'Josué',
      'Gideão', 'Sansão', 'Rute', 'Samuel', 'Saul', 'Davi', 'Salomão',
      'Elias', 'Eliseu', 'Jó', 'Isaías', 'Jeremias', 'Ezequiel', 'Daniel',
      'Jonas', 'Neemias', 'Esdras', 'Ester', 'Noé', 'Adão e Eva', 'Caim e Abel',
      'Maria mãe de Jesus', 'João Batista', 'Pedro', 'Paulo', 'Tiago',
      'João o discípulo amado', 'Tomé', 'Judas Iscariotes', 'Estêvão',
      'Barnabé', 'Timóteo', 'Lídia', 'Priscila e Áquila', 'Zaqueu',
      'a mulher samaritana', 'Marta e Maria', 'Lázaro', 'Nicodemos',
      'o filho pródigo', 'o bom samaritano', 'Raabe', 'Débora', 'Ana mãe de Samuel',
    ],
  },
];

/**
 * Aviso de apoio nas páginas de sofrimento emocional.
 *
 * Aparece antes do bloco de venda, de propósito: quem chegou aqui em crise
 * precisa ver isto antes de qualquer coisa comercial. Se essa pessoa não virar
 * assinante, tudo bem — é o preço certo a pagar.
 *
 * O CVV é o canal nacional de apoio emocional: 188, gratuito, 24 horas.
 */
export const AVISO_CUIDADO = `
    <aside class="cuidado" role="note">
      <p><strong>Se você está passando por isso agora</strong>, procure alguém de
      confiança — seu pastor, um familiar, um profissional de saúde. Fé e cuidado
      profissional não competem entre si: um sofrimento que se arrasta merece
      acompanhamento, do mesmo jeito que uma fratura merece um médico.</p>
      <p>Se a dor estiver pesada demais, o <strong>CVV</strong> atende de graça,
      24 horas por dia, pelo telefone <strong>188</strong> ou em
      <a href="https://www.cvv.org.br" rel="nofollow noopener" target="_blank">cvv.org.br</a>.
      Ligar não custa nada e não compromete você a nada.</p>
    </aside>`;
