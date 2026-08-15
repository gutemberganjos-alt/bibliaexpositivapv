/**
 * Caneta escrevendo no papel — substitui o ícone de "faísca" (Sparkles), que é o
 * símbolo visual de IA e não diz nada sobre preparo de material bíblico.
 *
 * SVG animado em vez de GIF: acompanha a cor do texto ao redor (currentColor),
 * não pesa nada, não pixeliza em tela retina e não precisa de arquivo.
 * Respeita `prefers-reduced-motion`.
 */
export default function PenWriting({
  size = 16,
  className = '',
  animate = true,
}: {
  size?: number;
  className?: string;
  /** Desliga a animação (ex.: ícone estático dentro de uma lista). */
  animate?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pen-writing ${animate ? 'pen-writing-anim' : ''} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* folha */}
      <path d="M4 3.5h10.5L19 8v12.5H4z" opacity={0.45} />
      <path d="M14.5 3.5V8H19" opacity={0.45} />
      {/* linhas já escritas */}
      <path className="pen-line pen-line-1" d="M7 11h8" />
      <path className="pen-line pen-line-2" d="M7 14.2h8" />
      <path className="pen-line pen-line-3" d="M7 17.4h4.5" />
      {/* caneta */}
      <g className="pen-body">
        <path d="M20.6 12.4 14 19l-2.6.7.7-2.6 6.6-6.6z" />
        <path d="M17.9 10.6l2.1 2.1" />
      </g>
    </svg>
  );
}
