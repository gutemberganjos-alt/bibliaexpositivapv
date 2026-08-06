import { Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';

/** Bloqueia rotas administrativas para quem não é admin (checado no servidor via RLS). */
export default function AdminRoute() {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center">
        <p className="text-[var(--cor-dourado)] font-['Manrope'] tracking-widest animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/inicio" replace />;

  return <Outlet />;
}
