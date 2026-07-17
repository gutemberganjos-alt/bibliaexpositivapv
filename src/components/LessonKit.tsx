import { ArrowLeft, BookOpenCheck, ClipboardList, Printer, UsersRound } from 'lucide-react';
import type { EstudoResultado } from '../lib/gerar';
import { nomeDoModo, nomeDoPublico } from '../lib/ai-config';

interface LessonKitProps {
  result: EstudoResultado;
  reference: string;
  modeId: string;
  audienceId: string;
  onBack: () => void;
}

export default function LessonKit({ result, reference, modeId, audienceId, onBack }: LessonKitProps) {
  const printKit = () => window.print();

  return (
    <div className="kit-page max-w-3xl mx-auto p-4 pb-24">
      <div className="kit-actions flex items-center justify-between mb-7">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-[var(--cor-dourado)] hover:text-[var(--cor-dourado-claro)]">
          <ArrowLeft size={17} /> Voltar ao estudo
        </button>
        <button onClick={printKit} className="btn-secondary inline-flex items-center gap-2"><Printer size={15} /> Imprimir / PDF</button>
      </div>

      <article className="kit-sheet">
        <header className="kit-header">
          <p className="eyebrow">KIT DE AULA</p>
          <h1>{result.titulo}</h1>
          <p>{reference} · {nomeDoModo(modeId)} · {nomeDoPublico(audienceId)}</p>
        </header>

        <section className="kit-section">
          <div className="kit-section-title"><BookOpenCheck size={18} /><h2>Material de estudo</h2></div>
          <article className="estudo-conteudo" dangerouslySetInnerHTML={{ __html: result.html }} />
        </section>

        <section className="kit-section kit-activity">
          <div className="kit-section-title"><ClipboardList size={18} /><h2>Atividade de fixação</h2></div>
          <p className="kit-instruction">Reserve 10–15 minutos. A atividade foi organizada a partir do estudo para consolidar a aprendizagem sem exigir nova geração.</p>
          <ol>
            <li><strong>Observe:</strong> qual verdade central do texto você consegue explicar com suas palavras?</li>
            <li><strong>Interprete:</strong> que detalhe do contexto ajuda você a entender melhor {reference}?</li>
            <li><strong>Aplique:</strong> qual decisão prática este texto pede de você nesta semana?</li>
          </ol>
          <div className="kit-lines"><span /><span /><span /></div>
        </section>

        <section className="kit-section">
          <div className="kit-section-title"><UsersRound size={18} /><h2>Condução em grupo</h2></div>
          <ul className="kit-checklist">
            <li>Abra com a leitura de {reference}.</li>
            <li>Peça que cada pessoa compartilhe uma observação antes da explicação.</li>
            <li>Use as três perguntas da atividade em duplas ou pequenos grupos.</li>
            <li>Encerre com uma aplicação e oração objetiva.</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
