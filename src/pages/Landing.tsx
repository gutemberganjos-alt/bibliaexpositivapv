import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { MODOS } from '../lib/ai-config';
import { PLANOS } from '../lib/subscription';
import { TESTE_GRATIS_LIMITE } from '../lib/quota';

type Tema = 'claro' | 'escuro';

const ICONE_MODO: Record<string, string> = {
  devocional: '♡',
  estudo: '▤',
  sermao: '▭',
  exegese: '▦',
  curso: '▣',
  pergunte_texto: '?',
  pequeno_grupo: '◎',
  discipulado: '◈',
  apologetica: '⛨',
};

const PUBLICOS_COUNT = 7; // crianças, adolescentes, jovens, igreja, professores, pastores, teologia

const SELOS = [
  { classe: 'selo-escritura', nome: 'Escritura', texto: 'Direto do texto bíblico.' },
  { classe: 'selo-consenso', nome: 'Consenso', texto: 'Amplamente aceito entre os estudiosos.' },
  { classe: 'selo-aceita', nome: 'Interpretação aceita', texto: 'Posição comum, sem unanimidade total.' },
  { classe: 'selo-debatida', nome: 'Debatida', texto: 'Existem correntes divergentes.' },
  { classe: 'selo-hipotese', nome: 'Hipótese', texto: 'Leitura possível, não conclusiva.' },
  { classe: 'selo-tradicao', nome: 'Tradição', texto: 'Vem da tradição da igreja, não do texto.' },
];

