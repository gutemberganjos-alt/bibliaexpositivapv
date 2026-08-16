import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Copy, RotateCcw, BookmarkPlus, Check, ClipboardList, Lock, ArrowRight, BookOpen, Printer, Mic, Volume2, VolumeX } from 'lucide-react';
import PenWriting from './PenWriting';
import {
  MODOS,
  PUBLICOS,
  MODO_PADRAO,
  PUBLICO_PADRAO,
  nomeDoModo,
  nomeDoPublico,
  CORRENTES,
  gruposDeTeologos,
  nomeDoTeologo,
  TRADUCOES,
  TRADUCAO_PADRAO,
  TEMAS_SUGERIDOS,
} from '../lib/ai-config';
import { gerarEstudo, gerarEstudoStream } from '../lib/gerar';
import type { EstudoResultado } from '../lib/gerar';
import { useToast } from '../contexts/ToastContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { rotuloRestantes } from '../lib/quota';
import TrialPaywall from './TrialPaywall';
import { saveStudy, fetchStudies, getCachedStudies } from '../lib/study-library';
import type { SavedStudy } from '../lib/study-library';
import { cacheStudy, getCachedStudy } from '../lib/study-cache';
import LessonKit from './LessonKit';
import { getStudyProfileId, profileName } from '../lib/profile';
import { parseReferencia } from '../lib/bible-ref';
import { buscarPaginaPublicaExata, urlPaginaPublica } from '../lib/seo-pages';
import type { PaginaPublica } from '../lib/seo-pages';
import { ExternalLink } from 'lucide-react';

/** Mensagens de espera. Trocam a cada ~7s para o material longo não parecer travado. */
const ETAPAS_ESPERA = [
  'Lendo a passagem e o contexto imediato.',
  'Levantando referências cruzadas e paralelos.',
  'Estruturando o material no formato escolhido.',
  'Classificando cada afirmação com os selos de confiabilidade.',
  'Revisando e fechando o texto. Já falta pouco.',
];

/** Fundo escuro navy+dourado — o mesmo do Dashboard (.home-dark), aplicado
 * aqui também para que a tela de Estudos siga o mesmo "estilo e cor" pedido. */
const FUNDO_ESCURO = {
  background:
    'radial-gradient(ellipse 80% 45% at 50% -8%, rgba(228,190,107,.14), transparent 60%), linear-gradient(180deg, #0E2038 0%, #0A1728 100%)',
};

interface StudyGeneratorProps {
  /** Título grande da página. */
  titulo?: string;
  /** Subtítulo/descrição curta. */
  subtitulo?: string;
  /** Fixa o modo (ex.: 'exegese') e esconde o seletor de modo. */
  modoFixo?: string;
  /** Preenche a referência inicial (ex.: vindo da tela da Bíblia). */
  referenciaInicial?: string;
  /** Pré-seleciona o público (ex.: vindo da paleta de comando ⌘K). */
  publicoInicial?: string;
  /** Placeholder do campo de referência. */
  placeholder?: string;
}

