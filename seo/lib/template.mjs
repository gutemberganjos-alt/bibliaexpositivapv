// Template da página pública.
//
// Decisão central: HTML puro, sem React, sem hidratação, sem JS obrigatório.
// O app é 100% client-side (Vite/React) — o Google até executa JS, mas com fila,
// atraso e falhas. Página de conteúdo tem que existir no primeiro byte.
// O CSS vai embutido: uma requisição a menos, e conteúdo nunca fica invisível
// esperando uma folha de estilo.

import { SITE, NOME_SITE, PREFIXOS } from '../config.mjs';
import { escapar } from './util.mjs';
import { AVISO_CUIDADO } from './temas.mjs';

export const CSS = `
:root{
  --fundo:#F6F1E7; --card:#FFFDF7; --navy:#0E2038; --navy2:#1E3B63;
  --texto:#24302B; --medio:#5C6B82; --borda:#E3DCCC; --ouro:#A97C1E;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fundo);color:var(--texto);
  font-family:Literata,Georgia,'Times New Roman',serif;font-size:18px;line-height:1.72}
a{color:var(--navy2)}
.topo{background:var(--navy);color:#fff}
.topo .interno{max-width:920px;margin:0 auto;padding:.9rem 1.25rem;display:flex;
  align-items:center;justify-content:space-between;gap:1rem}
.topo a{color:#fff;text-decoration:none}
.marca{font-family:'Playfair Display',Georgia,serif;font-size:1.15rem;font-weight:600;letter-spacing:.01em}
.botao{display:inline-block;background:var(--ouro);color:#1a1206!important;text-decoration:none;
  font-family:Manrope,system-ui,sans-serif;font-weight:700;font-size:.9rem;
  padding:.6rem 1.15rem;border-radius:8px;line-height:1.2}
.botao:hover{filter:brightness(1.07)}
main{max-width:760px;margin:0 auto;padding:1.5rem 1.25rem 4rem}
.trilha{font-family:Manrope,system-ui,sans-serif;font-size:.8rem;color:var(--medio);margin:.4rem 0 1.4rem}
.trilha a{color:var(--medio)}
h1{font-family:'Playfair Display',Georgia,serif;font-size:2.05rem;line-height:1.22;
  margin:.2rem 0 .5rem;color:var(--navy);font-weight:600}
.ficha{font-family:Manrope,system-ui,sans-serif;font-size:.82rem;color:var(--medio);
  display:flex;flex-wrap:wrap;gap:.35rem .9rem;margin-bottom:1.8rem;
  padding-bottom:1.1rem;border-bottom:1px solid var(--borda)}
article h4{font-family:'Playfair Display',Georgia,serif;font-size:1.32rem;color:var(--navy);
  margin:2.2rem 0 .7rem;font-weight:600;line-height:1.3}
article p{margin:0 0 1.05rem}
article ul,article ol{margin:0 0 1.15rem;padding-left:1.3rem}
article li{margin-bottom:.45rem}
article blockquote{margin:1.4rem 0;padding:.9rem 1.2rem;background:var(--card);
  border-left:3px solid var(--ouro);border-radius:0 8px 8px 0;font-style:italic}
article blockquote cite{display:block;margin-top:.5rem;font-style:normal;
  font-family:Manrope,system-ui,sans-serif;font-size:.82rem;color:var(--medio)}
article strong{color:var(--navy)}
.selo{display:inline-block;font-family:Manrope,system-ui,sans-serif;font-size:.62rem;
  font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.08rem .45rem;
  border-radius:999px;border:1px solid transparent;vertical-align:middle;white-space:nowrap;line-height:1.4}
.selo-escritura{color:#7A5E12;background:rgba(201,168,76,.2);border-color:rgba(160,130,40,.6)}
.selo-consenso{color:#1E6B40;background:rgba(42,122,74,.16);border-color:rgba(42,122,74,.55)}
.selo-aceita{color:#285E70;background:rgba(58,110,130,.16);border-color:rgba(58,110,130,.55)}
.selo-debatida{color:#6B5A0E;background:rgba(122,106,16,.16);border-color:rgba(122,106,16,.6)}
.selo-hipotese{color:#8C2B2B;background:rgba(122,31,31,.14);border-color:rgba(122,31,31,.5)}
.selo-tradicao{color:#55447A;background:rgba(90,70,120,.16);border-color:rgba(90,70,120,.55)}
/* Aviso de apoio em páginas de sofrimento emocional. Vem ANTES do bloco de
   venda, de propósito: quem chega em crise precisa ver isto primeiro. */
.cuidado{margin:2.2rem 0 0;padding:1.3rem 1.4rem;background:#EFF3F7;
  border:1px solid #D3DDE8;border-radius:12px}
.cuidado p{font-family:Manrope,system-ui,sans-serif;font-size:.92rem;
  line-height:1.65;color:#3D4A5C;margin:0 0 .8rem}
.cuidado p:last-child{margin-bottom:0}
.cuidado strong{color:#1E3B63}
.cuidado a{color:#1E3B63;font-weight:700}
/* ---- Bloco de conversão -------------------------------------------------- */
/* A transição do texto para a oferta é o momento mais delicado da página.
   O gradiente no topo faz o conteúdo "desaparecer" em vez de bater numa parede:
   o leitor sente que o texto continua, e não que foi expulso. */
.corte{position:relative;margin-top:0;padding:3.5rem 0 0}
.corte::before{content:"";position:absolute;top:-7rem;left:0;right:0;height:7rem;
  background:linear-gradient(to bottom,rgba(246,241,231,0),var(--fundo));pointer-events:none}
.corte h2{font-family:'Playfair Display',Georgia,serif;font-size:1.62rem;color:var(--navy);
  margin:0 0 .7rem;font-weight:600;line-height:1.28}
.corte h3{font-family:'Playfair Display',Georgia,serif;font-size:1.22rem;color:var(--navy);
  margin:0 0 .7rem;font-weight:600;line-height:1.32}
.corte p{margin:0 0 1rem;font-size:1rem}
.corte-topo{padding:1.6rem 1.5rem;background:var(--card);border:1px solid var(--borda);
  border-radius:14px 14px 0 0;border-bottom:none}
.corte-onde{font-family:Manrope,system-ui,sans-serif;font-size:.78rem;
  text-transform:uppercase;letter-spacing:.09em;color:var(--medio);margin:0 0 .5rem!important}
.corte-secoes{list-style:none;margin:0;padding:0}
.corte-secoes li{font-family:Manrope,system-ui,sans-serif;font-size:.94rem;
  color:var(--texto);padding:.42rem 0 .42rem 1.5rem;position:relative;
  border-bottom:1px solid rgba(227,220,204,.7)}
.corte-secoes li:last-child{border-bottom:none}
.corte-secoes li::before{content:"—";position:absolute;left:0;color:var(--ouro);font-weight:700}
.oferta-bloco{padding:1.6rem 1.5rem;background:var(--card);border:1px solid var(--borda);
  border-top:none;border-radius:0}
.oferta-bloco:last-of-type{border-radius:0 0 14px 14px}
.oferta-bloco.destaque{background:linear-gradient(to bottom,#FFFDF7,#F7F2E6)}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:0;
  background:var(--card);border:1px solid var(--borda);border-top:none}
.grade-col{padding:1.3rem 1.5rem}
.grade-col+.grade-col{border-left:1px solid var(--borda)}
.grade-titulo{font-family:Manrope,system-ui,sans-serif!important;font-size:.76rem!important;
  text-transform:uppercase;letter-spacing:.1em;color:var(--ouro)!important;
  margin:0 0 .5rem!important;font-weight:700}
.grade-col p{font-family:Manrope,system-ui,sans-serif;font-size:.9rem;
  color:var(--medio);margin:0;line-height:1.7}
.grade-col strong{color:var(--navy)}
.selos-amostra{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1.1rem!important}
/* Bloco de objeção: o texto mais importante da página. Respira mais que o resto
   porque é lido devagar — quem chega aqui está decidindo, não escaneando. */
.oferta-bloco.objecao{background:#FBF7EE}
.objecao p{margin-bottom:1.15rem}
.objecao .virada{font-family:'Playfair Display',Georgia,serif;font-size:1.16rem;
  line-height:1.45;color:var(--navy);border-left:3px solid var(--ouro);
  padding:.15rem 0 .15rem 1rem;margin:1.5rem 0!important}
.versiculo{margin:1.6rem 0 .2rem!important;padding:0;background:none;border:none;
  border-top:1px solid var(--borda);padding-top:1.2rem;
  font-family:'Playfair Display',Georgia,serif;font-style:italic;
  font-size:1.05rem;color:var(--medio);text-align:center}
.versiculo cite{display:block;margin-top:.45rem;font-style:normal;
  font-family:Manrope,system-ui,sans-serif;font-size:.78rem;
  letter-spacing:.06em;text-transform:uppercase;color:var(--ouro)}
.preco{margin-top:1.6rem;padding:1.8rem 1.5rem;background:var(--navy);
  border-radius:14px;text-align:center;color:#DCE4EF}
.preco-linha{font-family:Manrope,system-ui,sans-serif;font-size:1.15rem;color:#fff;
  margin:0 0 .35rem!important}
.preco-linha strong{color:var(--ouro-claro,#E4BE6B);font-size:1.55rem}
.preco-nota{font-family:Manrope,system-ui,sans-serif;font-size:.88rem;
  color:#B9C4D4;margin:0 0 1.3rem!important}
.preco-nota strong{color:#fff}
.preco .miudo{color:#93A2B8;margin-top:1rem}
.botao-grande{font-size:1rem;padding:.85rem 1.6rem}
.fecho{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:1.12rem;
  color:var(--medio);text-align:center;margin:2.2rem 0 0!important}
.miudo{font-family:Manrope,system-ui,sans-serif;font-size:.82rem;color:var(--medio);
  margin-top:.8rem;line-height:1.65}
.vizinhos{margin-top:3rem;padding-top:1.6rem;border-top:1px solid var(--borda)}
.vizinhos h2{font-family:Manrope,system-ui,sans-serif;font-size:.82rem;text-transform:uppercase;
  letter-spacing:.09em;color:var(--medio);margin:0 0 .9rem;font-weight:700}
.vizinhos ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.vizinhos a{font-size:.98rem;text-decoration:none;border-bottom:1px solid rgba(30,59,99,.25)}
.vizinhos a:hover{border-bottom-color:var(--navy2)}
footer{background:var(--navy);color:#B9C4D4;margin-top:4rem}
footer .interno{max-width:920px;margin:0 auto;padding:2rem 1.25rem;
  font-family:Manrope,system-ui,sans-serif;font-size:.84rem}
footer a{color:#DCE4EF}
@media(max-width:640px){
  body{font-size:17px}
  h1{font-size:1.6rem}
  .topo .interno{flex-direction:column;align-items:flex-start;gap:.65rem}
  .corte h2{font-size:1.34rem}
  .corte-topo,.oferta-bloco,.grade-col,.preco{padding-left:1.15rem;padding-right:1.15rem}
  .grade{grid-template-columns:1fr}
  .grade-col+.grade-col{border-left:none;border-top:1px solid var(--borda)}
  .botao-grande{display:block;text-align:center}
}
`.trim();

