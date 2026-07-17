import { supabase } from './supabase';

export type PlanId = 'individual' | 'igreja';
export type SubscriptionTier = 'free' | 'premium' | 'church';
export type SubscriptionStatus =
  | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export interface PlanoInfo {
  id: PlanId;
  nome: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  precoLabel: string;
  ciclo: string;
}

/** Catálogo exibido no frontend. Os preços reais vivem nos Prices da Stripe. */
export const PLANOS: Record<PlanId, PlanoInfo> = {
  individual: { id: 'individual', nome: 'Individual', tier: 'premium', precoLabel: 'R$ 29,90', ciclo: 'por mês' },
  igreja: { id: 'igreja', nome: 'Igreja', tier: 'church', precoLabel: 'R$ 99,90', ciclo: 'por mês' },
};

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  value: number | null;
  cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  stripe_subscription_id: string | null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

export function isActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (!ACTIVE_STATUSES.includes(sub.status)) return false;
  if (sub.current_period_end && new Date(sub.current_period_end).getTime() < Date.now()) return false;
  return true;
}

/** Assinatura mais recente do usuário logado (ou null). */
export async function fetchSubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, tier, status, value, cycle, current_period_end, cancel_at_period_end, canceled_at, stripe_subscription_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[subscription] fetch', error.message);
    return null;
  }
  return (data as Subscription) ?? null;
}

/** Inicia o checkout da Stripe e redireciona o navegador para o Checkout hospedado. */
export async function startCheckout(plan: PlanId): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-checkout',
    { body: { plan } },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Não foi possível iniciar o checkout.');
  window.location.href = data.url;
}

/** Abre o Billing Portal da Stripe (gerenciar/cancelar/atualizar cartão). */
export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-portal',
    { body: { action: 'portal' } },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Não foi possível abrir o portal.');
  window.location.href = data.url;
}

export interface CancelResult { canceled: boolean; refunded: boolean; message: string }

/** Cancela a assinatura; reembolsa automaticamente se dentro de 7 dias do 1º pagamento. */
export async function cancelSubscription(): Promise<CancelResult> {
  const { data, error } = await supabase.functions.invoke<CancelResult & { error?: string }>(
    'stripe-portal',
    { body: { action: 'cancel' } },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as CancelResult;
}
