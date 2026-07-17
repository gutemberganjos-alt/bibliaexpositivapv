import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ShieldCheck, GraduationCap, Users, Church, ArrowRight, Check, MessageCircleQuestion } from 'lucide-react';
import { MODOS, PUBLICOS } from '../lib/ai-config';
import { PLANOS } from '../lib/subscription';

const PASSOS = [
  { titulo: '1. Escolha o formato', texto: 'Devocional, estudo completo, sermão, exegese, curso e mais — 9 formatos para cada necessidade.' },
  { titulo: '2. Escolha o público', texto: 'Crianças, adolescentes, jovens, igreja, professores, pastores ou teologia acadêmica.' },
  { titulo: '3. Informe o texto ou tema', texto: 'Uma referência bíblica ou um tema. A IA gera o material completo em segundos, com selos de confiabilidade.' },
];

const SELOS = [
  { classe: 'selo-escritura', nome: 'Escritura', texto: 'Direto do texto bíblico.' },
  { classe: 'selo-consenso', nome: 'Consenso', texto: 'Amplamente aceito entre os estudiosos.' },
  { classe: 'selo-aceita', nome: 'Interpretação aceita', texto: 'Posição comum, sem unanimidade total.' },
  { classe: 'selo-debatida', nome: 'Debatida', texto: 'Existem correntes divergentes.' },
  { classe: 'selo-hipotese', nome: 'Hipótese', texto: 'Leitura possível, não conclusiva.' },
  { classe: 'selo-tradicao', nome: 'Tradição', texto: 'Vem da tradição da igreja, não do texto.' },
];

