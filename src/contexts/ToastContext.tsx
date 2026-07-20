import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => {
      // Máximo de 3 toasts simultâneos
      const newToasts = [...prev, { id, message, type }];
      if (newToasts.length > 3) return newToasts.slice(newToasts.length - 3);
      return newToasts;
    });

    // Remove direto pelo setToasts: usar removeToast aqui referenciava uma
    // variável declarada abaixo (acesso antes da declaração).
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between bg-[var(--cor-fundo-card)] border border-[var(--cor-dourado)] rounded-md px-4 py-3 shadow-lg animate-[slideUp_0.2s_ease-out]"
          >
            <span className="font-['Literata'] text-[var(--cor-pergaminho)] text-[0.95rem]">
              {toast.message}
            </span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-[var(--cor-texto-dim)] hover:text-[var(--cor-dourado)] ml-4 shrink-0 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}