/** Lê o tema salvo; na primeira visita segue a preferência do sistema. */
function temaInicial(): Tema {
  if (typeof window === 'undefined') return 'claro';
  const salvo = window.localStorage.getItem('bepv-tema');
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export default function Landing() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    window.localStorage.setItem('bepv-tema', tema);
  }, [tema]);

  return (
    <div className="landing-page" data-tema={tema}>
      <header className="lp-header">
        <div className="lp-wrap lp-hd">
          <span className="lp-marca-topo">
            <img src="/icons/logo-64.png" alt="Bíblia Expositiva" />
            Bíblia Expositiva
          </span>
          <nav className="lp-nav">
            <a href="#como" className="lp-nav-link">Como funciona</a>
            <a href="#selos" className="lp-nav-link">Selos</a>
            <a href="#planos" className="lp-nav-link">Planos</a>
            <Link to="/login" className="lp-nav-link">Entrar</Link>
            <button
              type="button"
              className="lp-tema-btn"
              aria-label="Alternar tema claro e escuro"
              title="Alternar tema"
              onClick={() => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro'))}
            >
              {tema === 'escuro' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link to="/cadastro" className="lp-btn lp-btn-o">Começar grátis</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div>
            <p className="eyebrow">Preparação bíblica</p>
            <h1>Do texto ao púlpito, <em>sem atalhos</em></h1>
            <p className="lp-lead">Escolha o formato, o público e a passagem. O material completo fica pronto
              em segundos — e cada afirmação vem marcada pela origem, para você saber o que é
              Escritura e o que é herança da igreja.</p>
            <div className="lp-acoes">
              <Link to="/cadastro" className="lp-btn lp-btn-o">Preparar meu primeiro material</Link>
              <a href="#selos" className="lp-btn lp-btn-l">Ver uma amostra</a>
            </div>
            <p className="lp-provas">
              <span><b>{TESTE_GRATIS_LIMITE}</b> materiais gratuitos</span>
              <span>Sem cartão para começar</span>
              <span>Reembolso em 7 dias</span>
            </p>
          </div>
          <div className="lp-tela">
            <div className="lp-tela-cab">
              <span className="lado"><i /><b>Bíblia Expositiva</b></span>
              <span className="pts"><span /><span /><span /></span>
            </div>
            <div className="lp-tela-corpo">
              <div className="lp-grade9">
                {MODOS.map((m) => (
                  <div key={m.id} className="lp-tile">
                    <div className="ic">{ICONE_MODO[m.id] ?? '•'}</div>
                    <span>{m.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Passo 1 — como funciona */}
      <section className="lp-faixa lp-f-a" id="como">
        <div className="lp-wrap lp-dupla">
          <div className="txt">
            <p className="eyebrow">Passo 1</p>
            <h2>Três escolhas e a passagem. Só isso.</h2>
            <p className="lp-lead">Nada de prompt, nada de configuração. Você diz o formato, para quem vai
              ensinar e qual texto. O resto é com a ferramenta.</p>
            <ul className="lp-bullets">
              <li><span className="lp-check">✓</span><span><b>{MODOS.length} formatos</b> — do devocional de 5 minutos à exegese acadêmica.</span></li>
              <li><span className="lp-check">✓</span><span><b>{PUBLICOS_COUNT} públicos</b> — de crianças a teologia acadêmica.</span></li>
              <li><span className="lp-check">✓</span><span><b>Qualquer passagem</b> — referência bíblica ou tema livre.</span></li>
            </ul>
          </div>
          <div className="lp-tela">
            <div className="lp-tela-cab"><span className="lado"><i /><b>Novo material</b></span><span className="pts"><span /><span /><span /></span></div>
            <div className="lp-tela-corpo">
              <div className="lp-campo" style={{ marginBottom: '.7rem' }}>
                <div className="lbl">Formato</div>
                <div className="lp-pills"><span className="lp-pill">Devocional</span><span className="lp-pill on">Sermão</span><span className="lp-pill">Exegese</span></div>
                <div className="lbl">Público</div>
                <div className="lp-pills"><span className="lp-pill on">Igreja</span><span className="lp-pill">Professores</span><span className="lp-pill">Jovens</span></div>
              </div>
              <div className="lp-campo">
                <div className="lbl">Texto, tema ou referência</div>
                <div style={{ color: '#E8EEF6', fontSize: '.94rem', fontFamily: "'Playfair Display', serif" }}>Romanos 8:28</div>
              </div>
              <div className="lp-botao-falso">Clique aqui para preparar seu material</div>
            </div>
          </div>
        </div>
      </section>

      {/* Selos de confiabilidade */}
      <section className="lp-faixa lp-f-b" id="selos">
        <div className="lp-wrap">
          <div className="lp-dupla inv">
            <div className="txt">
              <p className="eyebrow">O diferencial</p>
              <h2>Cada frase declara de onde veio</h2>
              <p className="lp-lead">O erro no ensino quase nunca é má-fé. É repetir, com a autoridade de
                quem cita a Escritura, o que era só tradição herdada. Aqui isso fica visível antes
                de você ensinar.</p>
              <ul className="lp-bullets">
                <li><span className="lp-check">✓</span><span>Classificação aplicada <b>parágrafo a parágrafo</b>.</span></li>
                <li><span className="lp-check">✓</span><span>Você <b>vê a divergência</b> antes da pergunta do aluno.</span></li>
                <li><span className="lp-check">✓</span><span>Dá para <b>ensinar com honestidade</b> sobre o que ainda é discutido.</span></li>
              </ul>
            </div>
            <div className="lp-doc">
              <div className="lp-doc-cab"><b>Romanos 8:28 — Sermão</b><span>Amostra</span></div>
              <div className="lp-doc-corpo">
                <p><span className="selo selo-escritura">Escritura</span>“E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus” (Romanos 8:28).</p>
                <p><span className="selo selo-consenso">Consenso</span>O “bem” é lido, pelo contexto imediato, como a conformação ao caráter de Cristo — o versículo 29 explica o 28.</p>
                <p><span className="selo selo-aceita">Interpretação aceita</span>“Aqueles que amam a Deus” costuma ser entendido como equivalente aos “chamados segundo o seu propósito”.</p>
                <p><span className="selo selo-debatida">Debatida</span>O alcance de “predestinou”, no versículo 29, divide leituras reformadas e arminianas há séculos.</p>
                <p><span className="selo selo-hipotese">Hipótese</span>Há quem proponha que Paulo ecoa Gênesis 50:20. Plausível, mas o texto não torna explícito.</p>
                <p><span className="selo selo-tradicao">Tradição</span>A leitura agostiniana moldou a recepção ocidental — herança da igreja, não afirmação do versículo.</p>
              </div>
            </div>
          </div>
          <div className="lp-selos6">
            {SELOS.map((s) => (
              <div key={s.classe} className="lp-selo-card">
                <span className={`selo ${s.classe}`}>{s.nome}</span>
                <p>{s.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onde você prepara — celular */}
      <section className="lp-faixa lp-f-esc">
        <div className="lp-wrap">
          <div style={{ maxWidth: '44rem' }}>
            <p className="eyebrow">Onde você prepara</p>
            <h2 style={{ fontSize: '1.7rem', margin: '.75rem 0 .875rem' }}>Na madrugada de sábado, no celular, sem computador por perto</h2>
            <p className="lp-lead">A mesma ferramenta na tela pequena: a grade vira duas colunas e o
              material continua legível para ler no púlpito.</p>
          </div>
          <div className="lp-trio">
            <div>
              <div className="lp-mob">
                <div className="lp-tela-cab"><span className="lado"><i /><b>Bíblia Expositiva</b></span></div>
                <div className="lp-tela-corpo"><div className="lp-grade9">
                  {MODOS.slice(0, 6).map((m) => (
                    <div key={m.id} className="lp-tile"><div className="ic">{ICONE_MODO[m.id] ?? '•'}</div><span>{m.nome}</span></div>
                  ))}
                </div></div>
              </div>
              <div className="txt"><b>Escolha o formato</b><span>{MODOS.length} opções, dois toques.</span></div>
            </div>
            <div>
              <div className="lp-mob">
                <div className="lp-tela-cab"><span className="lado"><i /><b>Novo material</b></span></div>
                <div className="lp-tela-corpo">
                  <div className="lp-campo"><div className="lbl">Referência</div>
                    <div style={{ color: '#E8EEF6', fontFamily: "'Playfair Display', serif", fontSize: '.84rem' }}>Romanos 8:28</div></div>
                  <div className="lp-botao-falso" style={{ fontSize: '.68rem' }}>Preparar meu material</div>
                  <div style={{ marginTop: '.7rem', height: 5, borderRadius: 9, background: 'rgba(228,190,107,.20)', overflow: 'hidden' }}>
                    <div style={{ width: '50%', height: '100%', background: '#C79A3E' }} />
                  </div>
                  <div style={{ textAlign: 'center', color: '#A9B6C8', fontSize: '.625rem', marginTop: '.375rem' }}>1 de {TESTE_GRATIS_LIMITE} gratuitas usadas</div>
                </div>
              </div>
              <div className="txt"><b>Gere em segundos</b><span>E veja quanto resta do teste.</span></div>
            </div>
            <div>
              <div className="lp-mob">
                <div className="lp-tela-cab"><span className="lado"><i /><b>Sermão</b></span></div>
                <div className="lp-tela-corpo" style={{ background: '#F8F6F0', padding: '.75rem' }}>
                  <p style={{ font: "600 .75rem/1.3 'Playfair Display', serif", color: '#18202C', marginBottom: '.56rem' }}>Romanos 8:28</p>
                  <p style={{ fontSize: '.66rem', lineHeight: 1.6, fontFamily: "'Literata', serif", color: '#18202C', marginBottom: '.5rem' }}><span className="selo selo-escritura" style={{ fontSize: '.5rem' }}>Escritura</span> “Todas as coisas cooperam para o bem…”</p>
                  <p style={{ fontSize: '.66rem', lineHeight: 1.6, fontFamily: "'Literata', serif", color: '#18202C', marginBottom: '.5rem' }}><span className="selo selo-consenso" style={{ fontSize: '.5rem' }}>Consenso</span> O “bem” é a conformação a Cristo.</p>
                  <p style={{ fontSize: '.66rem', lineHeight: 1.6, fontFamily: "'Literata', serif", color: '#18202C' }}><span className="selo selo-debatida" style={{ fontSize: '.5rem' }}>Debatida</span> O alcance de “predestinou” divide leituras.</p>
                </div>
              </div>
              <div className="txt"><b>Leia com os selos</b><span>Pronto para o púlpito.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Quem usa */}
      <section className="lp-faixa lp-f-a">
        <div className="lp-wrap">
          <div style={{ maxWidth: '44rem' }}>
            <p className="eyebrow">Quem usa</p>
            <h2 style={{ fontSize: '1.7rem', margin: '.75rem 0 .875rem' }}>Preparado por gente que ensina toda semana</h2>
            <p className="lp-lead">Pastores, professoras de EBD e líderes de pequeno grupo — cada um no seu
              tempo e no seu lugar.</p>
          </div>
          <div className="lp-pessoas">
            <div className="lp-pessoa">
              <img className="lp-foto" src="/fotos/pessoa-1-gabinete.jpg" alt="Pastor preparando o sermão no gabinete" loading="lazy" width={1200} height={900} />
              <div className="cap"><b>No gabinete, antes do domingo</b>
                <span>O sermão sai do texto, não da memória do que se ouviu por aí.</span></div>
            </div>
            <div className="lp-pessoa">
              <img className="lp-foto" src="/fotos/pessoa-2-cozinha.jpg" alt="Professora de EBD preparando a aula em casa" loading="lazy" width={1200} height={900} />
              <div className="cap"><b>Na mesa da cozinha, no meio da semana</b>
                <span>A aula de sábado pronta sem tomar a noite inteira.</span></div>
            </div>
            <div className="lp-pessoa">
              <img className="lp-foto" src="/fotos/pessoa-3-grupo.jpg" alt="Líder conduzindo um pequeno grupo" loading="lazy" width={1200} height={900} />
              <div className="cap"><b>No pequeno grupo, com o roteiro na mão</b>
                <span>Perguntas prontas e o que é discutido sinalizado.</span></div>
            </div>
          </div>
          <div className="lp-selo-card" style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '.84rem', margin: 0 }}>Espaço reservado para depoimentos reais, com nome e
              igreja — e para a linha editorial dos selos: quem revisa e como as divergências entre
              tradições são tratadas.</p>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="lp-faixa lp-f-b" id="planos">
        <div className="lp-wrap">
          <div style={{ maxWidth: '42rem' }}>
            <p className="eyebrow">Planos</p>
            <h2 style={{ fontSize: '1.7rem', margin: '.75rem 0 .875rem' }}>Comece grátis. Assine quando fizer sentido.</h2>
            <p className="lp-lead">{TESTE_GRATIS_LIMITE} materiais gratuitos, sem cartão. Depois você escolhe.</p>
          </div>
          <div className="lp-planos">
            <div className="lp-plano">
              <b>{PLANOS.avulso.nome}</b><span className="peq">Sem fidelidade</span>
              <div className="val">{PLANOS.avulso.precoLabel}</div>
              <div className="cic">pagamento único · {PLANOS.avulso.ciclo}</div>
              <p>Para usar num período específico, sem assinar nada.</p>
              <Link to="/cadastro" className="lp-btn lp-btn-l">Começar</Link>
            </div>
            <div className="lp-plano dest">
              <b>{PLANOS.individual.nome}</b><span className="peq">Mensal ou anual</span>
              <div className="val">{PLANOS.individual.precoLabel}</div>
              <div className="cic">por mês · anual {PLANOS.individual.precos.ANUAL.precoLabel} ({PLANOS.individual.precos.ANUAL.economiaLabel?.toLowerCase()})</div>
              <p>Para quem prepara material toda semana.</p>
              <Link to="/cadastro" className="lp-btn lp-btn-o">Assinar</Link>
            </div>
            <div className="lp-plano">
              <b>{PLANOS.igreja.nome}</b><span className="peq">Equipe inteira</span>
              <div className="val">{PLANOS.igreja.precoLabel}</div>
              <div className="cic">por mês · anual {PLANOS.igreja.precos.ANUAL.precoLabel}</div>
              <p>Para ministérios que formam professores e líderes.</p>
              <Link to="/cadastro" className="lp-btn lp-btn-l">Assinar</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-rod">
            <div>
              <div className="marca"><img src="/icons/logo-64.png" alt="" /> Bíblia Expositiva</div>
              <p>Estudos, sermões e exegeses com a origem de cada afirmação declarada.<br />
                Feito para quem ensina a Palavra toda semana.</p>
            </div>
            <div>
              <h4>Suporte</h4>
              <div className="lp-contato">
                <a href="mailto:suporte@grupo-soares.com"><span className="ic">✉</span> suporte@grupo-soares.com</a>
                <a href="https://wa.me/5579996371970" target="_blank" rel="noopener noreferrer"><span className="ic">✆</span> Falar no WhatsApp</a>
              </div>
            </div>
            <div>
              <h4>Institucional</h4>
              <p>
                <Link to="/termos">Termos de uso</Link><br />
                <Link to="/privacidade">Política de privacidade</Link><br />
                <a href="#planos">Planos</a>
              </p>
            </div>
          </div>
          <p className="lp-legal">CNPJ 41.350.395/0001-30 · © {new Date().getFullYear()} Bíblia Expositiva PV — todos os direitos reservados.</p>
          {/* Biblioteca pública: páginas ESTÁTICAS geradas em seo/, fora do React Router.
              Precisam de <a> comum — <Link> tentaria rota client-side e cairia no
              fallback do SPA, que não tem rota para /estudo. */}
          <nav className="lp-legal-links">
            <a href="/estudo/">Estudos por capítulo</a>
            <a href="/tema/">Estudos por tema</a>
            <a href="/sermao/">Esboços de sermão</a>
            <a href="/usar-ia-para-pregar">Bíblia Digital e ministério</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
