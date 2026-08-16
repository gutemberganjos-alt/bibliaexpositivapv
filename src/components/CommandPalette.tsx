import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Book, LibraryBig, UserCircle, CornerDownLeft } from 'lucide-react';
import { interpretarComando } from '../lib/command-parser';
import { nomeDoModo, nomeDoPublico } from '../lib/ai-config';

const ATALHOS = [
  { label: 'Início', to: '/inicio', icon: Home },
  { label: 'Bíblia', to: '/biblia', icon: Book },
  { label: 'Biblioteca', to: '/biblioteca', icon: LibraryBig },
  { label: 'Minha conta', to: '/minha-conta', icon: UserCircle },
];

/**
 * Paleta de comando (⌘K / Ctrl+K) — atalho de teclado para quem já sabe o que
 * quer e não quer clicar Formato → Público → Referência toda vez. Interpreta
 * localmente (sem IA, sem custo) frases como "sermão sobre Romanos 8 para
 * jovens" e já preenche o gerador de Estudos.
 */
export default function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto((v) => !v);
      } else if (e.key === 'Escape') {
        setAberto(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (aberto) {
      setTexto('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [aberto]);

  if (!aberto) return null;

  const interpretado = texto.trim() ? interpretarComando(texto) : null;

  const executar = () => {
    if (!interpretado || !interpretado.referencia) return;
    const params = new URLSearchParams();
    if (interpretado.modoId) params.set('modo', interpretado.modoId);
    if (interpretado.publicoId) params.set('publico', interpretado.publicoId);
    params.set('ref', interpretado.referencia);
    setAberto(false);
    navigate(`/estudos?${params.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60"
      onClick={() => setAberto(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
        style={{ background: '#13294A', border: '1px solid var(--cor-navy-borda)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--cor-navy-borda)' }}>
          <Search size={17} style={{ color: 'var(--cor-navy-texto-dim)' }} />
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') executar(); }}
            placeholder="Ex.: sermão sobre Romanos 8 para jovens…"
            className="flex-1 bg-transparent outline-none text-[15px] font-['Literata']"
            style={{ color: 'var(--cor-navy-texto)' }}
          />
          <kbd className="text-[10px] font-['Manrope'] px-1.5 py-0.5 rounded" style={{ color: 'var(--cor-navy-texto-dim)', border: '1px solid var(--cor-navy-borda)' }}>esc</kbd>
        </div>

        {interpretado ? (
          <button
            onClick={executar}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[rgba(255,255,255,.04)] transition-colors"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-['Manrope'] font-medium truncate" style={{ color: 'var(--cor-ouro-claro)' }}>
                {interpretado.referencia}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--cor-navy-texto-dim)' }}>
                {interpretado.modoId ? nomeDoModo(interpretado.modoId) : 'Estudo Bíblico'}
                {interpretado.publicoId ? ` · ${nomeDoPublico(interpretado.publicoId)}` : ''}
              </span>
            </span>
            <CornerDownLeft size={15} style={{ color: 'var(--cor-navy-texto-dim)' }} className="shrink-0" />
          </button>
        ) : (
          <div className="py-1.5">
            {ATALHOS.map((a) => (
              <button
                key={a.to}
                onClick={() => { setAberto(false); navigate(a.to); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(255,255,255,.04)] transition-colors"
              >
                <a.icon size={16} style={{ color: 'var(--cor-navy-texto-dim)' }} />
                <span className="text-sm font-['Manrope']" style={{ color: 'var(--cor-navy-texto)' }}>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