export default function StudyGenerator({
  titulo = 'Estudos',
  subtitulo = 'Gere material bíblico sob medida: escolha o formato, o público e o texto.',
  modoFixo,
  referenciaInicial = '',
  publicoInicial,
  placeholder = 'Ex.: João 3:16, o fruto do Espírito, a parábola do semeador…',
}: StudyGeneratorProps) {
  const [modoId, setModoId] = useState<string>(modoFixo ?? MODO_PADRAO);
  const [publicoId, setPublicoId] = useState<string>(
    PUBLICOS.some((p) => p.id === publicoInicial) ? (publicoInicial as string) : PUBLICO_PADRAO,
  );
  const [referencia, setReferencia] = useState<string>(referenciaInicial);

  // Lente teológica da resposta — ver briefing "Reformulação da tela de Estudos".
  const [correntes, setCorrentes] = useState<string[]>([]);
  const [mostrarTag, setMostrarTag] = useState(true);
  const [teologoId, setTeologoId] = useState<string>('');
  const [traducaoId, setTraducaoId] = useState<string>(TRADUCAO_PADRAO);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Ditado por voz no campo de referência — recurso nativo do navegador
  // (sem custo de API): quem está de pé preparando aula pode falar em vez de digitar.
  // Tipagem mínima local: a API Web Speech não faz parte do lib DOM padrão do TS.
  interface ReconhecimentoVoz {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
  }
  const [ouvindoDitado, setOuvindoDitado] = useState(false);
  const reconhecimentoRef = useRef<ReconhecimentoVoz | null>(null);
  const ReconhecimentoCtor = (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  const vozDisponivel = typeof window !== 'undefined' && typeof ReconhecimentoCtor === 'function';

  function alternarDitado() {
    if (ouvindoDitado) {
      reconhecimentoRef.current?.stop();
      return;
    }
    if (typeof ReconhecimentoCtor !== 'function') return;
    const reconhecimento = new (ReconhecimentoCtor as new () => ReconhecimentoVoz)();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 1;
    reconhecimento.onresult = (evento) => {
      const texto = evento.results[0]?.[0]?.transcript ?? '';
      if (texto) setReferencia((atual) => (atual ? `${atual} ${texto}` : texto).slice(0, 200));
    };
    reconhecimento.onend = () => setOuvindoDitado(false);
    reconhecimento.onerror = () => setOuvindoDitado(false);
    reconhecimentoRef.current = reconhecimento;
    reconhecimento.start();
    setOuvindoDitado(true);
  }

  // Leitura em voz alta do estudo gerado — window.speechSynthesis, também sem custo.
  const [falandoEstudo, setFalandoEstudo] = useState(false);
  const vozLeituraDisponivel = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function alternarLeitura() {
    if (falandoEstudo) {
      window.speechSynthesis.cancel();
      setFalandoEstudo(false);
      return;
    }
    const fonteHtml = resultado?.html ?? streamHtml;
    if (!fonteHtml) return;
    const texto = fonteHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!texto) return;
    window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.onend = () => setFalandoEstudo(false);
    fala.onerror = () => setFalandoEstudo(false);
    window.speechSynthesis.speak(fala);
    setFalandoEstudo(true);
  }

  useEffect(() => {
    // Ao sair da tela (ou trocar de estudo), não deixar a leitura tocando sozinha.
    return () => { if (vozLeituraDisponivel) window.speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Já existe uma versão pública disto?" — evita gastar uma geração quando o
  // pipeline seo/ já publicou exatamente esse termo (ver lib/seo-pages.ts).
  const [paginaPublica, setPaginaPublica] = useState<PaginaPublica | null>(null);
  useEffect(() => {
    const termo = referencia.trim();
    if (termo.length < 3) { setPaginaPublica(null); return; }
    let ativo = true;
    const t = setTimeout(() => {
      void buscarPaginaPublicaExata(termo).then((p) => { if (ativo) setPaginaPublica(p); });
    }, 500);
    return () => { ativo = false; clearTimeout(t); };
  }, [referencia]);

  const toggleCorrente = (id: string) =>
    setCorrentes((atual) => (atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id]));

  const sugestoesTema = useMemo(() => {
    const termo = referencia.trim().toLowerCase();
    const lista = termo
      ? TEMAS_SUGERIDOS.filter((t) => t.toLowerCase().includes(termo))
      : TEMAS_SUGERIDOS;
    return lista.slice(0, 6);
  }, [referencia]);

  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamHtml, setStreamHtml] = useState('');
  const [streamTitulo, setStreamTitulo] = useState('');
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<EstudoResultado | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [reutilizado, setReutilizado] = useState(false);
  const [mostrarKit, setMostrarKit] = useState(false);
  /** Convite de assinatura: aberto quando o teste grátis acaba. */
  const [paywall, setPaywall] = useState(false);
  const [etapaEspera, setEtapaEspera] = useState(0);

  // Estudos recentes — mostrados na coluna lateral do formulário (contexto,
  // igual ao protótipo aprovado), com os mesmos dados reais da biblioteca.
  const [recentes, setRecentes] = useState<SavedStudy[]>(() => getCachedStudies().slice(0, 3));
  useEffect(() => {
    let ativo = true;
    void fetchStudies().then((lista) => { if (ativo) setRecentes(lista.slice(0, 3)); });
    return () => { ativo = false; };
  }, []);

  const { showToast } = useToast();
  const { active, quota, refreshQuota } = useSubscription();
  const navigate = useNavigate();

  // Contador do teste grátis. Só aparece para quem ainda não assinou.
  const emTeste = !active && quota?.trial === true;
  const semGeracoes = emTeste && quota.remaining <= 0;

  // Aborta a geração se o componente for desmontado no meio do stream.
  const abortRef = useRef<null | (() => void)>(null);
  useEffect(() => () => abortRef.current?.(), []);

  // Avança a mensagem de espera enquanto o material é gerado.
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setEtapaEspera((n) => n + 1), 7000);
    return () => clearInterval(t);
  }, [loading]);

  // `opts.publicoOverride` é usado pelo ajuste de nível incremental — reescreve
  // o MESMO estudo para outro público sem inventar um caminho de custo novo:
  // é a mesma chamada de geração, mesma franquia, só com o publicoId trocado.
  const handleGerar = (opts?: { publicoOverride?: string }) => {
    if (!referencia.trim()) {
      setError('Informe um texto, tema ou referência bíblica.');
      return;
    }
    // Teste grátis já encerrado: mostra o convite antes de chamar o servidor.
    if (semGeracoes) {
      setPaywall(true);
      return;
    }
    const publicoAlvo = opts?.publicoOverride ?? publicoId;
    const params = {
      modoId, publicoId: publicoAlvo, referencia, perfilId: getStudyProfileId(),
      correntes, mostrarTag, teologoId: teologoId || undefined, traducaoId,
    };
    const cached = getCachedStudy(params);
    if (cached) {
      setError('');
      setResultado(cached);
      setSalvo(false);
      setReutilizado(true);
      if (opts?.publicoOverride) setPublicoId(opts.publicoOverride);
      showToast('Material recuperado do seu acervo. Nenhuma geração foi usada.', 'info');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (opts?.publicoOverride) setPublicoId(opts.publicoOverride);
    setLoading(true);
    setStreaming(true);
    setEtapaEspera(0);
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
          // Atualiza o contador do teste grátis logo após consumir uma geração.
          void refreshQuota();
        },
        onError: (msg, code) => {
          // Acabaram as gerações do teste: abre o convite em vez de um erro seco.
          if (code === 'trial_exhausted') {
            setPaywall(true);
            void refreshQuota();
          } else if (code === 'device_trial_limit') {
            showToast(msg, 'error');
            setPaywall(true);
            void refreshQuota();
          } else if (code === 'whatsapp_required') {
            // Bug antigo: mandava para "/conta", rota que não existe — como
            // nenhuma rota casava, a tela ficava em branco (nem o Layout
            // aparecia). A rota certa é "/minha-conta".
            showToast(msg, 'error');
            navigate('/minha-conta');
          } else {
            setError(msg);
          }
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

  // Comparação lado a lado de duas correntes teológicas — opt-in e com custo
  // explícito: são DUAS chamadas de geração (uma por corrente), o dobro da
  // franquia de um estudo comum. Por isso o window.confirm antes de disparar.
  const [comparando, setComparando] = useState(false);
  const [resultadoComparacao, setResultadoComparacao] = useState<{ a: EstudoResultado; b: EstudoResultado; nomeA: string; nomeB: string } | null>(null);

  const handleComparar = async () => {
    if (correntes.length !== 2) return;
    if (!referencia.trim()) {
      setError('Informe um texto, tema ou referência bíblica.');
      return;
    }
    if (semGeracoes) {
      setPaywall(true);
      return;
    }
    const [idA, idB] = correntes;
    const nomeA = CORRENTES.find((c) => c.id === idA)?.nome ?? idA;
    const nomeB = CORRENTES.find((c) => c.id === idB)?.nome ?? idB;
    const confirmado = window.confirm(
      `Isso gera DUAS versões completas — "${nomeA}" e "${nomeB}" — lado a lado.\n\nConsome 2 gerações da sua franquia (o dobro de um estudo comum). Continuar?`,
    );
    if (!confirmado) return;

    setComparando(true);
    setError('');
    setResultadoComparacao(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const base = {
      modoId, publicoId, referencia, perfilId: getStudyProfileId(),
      mostrarTag: true, teologoId: teologoId || undefined, traducaoId,
    };
    try {
      const [resA, resB] = await Promise.all([
        gerarEstudo({ ...base, correntes: [idA] }),
        gerarEstudo({ ...base, correntes: [idB] }),
      ]);
      setResultadoComparacao({ a: resA, b: resB, nomeA, nomeB });
      void refreshQuota();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Não foi possível gerar a comparação.', 'error');
    } finally {
      setComparando(false);
    }
  };

  const handleNovo = () => {
    abortRef.current?.();
    abortRef.current = null;
    setResultado(null);
    setResultadoComparacao(null);
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

  // ---------- TELA DE COMPARAÇÃO (duas correntes lado a lado) ----------
  if (comparando) {
    return (
      <div className="home-dark" style={FUNDO_ESCURO}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Loader2 size={28} className="animate-spin text-[var(--cor-dourado)] mb-4" />
          <p className="font-['Manrope'] text-[var(--cor-pergaminho)] text-sm">
            Gerando as duas versões em paralelo — uma para cada corrente…
          </p>
        </div>
      </div>
    );
  }
  if (resultadoComparacao) {
    return (
      <div className="home-dark" style={FUNDO_ESCURO}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
          <div className="flex items-center justify-between gap-3 mb-6">
            <p className="eyebrow">COMPARAÇÃO LADO A LADO</p>
            <button onClick={() => setResultadoComparacao(null)} className="btn-secondary flex items-center gap-2">
              <RotateCcw size={14} /> Voltar
            </button>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              { res: resultadoComparacao.a, nome: resultadoComparacao.nomeA },
              { res: resultadoComparacao.b, nome: resultadoComparacao.nomeB },
            ].map(({ res, nome }) => (
              <div key={nome}>
                <p className="text-xs font-['Manrope'] font-bold uppercase tracking-wider text-[var(--cor-dourado)] mb-1.5">{nome}</p>
                <h2 className="font-['Playfair_Display'] text-xl md:text-2xl text-[var(--cor-dourado-claro)] mb-4 leading-snug">{res.titulo}</h2>
                <div className="estudo-card-claro p-5 md:p-6">
                  <article className="estudo-conteudo" dangerouslySetInnerHTML={{ __html: res.html }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- TELA DE RESULTADO (inclui o streaming em andamento) ----------
  const emStream = streaming && !resultado;
  if (resultado && mostrarKit) {
    return <LessonKit result={resultado} reference={referencia} modeId={modoId} audienceId={publicoId} onBack={() => setMostrarKit(false)} />;
  }
  if (resultado || emStream) {
    const tituloExibido = resultado?.titulo || streamTitulo || referencia;
    const htmlExibido = resultado?.html ?? streamHtml;
    // Sumário ao vivo: extrai os <h4> já escritos no streaming — em vez de só
    // uma frase de espera, mostra o material tomando forma em tempo real.
    const secoesEscritas = emStream
      ? [...streamHtml.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''))
      : [];
    return (
      <div className="home-dark" style={FUNDO_ESCURO}>
        <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
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
                className={`p-2.5 rounded-lg border border-[var(--cor-borda)] transition-colors ${salvo ? 'text-[var(--cor-sucesso)]' : 'text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'} ${emStream ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {salvo ? <Check size={17} /> : <BookmarkPlus size={17} />}
              </button>
              <button
                onClick={() => setMostrarKit(true)}
                disabled={emStream}
                title="Abrir kit de aula"
                className={`p-2.5 rounded-lg border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] transition-colors ${emStream ? 'opacity-40 cursor-not-allowed' : 'hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'}`}
              >
                <ClipboardList size={17} />
              </button>
              <button
                onClick={handleCopiar}
                disabled={emStream}
                title="Copiar"
                className={`p-2.5 rounded-lg border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] transition-colors ${
                  emStream
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'
                }`}
              >
                <Copy size={17} />
              </button>
              {resultado && (
                <button
                  onClick={() => window.print()}
                  title="Imprimir / salvar em PDF — bom para levar ao púlpito ou à sala de aula sem internet"
                  className="p-2.5 rounded-lg border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)] transition-colors"
                >
                  <Printer size={17} />
                </button>
              )}
              {resultado && vozLeituraDisponivel && (
                <button
                  onClick={alternarLeitura}
                  title={falandoEstudo ? 'Parar leitura' : 'Ouvir este estudo em voz alta'}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    falandoEstudo
                      ? 'border-[var(--cor-dourado)] text-[var(--cor-dourado)]'
                      : 'border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)]'
                  }`}
                >
                  {falandoEstudo ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              )}
              <button
                onClick={handleNovo}
                title="Novo estudo"
                className="p-2.5 rounded-lg border border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:border-[var(--cor-borda-hover)] transition-colors"
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          <div className="print-area">
          <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[var(--cor-dourado-claro)] mb-2 leading-tight">
            {tituloExibido}
            {emStream && !tituloExibido && (
              <span className="text-[var(--cor-texto-dim)] italic">Preparando…</span>
            )}
          </h1>

          {/* Cabeçalho de identificação — "Referência (Tradução) | Visão | Perspectiva | Público".
              Regra de ouro: toda resposta gerada vem com esta linha fixa. */}
          {resultado?.meta?.cabecalho && (
            <p className="text-xs font-['Manrope'] text-[var(--cor-dourado-dim)] mb-4 pb-4 border-b border-[var(--cor-borda)]">
              {resultado.meta.cabecalho}
            </p>
          )}

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

          {/* Ajuste de nível incremental — reescreve o MESMO estudo para outro
              público sem passar pela tela de formulário de novo. Não é um
              caminho de custo novo: é a mesma chamada de geração de sempre,
              por isso o aviso explícito de que consome 1 geração. */}
          {resultado && !emStream && (
            <div className="mb-6 pb-6 border-b border-[var(--cor-borda)] print-oculto">
              <p className="text-[11px] font-['Manrope'] uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-2.5">
                Reescrever para outro público
              </p>
              <div className="flex flex-wrap gap-2">
                {PUBLICOS.filter((p) => p.id !== publicoId).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleGerar({ publicoOverride: p.id })}
                    title={`Gera uma nova versão deste estudo para "${p.nome}" — consome 1 geração da sua franquia`}
                    className="px-3 py-1.5 rounded-full border border-[var(--cor-borda)] text-xs font-['Manrope'] text-[var(--cor-texto-medio)] hover:border-[var(--cor-dourado)] hover:text-[var(--cor-dourado)] transition-colors"
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--cor-texto-dim)] font-['Manrope'] mt-2">Cada clique gera de novo e usa 1 geração da sua franquia.</p>
            </div>
          )}

          {emStream && (
            <div className="mb-6 pb-6 border-b border-[var(--cor-borda)]">
              <div className="flex items-center gap-2 text-xs text-[var(--cor-dourado-dim)] font-['Manrope'] mb-3">
                <Loader2 size={13} className="animate-spin" />
                <span>{secoesEscritas.length > 0 ? `Escrevendo — ${secoesEscritas.length} seção(ões) prontas` : 'Gerando o material…'}</span>
              </div>
              {secoesEscritas.length > 0 && (
                <ul className="space-y-1.5">
                  {secoesEscritas.map((s, i) => (
                    <li key={`${s}-${i}`} className="flex items-center gap-2 text-sm font-['Manrope'] text-[var(--cor-pergaminho)]">
                      <Check size={13} className="text-[var(--cor-sucesso)] shrink-0" />
                      {s}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-sm font-['Manrope'] text-[var(--cor-texto-dim)] italic">
                    <Loader2 size={13} className="animate-spin shrink-0" />
                    escrevendo a próxima seção…
                  </li>
                </ul>
              )}
            </div>
          )}

          {/* Conteúdo gerado pelo modelo — cartão claro proposital (os selos de
              confiabilidade foram calibrados para fundo claro). Clique em um
              selo com referência (data-ref) abre o Laboratório do Original
              direto naquele versículo. */}
          {htmlExibido ? (
            <div
              className="relative estudo-card-claro p-6 md:p-8"
              onClick={(e) => {
                const alvo = (e.target as HTMLElement).closest('.selo[data-ref]');
                const ref = alvo?.getAttribute('data-ref');
                if (!ref) return;
                const resolvido = parseReferencia(ref);
                if (!resolvido) return;
                const params = new URLSearchParams({ livro: resolvido.livro.name, cap: String(resolvido.capitulo) });
                if (resolvido.versiculo) params.set('verso', String(resolvido.versiculo));
                navigate(`/biblia?${params.toString()}`);
              }}
            >
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

          {resultado?.meta?.relacionados && resultado.meta.relacionados.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[var(--cor-borda)]">
              <h4 className="font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
                Estudos relacionados
              </h4>
              <div className="flex flex-wrap gap-2">
                {resultado.meta.relacionados.map((termo) => (
                  <button
                    key={termo}
                    onClick={() => navigate(`/estudos?ref=${encodeURIComponent(termo)}`)}
                    className="px-3.5 py-1.5 rounded-full border border-[var(--cor-borda)] text-xs font-['Manrope'] text-[var(--cor-texto-medio)] hover:border-[var(--cor-dourado)] hover:text-[var(--cor-dourado)] transition-colors"
                  >
                    {termo}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="mt-8 flex justify-center print-oculto">
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
      </div>
    );
  }

  // ---------- TELA DO FORMULÁRIO ----------
  const referenciaPrevia = referencia.trim() || 'Referência';
  const visaoPrevia = mostrarTag && correntes.length > 0
    ? correntes.map((id) => CORRENTES.find((c) => c.id === id)?.nome).join(' + ')
    : null;

  return (
    <div className="home-dark" style={FUNDO_ESCURO}>
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
        <header className="mb-7 pt-2">
          <p className="eyebrow mb-1.5">GERADOR DE ESTUDO</p>
          <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl text-[var(--cor-dourado)] mb-2">
            {titulo}
          </h1>
          <p className="text-[var(--cor-texto-medio)] text-sm md:text-[15px] max-w-xl">{subtitulo}</p>
        </header>

        <div className="grid lg:grid-cols-[1.25fr_0.85fr] gap-6 items-start">
          <div className="space-y-5">
            {/* Modo (formato) */}
            {!modoFixo && (
              <section className="card p-5 md:p-6">
                <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
                  Formato
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {MODOS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModoId(m.id)}
                      title={m.descricao}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
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
            <section className="card p-5 md:p-6">
              <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
                Público
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PUBLICOS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPublicoId(p.id)}
                    title={p.descricao}
                    className={`px-4 py-2 rounded-full border text-sm font-['Manrope'] transition-colors ${
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

            {/* Referência — com autocomplete de temas e chips de sugestão rápida */}
            <section className="card p-5 md:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor="referencia"
                  className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)]"
                >
                  Texto, tema ou referência
                </label>
                {vozDisponivel && (
                  <button
                    type="button"
                    onClick={alternarDitado}
                    title="Ditar por voz"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-['Manrope'] font-semibold uppercase tracking-wide transition-colors ${
                      ouvindoDitado
                        ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)] animate-pulse'
                        : 'border-[var(--cor-borda)] text-[var(--cor-texto-dim)] hover:border-[var(--cor-borda-hover)] hover:text-[var(--cor-texto-medio)]'
                    }`}
                  >
                    <Mic size={12} />
                    {ouvindoDitado ? 'Ouvindo…' : 'Falar'}
                  </button>
                )}
              </div>
              <textarea
                id="referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                onFocus={() => setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGerar();
                }}
                rows={3}
                maxLength={200}
                placeholder={placeholder}
                className="input-base w-full p-3.5 text-[1rem] resize-none font-['Literata']"
              />
              <div className="text-right text-[11px] text-[var(--cor-texto-dim)] mt-1 font-['Manrope']">
                {referencia.length}/200
              </div>

              {mostrarSugestoes && sugestoesTema.length > 0 && (
                <div className="absolute left-5 right-5 top-[calc(100%-1.1rem)] z-20 rounded-md border border-[var(--cor-borda-hover)] bg-[var(--cor-fundo-card)] shadow-lg overflow-hidden">
                  {sugestoesTema.map((tema) => (
                    <button
                      key={tema}
                      type="button"
                      onMouseDown={() => { setReferencia(tema); setMostrarSugestoes(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-['Literata'] text-[var(--cor-pergaminho)] hover:bg-[var(--cor-fundo-hover)] transition-colors flex items-center justify-between"
                    >
                      {tema}
                      <span className="text-[10px] font-['Manrope'] uppercase tracking-wide text-[var(--cor-texto-dim)]">tema</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3.5 pt-3.5 border-t border-[var(--cor-borda)]">
                {TEMAS_SUGERIDOS.slice(0, 6).map((tema) => (
                  <button
                    key={tema}
                    type="button"
                    onClick={() => setReferencia(tema)}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-['Manrope'] transition-colors ${
                      referencia === tema
                        ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)]'
                        : 'border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:border-[var(--cor-borda-hover)]'
                    }`}
                  >
                    {tema}
                  </button>
                ))}
              </div>
            </section>

            {/* Já existe uma versão pública deste tema — economiza a franquia
                e ajuda o SEO (link interno para a página já indexada). */}
            {paginaPublica && (
              <a
                href={urlPaginaPublica(paginaPublica)}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-4 flex items-center gap-3 border-[var(--cor-oliva)]/40 hover:border-[var(--cor-oliva)] transition-colors"
              >
                <ExternalLink size={18} className="shrink-0" style={{ color: 'var(--cor-oliva)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-['Manrope'] font-medium text-[var(--cor-pergaminho)] truncate">
                    Já existe uma versão pública: {paginaPublica.titulo}
                  </span>
                  <span className="block text-xs text-[var(--cor-texto-dim)] mt-0.5">
                    Ler grátis sem gastar uma geração — abre em nova aba
                  </span>
                </span>
              </a>
            )}

            {/* Corrente teológica + Perspectiva do teólogo + Tradução */}
            <div className="grid sm:grid-cols-2 gap-5">
              <section className="card p-5 md:p-6">
                <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
                  Corrente teológica
                </label>
                <div className="space-y-3">
                  {CORRENTES.map((c) => {
                    const marcado = correntes.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCorrente(c.id)}
                        className="flex items-center gap-2.5 text-sm font-['Literata'] text-[var(--cor-pergaminho)]"
                      >
                        <span
                          className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                            marcado ? 'bg-[var(--cor-dourado)] border-[var(--cor-dourado)]' : 'border-[var(--cor-borda-hover)]'
                          }`}
                        >
                          {marcado && <Check size={12} className="text-white" />}
                        </span>
                        {c.nome}
                      </button>
                    );
                  })}
                  <div className="pt-2.5 mt-1 border-t border-[var(--cor-borda)]">
                    <button
                      type="button"
                      onClick={() => setMostrarTag((v) => !v)}
                      className="flex items-center gap-2.5 text-sm font-['Literata'] text-[var(--cor-pergaminho)]"
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                          mostrarTag ? 'bg-[var(--cor-ouro)] border-[var(--cor-ouro)]' : 'border-[var(--cor-borda-hover)]'
                        }`}
                      >
                        {mostrarTag && <Check size={12} className="text-white" />}
                      </span>
                      Mostrar tag na resposta
                    </button>
                  </div>
                  {correntes.length === 2 && (
                    <div className="pt-2.5 mt-1 border-t border-[var(--cor-borda)]">
                      <button
                        type="button"
                        onClick={handleComparar}
                        title="Gera duas versões completas, uma para cada corrente marcada, lado a lado — consome 2 gerações"
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)] text-sm font-['Manrope'] font-medium flex items-center justify-between gap-2 hover:opacity-90 transition-opacity"
                      >
                        Comparar as duas lado a lado
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--cor-dourado-claro)]">2 gerações</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="card p-5 md:p-6">
                <label htmlFor="teologo" className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3">
                  Perspectiva do teólogo <span className="normal-case text-[var(--cor-texto-dim)]">(opcional)</span>
                </label>
                <select
                  id="teologo"
                  value={teologoId}
                  onChange={(e) => setTeologoId(e.target.value)}
                  className="input-base w-full p-2.5 text-sm font-['Literata']"
                >
                  <option value="">Nenhuma (resposta neutra)</option>
                  {gruposDeTeologos().map(({ grupo, itens }) => (
                    <optgroup key={grupo} label={grupo}>
                      {itens.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <label htmlFor="traducao" className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-3 mt-5">
                  Tradução
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRADUCOES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTraducaoId(t)}
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-['Manrope'] font-semibold transition-colors ${
                        traducaoId === t
                          ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)]'
                          : 'border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:border-[var(--cor-borda-hover)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[var(--cor-erro)] text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => handleGerar()}
              disabled={loading || !referencia.trim()}
              className={`btn-primary w-full flex items-center justify-center gap-2 !py-4 !text-[13.5px] ${
                loading || !referencia.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <PenWriting size={17} /> Preparando seu material…
                </>
              ) : semGeracoes ? (
                <>
                  <Lock size={16} /> Assinar para continuar
                </>
              ) : (
                <>
                  <PenWriting size={17} /> Clique aqui para preparar seu material
                </>
              )}
            </button>

            {/* Contador do teste grátis: a pessoa precisa saber que o limite existe
                ANTES de bater nele, senão o bloqueio parece armadilha. A barra torna
                o consumo visível — texto sozinho passa despercebido. */}
            {emTeste && !loading && (
              <div className="max-w-xs mx-auto">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-['Manrope'] uppercase tracking-wider text-[var(--cor-dourado-dim)]">
                    Teste gratuito
                  </span>
                  <span className="text-[11px] font-['Manrope'] text-[var(--cor-texto-medio)]">
                    {quota.used} de {quota.limit} usadas
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-[var(--cor-dourado-bg)] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={quota.used}
                  aria-valuemin={0}
                  aria-valuemax={quota.limit}
                  aria-label="Gerações usadas no teste gratuito"
                >
                  <div
                    className="h-full rounded-full bg-[var(--cor-ouro)] transition-all duration-500"
                    style={{ width: `${Math.min(100, (quota.used / Math.max(quota.limit, 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-center text-xs text-[var(--cor-dourado-dim)] mt-2 font-['Manrope']">
                  {rotuloRestantes(quota)}
                </p>
              </div>
            )}

            {/* Exegese longa passa de um minuto. Uma frase fixa dá a sensação de travado
                — a mensagem avança junto com o trabalho para mostrar que há progresso. */}
            {loading && (
              <p className="text-center text-xs text-[var(--cor-texto-dim)] font-['Manrope']">
                {ETAPAS_ESPERA[Math.min(etapaEspera, ETAPAS_ESPERA.length - 1)]}
              </p>
            )}
          </div>

          {/* Coluna lateral de contexto — prévia do cabeçalho + estudos recentes,
              igual ao protótipo aprovado ("exemplos, sugestões de temas"). */}
          <div className="space-y-5 lg:sticky lg:top-6">
            <section className="card p-5 space-y-3">
              <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)]">
                Cabeçalho da resposta
              </label>
              <div className="rounded-md bg-[var(--cor-fundo-hover)] px-3.5 py-3 text-xs font-['Manrope'] text-[var(--cor-texto-medio)] leading-relaxed">
                <strong className="text-[var(--cor-pergaminho)]">{referenciaPrevia} ({traducaoId})</strong>
                {visaoPrevia && (
                  <> {' '}| Visão: <strong className="text-[var(--cor-dourado)]">{visaoPrevia}</strong></>
                )}
                {teologoId && (
                  <> {' '}| Perspectiva: <strong className="text-[var(--cor-dourado)]">{nomeDoTeologo(teologoId)}</strong></>
                )}
                {' '}| Público: <strong className="text-[var(--cor-pergaminho)]">{nomeDoPublico(publicoId)}</strong>
              </div>
              <p className="text-[11px] text-[var(--cor-texto-dim)] font-['Manrope']">
                Toda resposta gerada leva este cabeçalho fixo, conforme a regra de identificação.
              </p>
            </section>

            {recentes.length > 0 && (
              <section className="card p-5 space-y-1">
                <label className="block font-['Manrope'] text-xs uppercase tracking-wider text-[var(--cor-dourado-dim)] mb-2">
                  Estudos recentes
                </label>
                {recentes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/biblioteca?abrir=${s.id}`)}
                    className="w-full flex items-center gap-3 py-2.5 border-b border-[var(--cor-borda)] last:border-0 text-left"
                  >
                    <BookOpen size={16} className="shrink-0 text-[var(--cor-dourado)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-[var(--cor-pergaminho)] truncate">{s.titulo}</span>
                      <span className="block text-[11px] text-[var(--cor-texto-dim)] mt-0.5">{nomeDoModo(s.modoId)}</span>
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-[var(--cor-dourado-dim)]" />
                  </button>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>

      {paywall && <TrialPaywall onClose={() => setPaywall(false)} />}
    </div>
  );
}
