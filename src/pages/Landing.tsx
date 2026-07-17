import { Link } from 'react-router-dom';
import {
  Sparkles, Search, Layers, BookOpen, Users, Cloud, ArrowRight, Check,
  ShieldCheck, GraduationCap, Church, Baby, User, Heart,
} from 'lucide-react';
import { MODOS } from '../lib/ai-config';
import { PLANOS } from '../lib/subscription';

const RECURSOS = [
  { ic: Sparkles, titulo: 'Criação de estudos personalizados', texto: 'Em minutos, com profundidade e relevância.' },
  { ic: Search, titulo: 'Exegese e contexto bíblico', texto: 'Análises profundas com base nas Escrituras.' },
  { ic: Layers, titulo: 'Diversos modelos de estudos', texto: 'Devocional, expositivo, temático, indutivo e mais.' },
  { ic: Users, titulo: 'Para todos os perfis', texto: 'Recursos adaptados para cada fase e chamado.' },
  { ic: Cloud, titulo: 'Acesse de onde estiver', texto: 'No seu tempo e no seu ritmo, celular ou computador.' },
];

const PASSOS = [
  { titulo: '1. Escolha o formato', texto: 'Devocional, estudo completo, sermão, exegese, curso e mais — 9 formatos para cada necessidade.' },
  { titulo: '2. Escolha o público', texto: 'Crianças, adolescentes, jovens, igreja, professores, pastores ou teologia acadêmica.' },
  { titulo: '3. Informe o texto ou tema', texto: 'Uma referência bíblica ou um tema. A IA gera o material completo em segundos, com selos de confiabilidade.' },
];

const PERFIS = [
  { ic: Church, nome: 'Pastores' },
  { ic: GraduationCap, nome: 'Professores' },
  { ic: BookOpen, nome: 'Teólogos' },
  { ic: Users, nome: 'Jovens' },
  { ic: Users, nome: 'Adolescentes' },
  { ic: Baby, nome: 'Crianças' },
  { ic: User, nome: 'Adultos' },
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
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="landing-logo-wrap">
            <img src="/icons/icon-192.png" alt="Bíblia Expositiva" className="landing-logo-img" />
            <span className="landing-logo font-['Playfair_Display']">Bíblia <b>Expositiva</b></span>
          </span>
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
          <p className="eyebrow mb-3">A PLATAFORMA COMPLETA PARA</p>
          <h1 className="font-['Playfair_Display'] landing-hero-title">
            Criação de <b>Estudos Bíblicos</b>
          </h1>
          <p className="landing-hero-subtitle">
            Profundidade, clareza e propósito para cada perfil. Escolha o formato, o público e um texto —
            a Bíblia Expositiva gera o material completo em segundos, com selos de confiabilidade.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/cadastro" className="btn-primary flex items-center gap-2">
              <Sparkles size={16} /> Criar conta grátis
            </Link>
            <Link to="/login" className="btn-secondary flex items-center gap-2">
              Já tenho conta <ArrowRight size={15} />
            </Link>
          </div>
          <span className="landing-hero-seal"><ShieldCheck size={14} /> Base bíblica · Conteúdo confiável</span>
        </section>

        {/* Recursos */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">RECURSOS</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Tudo para ensinar a Palavra com excelência</h2>
          <div className="landing-features">
            {RECURSOS.map(({ ic: Ic, titulo, texto }) => (
              <div key={titulo} className="landing-feature">
                <Ic size={22} className="landing-feature-ic" />
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">COMO FUNCIONA</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Três passos até o material pronto</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PASSOS.map((p) => (
              <div key={p.titulo} className="card p-5">
                <h3 className="text-base mb-2">{p.titulo}</h3>
                <p className="text-sm">{p.texto}</p>
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
                <h3 className="text-sm mb-1">{m.nome}</h3>
                <p className="text-xs">{m.descricao}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs landing-muted mt-4">
            + Pergunte ao Texto, Discipulado e Apologética — {MODOS.length} formatos ao todo.
          </p>
        </section>

        {/* Para quem */}
        <section className="landing-section">
          <p className="eyebrow mb-2 text-center">PARA QUEM É A BÍBLIA EXPOSITIVA</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-8">Feita para cada chamado</h2>
          <div className="landing-perfis">
            {PERFIS.map(({ ic: Ic, nome }) => (
              <span key={nome} className="landing-perfil"><Ic size={16} /> {nome}</span>
            ))}
          </div>
        </section>

        {/* Selos de confiabilidade (painel claro = mostra a leitura) */}
        <section className="landing-section landing-section-alt">
          <p className="eyebrow mb-2 text-center">DIFERENCIAL</p>
          <h2 className="landing-section-title font-['Playfair_Display'] text-center mb-3">Selos de confiabilidade em cada afirmação</h2>
          <p className="text-center text-sm max-w-xl mx-auto mb-8">
            Cada trecho do material gerado é classificado: o que vem direto da Escritura, o que é consenso entre
            estudiosos, o que é interpretação debatida, hipótese ou tradição — para você saber exatamente o peso de cada palavra.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {SELOS.map((s) => (
              <div key={s.classe} className="landing-selo-card">
                <span className={`selo ${s.classe}`}>{s.nome}</span>
                <p className="text-xs mt-2">{s.texto}</p>
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
              <GraduationCap size={23} className="landing-feature-ic mb-4" />
              <p className="eyebrow">{PLANOS.individual.nome.toUpperCase()}</p>
              <h3 className="text-lg mt-1 mb-2">Para quem estuda, ensina e ministra.</h3>
              <p className="text-2xl font-['Playfair_Display'] landing-preco">
                {PLANOS.individual.precoLabel}
                <span className="text-sm font-sans landing-muted"> {PLANOS.individual.ciclo}</span>
              </p>
              <Link to="/cadastro" className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                Assinar plano individual
              </Link>
            </article>
            <article className="plan-card plan-card-featured card p-6">
              <Church size={23} className="landing-feature-ic mb-4" />
              <p className="eyebrow">{PLANOS.igreja.nome.toUpperCase()}</p>
              <h3 className="text-lg mt-1 mb-2">Para equipes que servem e formam pessoas.</h3>
              <p className="text-2xl font-['Playfair_Display'] landing-preco">
                {PLANOS.igreja.precoLabel}
                <span className="text-sm font-sans landing-muted"> {PLANOS.igreja.ciclo}</span>
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

        {/* Confiança */}
        <section className="landing-section">
          <div className="landing-trust">
            <span className="landing-trust-item"><BookOpen size={20} /> <span><b>Fundamentado</b> na Verdade</span></span>
            <span className="landing-trust-item"><Heart size={20} /> <span><b>Aplicável</b> à Vida</span></span>
            <span className="landing-trust-item"><Users size={20} /> <span><b>Transforma</b> Gerações</span></span>
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
