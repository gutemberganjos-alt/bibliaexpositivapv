import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Controla o acesso às rotas de geração.
 *
 * Quem NÃO assinou entra normalmente enquanto tiver gerações do teste grátis —
 * é isso que permite a pessoa experimentar o produto antes de ver o preço.
 * Quando o teste acaba, o próprio StudyGenerator mostra a tela de assinatura;
 * quem chega aqui já sem nenhuma geração é levado direto para /assinatura.
 *
 * Ativado por VITE_ENFORCE_SUBSCRIPTION=true (padrão: desligado, para dev/testes).
 * A checagem definitiva também acontece no servidor (edge `gerar`).
 */
const ENFORCE = import.meta.env.VITE_ENFORCE_SUBSCRIPTION === 'true';

export default function RequireSubscription() {
  const { active, podeGerar, loading } = useSubscription();
  const location = useLocation();

  if (!ENFORCE) return <Outlet />;

  if (loading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center">
        <p className="text-[var(--cor-dourado)] font-['Manrope'] tracking-widest animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!active && !podeGerar) {
    return <Navigate to="/assinatura" replace state={{ from: location.pathname, gated: true, trialEnded: true }} />;
  }

  return <Outlet />;
}