const nomeModo = {
  devocional: 'Devocional', estudo: 'Estudo bíblico', sermao: 'Esboço de sermão',
  exegese: 'Exegese', curso: 'Aula de 1 hora', pergunte_texto: 'Estudo indutivo',
  pequeno_grupo: 'Roteiro de pequeno grupo', discipulado: 'Discipulado', apologetica: 'Apologética',
};
const nomePublico = {
  criancas: 'crianças', adolescentes: 'adolescentes', jovens: 'jovens', igreja: 'igreja',
  professores: 'professores de EBD', pastores: 'pastores', teologia: 'estudo acadêmico',
};

const rotulo = { estudo: 'Estudos', tema: 'Temas', sermao: 'Sermões' };

/**
 * Título da aba (<title>) — diferente do <h1>.
 *
 * O modelo cria títulos bonitos ("O Verbo se Fez Carne: Um Estudo Profundo de
 * João 1"), ótimos para quem já está lendo. Mas o Google casa a busca com o
 * começo do <title>, e ninguém digita "o verbo se fez carne" — digita
 * "estudo bíblico de joão 1". Então o <title> começa pelo termo buscado e o
 * <h1> mantém o título criativo, que é o que convence depois do clique.
 *
 * Limite prático do Google: ~60 caracteres. Passou disso, ele corta com "…" e
 * a parte cortada é justamente a que você escolheu.
 */
