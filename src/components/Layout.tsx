import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Book, Bookmark, LibraryBig, UserCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const NAV_ITEMS = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/estudos', label: 'Estudos', icon: Bookmark },
  { to: '/biblia', label: 'Bíblia', icon: Book },
  { to: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
  { to: '/minha-conta', label: 'Conta', icon: UserCircle },
];

/** Trilha de navegação (breadcrumb) da barra superior — cobre as rotas do app autenticado. */
const CRUMBS: Record<string, string[]> = {
  '/inicio': ['Início'],
  '/estudos': ['Início', 'Estudos'],
  '/exegese': ['Início', 'Estudos', 'Exegese'],
  '/interpretacao': ['Início', 'Estudos', 'Interpretação'],
  '/biblia': ['Início', 'Bíblia', 'Laboratório do Original'],
  '/biblioteca': ['Início', 'Biblioteca'],
  '/minha-conta': ['Início', 'Minha Conta'],
  '/assinatura': ['Início', 'Assinatura'],
  '/perfil': ['Início', 'Perfil de Estudo'],
  '/admin/usuarios': ['Início', 'Admin', 'Usuários'],
};

function iniciaisDoUsuario(nome?: string | null, email?: string | null): string {
  if (nome && nome.trim()) {
    const partes = nome.trim().split(/\s+/);
    return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? '?';
}

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const { active, quota } = useSubscription();

  const crumbs = CRUMBS[location.pathname] ?? ['Início'];
  const iniciais = iniciaisDoUsuario(user?.user_metadata?.full_name as string | undefined, user?.email);
  const statusPlano = active ? 'Assinatura ativa' : quota?.trial ? 'Período de teste' : 'Sem assinatura ativa';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Menu lateral — persistente em telas médias/grandes ("menu na lateral"). */}
      <aside
        className="hidden md:flex md:w-[224px] md:shrink-0 md:flex-col overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #0E2038 0%, #0A1728 100%)',
          borderRight: '1px solid var(--cor-navy-borda)',
        }}
      >
        <div className="px-5 pt-6 pb-7">
          <div className="font-['Manrope'] font-bold text-[15px] text-white leading-tight">Bíblia Expositiva</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--cor-navy-texto-dim)' }}>PV · plataforma de estudo</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium font-['Manrope'] transition-colors"
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--cor-ouro-bg)', color: 'var(--cor-ouro-claro)' }
                  : { color: 'var(--cor-navy-texto-dim)' }
              }
            >
              <item.icon size={17} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-5 mt-auto border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
          <div className="text-[11px] font-['Manrope']" style={{ color: 'var(--cor-navy-texto-dim)' }}>{statusPlano}</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Barra superior — breadcrumb + tradução padrão + avatar ("menu... em cima"). */}
        <header
          className="flex items-center justify-between gap-3 px-4 md:px-8 py-3.5 shrink-0"
          style={{ background: '#0E2038', borderBottom: '1px solid var(--cor-navy-borda)' }}
        >
          <div className="flex items-center gap-1.5 text-xs font-['Manrope'] min-w-0 overflow-hidden">
            {crumbs.map((c, i) => (
              <span key={c} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <ChevronRight size={11} style={{ color: 'var(--cor-navy-texto-dim)' }} />}
                <span
                  className="truncate max-w-[40vw] md:max-w-none"
                  style={{ color: i === crumbs.length - 1 ? 'var(--cor-navy-texto)' : 'var(--cor-navy-texto-dim)', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}
                >
                  {c}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className="hidden sm:inline text-[10px] font-['Manrope'] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ color: 'var(--cor-ouro-claro)', background: 'var(--cor-ouro-bg)' }}
            >
              ARC padrão
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-['Manrope']"
              style={{ background: 'var(--cor-ouro-claro)', color: '#10233E' }}
            >
              {iniciais}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior — só em telas pequenas (o menu lateral cobre md+). */}
      <nav className="md:hidden fixed bottom-0 w-full h-[68px] bg-[rgba(255,254,250,.9)] backdrop-blur-xl border-t border-[var(--cor-borda)] flex justify-around items-center px-2 z-50">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
          >
            <item.icon size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-['Manrope'] tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
