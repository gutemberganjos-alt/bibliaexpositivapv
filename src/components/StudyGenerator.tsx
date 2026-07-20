import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Sparkles, Copy, RotateCcw, BookmarkPlus, Check, ClipboardList } from 'lucide-react';
import {
  MODOS,
  PUBLICOS,
  MODO_PADRAO,
  PUBLICO_PADRAO,
  nomeDoModo,
  nomeDoPublico,
} from '../lib/ai-config';
import { gerarEstudoStream } from '../lib/gerar';
import type { EstudoResultado } from '../lib/gerar';
import { useToast } from '../contexts/ToastContext';
import { saveStudy } from '../lib/study-library';
import { cacheStudy, getCachedStudy } from '../lib/study-cache';
import LessonKit from './LessonKit';
import { getStudyProfileId, profileName } from '../lib/profile';

interface StudyGeneratorProps {
  /** Título grande da página. */
  titulo?: string;
  /** Subtítulo/descrição curta. */
  subtitulo?: string;
  /** Fixa o modo (ex.: 'exegese') e esconde o seletor de modo. */
  modoFixo?: string;
  /** Preenche a referência inicial (ex.: vindo da tela da Bíblia). */
  referenciaInicial?: string;
  /** Placeholder do campo de referência. */
  placeholder?: string;
}

