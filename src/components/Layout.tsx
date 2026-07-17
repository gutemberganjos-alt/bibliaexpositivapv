import { Outlet, NavLink } from 'react-router-dom';
import { Home, Book, Bookmark, LibraryBig, UserCircle } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full h-[68px] bg-[rgba(255,254,250,.9)] backdrop-blur-xl border-t border-[var(--cor-borda)] flex justify-around items-center px-2 z-50 md:px-[max(2rem,calc((100vw-56rem)/2))]">
        <NavLink
          to="/inicio"
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
        >
          <Home size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-['Manrope'] tracking-wider">Início</span>
        </NavLink>
        
        <NavLink 
          to="/biblia" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
        >
          <Book size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-['Manrope'] tracking-wider">Bíblia</span>
        </NavLink>
        
        <NavLink 
          to="/estudos" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
        >
          <Bookmark size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-['Manrope'] tracking-wider">Estudos</span>
        </NavLink>
        
        <NavLink 
          to="/biblioteca" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
        >
          <LibraryBig size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-['Manrope'] tracking-wider">Biblioteca</span>
        </NavLink>
        
        <NavLink 
          to="/minha-conta" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--cor-dourado)]' : 'text-[var(--cor-texto-dim)] hover:text-[var(--cor-texto-medio)]'}`}
        >
          <UserCircle size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-['Manrope'] tracking-wider">Conta</span>
        </NavLink>
      </nav>
    </div>
  );
}
