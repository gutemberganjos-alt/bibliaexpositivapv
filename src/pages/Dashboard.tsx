import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, FolderHeart, Sparkles, X } from 'lucide-react';
import { fetchStudies, getCachedStudies } from '../lib/study-library';

const OBJECTIVES = [
  { id: 'devocao', title: 'Crescer na Palavra', description: 'Devocionais e estudos para sua caminhada diária.' },
  { id: 'ensinar', title: 'Ensinar melhor', description: 'Aulas com perguntas, dinâmica e aplicação.' },
  { id: 'pregar', title: 'Preparar mensagens', description: 'Esboços, exegese e aplicação para ministrar.' },
];

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
    <div className="p-4 max-w-3xl mx-auto w-full overflow-x-hidden">
      <header className="home-hero mb-7 pt-6 pb-5 min-w-0">
        <p className="eyebrow">BÍBLIA EXPOSITIVA</p>
        <h1 className="dashboard-title font-['Playfair_Display'] text-[var(--cor-dourado)] mb-3">A Palavra, estudada com reverência. Ensinada com clareza.</h1>
        <p className="dashboard-subtitle text-[var(--cor-texto-medio)]">Transforme uma passagem bíblica em material claro para sua vida, classe ou ministração.</p>
      </header>
      
      <section className="card p-5 mb-5">
        <p className="eyebrow mb-2">PARA HOJE</p>
        <h2 className="text-xl mb-3 text-[var(--cor-dourado-claro)]">Versículo do Dia</h2>
        <p className="text-lg italic mb-4 leading-relaxed">"Lâmpada para os meus pés é tua palavra, e luz para o meu caminho."</p>
        <p className="text-sm text-[var(--cor-texto-dim)] uppercase tracking-widest font-['Manrope']">— Salmos 119:105</p>
      </section>

      {!objective ? (
        <section className="card p-5 mb-5 onboarding-card">
          <p className="eyebrow mb-2">PERSONALIZE EM 10 SEGUNDOS</p>
          <h2 className="text-lg text-[var(--cor-dourado-claro)] mb-1">Qual é sua prioridade hoje?</h2>
          <p className="text-sm text-[var(--cor-texto-medio)] mb-4">Vamos destacar os formatos mais úteis para você.</p>
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
          <Sparkles size={19} className="text-[var(--cor-dourado)] shrink-0" />
          <p className="flex-1 text-sm text-[var(--cor-texto-medio)]">Seu foco: <strong className="text-[var(--cor-dourado-claro)]">{selectedObjective.title}</strong></p>
          <button onClick={() => { localStorage.removeItem('biblia-expositiva:objetivo'); setObjective(null); }} title="Alterar objetivo" className="p-1 text-[var(--cor-texto-dim)] hover:text-[var(--cor-dourado)]"><X size={16} /></button>
        </section>
      ) : null}

      <div className="flex gap-3 mb-7">
        <button onClick={() => navigate('/estudos')} className="btn-primary flex-1 flex items-center justify-center gap-2"><Sparkles size={16} /> Criar estudo</button>
      </div>

      <div className="h-[1px] w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)' }}></div>

      <section>
        <h3 className="font-['Manrope'] text-lg text-[var(--cor-dourado)] mb-4 tracking-wider">Seu próximo passo</h3>
        <div className="card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--cor-texto-medio)] mb-1">Leia um capítulo com profundidade</p>
            <p className="text-xs text-[var(--cor-texto-dim)]">Abra a Bíblia, escolha um versículo e transforme-o em estudo.</p>
          </div>
          <button onClick={() => navigate('/biblia')} className="btn-secondary shrink-0"><BookOpen size={15} /></button>
        </div>
        <button onClick={() => navigate('/biblioteca')} className="w-full mt-3 card p-4 flex items-center gap-3 text-left">
          <FolderHeart size={20} className="text-[var(--cor-dourado)]" />
          <span className="flex-1"><span className="block text-sm text-[var(--cor-pergaminho)]">Sua biblioteca</span><span className="block text-xs text-[var(--cor-texto-dim)]">{savedCount === 0 ? 'Guarde estudos importantes para voltar depois.' : `${savedCount} ${savedCount === 1 ? 'estudo salvo' : 'estudos salvos'}`}</span></span>
          <ArrowRight size={17} className="text-[var(--cor-dourado-dim)]" />
        </button>
      </section>
    </div>
  );
}
