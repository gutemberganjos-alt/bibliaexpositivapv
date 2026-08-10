import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, FolderHeart, Sparkles, X, Bell, Search,
  Heart, Presentation, ScrollText, GraduationCap, MessageCircleQuestion,
  Users, Compass, ShieldCheck,
} from 'lucide-react';
import { fetchStudies, getCachedStudies } from '../lib/study-library';
import { MODOS } from '../lib/ai-config';

const OBJECTIVES = [
  { id: 'devocao', title: 'Crescer na Palavra', description: 'Devocionais e estudos para sua caminhada diária.' },
  { id: 'ensinar', title: 'Ensinar melhor', description: 'Aulas com perguntas, dinâmica e aplicação.' },
  { id: 'pregar', title: 'Preparar mensagens', description: 'Esboços, exegese e aplicação para ministrar.' },
];

// Um ícone por formato real (mesmos 9 de lib/ai-config.ts) — a grade que
// substitui o mockup do anúncio, mas ligada às telas de verdade.
const FORMATO_ICONES: Record<string, typeof BookOpen> = {
  devocional: Heart,
  estudo: BookOpen,
  sermao: Presentation,
  exegese: ScrollText,
  curso: GraduationCap,
  pergunte_texto: MessageCircleQuestion,
  pequeno_grupo: Users,
  discipulado: Compass,
  apologetica: ShieldCheck,
};

function getObjective() {
  try {
    return localStorage.getItem('biblia-expositiva:objetivo');
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  // Mostra o número do cache na hora e corrige com o do banco quando chegar.
  const [savedCount, setSavedCount] = useState(() => getCachedStudies().length);
  useEffect(() => {
    let ativo = true;
    void fetchStudies().then((lista) => { if (ativo) setSavedCount(lista.length); });
    return () => { ativo = false; };
  }, []);
  const [objective, setObjective] = useState(getObjective);
  const selectedObjective = OBJECTIVES.find((item) => item.id === objective);

  const chooseObjective = (id: string) => {
    localStorage.setItem('biblia-expositiva:objetivo', id);
    setObjective(id);
  };
  return (
    <div
      className="home-dark"
      style={{
        display: 'block',
        width: '100%',
        minHeight: '100%',
        color: 'var(--cor-navy-texto)',
        background:
          'radial-gradient(ellipse 80% 45% at 50% -8%, rgba(228,190,107,.14), transparent 60%), linear-gradient(180deg, #0E2038 0%, #0A1728 100%)',
      }}
    >
    <div className="p-4 max-w-3xl mx-auto w-full overflow-x-hidden">
      <header className="home-hero mb-6 pt-6 pb-2 min-w-0">
        <p className="eyebrow">BÍBLIA EXPOSITIVA</p>
        <h1 className="dashboard-title font-['Playfair_Display'] mb-3">A Palavra, estudada com <span className="dashboard-title-accent">reverência</span>. Ensinada com clareza.</h1>
        <p className="dashboard-subtitle">Transforme uma passagem bíblica em material claro para sua vida, classe ou ministração.</p>
      </header>

      {/* "Tela" do app — a grade de formatos que substitui o mockup do anúncio,
          só que ligada às telas de geração de verdade. */}
      <section className="home-app-frame mb-6">
        <div className="home-app-frame-header">
          <div className="home-app-frame-brand">
            <img src="/icons/icon-192.png" alt="" />
            <span>Bíblia Expositiva</span>
          </div>
          <div className="home-app-frame-icons">
            <Search size={16} />
            <Bell size={16} />
            <span className="avatar-dot" />
          </div>
        </div>
        <div className="formato-grid">
          {MODOS.map((m) => {
            const Icon = FORMATO_ICONES[m.id] ?? BookOpen;
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/estudos?modo=${m.id}`)}
                className="formato-tile"
                title={m.descricao}
              >
                <span className="formato-tile-icon"><Icon size={19} strokeWidth={1.75} /></span>
                <span className="formato-tile-label">{m.nome}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 mb-5">
        <p className="eyebrow mb-2">PARA HOJE</p>
        <h2 className="text-xl mb-3 text-[var(--cor-ouro-claro)]">Versículo do Dia</h2>
        <p className="text-lg italic mb-4 leading-relaxed">"Lâmpada para os meus pés é tua palavra, e luz para o meu caminho."</p>
        <p className="text-sm uppercase tracking-widest font-['Manrope'] text-[var(--cor-navy-texto-dim)]">— Salmos 119:105</p>
      </section>

      {!objective ? (
        <section className="card p-5 mb-5 onboarding-card">
          <p className="eyebrow mb-2">PERSONALIZE EM 10 SEGUNDOS</p>
          <h2 className="text-lg text-[var(--cor-ouro-claro)] mb-1">Qual é sua prioridade hoje?</h2>
          <p className="text-sm mb-4 text-[var(--cor-navy-texto-dim)]">Vamos destacar os formatos mais úteis para você.</p>
          <div className="grid gap-2">
            {OBJECTIVES.map((item) => (
              <button key={item.id} onClick={() => chooseObjective(item.id)} className="objective-choice text-left">
                <span>{item.title}</span><small>{item.description}</small>
              </button>
            ))}
          </div>
        </section>
      ) : selectedObjective ? (
        <section className="card p-4 mb-5 flex items-center gap-3">
          <Sparkles size={19} className="text-[var(--cor-ouro-claro)] shrink-0" />
          <p className="flex-1 text-sm text-[var(--cor-navy-texto-dim)]">Seu foco: <strong className="text-[var(--cor-ouro-claro)]">{selectedObjective.title}</strong></p>
          <button onClick={() => { localStorage.removeItem('biblia-expositiva:objetivo'); setObjective(null); }} title="Alterar objetivo" className="p-1 text-[var(--cor-navy-texto-dim)] hover:text-[var(--cor-ouro-claro)]"><X size={16} /></button>
        </section>
      ) : null}

      <div className="flex gap-3 mb-7">
        <button onClick={() => navigate('/estudos')} className="btn-primary flex-1 flex items-center justify-center gap-2"><Sparkles size={16} /> Criar estudo</button>
      </div>

      <div className="h-[1px] w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(228,190,107,0.35), transparent)' }}></div>

      <section>
        <h3 className="font-['Manrope'] text-lg text-[var(--cor-ouro-claro)] mb-4 tracking-wider">Seu próximo passo</h3>
        <div className="card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm mb-1 text-[var(--cor-navy-texto-dim)]">Leia um capítulo com profundidade</p>
            <p className="text-xs text-[var(--cor-navy-texto-dim)]">Abra a Bíblia, escolha um versículo e transforme-o em estudo.</p>
          </div>
          <button onClick={() => navigate('/biblia')} className="btn-secondary shrink-0"><BookOpen size={15} /></button>
        </div>
        <button onClick={() => navigate('/biblioteca')} className="w-full mt-3 card p-4 flex items-center gap-3 text-left">
          <FolderHeart size={20} className="text-[var(--cor-ouro-claro)]" />
          <span className="flex-1"><span className="block text-sm text-white">Sua biblioteca</span><span className="block text-xs text-[var(--cor-navy-texto-dim)]">{savedCount === 0 ? 'Guarde estudos importantes para voltar depois.' : `${savedCount} ${savedCount === 1 ? 'estudo salvo' : 'estudos salvos'}`}</span></span>
          <ArrowRight size={17} className="text-[var(--cor-ouro-claro)]" />
        </button>
      </section>
    </div>
    </div>
  );
}
