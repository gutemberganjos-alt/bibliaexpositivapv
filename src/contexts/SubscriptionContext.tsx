import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchSubscription, isActive, type Subscription } from '../lib/subscription';
import { trackOnce, trackPurchase } from '../lib/pixel';

interface SubscriptionContextType {
  subscription: Subscription | null;
  active: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setSubscription(await fetchSubscription());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const load = async () => {
      const sub = user ? await fetchSubscription() : null;
      if (!cancelled) {
        setSubscription(sub);
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Dispara o evento de compra do Pixel na primeira vez que detectamos essa
  // assinatura ativa — o pagamento acontece na Logos Academy (fora do nosso
  // domínio), então este é o ponto mais confiável que temos: o retorno ao app
  // (via magic link ou login normal) já com o acesso liberado pelo webhook.
  useEffect(() => {
    if (!subscription?.id || !isActive(subscription)) return;
    trackOnce(`fb_purchase_${subscription.id}`, () => trackPurchase({
      value: subscription.value ?? 0,
      plano: subscription.tier,
    }));
  }, [subscription]);

  return (
    <SubscriptionContext.Provider
      value={{ subscription, active: isActive(subscription), loading, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (ctx === undefined) throw new Error('useSubscription deve ser usado dentro de SubscriptionProvider');
  return ctx;
}
