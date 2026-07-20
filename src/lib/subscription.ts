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
  asaas_subscription_id: string | null;
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
    .select('id, tier, status, value, cycle, current_period_end, cancel_at_period_end, canceled_at, asaas_subscription_id')
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

export type FormaPagamento = 'PIX' | 'CREDIT_CARD';

/** Valida CPF (11) ou CNPJ (14) com dígitos verificadores — mesma regra do servidor. */
export function documentoValido(doc: string): boolean {
  const d = (doc ?? '').replace(/\D/g, '');
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    const pares: Array<[number, number]> = [[9, 10], [10, 11]];
    for (const [len, peso] of pares) {
      let soma = 0;
      for (let i = 0; i < len; i++) soma += Number(d[i]) * (peso - i);
      let dig = (soma * 10) % 11;
      if (dig === 10) dig = 0;
      if (dig !== Number(d[len])) return false;
    }
    return true;
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (base: string) => {
      const pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = base.split('').reduce((s, n, i) => s + Number(n) * pesos[i], 0);
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    if (calc(d.slice(0, 12)) !== Number(d[12])) return false;
    if (calc(d.slice(0, 13)) !== Number(d[13])) return false;
    return true;
  }
  return false;
}

/** Máscara visual de CPF/CNPJ enquanto o usuário digita. */
export function formatarDocumento(valor: string): string {
  const d = (valor ?? '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Cria a assinatura no Asaas e leva o usuário à página de cobrança (PIX ou cartão).
 * O acesso só libera quando o webhook confirmar o pagamento.
 */
export async function startCheckout(
  plan: PlanId,
  cpfCnpj: string,
  billingType: FormaPagamento,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'asaas-checkout',
    { body: { plan, cpfCnpj, billingType } },
  );
  if (error) {
    // A mensagem útil vem no corpo da resposta da função, não no erro genérico.
    let detalhe = '';
    try {
      const ctx = (error as { context?: unknown }).context;
      if (ctx instanceof Response) detalhe = (await ctx.json())?.error ?? '';
    } catch { /* corpo não-JSON */ }
    throw new Error(detalhe || error.message);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Não foi possível iniciar a assinatura.');
  window.location.href = data.url;
}

export interface CancelResult { canceled: boolean; refunded: boolean; message: string }

/** Cancela a assinatura; reembolsa automaticamente se dentro de 7 dias do 1º pagamento. */
export async function cancelSubscription(): Promise<CancelResult> {
  const { data, error } = await supabase.functions.invoke<CancelResult & { error?: string }>(
    'asaas-cancel',
    { body: {} },
  );
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as CancelResult;
}