const DESTAQUES_MODOS = MODOS.filter((m) =>
  ['devocional', 'estudo', 'sermao', 'exegese', 'curso', 'pequeno_grupo'].includes(m.id),
);

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Header full-width: a faixa vai de ponta a ponta, o conteúdo interno é centralizado */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="landing-logo font-['Playfair_Display']">Bíblia Expositiva</span>
          <nav className="landing-nav">
            <Link to="/login" className="landing-link">Entrar</Link>
            <Link to="/cadastro" className="btn-primary landing-cta-small">Criar conta</Link>
          </nav>
        </div>
      </header>

      <div className="landing-container">
      <main>
        {/* Hero */}
        <section className="landing-hero">
          <p className="eyebrow mb-3">ESTUDO BÍBLICO COM IA + SELOS DE CONFIABILIDADE</p>
          <h1 className="font-['Playfair_Display'] text-[var(--cor-dourado)] landing-hero-title">
            A Palavra, estudada com reverência. Ensinada com clareza.
          </h1>
          <p className="landing-hero-subtitle text-[var(--cor-texto-medio)]">
            Escolha o formato, o público e um texto ou tema bíblico — a Bíblia Expositiva gera devocionais, estudos,
            sermões, exegeses e cursos completos, cada afirmação marcada com um selo de confiabilidade.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/cadastro" className="btn-primary flex items-center gap-2">
              <Sparkles size={16} /> Começar gratuitamente
            </Link>
            <Link to="/login" className="btn-secondary flex items-center gap-2">
              Já tenho conta <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        {/* Como funciona */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">COMO FUNCIONA</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Três passos até o material pronto</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PASSOS.map((p) => (
              <div key={p.titulo} className="card p-5">
                <h3 className="text-[var(--cor-dourado-claro)] text-base mb-2">{p.titulo}</h3>
                <p className="text-sm text-[var(--cor-texto-medio)]">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formatos */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">FORMATOS</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Um material para cada momento</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {DESTAQUES_MODOS.map((m) => (
              <div key={m.id} className="card p-4">
                <h3 className="text-[var(--cor-dourado-claro)] text-sm mb-1">{m.nome}</h3>
                <p className="text-xs text-[var(--cor-texto-medio)]">{m.descricao}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--cor-texto-dim)] mt-4">
            + Pergunte ao Texto, Discipulado e Apologética — {MODOS.length} formatos ao todo.
          </p>
        </section>

        {/* Públicos */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">PARA QUEM VOCÊ ENSINA</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Linguagem certa para cada público</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {PUBLICOS.map((p) => (
              <span key={p.id} className="landing-badge" title={p.descricao}>{p.nome}</span>
            ))}
          </div>
        </section>

        {/* Selos de confiabilidade */}
        <section className="landing-section landing-section-alt">
          <p className="eyebrow mb-2 text-center">DIFERENCIAL</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-3">Selos de confiabilidade em cada afirmação</h2>
          <p className="text-center text-sm text-[var(--cor-texto-medio)] max-w-xl mx-auto mb-8">
            Cada trecho do material gerado é classificado: o que vem direto da Escritura, o que é consenso entre
            estudiosos, o que é interpretação debatida, hipótese ou tradição — para você saber exatamente o peso de cada palavra.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {SELOS.map((s) => (
              <div key={s.classe} className="landing-selo-card">
                <span className={`selo ${s.classe}`}>{s.nome}</span>
                <p className="text-xs text-[var(--cor-texto-medio)] mt-2">{s.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planos */}
        <section className="landing-section" id="planos">
          <p className="eyebrow mb-2 text-center">PLANOS</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Ferramentas sérias para ensinar a Palavra</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <article className="plan-card card p-6">
              <GraduationCap size={23} className="text-[var(--cor-dourado)] mb-4" />
              <p className="eyebrow">{PLANOS.individual.nome.toUpperCase()}</p>
              <h3 className="text-lg text-[var(--cor-dourado-claro)] mt-1 mb-2">Para quem estuda, ensina e ministra.</h3>
              <p className="text-2xl text-[var(--cor-dourado)] font-['Playfair_Display']">
                {PLANOS.individual.precoLabel}
                <span className="text-sm text-[var(--cor-texto-dim)] font-sans"> {PLANOS.individual.ciclo}</span>
              </p>
              <Link to="/cadastro" className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                Assinar plano individual
              </Link>
            </article>
            <article className="plan-card plan-card-featured card p-6">
              <Church size={23} className="text-[var(--cor-dourado)] mb-4" />
              <p className="eyebrow">{PLANOS.igreja.nome.toUpperCase()}</p>
              <h3 className="text-lg text-[var(--cor-dourado-claro)] mt-1 mb-2">Para equipes que servem e formam pessoas.</h3>
              <p className="text-2xl text-[var(--cor-dourado)] font-['Playfair_Display']">
                {PLANOS.igreja.precoLabel}
                <span className="text-sm text-[var(--cor-texto-dim)] font-sans"> {PLANOS.igreja.ciclo}</span>
              </p>
              <Link to="/cadastro" className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                Assinar plano igreja
              </Link>
            </article>
          </div>
          <ul className="landing-benefits-list">
            <li><Check size={15} /> Biblioteca pessoal e kit de aula</li>
            <li><Check size={15} /> Conteúdo reutilizável sem nova geração</li>
            <li><Check size={15} /> Experiência completa em celular, tablet e computador</li>
          </ul>
          <p className="membership-trust"><ShieldCheck size={15} /> Cobrança segura via Stripe (cartão e PIX). Reembolso integral em até 7 dias.</p>
        </section>

        {/* Prova social / confiança */}
        <section className="landing-section landing-section-alt">
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-center">
            <div>
              <BookOpen size={22} className="mx-auto text-[var(--cor-dourado)] mb-2" />
              <p className="text-sm text-[var(--cor-texto-medio)]">Material completo em segundos, direto no seu celular ou computador.</p>
            </div>
            <div>
              <MessageCircleQuestion size={22} className="mx-auto text-[var(--cor-dourado)] mb-2" />
              <p className="text-sm text-[var(--cor-texto-medio)]">Transparência sobre o que é bíblico, consenso, debate ou tradição.</p>
            </div>
            <div>
              <Users size={22} className="mx-auto text-[var(--cor-dourado)] mb-2" />
              <p className="text-sm text-[var(--cor-texto-medio)]">Feito para uso individual e para equipes de igreja.</p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="landing-section text-center">
          <h2 className="landing-section-title font-['Playfair_Display'] mb-4">Comece seu próximo estudo agora</h2>
          <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={16} /> Criar conta grátis
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Bíblia Expositiva. Todos os direitos reservados.</p>
        <nav className="flex gap-4">
          <Link to="/login">Entrar</Link>
          <Link to="/cadastro">Criar conta</Link>
        </nav>
      </footer>
      </div>
    </div>
  );
}