const LIMITE_TITULO = 62;

// Os termos vêm do autocomplete, tudo em minúscula ("o que a bíblia diz sobre…").
// Num site cristão, "bíblia" e "deus" em caixa baixa no título passam desleixo.
const PROPRIOS = {
  biblia: 'Bíblia', bíblia: 'Bíblia', deus: 'Deus', jesus: 'Jesus',
  cristo: 'Cristo', senhor: 'Senhor', espirito: 'Espírito', espírito: 'Espírito',
  santo: 'Santo', evangelho: 'Evangelho', igreja: 'Igreja', ebd: 'EBD',
};

function ajustarCaixa(texto) {
  const t = String(texto).replace(/\b[\wÀ-ÿ]+\b/g, (p) => PROPRIOS[p.toLowerCase()] ?? p);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function montarTituloSeo(pagina) {
  const termo = String(pagina.termo ?? '').trim();
  const base = termo ? ajustarCaixa(termo) : String(pagina.titulo ?? '');

  // Parte criativa: o que sobra do título do modelo depois de tirar o que já
  // está no termo (evita "Estudo bíblico de João 1: … Estudo de João 1").
  const criativo = String(pagina.titulo ?? '')
    .replace(/^(estudo b[íi]blico|estudo|exegese|serm[ãa]o|esbo[çc]o)[^:–—-]*[:–—-]\s*/i, '')
    .replace(/[:–—-]\s*um estudo.*$/i, '')
    .trim();

  const composto = criativo && !base.toLowerCase().includes(criativo.toLowerCase().slice(0, 15))
    ? `${base}: ${criativo}`
    : base;

  // A verificação é sempre sobre o texto FINAL. Medir só o pedaço antes de somar
  // o nome do site produzia títulos de 80 caracteres — e o que o Google corta com
  // "…" é justamente o fim, onde estava a parte escolhida a dedo.
  const sufixo = ` — ${NOME_SITE}`;
  if (composto.length + sufixo.length <= LIMITE_TITULO) return composto + sufixo;
  if (composto.length <= LIMITE_TITULO) return composto;
  if (base.length + sufixo.length <= LIMITE_TITULO) return base + sufixo;
  return base;
}

/**
 * Bloco de conversão. Não é um paywall agressivo: mostra exatamente o que falta,
 * pelo nome. Curiosidade específica converte muito melhor que "assine para ver".
 */
/**
 * O que este modo entrega de concreto. Tudo aqui é fato verificável do prompt
 * do servidor (supabase/functions/gerar/prompts.ts) — nenhuma promessa inventada.
 * Especificidade é o que convence pastor e professor; adjetivo não é.
 */
const PROVA_POR_MODO = {
  estudo: {
    frase: 'de 10 a 15 referências cruzadas — cada uma com uma linha explicando <em>por que</em> aquela passagem ilumina esta',
    itens: ['Contexto histórico e literário', 'Análise da passagem em ordem, com os termos originais que mudam o sentido', 'Teologia bíblica e cristologia', 'Erros comuns de interpretação'],
  },
  sermao: {
    frase: 'de 2 a 4 pontos, cada um com afirmação, demonstração no texto, ilustração e aplicação — e um esboço de uma página para levar ao púlpito',
    itens: ['Proposição em uma frase', 'Pontos desenvolvidos com os versículos que os sustentam', 'Conclusão e apelo', 'Esboço de uma página'],
  },
  exegese: {
    frase: 'no mínimo 5 termos no original com transliteração, forma gramatical, campo semântico e o uso em outras passagens',
    itens: ['Delimitação da perícope e tradução própria', 'Estrutura literária do texto', 'Variantes textuais e o peso de cada uma', 'Questões interpretativas com os melhores argumentos dos dois lados'],
  },
  curso: {
    frase: 'um cronograma de 60 minutos que diz o que o professor <em>faz</em> e <em>fala</em> em cada bloco — não apenas o tema',
    itens: ['Objetivos de aprendizagem observáveis', '6 perguntas de discussão com as respostas esperadas', 'Atividade descrita passo a passo, com tempo e material', 'Avaliação com gabarito'],
  },
  pequeno_grupo: {
    frase: '7 perguntas abertas, cada uma com uma nota ao líder sobre onde a conversa costuma travar',
    itens: ['Leitura e contexto para o líder ensinar', 'Dinâmica de fixação com passo a passo', 'Aplicação da semana', 'Oração final'],
  },
  discipulado: {
    frase: 'um caminho de encontro a encontro, com perguntas de acompanhamento e o propósito de cada uma',
    itens: ['Verdade central', 'Compreensão desenvolvida para ensinar', 'Prática da semana', 'Próximo encontro'],
  },
  apologetica: {
    frase: 'as 3 objeções mais fortes na versão real delas — não em caricatura — cada uma respondida com argumento e evidência',
    itens: ['Base bíblica', 'O raciocínio construído passo a passo', 'Como conversar com respeito', 'O que é consenso, o que é interpretação e o que está em debate'],
  },
  pergunte_texto: {
    frase: 'perguntas de observação que ensinam o método indutivo, com a resposta que o próprio texto oferece',
    itens: ['O que o texto diz', 'O que significava aos primeiros leitores', 'O que revela sobre Deus e sobre o ser humano', 'Próximo passo'],
  },
  devocional: {
    frase: 'reflexão centrada em Cristo, com aplicação concreta e oração sugerida',
    itens: ['Texto bíblico', 'Reflexão', 'Aplicação para hoje', 'Oração'],
  },
};

/**
 * O bloco de conversão.
 *
 * Princípio: não vender "IA que escreve sermão". Vender as horas de gabinete de
 * volta e a segurança de ensinar sem medo de errar. O leitor aqui é alguém que
 * vai ficar de pé na frente de pessoas e responder pelo que disser — o que o
 * convence é rigor demonstrado, não entusiasmo.
 *
 * Nada de escassez inventada, cronômetro ou "últimas vagas". Este público
 * conversa entre si e o produto vende confiabilidade; truque de checkout aqui
 * destrói exatamente o ativo que estamos construindo.
 */
function blocoCorte(pagina) {
  const bloqueadas = pagina.meta?.secoes_bloqueadas ?? [];
  const prova = PROVA_POR_MODO[pagina.modo_id] ?? PROVA_POR_MODO.estudo;
  const publico = nomePublico[pagina.publico_id] ?? 'a igreja';
  const restante = Math.max(1, Math.round((pagina.palavras_total - pagina.palavras_previa) / 100) * 100);

  const corte = bloqueadas.length
    ? `
      <div class="corte-topo">
        <p class="corte-onde">Você leu ${Math.round((pagina.palavras_previa / Math.max(pagina.palavras_total, 1)) * 100)}% deste material.</p>
        <h2>Faltam ${restante} palavras — e são as que você vai usar</h2>
        <p>O que está adiante neste mesmo texto:</p>
        <ul class="corte-secoes">${bloqueadas.map((s) => `<li>${escapar(s)}</li>`).join('')}</ul>
      </div>`
    : `
      <div class="corte-topo">
        <h2>Este estudo foi escrito para ${escapar(publico)}</h2>
        <p>E o seu público talvez seja outro.</p>
      </div>`;

  return `
    <section class="corte" id="assinar">
      ${corte}

      <div class="oferta-bloco">
        <h3>Só que o que falta de verdade não é o resto deste texto</h3>
        <p>Esta página traz <strong>uma</strong> versão, escrita para <strong>${escapar(publico)}</strong>.
        Na terça você vai precisar da mesma passagem para os adolescentes. No sábado,
        de um esboço para o púlpito. Na quarta, de uma aula de EBD com dinâmica e gabarito.
        Nenhum blog resolve isso — porque cada um desses é um material diferente,
        escrito do zero.</p>
        <p><strong>É exatamente isso que a Bíblia Expositiva faz em minutos:</strong>
        você escolhe a passagem, o formato e quem vai ouvir. O material sai pronto
        para o formato certo.</p>
      </div>

      <div class="grade">
        <div class="grade-col">
          <h4 class="grade-titulo">9 formatos</h4>
          <p>Devocional · Estudo bíblico · Sermão · <strong>Exegese</strong> ·
          Curso de 1h · Pequeno grupo · Discipulado · Apologética · Estudo indutivo</p>
        </div>
        <div class="grade-col">
          <h4 class="grade-titulo">7 públicos</h4>
          <p>Crianças · Adolescentes · Jovens · Igreja · <strong>Professores de EBD</strong> ·
          Pastores · Estudantes de teologia</p>
        </div>
      </div>

      <div class="oferta-bloco">
        <h3>Profundidade não é promessa. É especificação.</h3>
        <p>Todo <strong>${escapar(nomeModo[pagina.modo_id] ?? 'estudo')}</strong> gerado aqui
        é obrigado a entregar ${prova.frase}.</p>
        <ul class="corte-secoes">${prova.itens.map((i) => `<li>${i}</li>`).join('')}</ul>
        <p class="miudo">Toda entrega é conferida antes de aparecer na sua tela: se faltar
        qualquer uma das seções obrigatórias, o material é recusado e refeito — você
        nunca recebe um estudo pela metade.</p>
      </div>

      <div class="oferta-bloco destaque">
        <h3>Você vai responder pelo que ensinar. Por isso cada afirmação vem etiquetada.</h3>
        <p>Comentário genérico mistura o que a Bíblia afirma com o que um autor supõe.
        Quem ensina paga essa conta. Aqui, cada afirmação central carrega o seu nível:</p>
        <p class="selos-amostra">
          <span class="selo selo-escritura">ESCRITURA</span>
          <span class="selo selo-consenso">CONSENSO</span>
          <span class="selo selo-aceita">AMPLAMENTE ACEITA</span>
          <span class="selo selo-debatida">DEBATIDA</span>
          <span class="selo selo-hipotese">HIPÓTESE</span>
          <span class="selo selo-tradicao">TRADIÇÃO</span>
        </p>
        <p>Você enxerga na hora o que pode afirmar do púlpito com autoridade, o que
        deve apresentar como leitura possível e o que precisa de um "há diferentes
        interpretações entre estudiosos cristãos".</p>
        <p class="miudo"><strong>Regra absoluta do sistema:</strong> nunca inventar citação, autor ou obra.
        Sem fonte verificada, não vai entre aspas. Em questão debatida, as posições
        aparecem lado a lado — nenhuma disfarçada de fato.</p>
      </div>

      <div class="oferta-bloco objecao">
        <h3>"Mas isso não esfria o estudo? Não tira o lado espiritual?"</h3>

        <p>A pergunta é justa, e merece uma resposta honesta. Ela começa pelo que
        esta ferramenta <strong>não</strong> faz.</p>

        <p>Ela não ora por você. Não conhece a viúva da terceira fileira nem o
        jovem que parou de vir. Não carrega o peso de quem vai ouvir no domingo.
        Não recebe direção, não tem discernimento e não vai lhe dar uma palavra.
        <strong>Ela não substitui o Espírito Santo. Ela substitui a concordância.</strong></p>

        <p>E nenhuma ferramenta de gabinete entrou na igreja sem essa mesma
        desconfiança. O léxico foi acusado de deixar o estudo preguiçoso. A
        concordância, de entregar pronto o que era para se buscar. A Bíblia
        interlinear, de dar grego a quem não estudou grego. O software bíblico,
        nos anos 90, de matar o trabalho de gabinete.</p>

        <p>Nenhuma delas fez um só pregador orar menos. O que todas fizeram foi
        a mesma coisa: <strong>devolver tempo</strong>.</p>

        <p class="virada">A pergunta que importa não é se a pesquisa levou seis horas
        ou seis minutos. É o que aconteceu com as outras cinco horas e cinquenta.</p>

        <p>Se elas viraram tempo de oração pela mensagem, de consagração antes de
        pregá-la, de visitar quem estava precisando, de jantar com a sua família
        num sábado — então você não perdeu espiritualidade nenhuma. Você recuperou
        o que a preparação vinha tomando.</p>

        <p>O trabalho braçal é da máquina: levantar contexto, conferir o original,
        mapear as referências, organizar a estrutura. <strong>A mensagem continua
        sendo sua</strong> — a voz, a aplicação, o que Deus tem falado à sua igreja.
        Isso ninguém escreve no seu lugar, e este produto foi construído para
        nunca tentar.</p>

        <blockquote class="versiculo">
          Remindo o tempo, porquanto os dias são maus.
          <cite>Efésios 5:16</cite>
        </blockquote>

        <p class="miudo" style="text-align:center;margin-top:1.2rem">
          <a href="/usar-ia-para-pregar">Tratamos essa pergunta a fundo aqui —
          inclusive onde a ferramenta <em>não</em> deve ser usada →</a>
        </p>
      </div>

      <div class="preco">
        <p class="preco-linha"><strong>R$ 29,90</strong> por mês · 30 materiais completos</p>
        <p class="preco-nota">Quem prepara para a igreja inteira e precisa de mais volume:
        plano Igreja, <strong>R$ 99,90</strong>/mês com 150 materiais.</p>
        <a class="botao botao-grande" href="${SITE}/cadastro">Criar minha conta e ler o material completo</a>
        <p class="miudo">Cadastro em menos de um minuto. Cancelamento com reembolso integral em até 7 dias.</p>
      </div>

      <p class="fecho">Sábado à noite não precisa ser assim todo fim de semana.</p>
    </section>`;
}

function blocoVizinhos(relacionados, mapa) {
  const links = (relacionados ?? [])
    .map((ref) => {
      const [tipo, slug] = String(ref).split(':');
      const alvo = mapa.get(`${tipo}/${slug}`);
      if (!alvo) return null;
      return `<li><a href="${PREFIXOS[tipo]}/${slug}">${escapar(alvo.titulo)}</a></li>`;
    })
    .filter(Boolean);
  if (!links.length) return '';
  return `
    <nav class="vizinhos">
      <h2>Continue estudando</h2>
      <ul>${links.join('')}</ul>
    </nav>`;
}

export function renderizarPagina(pagina, mapa) {
  const url = `${SITE}${PREFIXOS[pagina.tipo]}/${pagina.slug}`;
  const titulo = montarTituloSeo(pagina);
  const modo = nomeModo[pagina.modo_id] ?? 'Estudo bíblico';
  const publicado = (pagina.publicado_em ?? pagina.criado_em ?? new Date().toISOString()).slice(0, 10);

  // JSON-LD: Article + Breadcrumb. O breadcrumb é o que faz a URL aparecer
  // bonita no resultado de busca em vez do caminho cru.
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: pagina.titulo,
        description: pagina.meta_description,
        inLanguage: 'pt-BR',
        datePublished: publicado,
        dateModified: publicado,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: NOME_SITE, url: `${SITE}/` },
        publisher: {
          '@type': 'Organization', name: NOME_SITE, url: `${SITE}/`,
          logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
        },
        isAccessibleForFree: false,
        hasPart: {
          '@type': 'WebPageElement',
          isAccessibleForFree: false,
          cssSelector: '.corte',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: rotulo[pagina.tipo] ?? 'Conteúdo', item: `${SITE}${PREFIXOS[pagina.tipo]}/` },
          { '@type': 'ListItem', position: 3, name: pagina.titulo, item: url },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(pagina.meta_description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="theme-color" content="#0E2038">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${NOME_SITE}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${escapar(pagina.titulo)}">
<meta property="og:description" content="${escapar(pagina.meta_description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapar(pagina.titulo)}">
<meta name="twitter:description" content="${escapar(pagina.meta_description)}">
<meta name="twitter:image" content="${SITE}/icons/og-image.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Manrope:wght@400;600;700&family=Literata:opsz,wght@7..72,400;7..72,600&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>

<header class="topo">
  <div class="interno">
    <a class="marca" href="/">${NOME_SITE}</a>
    <a class="botao" href="/cadastro">Gerar meu estudo</a>
  </div>
</header>

<main>
  <nav class="trilha" aria-label="Você está em">
    <a href="/">Início</a> › <a href="${PREFIXOS[pagina.tipo]}/">${rotulo[pagina.tipo] ?? 'Conteúdo'}</a> › ${escapar(pagina.titulo)}
  </nav>

  <h1>${escapar(pagina.titulo)}</h1>

  <div class="ficha">
    <span>${escapar(modo)}</span>
    <span>Para ${escapar(nomePublico[pagina.publico_id] ?? 'a igreja')}</span>
    ${pagina.meta?.tempo ? `<span>${escapar(pagina.meta.tempo)} de leitura</span>` : ''}
    ${pagina.meta?.profundidade ? `<span>Nível ${escapar(pagina.meta.profundidade)}</span>` : ''}
  </div>

  <article>
${pagina.html_previa}
  </article>

${pagina.meta?.cuidado ? AVISO_CUIDADO : ''}
${blocoCorte(pagina)}
${blocoVizinhos(pagina.relacionados, mapa)}
</main>

<footer>
  <div class="interno">
    <p><strong style="color:#fff">${NOME_SITE}</strong> — estudos, sermões e exegeses com selos de confiabilidade.</p>
    <p><a href="/">Início</a> · <a href="/estudo/">Índice de estudos</a> · <a href="/usar-ia-para-pregar">IA e ministério</a> · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></p>
  </div>
</footer>

</body>
</html>`;
}

/** Índice de cada tipo: o hub que distribui autoridade para as páginas filhas. */
export function renderizarIndice(tipo, paginas, pagina = 1, totalPaginas = 1) {
  const titulos = {
    estudo: 'Estudos bíblicos por capítulo',
    tema: 'Estudos bíblicos por tema',
    sermao: 'Esboços de sermão',
  };
  const descricoes = {
    estudo: 'Estudo bíblico de cada capítulo das Escrituras: contexto, análise do texto, teologia e aplicação, com selos de confiabilidade.',
    tema: 'Estudos bíblicos organizados por tema e por pergunta, do devocional à exegese, para igreja, jovens e escola dominical.',
    sermao: 'Esboços de pregação com texto base, proposição, pontos, ilustrações e apelo — prontos para o púlpito.',
  };
  const titulo = titulos[tipo] ?? 'Conteúdo';
  const base = PREFIXOS[tipo];
  const url = `${SITE}${base}/${pagina > 1 ? `pagina-${pagina}` : ''}`;

  const itens = paginas
    .map((p) => `<li><a href="${base}/${p.slug}">${escapar(p.titulo)}</a></li>`)
    .join('');

  const paginacao = totalPaginas > 1
    ? `<nav class="vizinhos"><h2>Páginas</h2><ul style="display:flex;flex-wrap:wrap;gap:.6rem 1rem">${
        Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .map((n) => n === pagina
            ? `<li><strong>${n}</strong></li>`
            : `<li><a href="${base}/${n > 1 ? `pagina-${n}` : ''}">${n}</a></li>`)
          .join('')
      }</ul></nav>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}${pagina > 1 ? ` — página ${pagina}` : ''} — ${NOME_SITE}</title>
<meta name="description" content="${escapar(descricoes[tipo] ?? titulo)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Manrope:wght@400;600;700&family=Literata:opsz,wght@7..72,400&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="topo">
  <div class="interno">
    <a class="marca" href="/">${NOME_SITE}</a>
    <a class="botao" href="/cadastro">Gerar meu estudo</a>
  </div>
</header>
<main>
  <nav class="trilha"><a href="/">Início</a> › ${escapar(titulo)}</nav>
  <h1>${escapar(titulo)}</h1>
  <p>${escapar(descricoes[tipo] ?? '')}</p>
  <nav class="vizinhos"><h2>${paginas.length} materiais</h2><ul>${itens}</ul></nav>
  ${paginacao}
</main>
<footer><div class="interno">
  <p><a href="/">Início</a> · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></p>
</div></footer>
</body>
</html>`;
}
