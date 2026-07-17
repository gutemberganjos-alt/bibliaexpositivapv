import { useState } from 'react';
import { BookOpen, ChevronRight, FolderHeart, Trash2 } from 'lucide-react';
import { deleteStudy, getSavedStudies } from '../lib/study-library';
import type { SavedStudy } from '../lib/study-library';
import { nomeDoModo, nomeDoPublico } from '../lib/ai-config';

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export default function Library() {
  const [studies, setStudies] = useState(getSavedStudies);
  const [openStudy, setOpenStudy] = useState<SavedStudy | null>(null);

  const remove = (id: string) => {
    deleteStudy(id);
    setStudies(getSavedStudies());
  };

  if (openStudy) {
    return (
      <div className="p-4 max-w-3xl mx-auto pb-24">
        <button onClick={() => setOpenStudy(null)} className="text-sm text-[var(--cor-dourado)] mb-5">← Voltar para biblioteca</button>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="study-tag">{nomeDoModo(openStudy.modoId)}</span>
          <span className="study-tag study-tag-muted">{nomeDoPublico(openStudy.publicoId)}</span>
        </div>
        <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado-claro)] mb-2">{openStudy.titulo}</h1>
        <p className="text-sm text-[var(--cor-texto-dim)] pb-6 mb-6 border-b border-[var(--cor-borda)]">Salvo em {dateLabel(openStudy.createdAt)} · {openStudy.referencia}</p>
        <article className="estudo-conteudo" dangerouslySetInnerHTML={{ __html: openStudy.html }} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <header className="mb-7 pt-3">
        <p className="eyebrow">SEU ACERVO</p>
        <h1 className="font-['Playfair_Display'] text-3xl text-[var(--cor-dourado)] mb-2">Biblioteca</h1>
        <p className="text-sm text-[var(--cor-texto-medio)]">Tudo o que você decidiu guardar para ensinar, pregar e voltar a estudar.</p>
      </header>

      {studies.length === 0 ? (
        <div className="card p-8 text-center">
          <FolderHeart size={34} className="text-[var(--cor-dourado)] mx-auto mb-4" />
          <h2 className="text-lg text-[var(--cor-dourado-claro)] mb-2">Sua biblioteca começa com um estudo</h2>
          <p className="text-sm text-[var(--cor-texto-medio)]">Ao terminar um material, use “Salvar na biblioteca”. Ele ficará disponível aqui neste dispositivo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {studies.map((study) => (
            <article key={study.id} className="card p-4 flex items-center gap-3">
              <BookOpen size={20} className="shrink-0 text-[var(--cor-dourado)]" />
              <button onClick={() => setOpenStudy(study)} className="min-w-0 flex-1 text-left">
                <p className="text-[var(--cor-pergaminho)] truncate">{study.titulo}</p>
                <p className="text-xs text-[var(--cor-texto-dim)] mt-1 truncate">{nomeDoModo(study.modoId)} · {dateLabel(study.createdAt)}</p>
              </button>
              <button onClick={() => remove(study.id)} title="Excluir estudo" className="p-2 text-[var(--cor-texto-dim)] hover:text-[var(--cor-erro)]"><Trash2 size={17} /></button>
              <ChevronRight size={18} className="text-[var(--cor-dourado-dim)]" />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
