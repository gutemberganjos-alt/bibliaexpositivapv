import { supabase } from './supabase';

export type PlanId = 'individual' | 'igreja';
export type SubscriptionTier = 'free' | 'premium' | 'church';
export type SubscriptionStatus =
  | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export type Ciclo = 'MENSAL' | 'ANUAL';

export interface PrecoInfo {
  /** Valor cobrado de uma vez, no ciclo. */
  valor: number;
  precoLabel: string;
  ciclo: string;
  /** Só no anual: quanto se economiza em relação a 12 meses avulsos. */
  economiaLabel?: string;
}

export interface PlanoInfo {
  id: PlanId;
  nome: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  precos: Record<Ciclo, PrecoInfo>;
  /** Atalhos do preço mensal — usados na landing. */
  precoLabel: string;
  ciclo: string;
}

/**
 * Catálogo exibido no frontend. Os valores reais são revalidados no servidor
 * (edge function asaas-checkout) — aqui é só vitrine.
 * Anual: 12 meses avulsos custariam R$ 358,80 (individual) e R$ 1.198,80 (igreja).
 */
export const PLANOS: Record<PlanId, PlanoInfo> = {
  individual: {
    id: 'individual', nome: 'Individual', tier: 'premium',
    precoLabel: 'R$ 29,90', ciclo: 'por mês',
    precos: {
      MENSAL: { valor: 29.90, precoLabel: 'R$ 29,90', ciclo: 'por mês' },
      ANUAL: { valor: 295.90, precoLabel: 'R$ 295,90', ciclo: 'por ano', economiaLabel: 'Economize R$ 62,90' },
    },
  },
  igreja: {
    id: 'igreja', nome: 'Igreja', tier: 'church',
    precoLabel: 'R$ 99,90', ciclo: 'por mês',
    precos: {
      MENSAL: { valor: 99.90, precoLabel: 'R$ 99,90', ciclo: 'por mês' },
      ANUAL: { valor: 1019.90, precoLabel: 'R$ 1.019,90', ciclo: 'por ano', economiaLabel: 'Economize R$ 178,90' },
    },
  },
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

/** Telefone brasileiro: 10 dígitos (fixo) ou 11 (celular), DDD válido. */
export function telefoneValido(tel: string): boolean {
  const d = (tel ?? '').replace(/\D/g, '');
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== '9') return false; // celular começa com 9
  return true;
}

/** Máscara visual de telefone: (11) 91234-5678 */
export function formatarTelefone(valor: string): string {
  const d = (valor ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, '($1');
  if (d.length <= 6) return d.replace(/(\d{2})(\d{1,4})/, '($1) $2');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
}

/**
 * CEP com 8 dígitos. O Asaas exige endereço do cliente para o cartão, mas
 * completa rua, bairro e cidade a partir do CEP — só pedimos CEP e número.
 */
export function cepValido(cep: string): boolean {
  return (cep ?? '').replace(/\D/g, '').length === 8;
}

/** Máscara visual de CEP: 01310-100 */
export function formatarCep(valor: string): string {
  const d = (valor ?? '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? d.replace(/(\d{5})(\d{1,3})/, '$1-$2') : d;
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

/** Dados do PIX exibidos dentro do app — o cliente não sai da Bíblia Expositiva. */
export interface PixCobranca {
  copiaECola: string;
  imagemBase64: string | null;
  invoiceUrl: string | null;
  expiraEm: string | null;
}

/**
 * Cartão vai para o checkout do Asaas (precisa da tela deles, por segurança do
 * cartão). PIX fica no app: mostramos o QR code aqui mesmo.
 */
export type ResultadoCheckout =
  | { tipo: 'redirect'; url: string }
  | { tipo: 'pix'; pix: PixCobranca };

/**
 * Cria a assinatura no Asaas. O acesso só libera quando o webhook confirmar o
 * pagamento — por isso a tela fica aguardando em vez de liberar na hora.
 */
export async function startCheckout(
  plan: PlanId,
  cpfCnpj: string,
  billingType: FormaPagamento,
  telefone: string,
  ciclo: Ciclo,
  cep: string,
  numero: string,
  complemento?: string,
): Promise<ResultadoCheckout> {
  const { data, error } = await supabase.functions.invoke<{
    url?: string; pix?: PixCobranca; error?: string;
  }>('asaas-checkout', {
    body: { plan, cpfCnpj, billingType, telefone, ciclo, cep, numero, complemento },
  });
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
  if (data?.pix?.copiaECola) return { tipo: 'pix', pix: data.pix };
  if (data?.url) return { tipo: 'redirect', url: data.url };
  throw new Error('Não foi possível iniciar a assinatura.');
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
