import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchSubscription, isActive, type Subscription } from '../lib/subscription';
import { fetchQuotaStatus, type QuotaStatus } from '../lib/quota';
import { trackOnce, trackPurchase } from '../lib/pixel';

interface SubscriptionContextType {
  subscription: Subscription | null;
  active: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Franquia atual: teste grátis para quem não assinou, limite mensal para assinante. */
  quota: QuotaStatus | null;
  /** Pode gerar agora (assinatura ativa ou ainda tem geração de teste). */
  podeGerar: boolean;
  refreshQuota: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshQuota = useCallback(async () => {
    if (!user) {
      setQuota(null);
      return;
    }
    setQuota(await fetchQuotaStatus());
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setQuota(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sub, q] = await Promise.all([fetchSubscription(), fetchQuotaStatus()]);
      setSubscription(sub);
      setQuota(q);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const load = async () => {
      const [sub, q] = user
        ? await Promise.all([fetchSubscription(), fetchQuotaStatus()])
        : [null, null];
      if (!cancelled) {
        setSubscription(sub);
        setQuota(q);
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

  const active = isActive(subscription);
  // Enquanto a franquia não carregou, não travamos a tela: o servidor é a
  // checagem definitiva (a edge `gerar` recusa quem não pode gerar).
  const podeGerar = active || quota === null || quota.remaining > 0;

  return (
    <SubscriptionContext.Provider
      value={{ subscription, active, loading, refresh, quota, podeGerar, refreshQuota }}
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
