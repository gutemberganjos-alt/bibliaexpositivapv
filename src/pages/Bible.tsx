import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, AlertCircle, Languages, ScrollText, Copy, Sparkles, RefreshCw } from 'lucide-react';
import { BIBLE_BOOKS } from '../lib/bible-data';
import type { BibleBook } from '../lib/bible-data';
import { useToast } from '../contexts/ToastContext';
import { gerarLexico } from '../lib/lexico';
import type { LexicoResultado, PalavraLexico } from '../lib/lexico';

/** Tradução usada pela leitura corrida hoje — Regra de Ouro: nunca mostrar um
 * versículo sem indicar a tradução. As demais (ARA/NVI/NVT/NAA/KJV) exigem
 * licenciar o texto de cada editora e ainda não estão disponíveis aqui. */
const TRADUCAO_ATUAL = 'ARC';

interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: Verse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export default function Bible() {
  const [selectedVersion] = useState<'almeida'>('almeida');
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Laboratório do Original — análise das palavras-chave do versículo selecionado.
  const [lexico, setLexico] = useState<LexicoResultado | null>(null);
  const [lexicoLoading, setLexicoLoading] = useState(false);
  const [lexicoError, setLexicoError] = useState('');
  const [palavraAtiva, setPalavraAtiva] = useState<PalavraLexico | null>(null);
  const [lexicoRetry, setLexicoRetry] = useState(0);

  const readingAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Busca o léxico assim que um versículo é selecionado. Ignora respostas que
  // chegam depois de o usuário já ter trocado de versículo (evita "race").
  useEffect(() => {
    if (selectedVerseIndex === null || !verses[selectedVerseIndex]) {
      return;
    }
    const verse = verses[selectedVerseIndex];
    const referencia = `${selectedBook.name} ${selectedChapter}:${verse.verse}`;
    let ativo = true;
    setLexico(null);
    setPalavraAtiva(null);
    setLexicoError('');
    setLexicoLoading(true);
    gerarLexico(referencia, verse.text, TRADUCAO_ATUAL)
      .then((res) => {
        if (!ativo) return;
        setLexico(res);
        setPalavraAtiva(res.palavras[0] ?? null);
      })
      .catch((e: Error) => { if (ativo) setLexicoError(e.message); })
      .finally(() => { if (ativo) setLexicoLoading(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVerseIndex, lexicoRetry]);

  const fetchChapter = async () => {
    setLoading(true);
    setError('');
    setVerses([]);
    setSelectedVerseIndex(null);
    
    try {
      const response = await fetch(`https://bible-api.com/${selectedBook.apiName}+${selectedChapter}?translation=${selectedVersion}`);
      if (!response.ok) throw new Error('Falha ao carregar o capítulo');
      
      const data: BibleApiResponse = await response.json();
      setVerses(data.verses);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Não foi possível carregar este capítulo. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapter();
  }, [selectedBook, selectedChapter, selectedVersion]);

  // Click outside listener para fechar o menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedVerseIndex !== null) {
        // Se clicar fora do verse selecionado, deselecionar
        const target = e.target as HTMLElement;
        if (!target.closest('.verse-container') && !target.closest('.floating-menu')) {
          setSelectedVerseIndex(null);
        }
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVerseIndex(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [selectedVerseIndex]);

  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const book = BIBLE_BOOKS.find(b => b.name === e.target.value);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(1);
    }
  };

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChapter(Number(e.target.value));
  };

  const handleVerseClick = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    if (selectedVerseIndex === index) {
      setSelectedVerseIndex(null); // Toggle off if clicked again
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectedVerseIndex(index);
    setMenuPosition({
      // Posição acima do elemento com um offset
      top: rect.top + window.scrollY - 50,
      left: Math.max(16, rect.left + (rect.width / 2) - 150) // Centralizado mas respeitando margem
    });
  };

  const prevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else {
      const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook.name);
      if (bookIndex > 0) {
        const prevBook = BIBLE_BOOKS[bookIndex - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(prevBook.chapters);
      }
    }
  };

  const nextChapter = () => {
    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter(prev => prev + 1);
    } else {
      const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook.name);
      if (bookIndex < BIBLE_BOOKS.length - 1) {
        setSelectedBook(BIBLE_BOOKS[bookIndex + 1]);
        setSelectedChapter(1);
      }
    }
  };

  const handleCopy = (verse: Verse) => {
    const textToCopy = `"${verse.text.trim()}" - ${selectedBook.name} ${selectedChapter}:${verse.verse}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Copiado para a área de transferência', 'success');
      setSelectedVerseIndex(null);
    }).catch(() => {
      showToast('Erro ao copiar', 'error');
    });
  };

  const navigateToExegesis = (verse: Verse) => {
    navigate('/exegese', { state: { reference: `${selectedBook.name} ${selectedChapter}:${verse.verse}` } });
  };

  const navigateToInterpretation = (verse: Verse) => {
    navigate('/interpretacao', { state: { reference: `${selectedBook.name} ${selectedChapter}:${verse.verse}` } });
  };

  const hasPrev = selectedChapter > 1 || BIBLE_BOOKS.findIndex(b => b.name === selectedBook.name) > 0;
  const hasNext = selectedChapter < selectedBook.chapters || BIBLE_BOOKS.findIndex(b => b.name === selectedBook.name) < BIBLE_BOOKS.length - 1;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Sticky Controls */}
      <div className="sticky top-0 z-40 bg-[var(--cor-fundo-card)] border-b border-[var(--cor-dourado)] px-4 py-3 shadow-md">
        <div className="flex flex-wrap gap-2 md:gap-4 max-w-4xl mx-auto items-center">
          
          <div className="relative flex-1 min-w-[120px]">
            <select 
              value={selectedBook.name}
              onChange={handleBookChange}
              className="w-full appearance-none bg-[var(--cor-fundo-input)] border border-[var(--cor-borda)] text-[var(--cor-pergaminho)] rounded-md pl-3 pr-8 py-2 text-sm font-['Manrope'] focus:border-[var(--cor-dourado)] outline-none"
            >
              <optgroup label="Antigo Testamento">
                {BIBLE_BOOKS.filter(b => b.testament === 'AT').map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="Novo Testamento">
                {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)] pointer-events-none" />
          </div>

          <div className="relative w-[80px] md:w-[100px]">
            <select 
              value={selectedChapter}
              onChange={handleChapterChange}
              className="w-full appearance-none bg-[var(--cor-fundo-input)] border border-[var(--cor-borda)] text-[var(--cor-pergaminho)] rounded-md pl-3 pr-8 py-2 text-sm font-['Manrope'] focus:border-[var(--cor-dourado)] outline-none"
            >
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)] pointer-events-none" />
          </div>

          <div className="relative w-[80px] md:w-[100px]">
            <select
              value={selectedVersion}
              disabled
              title="Apenas Almeida (ARC) está disponível no momento"
              className="w-full appearance-none bg-[var(--cor-fundo-input)] border border-[var(--cor-borda)] text-[var(--cor-pergaminho)] rounded-md pl-3 pr-8 py-2 text-sm font-['Manrope'] outline-none opacity-70 cursor-not-allowed"
            >
              <option value="almeida">ARC</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cor-texto-dim)] pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Reading Area */}
      <div 
        ref={readingAreaRef} 
        className="flex-grow w-full max-w-4xl mx-auto p-4 md:py-6 md:px-8 relative"
      >
        {loading ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <Loader2 size={32} className="text-[var(--cor-dourado)] animate-spin mb-4" />
            <span className="font-['Manrope'] text-sm tracking-widest text-[var(--cor-dourado-dim)] animate-pulse">Carregando Escrituras</span>
          </div>
        ) : error ? (
          <div className="card p-6 flex flex-col items-center text-center max-w-md mx-auto mt-10">
            <AlertCircle size={32} className="text-[var(--cor-erro)] mb-4" />
            <p className="text-[var(--cor-texto-medio)] mb-6">{error}</p>
            <button onClick={fetchChapter} className="btn-secondary">Tentar novamente</button>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="font-['Manrope'] text-2xl text-[var(--cor-dourado-claro)] text-center mb-8 border-b border-[var(--cor-borda)] pb-4 flex items-center justify-center gap-2.5">
              {selectedBook.name} {selectedChapter}
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-[var(--cor-dourado)] text-[var(--cor-dourado)] align-middle">
                {TRADUCAO_ATUAL}
              </span>
            </h1>

            {verses.map((verse, index) => (
              <div 
                key={verse.verse} 
                className={`verse-container relative cursor-pointer p-2 rounded transition-colors ${selectedVerseIndex === index ? 'bg-[var(--cor-dourado-bg)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
                onClick={(e) => handleVerseClick(e, index)}
              >
                <p className="text-[1.1rem] leading-loose text-[var(--cor-pergaminho)]">
                  <sup className="font-['Manrope'] text-[0.65rem] text-[var(--cor-dourado-dim)] mr-2 font-bold select-none">{verse.verse}</sup>
                  {verse.text}
                </p>
              </div>
            ))}

            {/* Laboratório do Original — aparece ao selecionar um versículo. */}
            {selectedVerseIndex !== null && verses[selectedVerseIndex] && (
              <div className="mt-6 rounded-lg border border-[var(--cor-dourado)] bg-[var(--cor-fundo-card)] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--cor-borda)]">
                  <div className="flex items-center gap-2 font-['Manrope'] text-sm font-semibold text-[var(--cor-dourado)]">
                    <Sparkles size={16} />
                    Laboratório do Original
                  </div>
                  <span className="text-xs font-['Manrope'] text-[var(--cor-texto-dim)]">
                    {selectedBook.name} {selectedChapter}:{verses[selectedVerseIndex].verse} ({TRADUCAO_ATUAL})
                  </span>
                </div>

                {lexicoLoading && (
                  <div className="flex items-center gap-2.5 text-sm text-[var(--cor-texto-medio)] font-['Manrope'] py-3">
                    <Loader2 size={16} className="animate-spin text-[var(--cor-dourado)]" />
                    Analisando o original deste versículo…
                  </div>
                )}

                {!lexicoLoading && lexicoError && (
                  <div className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-[var(--cor-erro)]">{lexicoError}</span>
                    <button
                      onClick={() => setLexicoRetry((n) => n + 1)}
                      className="btn-secondary shrink-0 flex items-center gap-1.5 text-xs py-1.5 px-3"
                    >
                      <RefreshCw size={13} /> Tentar de novo
                    </button>
                  </div>
                )}

                {!lexicoLoading && !lexicoError && lexico && (
                  <div className="space-y-4">
                    {/* Palavras-chave clicáveis */}
                    <div className="flex flex-wrap gap-2">
                      {lexico.palavras.map((p) => (
                        <button
                          key={`${p.pt}-${p.original}`}
                          onClick={() => setPalavraAtiva(p)}
                          className={`px-3 py-1.5 rounded-full border text-sm font-['Literata'] transition-colors ${
                            palavraAtiva?.original === p.original
                              ? 'border-[var(--cor-dourado)] bg-[var(--cor-dourado-bg)] text-[var(--cor-dourado-claro)]'
                              : 'border-[var(--cor-borda)] text-[var(--cor-texto-medio)] hover:border-[var(--cor-borda-hover)]'
                          }`}
                        >
                          {p.pt}
                        </button>
                      ))}
                    </div>

                    {palavraAtiva && (
                      <div className="grid sm:grid-cols-2 gap-4 pt-2">
                        {/* Coluna Original */}
                        <div className="rounded-md p-3.5" style={{ background: 'var(--cor-fundo-hover)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-['Manrope'] uppercase tracking-wider text-[var(--cor-texto-dim)]">Original</p>
                            <span className="text-[10px] font-['Manrope'] font-bold uppercase px-1.5 py-0.5 rounded-full text-[var(--cor-dourado)] border border-[var(--cor-borda-hover)]">
                              {palavraAtiva.idioma}
                            </span>
                          </div>
                          <p
                            dir={palavraAtiva.idioma === 'Hebraico' || palavraAtiva.idioma === 'Aramaico' ? 'rtl' : 'ltr'}
                            className="text-2xl text-center py-2"
                            style={{ fontFamily: "'Noto Sans Hebrew', 'Noto Sans', serif" }}
                          >
                            {palavraAtiva.original}
                          </p>
                          <p className="text-center text-sm italic text-[var(--cor-texto-dim)] mb-2">{palavraAtiva.translit}</p>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {palavraAtiva.strong && (
                              <span className="text-[11px] font-['Manrope'] font-bold px-2 py-0.5 rounded-full text-[var(--cor-dourado-claro)] bg-[var(--cor-dourado-bg)]">
                                {palavraAtiva.strong}
                              </span>
                            )}
                            {palavraAtiva.ocorrencias > 0 && (
                              <span className="text-[11px] text-[var(--cor-texto-dim)]">{palavraAtiva.ocorrencias}× no Testamento</span>
                            )}
                          </div>
                          {palavraAtiva.classe && <p className="text-xs text-[var(--cor-texto-medio)] text-center">{palavraAtiva.classe}</p>}
                          {palavraAtiva.raiz && (
                            <p className="text-xs text-[var(--cor-texto-dim)] text-center mt-1.5 pt-1.5 border-t border-[var(--cor-borda)]">
                              Raiz: {palavraAtiva.raiz}
                            </p>
                          )}
                        </div>

                        {/* Coluna Léxico */}
                        <div className="rounded-md p-3.5" style={{ background: 'var(--cor-fundo-hover)' }}>
                          <p className="text-[10px] font-['Manrope'] uppercase tracking-wider text-[var(--cor-texto-dim)] mb-2">Léxico</p>
                          {palavraAtiva.significado && (
                            <p className="text-sm text-[var(--cor-pergaminho)] leading-relaxed mb-3">{palavraAtiva.significado}</p>
                          )}
                          {palavraAtiva.nota && (
                            <p className="text-xs leading-relaxed rounded p-2.5" style={{ background: 'var(--cor-oliva-bg, rgba(124,139,79,.12))', color: 'var(--cor-texto-medio)', borderLeft: '3px solid var(--cor-oliva, #7C8B4F)' }}>
                              {palavraAtiva.nota}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-[var(--cor-texto-dim)] pt-2 border-t border-[var(--cor-borda)]">
                      Análise gerada por IA a partir do texto massorético/crítico — use como ponto de partida de estudo, não como fonte lexical definitiva.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating Menu */}
        {selectedVerseIndex !== null && !loading && !error && (
          <div 
            className="floating-menu fixed z-50 flex items-center gap-1 bg-[var(--cor-fundo-card)] border border-[var(--cor-dourado)] rounded shadow-[0_4px_20px_rgba(0,0,0,0.5)] p-1 animate-[slideUp_0.15s_ease-out]"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          >
            <button 
              onClick={() => navigateToExegesis(verses[selectedVerseIndex])}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-['Manrope'] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:bg-[var(--cor-fundo-hover)] rounded transition-colors"
            >
              <Languages size={14} /> Exegese
            </button>
            <div className="w-[1px] h-6 bg-[var(--cor-borda)]"></div>
            <button 
              onClick={() => navigateToInterpretation(verses[selectedVerseIndex])}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-['Manrope'] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:bg-[var(--cor-fundo-hover)] rounded transition-colors"
            >
              <ScrollText size={14} /> Interpretação
            </button>
            <div className="w-[1px] h-6 bg-[var(--cor-borda)]"></div>
            <button 
              onClick={() => handleCopy(verses[selectedVerseIndex])}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-['Manrope'] text-[var(--cor-texto-medio)] hover:text-[var(--cor-dourado)] hover:bg-[var(--cor-fundo-hover)] rounded transition-colors"
            >
              <Copy size={14} /> Copiar
            </button>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      {!loading && !error && verses.length > 0 && (
        <div className="w-full max-w-4xl mx-auto px-4 mt-8 pb-8 flex justify-between">
          <button 
            onClick={prevChapter}
            disabled={!hasPrev}
            className={`btn-secondary flex items-center gap-2 ${!hasPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Anterior
          </button>
          <button 
            onClick={nextChapter}
            disabled={!hasNext}
            className={`btn-secondary flex items-center gap-2 ${!hasNext ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}