export default function StudyGenerator({
  titulo = 'Estudos',
  subtitulo = 'Gere material bíblico sob medida: escolha o formato, o público e o texto.',
  modoFixo,
  referenciaInicial = '',
  placeholder = 'Ex.: João 3:16, o fruto do Espírito, a parábola do semeador…',
}: StudyGeneratorProps) {
  const [modoId, setModoId] = useState<string>(modoFixo ?? MODO_PADRAO);
  const [publicoId, setPublicoId] = useState<string>(PUBLICO_PADRAO);
  const [referencia, setReferencia] = useState<string>(referenciaInicial);

  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamHtml, setStreamHtml] = useState('');
  const [streamTitulo, setStreamTitulo] = useState('');
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<EstudoResultado | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [reutilizado, setReutilizado] = useState(false);
  const [mostrarKit, setMostrarKit] = useState(false);

  const { showToast } = useToast();

  // Aborta a geração se o componente for desmontado no meio do stream.
  const abortRef = useRef<null | (() => void)>(null);
  useEffect(() => () => abortRef.current?.(), []);

  const handleGerar = () => {
    if (!referencia.trim()) {
      setError('Informe um texto, tema ou referência bíblica.');
      return;
    }
    const params = { modoId, publicoId, referencia, perfilId: getStudyProfileId() };
    const cached = getCachedStudy(params);
    if (cached) {
      setError('');
      setResultado(cached);
      setSalvo(false);
      setReutilizado(true);
      showToast('Material recuperado do seu acervo. Nenhum crédito de IA foi usado.', 'info');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setStreaming(true);
    setError('');
    setResultado(null);
    setSalvo(false);
    setReutilizado(false);
    setMostrarKit(false);
    setStreamHtml('');
    setStreamTitulo('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    abortRef.current = gerarEstudoStream(
      params,
      {
        onTitulo: (t) => setStreamTitulo(t),
        onDelta: (html) => setStreamHtml(html),
        onDone: (res) => {
          cacheStudy(params, res);
          setResultado(res);
          setStreaming(false);
          setLoading(false);
          abortRef.current = null;
        },
        onError: (msg) => {
          setError(msg);
          setStreaming(false);
          setLoading(false);
          setStreamHtml('');
          setStreamTitulo('');
          abortRef.current = null;
        },
      },
    );
  };

  const handleCopiar = () => {
    if (!resultado) return;
    // Copia como texto simples (remove as tags HTML).
    const tmp = document.createElement('div');
    tmp.innerHTML = resultado.html;
    const texto = `${resultado.titulo}\n\n${tmp.textContent ?? ''}`.trim();
    navigator.clipboard
      .writeText(texto)
      .then(() => showToast('Estudo copiado', 'success'))
      .catch(() => showToast('Erro ao copiar', 'error'));
  };

  const handleNovo = () => {
    abortRef.current?.();
    abortRef.current = null;
    setResultado(null);
    setStreaming(false);
    setStreamHtml('');
    setStreamTitulo('');
    setLoading(false);
    setError('');
    setSalvo(false);
    setReutilizado(false);
    setMostrarKit(false);
  };

  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!resultado || salvo || salvando) return;
    setSalvando(true);
    try {
      // Só marcamos como salvo DEPOIS que o banco confirmou. Dizer "salvo" antes
      // e falhar na gravação seria prometer o que não aconteceu.
      await saveStudy({ ...resultado, modoId, publicoId, referencia });
      setSalvo(true);
      showToast('Estudo salvo na sua biblioteca', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSalvando(false);
    }
  };

  // ---------- TELA DE RESULTADO (inclui o streaming em andamento) ----------
  const emStream = streaming && !resultado;
  if (resultado && mostrarKit) {
    return <LessonKit result={resultado} reference={referencia} modeId={modoId} audienceId={publicoId} onBack={() => setMostrarKit(false)} />;
  }
  if (resultado || emStream) {
    const tituloExibido = resultado?.titulo || streamTitulo || referencia;
    const htmlExibido = resultado?.html ?? streamHtml;
    return (
      <div className="p-4 max-w-3xl mx-auto pb-24">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-['Manrope'] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--cor-borda-hover)] text-[var(--cor-dourado)]">
              {nomeDoModo(modoId)}
            </span>
            <span className="text-[10px] font-['Manrope'] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--cor-borda)] text-[var(--cor-texto-medio)]">
              {nomeDoPublico(publicoId)}
            </span>
            <span className="text-[10px] font-['Manrope'] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--cor-borda)] text-[var(--cor-texto-medio)]">
              {profileName(getStudyProfileId())}
            </span>
            {reutilizado && (
              <span className="text-[10px] font-['Manrope'] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[var(--cor-sucesso)] text-[var(--cor-sucesso)]">
                Recuperado do acervo
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSalvar}
              disabled={emStream || salvo || salvando}
              title={salvo ? 'Estudo salvo' : salvando ? 'Salvando…' : 'Salvar na biblioteca'}
              className={`p-2 rounded border border-[var(--cor-borda)] transition-colors ${salvo ? 'text-[var(--cor-sucesso)]' : 'text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'} ${emStream ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {salvo ? <Check size={16} /> : <BookmarkPlus size={16} />}
            </button>
            <button
              onClick={() => setMostrarKit(true)}
              disabled={emStream}
              title="Abrir kit de aula"
              className={`p-2 rounded border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] transition-colors ${emStream ? 'opacity-40 cursor-not-allowed' : 'hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'}`}
            >
              <ClipboardList size={16} />
            </button>
            <button
              onClick={handleCopiar}
              disabled={emStream}
              title="Copiar"
              className={`p-2 rounded border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] transition-colors ${
                emStream
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'
              }`}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={handleNovo}
              title="Novo estudo"
              className="p-2 rounded border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)] transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl text-[var(--cor-dourado-claro)] mb-2 leading-tight">
          {tituloExibido}
          {emStream && !tituloExibido && (
            <span className="text-[var(--cor-texto-dim)] italic">Preparando…</span>
          )}
        </h1>

        {resultado && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--cor-texto-dim)] font-['Manrope'] mb-6 pb-6 border-b border-[var(--cor-borda)]">
            {resultado.meta?.profundidade && resultado.meta.profundidade !== '—' && (
              <span>Profundidade: {resultado.meta.profundidade}</span>
            )}
            {resultado.meta?.tempo && resultado.meta.tempo !== '—' && (
              <span>Leitura: {resultado.meta.tempo}</span>
            )}
            {resultado.meta?.classificacao && resultado.meta.classificacao !== '—' && (
              <span>Classificação: {resultado.meta.classificacao}</span>
            )}
          </div>
        )}

        {emStream && (
          <div className="flex items-center gap-2 text-xs text-[var(--cor-dourado-dim)] font-['Manrope'] mb-6 pb-6 border-b border-[var(--cor-borda)]">
            <Loader2 size={13} className="animate-spin" />
            <span>Gerando o material…</span>
          </div>
        )}

        {/* Conteúdo gerado pelo modelo (HTML restrito a tags simples). */}
        {htmlExibido ? (
          <div className="relative">
            <article
              className="estudo-conteudo"
              dangerouslySetInnerHTML={{ __html: htmlExibido }}
            />
            {emStream && <span className="cursor-stream" aria-hidden="true" />}
          </div>
        ) : (
          emStream && (
            <p className="text-center text-sm text-[var(--cor-texto-dim)] py-8 font-['Manrope'] animate-pulse">
              Pesquisando as Escrituras e preparando o material…
            </p>
          )
        )}

        {resultado?.meta?.fontes && resultado.meta.fontes !== '—' && (
          <div className="mt-8 pt-5 border-t border-[var(--cor-borda)]">
            <h4 className="font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-2">
              Fontes
            </h4>
            <p className="text-sm text-[var(--cor-texto-dim)] leading-relaxed">
              {resultado.meta.fontes}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          {emStream ? (
            <button onClick={handleNovo} className="btn-secondary flex items-center gap-2">
              Cancelar
            </button>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setMostrarKit(true)} className="btn-primary flex items-center gap-2"><ClipboardList size={15} /> Criar kit de aula</button>
              <button onClick={handleNovo} className="btn-secondary flex items-center gap-2"><RotateCcw size={14} /> Gerar outro estudo</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- TELA DO FORMULÁRIO ----------
  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <header className="mb-8 pt-2 text-center">
        <h1 className="font-['Playfair_Display'] text-2xl md:text-3xl text-[var(--cor-dourado)] mb-2">
          {titulo}
        </h1>
        <p className="text-[var(--cor-texto-medio)] text-sm max-w-md mx-auto">{subtitulo}</p>
      </header>

      {/* Modo (formato) */}
      {!modoFixo && (
        <section className="mb-6">
          <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
            Formato
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODOS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModoId(m.id)}
                title={m.descricao}
                className={`text-left p-3 rounded-md border transition-colors ${
                  modoId === m.id
                    ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)]'
                    : 'border-[var(--cor-borda)] hover:border-[var(--cor-borda-hover)]'
                }`}
              >
                <span
                  className={`block font-['Manrope'] text-sm font-medium ${
                    modoId === m.id ? 'text-[var(--cor-dourado-claro)]' : 'text-[var(--cor-pergaminho)]'
                  }`}
                >
                  {m.nome}
                </span>
                <span className="block text-[11px] text-[var(--cor-texto-dim)] mt-0.5 leading-snug">
                  {m.descricao}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Público */}
      <section className="mb-6">
        <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
          Público
        </label>
        <div className="flex flex-wrap gap-2">
          {PUBLICOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPublicoId(p.id)}
              title={p.descricao}
              className={`px-3 py-1.5 rounded-full border text-sm font-['Manrope'] transition-colors ${
                publicoId === p.id
                  ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)]'
                  : 'border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:border-[var(--cor-borda-hover)]'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      </section>

      {/* Referência */}
      <section className="mb-6">
        <label
          htmlFor="referencia"
          className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3"
        >
          Texto, tema ou referência
        </label>
        <textarea
          id="referencia"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGerar();
          }}
          rows={3}
          maxLength={200}
          placeholder={placeholder}
          className="input-base w-full p-3 text-[1rem] resize-none font-['Literata']"
        />
        <div className="text-right text-[11px] text-[var(--cor-texto-dim)] mt-1 font-['Manrope']">
          {referencia.length}/200
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 text-[var(--cor-erro)] text-sm mb-4">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleGerar}
        disabled={loading || !referencia.trim()}
        className={`btn-primary w-full flex items-center justify-center gap-2 ${
          loading || !referencia.trim() ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Gerando material…
          </>
        ) : (
          <>
            <Sparkles size={16} /> Gerar estudo
          </>
        )}
      </button>

      {loading && (
        <p className="text-center text-xs text-[var(--cor-texto-dim)] mt-4 font-['Manrope'] animate-pulse">
          Pesquisando as Escrituras e preparando o material. Isso pode levar alguns segundos.
        </p>
      )}
    </div>
  );
}
