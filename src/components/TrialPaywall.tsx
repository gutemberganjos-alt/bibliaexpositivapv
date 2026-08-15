import { useNavigate } from 'react-router-dom';
import { Crown, Lock, X } from 'lucide-react';
import PenWriting from './PenWriting';
import { PLANOS } from '../lib/subscription';
import { TESTE_GRATIS_LIMITE } from '../lib/quota';
import { trackInitiateCheckout } from '../lib/pixel';

const INDIVIDUAL = PLANOS.individual;

/**
 * Mensagem automática que aparece quando a pessoa termina as gerações do teste
 * grátis. Aparece por cima da tela de geração, no exato momento em que ela
 * tentou gerar de novo — é o ponto de maior intenção, e é aqui que o evento
 * InitiateCheckout do Pixel passa a existir.
 */
export default function TrialPaywall({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();

  const irPara = (ciclo: 'MENSAL' | 'ANUAL') => {
    trackInitiateCheckout({
      value: INDIVIDUAL.precos[ciclo].valor,
      plano: 'Individual',
      ciclo,
    });
    navigate('/assinatura', { state: { plano: 'individual', ciclo, gated: true, trialEnded: true } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-paywall-titulo"
    >
      <div className="card w-full max-w-lg p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]"
          >
            <X size={18} />
          </button>
        )}

        <div className="flex items-center gap-2 text-[var(--cor-dourado)] mb-3">
          <Lock size={18} />
          <span className="eyebrow">TESTE CONCLUÍDO</span>
        </div>

        <h2
          id="trial-paywall-titulo"
          className="font-['Playfair_Display'] text-2xl sm:text-3xl text-[var(--cor-texto-claro)] leading-tight"
        >
          Você usou suas {TESTE_GRATIS_LIMITE} gerações gratuitas
        </h2>

        <p className="text-sm text-[var(--cor-texto-medio)] mt-3">
          Agora você já viu como o material sai: estruturado, com exegese, aplicação e
          selo de confiabilidade em cada afirmação. Para continuar preparando seus
          estudos sem limite de teste, escolha um plano.
        </p>

        <div className="mt-5 grid gap-3">
          {/* Anual em primeiro: é a oferta com desconto. */}
          <button
            onClick={() => irPara('ANUAL')}
            className="btn-primary w-full flex flex-col items-center gap-1 py-3"
          >
            <span className="flex items-center gap-2 font-semibold">
              <PenWriting size={17} />
              Assinar o plano anual — {INDIVIDUAL.precos.ANUAL.precoLabel}
            </span>
            <span className="text-xs opacity-80">
              {INDIVIDUAL.precos.ANUAL.economiaLabel} em relação ao mensal
            </span>
          </button>

          <button
            onClick={() => irPara('MENSAL')}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
          >
            <Crown size={16} />
            Assinar mensal — {INDIVIDUAL.precos.MENSAL.precoLabel} por mês
          </button>
        </div>

        <button
          onClick={() => navigate('/assinatura', { state: { gated: true, trialEnded: true } })}
          className="w-full mt-4 text-xs text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)] underline"
        >
          Ver todos os planos, incluindo o plano Igreja
        </button>

        <p className="text-[11px] text-[var(--cor-texto-dim)] text-center mt-4">
          Pagamento via PIX ou cartão · Reembolso em até 7 dias · Seus estudos já
          gerados continuam salvos na sua biblioteca.
        </p>
      </div>
    </div>
  );
}
