import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, FolderHeart, X, Bell, Search,
  Heart, Presentation, ScrollText, GraduationCap, MessageCircleQuestion,
  Users, Compass, ShieldCheck, Clock, Flame,
} from 'lucide-react';
import PenWriting from '../components/PenWriting';
import { fetchStudies, getCachedStudies } from '../lib/study-library';
import type { SavedStudy } from '../lib/study-library';
import { MODOS, nomeDoModo } from '../lib/ai-config';

// Curadoria estática (como OBJECTIVES abaixo) — trilhas de estudo sugeridas.
// Cada uma manda o usuário direto para /estudos com o modo e o texto certos.
const TRILHAS = [
  { titulo: 'Fundamentos da Soteriologia', descricao: 'Como a salvação é ensinada do início ao fim das Escrituras.', icon: BookOpen, modo: 'estudo', ref: 'Soteriologia' },
  { titulo: 'Escatologia comparada', descricao: 'As principais leituras sobre os últimos tempos, lado a lado.', icon: Clock, modo: 'estudo', ref: 'Escatologia' },
  { titulo: 'Introdução à Pneumatologia', descricao: 'A pessoa e a obra do Espírito Santo na vida da igreja.', icon: Flame, modo: 'estudo', ref: 'Pneumatologia' },
];

// Versículos com abertura no original verificada manualmente (evita citar
// hebraico/grego errado por conta própria). Alterna por dia do ano — ver
// Golden Rule dos versículos: sempre com a tradução indicada.
const VERSICULOS_DESTAQUE = [
  {
    ref: 'Gênesis 1:1', traducao: 'ARC',
    texto: 'No princípio criou Deus os céus e a terra.',
    original: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
    translit: 'Bereshit bará Elohim et hashamayim ve\'et haárets',
    idioma: 'Hebraico',
  },
  {
    ref: 'João 3:16', traducao: 'ARC',
    texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    original: 'Οὕτως γὰρ ἠγάπησεν ὁ Θεὸς τὸν κόσμον, ὥστε τὸν Υἱὸν τὸν μονογενῆ ἔδωκεν',
    translit: 'Hoútōs gàr ēgápēsen ho Theòs tòn kósmon, hṓste tòn Hyiòn tòn monogenê édōken',
    idioma: 'Grego',
  },
];

function dataLabel(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

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
  // Mostra o cache na hora e corrige com o banco quando chegar — tanto a
  // contagem quanto a lista completa (usada em "Continuar estudando").
  const [studies, setStudies] = useState<SavedStudy[]>(() => getCachedStudies());
  const savedCount = studies.length;
  useEffect(() => {
    let ativo = true;
    void fetchStudies().then((lista) => { if (ativo) setStudies(lista); });
    return () => { ativo = false; };
  }, []);
  const recentes = studies.slice(0, 3);

  // Versículo do dia: alterna pela curadoria fixa conforme o dia do ano —
  // estável durante o dia inteiro, muda no dia seguinte, sem precisar de IA.
  const diaDoAno = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const versiculoDoDia = VERSICULOS_DESTAQUE[diaDoAno % VERSICULOS_DESTAQUE.length];

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
            <img src="/icons/logo-64.png" alt="" />
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
        <div className="flex items-center justify-between mb-2">
          <p className="eyebrow">VERSÍCULO DO DIA · NO ORIGINAL</p>
          <span className="text-[10px] font-['Manrope'] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-[var(--cor-ouro-claro)] border border-[var(--cor-navy-borda)]">
            {versiculoDoDia.traducao}
          </span>
        </div>
        <h2 className="text-xl mb-3 text-[var(--cor-ouro-claro)]">{versiculoDoDia.ref}</h2>
        <p className="text-lg italic mb-4 leading-relaxed">"{versiculoDoDia.texto}"</p>
        <div className="rounded-md p-3 mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
          <p className="text-[10px] uppercase tracking-widest font-['Manrope'] text-[var(--cor-navy-texto-dim)] mb-1.5">{versiculoDoDia.idioma}</p>
          <p dir={versiculoDoDia.idioma === 'Hebraico' ? 'rtl' : 'ltr'} className="text-lg mb-1" style={{ fontFamily: "'Noto Sans Hebrew', 'Noto Sans', serif" }}>
            {versiculoDoDia.original}
          </p>
          <p className="text-xs italic text-[var(--cor-navy-texto-dim)]">{versiculoDoDia.translit}</p>
        </div>
        <button onClick={() => navigate('/biblia')} className="text-sm font-['Manrope'] font-semibold text-[var(--cor-ouro-claro)] flex items-center gap-1.5">
          Abrir no Laboratório do Original <ArrowRight size={14} />
        </button>
      </section>

      {/* Continuar estudando — dados reais da biblioteca, não mockados. */}
      {recentes.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-['Manrope'] text-sm text-[var(--cor-ouro-claro)] tracking-wider">Continuar estudando</h3>
            <button onClick={() => navigate('/biblioteca')} className="text-xs font-['Manrope'] text-[var(--cor-navy-texto-dim)] hover:text-[var(--cor-ouro-claro)]">ver tudo</button>
          </div>
          <div className="space-y-2.5">
            {recentes.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/biblioteca?abrir=${s.id}`)}
                className="card w-full p-3.5 flex items-center gap-3 text-left"
              >
                <BookOpen size={18} className="shrink-0 text-[var(--cor-ouro-claro)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-white truncate">{s.titulo}</span>
                  <span className="block text-xs text-[var(--cor-navy-texto-dim)] mt-0.5">{nomeDoModo(s.modoId)} · {dataLabel(s.createdAt)}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-[var(--cor-ouro-claro)]" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trilhas recomendadas — curadoria estática, cada uma abre /estudos pronta. */}
      <section className="mb-5">
        <h3 className="font-['Manrope'] text-sm text-[var(--cor-ouro-claro)] tracking-wider mb-3">Trilhas recomendadas</h3>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {TRILHAS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.titulo}
                onClick={() => navigate(`/estudos?modo=${t.modo}&ref=${encodeURIComponent(t.ref)}`)}
                className="card p-4 text-left space-y-2.5"
              >
                <span className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--cor-oliva-bg)', color: 'var(--cor-oliva-claro)' }}>
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="block text-sm font-medium text-white leading-snug">{t.titulo}</span>
                <span className="block text-xs text-[var(--cor-navy-texto-dim)] leading-snug">{t.descricao}</span>
              </button>
            );
          })}
        </div>
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
          <PenWriting size={19} className="text-[var(--cor-ouro-claro)] shrink-0" />
          <p className="flex-1 text-sm text-[var(--cor-navy-texto-dim)]">Seu foco: <strong className="text-[var(--cor-ouro-claro)]">{selectedObjective.title}</strong></p>
          <button onClick={() => { localStorage.removeItem('biblia-expositiva:objetivo'); setObjective(null); }} title="Alterar objetivo" className="p-1 text-[var(--cor-navy-texto-dim)] hover:text-[var(--cor-ouro-claro)]"><X size={16} /></button>
        </section>
      ) : null}

      <div className="flex gap-3 mb-7">
        <button onClick={() => navigate('/estudos')} className="btn-primary flex-1 flex items-center justify-center gap-2"><PenWriting size={17} /> Clique aqui para preparar seu material</button>
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
