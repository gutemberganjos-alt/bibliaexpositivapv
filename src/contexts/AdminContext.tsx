import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchIsAdmin } from '../lib/admin';

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const load = async () => {
      const admin = user ? await fetchIsAdmin() : false;
      if (!cancelled) {
        setIsAdmin(admin);
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  return (
    <AdminContext.Provider value={{ isAdmin, loading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (ctx === undefined) throw new Error('useAdmin deve ser usado dentro de AdminProvider');
  return ctx;
}
