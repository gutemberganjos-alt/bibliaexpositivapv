import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * Bloqueia rotas de geração para quem não tem assinatura ativa.
 * Ativado por VITE_ENFORCE_SUBSCRIPTION=true (padrão: desligado, para dev/testes).
 * A checagem definitiva também acontece no servidor (edge `gerar`).
 */
const ENFORCE = import.meta.env.VITE_ENFORCE_SUBSCRIPTION === 'true';

export default function RequireSubscription() {
  const { active, loading } = useSubscription();
  const location = useLocation();

  if (!ENFORCE) return <Outlet />;

  if (loading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center">
        <p className="text-[var(--cor-dourado)] font-['Manrope'] tracking-widest animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!active) {
    return <Navigate to="/assinatura" replace state={{ from: location.pathname, gated: true }} />;
  }

  return <Outlet />;
}
