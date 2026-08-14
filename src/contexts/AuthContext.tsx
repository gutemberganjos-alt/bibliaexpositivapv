import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { trackCompleteRegistration, trackOnce } from '../lib/pixel';
import { claimDeviceSession, isDeviceSessionActive } from '../lib/deviceSession';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        // Sessão restaurada (aba recarregada, app reaberto): confere se este
        // aparelho ainda é o "dono" da conta — outro login em outro aparelho
        // pode ter derrubado essa sessão enquanto ela estava fechada.
        if (session?.user) {
          const ativa = await isDeviceSessionActive();
          if (!ativa) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            window.alert('Sua conta foi acessada em outro dispositivo. Faça login novamente.');
          }
        }
      } catch (error) {
        console.error("Erro ao buscar sessão inicial:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Login de verdade (não é o mesmo que sessão restaurada — isso vem do
        // getSession() acima): esse aparelho passa a ser o único autorizado a
        // usar a conta, derrubando qualquer outro aparelho logado antes.
        if (event === 'SIGNED_IN' && session?.user) {
          claimDeviceSession();
        }

        // Cadastro novo (e-mail confirmado agora ou primeiro login Google): o
        // Supabase não manda um evento "SIGNED_UP" separado, então detectamos
        // pela distância entre created_at e last_sign_in_at. trackOnce evita
        // disparar de novo em toda sessão restaurada.
        if (event === 'SIGNED_IN' && session?.user) {
          const u = session.user;
          const criado = u.created_at ? new Date(u.created_at).getTime() : null;
          const logado = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
          const cadastroNovo = criado !== null && logado !== null && Math.abs(logado - criado) < 15000;
          if (cadastroNovo) {
            trackOnce(`fb_cr_${u.id}`, trackCompleteRegistration);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
