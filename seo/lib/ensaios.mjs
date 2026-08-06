// ============================================================================
// Ensaios — páginas fixas, escritas à mão
// ============================================================================
// Diferente das páginas de /estudo e /tema, que são geradas pelo modelo, estas
// são texto autoral e não mudam a cada rodada.
//
// Por que existem: há buscas com angústia real por trás e nenhuma resposta séria
// disponível ("posso usar inteligência artificial para pregar?"). Quem digita isso
// é exatamente o público do produto, no momento exato da dúvida. Uma página que
// responde com honestidade — inclusive dizendo onde a ferramenta NÃO deve ser
// usada — ganha a confiança que nenhum anúncio compra.
//
// Regra desta pasta: o texto tem que se sustentar sozinho, como artigo. Se sair
// panfleto, o leitor sente, o Google sente, e o efeito é o contrário.
// ============================================================================

export const ENSAIOS = [
  {
    slug: 'usar-ia-para-pregar',
    tituloSeo: 'Posso usar inteligência artificial para preparar sermão?',
    h1: 'Posso usar inteligência artificial para preparar um sermão?',
    descricao: 'Uma resposta honesta: o que a IA pode legitimamente fazer no preparo, onde ela não deve entrar, e um teste de três perguntas para decidir. Com o precedente histórico das ferramentas de gabinete.',
    resumo: 'A pergunta é legítima e merece mais que um "pode" ou "não pode". Onde está a linha, por que ela está aí, e o que fazer com o tempo que sobra.',
    atualizado: '2026-07-21',

    // Perguntas e respostas para o schema FAQPage — é o que faz o Google exibir
    // a resposta direto no resultado de busca.
    faq: [
      {
        p: 'É pecado usar inteligência artificial para preparar um sermão?',
        r: 'Não há texto bíblico que trate de inteligência artificial. A questão não é a ferramenta, e sim o uso: pregar um texto que você não leu, não estudou e não orou é irresponsável com ou sem IA. Usar uma ferramenta para levantar contexto, conferir o original e organizar a estrutura é o mesmo trabalho que se fazia com léxico e concordância — mais rápido.',
      },
      {
        p: 'A IA substitui a direção do Espírito Santo no preparo?',
        r: 'Não, e não pode. Uma ferramenta de pesquisa levanta informação; ela não conhece a sua igreja, não intercede, não convence do pecado e não dá discernimento. Ela ocupa o lugar da concordância e do comentário, não o lugar da oração. O risco real não é a ferramenta trabalhar demais — é o pregador deixar de orar porque o material chegou pronto.',
      },
      {
        p: 'Preciso avisar a igreja que usei inteligência artificial?',
        r: 'Ninguém anuncia do púlpito qual comentário consultou. O problema não é a ferramenta usada na pesquisa, e sim atribuir a Deus o que veio de uma máquina. Enquanto o material for insumo de estudo — verificado, filtrado e assimilado por você — a mensagem continua sendo sua. Apresentar texto gerado como revelação recebida é outra coisa, e essa é desonesta.',
      },
      {
        p: 'Como saber se estou usando a IA de forma correta no ministério?',
        r: 'Três perguntas: eu li e estudei a passagem por mim mesmo antes de subir ao púlpito? Eu conferi na Escritura o que a ferramenta afirmou? O tempo que economizei foi para oração, cuidado pastoral e família, ou apenas para preparar menos? Se as três respostas forem boas, a ferramenta está no lugar certo.',
      },
    ],

    corpo: `
<p class="abertura">Muita gente faz essa pergunta em silêncio. Abre a ferramenta,
prepara o material, e fica com um incômodo que não sabe bem onde colocar — como se
tivesse pegado um atalho que não devia. Vale enfrentar a pergunta de frente, porque
ela é boa e a resposta não é óbvia.</p>

<h2>Primeiro, o que está realmente em jogo</h2>

<p>A preocupação não é com tecnologia. Ninguém se sente culpado por usar microfone,
projetor ou por ler a Bíblia num aplicativo. O incômodo aparece porque o preparo da
mensagem não é visto como tarefa administrativa — é visto como um lugar de encontro.
As horas debruçado sobre o texto são horas em que Deus fala ao pregador antes de
falar pela boca dele.</p>

<p>Quem teme que a ferramenta esfrie o estudo está protegendo algo <strong>certo</strong>.
E é justamente por isso que a resposta merece cuidado, em vez de um "relaxa, é só
uma ferramenta".</p>

<h2>A história já viu esse mesmo medo — várias vezes</h2>

<p>Nenhuma ferramenta de gabinete entrou na igreja sem desconfiança.</p>

<p>Quando a imprensa de Gutenberg colocou a Bíblia ao alcance de gente comum, houve
quem argumentasse que a leitura sem mediação produziria erro em massa. Quando as
concordâncias se popularizaram — a de Alexander Cruden, no século XVIII, depois a de
James Strong, no fim do XIX — a acusação foi que entregavam pronto aquilo que o
estudante deveria buscar suando. A Bíblia interlinear foi acusada de dar grego a quem
nunca estudou grego. E nos anos 90, quando os primeiros softwares bíblicos chegaram
aos gabinetes, ouviu-se de novo: isso vai matar o trabalho sério de pesquisa.</p>

<p>Olhando para trás, o padrão é claro. Nenhuma dessas ferramentas fez um só pregador
orar menos. Nenhuma delas produziu uma geração de pregadores mais rasa que a anterior.
O que todas fizeram foi a mesma coisa: <strong>encurtar o trabalho braçal</strong> —
procurar, comparar, conferir, organizar — e devolver horas que antes iam embora
folheando páginas.</p>

<p>Isso não encerra o assunto. Uma ferramenta nova pode ser diferente das anteriores,
e há uma diferença real aqui: as antigas devolviam <em>dados</em>, e esta devolve
<em>texto pronto</em>. É exatamente aí que mora o cuidado.</p>

<h2>Onde está a linha</h2>

<p>A pergunta útil não é "posso ou não posso". É "para quê".</p>

<h3>Usos legítimos — o mesmo trabalho, mais rápido</h3>

<ul>
  <li><strong>Levantar contexto histórico e literário.</strong> Quem escreveu, para
  quem, quando, respondendo a quê. Isso está em qualquer introdução de comentário;
  o que muda é o tempo de acesso.</li>
  <li><strong>Conferir os termos no original.</strong> A forma gramatical, o campo
  semântico, onde mais a palavra aparece. Trabalho de léxico, que sempre foi feito
  com ferramenta.</li>
  <li><strong>Mapear referências cruzadas.</strong> Que outras passagens iluminam
  esta, e por quê.</li>
  <li><strong>Organizar a estrutura.</strong> Ver o argumento do texto em blocos,
  perceber o quiasmo, a inclusão, a progressão.</li>
  <li><strong>Encontrar o que você não sabia que não sabia.</strong> A variante
  textual que muda o sentido, a objeção que a igreja vai levantar, o erro comum de
  interpretação daquela passagem.</li>
</ul>

<h3>Usos que corrompem — e aqui não há meio-termo</h3>

<ul>
  <li><strong>Pregar um texto que você não leu, não estudou e não orou.</strong>
  Isto já era errado antes de existir IA. Quem sobe ao púlpito com material que
  atravessou os olhos e não o coração está fazendo outra coisa, não pregação.</li>
  <li><strong>Apresentar como revelação o que veio de uma máquina.</strong> Ninguém
  anuncia qual comentário consultou, e não precisa. Mas dizer "Deus me mostrou" sobre
  um parágrafo que você leu na tela cinco minutos antes é mentira — e mentira dita
  em nome de Deus.</li>
  <li><strong>Deixar de verificar.</strong> Toda ferramenta erra. Comentário erra,
  pregador erra, e sistema de IA erra com uma fluência perigosa: o texto sai bem
  escrito mesmo quando está errado. Nada vai ao púlpito sem passar pela Escritura.</li>
  <li><strong>Trocar o estudo pelo atalho permanente.</strong> Se o pregador nunca
  mais abrir um léxico, nunca mais lutar com um texto difícil e nunca mais crescer,
  a ferramenta virou muleta. Ela devia ser andaime.</li>
</ul>

<h2>O teste das três perguntas</h2>

<p>Antes de subir ao púlpito com material preparado com qualquer ferramenta — IA,
comentário, sermão de outro pregador —, três perguntas resolvem quase tudo:</p>

<blockquote class="teste">
  <p><strong>1.</strong> Eu li, estudei e orei sobre esta passagem por mim mesmo?</p>
  <p><strong>2.</strong> Eu conferi na Escritura o que a ferramenta afirmou?</p>
  <p><strong>3.</strong> O tempo que economizei foi para onde?</p>
</blockquote>

<p>A terceira é a que mais dói, e é a mais importante.</p>

<h2>O que fazer com as horas que sobraram</h2>

<p>Um pregador que levava seis horas para preparar e agora leva uma tem cinco horas
nas mãos. Elas vão para algum lugar — a questão é para qual.</p>

<p>Se viraram oração pela mensagem e pelas pessoas que vão ouvi-la, consagração antes
de pregar, a visita àquele irmão que ninguém procurou, o jantar de sábado com a
família que há meses via o pai fechado no escritório — então não se perdeu
espiritualidade nenhuma. <strong>Recuperou-se o que a preparação vinha tomando.</strong></p>

<p>Se viraram apenas menos preparo e mais tempo no celular, o problema não é a
ferramenta. Nunca foi.</p>

<blockquote class="versiculo-ensaio">
  Remindo o tempo, porquanto os dias são maus.
  <cite>Efésios 5:16</cite>
</blockquote>

<p>O texto de Paulo não fala de produtividade — fala de urgência, de comprar o tempo
de volta porque os dias são difíceis e curtos. Mas o princípio alcança o gabinete:
tempo é recurso a ser resgatado para o que importa, não gasto por gasto.</p>

<h2>O que a ferramenta não pode fazer — e nunca poderá</h2>

<p>Vale dizer com todas as letras, porque é o que define o lugar dela.</p>

<p>Ela não ora. Não conhece a viúva da terceira fileira nem o jovem que parou de vir.
Não sabe o que a sua igreja atravessou este ano. Não carrega o peso de olhar para
duzentas pessoas sabendo que vai responder por cada palavra. Não recebe direção, não
tem discernimento espiritual e não vai lhe dar uma palavra.</p>

<p>Ela levanta informação. Isso é útil, e isso é tudo.</p>

<p><strong>A linha, no fim, é simples:</strong> a ferramenta pode fazer o trabalho
que você faria com livros. Não pode fazer o trabalho que você faria de joelhos.</p>

<h2>Uma palavra a quem continua desconfortável</h2>

<p>Cristãos sérios divergem sobre isto, e a divergência é legítima. Há quem entenda
que o esforço da pesquisa faz parte da formação do pregador e não deve ser encurtado —
que a luta com o texto é onde o caráter é forjado, não só onde o conteúdo é achado.
É um argumento honesto, e quem o sustenta não está sendo atrasado.</p>

<p>Se essa é a sua convicção, siga-a. Romanos 14 trata exatamente disso: consciência
não se atropela, nem a sua nem a do irmão. Ninguém precisa usar ferramenta alguma
para pregar fielmente.</p>

<p>Mas se o seu incômodo era só a falta de alguém tratando o assunto com seriedade em
vez de vender solução fácil ou condenar sem pensar — espero que esta página tenha
ajudado.</p>
`,

    // Chamada final: presente, mas depois do texto e sem disfarce.
    cta: {
      titulo: 'Sobre a Bíblia Expositiva',
      texto: `Este site é de uma ferramenta de estudo bíblico, e seria estranho esconder
      isso numa página sobre este assunto. Ela foi construída dentro dos limites descritos
      acima: entrega material de pesquisa denso — contexto, línguas originais, referências
      cruzadas, estrutura — com cada afirmação etiquetada pelo seu nível de confiabilidade,
      para você enxergar o que é Escritura, o que é consenso e o que é hipótese. Ela não
      escreve a sua mensagem, e foi desenhada para nunca tentar.`,
      botao: 'Conhecer a ferramenta',
      href: '/',
    },
  },
];
