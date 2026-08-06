import { supabase } from './supabase';

/** Checa se o usuário logado é administrador (via RPC is_admin() no banco). */
export async function fetchIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('[admin] fetchIsAdmin', error.message);
    return false;
  }
  return data === true;
}

export interface AdminProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  subscription_tier: string | null;
  church_id: string | null;
  created_at: string;
}

export interface AdminSubscriptionRow {
  user_id: string;
  tier: string;
  status: string;
  value: number | null;
  cycle: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface AdminUsageRow {
  user_id: string;
  period: string;
  lessons_this_month: number;
  tokens_used: number;
}

export interface AdminUserRow extends AdminProfileRow {
  subscription: AdminSubscriptionRow | null;
  usage: AdminUsageRow | null;
}

/**
 * Lista todos os usuários para o painel admin (profiles + assinatura mais recente
 * + consumo do período atual). Só retorna dados se o usuário logado for admin —
 * a garantia real é a policy `profiles_select_admin` no banco (RLS); aqui é só a
 * chamada. Junta os dados no cliente porque não há uma única view pronta.
 */
export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const [{ data: profiles, error: perr }, { data: subs, error: serr }, { data: usage, error: uerr }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, subscription_tier, church_id, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('user_id, tier, status, value, cycle, current_period_end, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('usage_counters')
        .select('user_id, period, lessons_this_month, tokens_used'),
    ]);

  if (perr) throw new Error(perr.message);
  if (serr) throw new Error(serr.message);
  if (uerr) throw new Error(uerr.message);

  // Assinatura mais recente por usuário (subs já vem ordenado desc).
  const subPorUsuario = new Map<string, AdminSubscriptionRow>();
  for (const s of (subs ?? []) as AdminSubscriptionRow[]) {
    if (!subPorUsuario.has(s.user_id)) subPorUsuario.set(s.user_id, s);
  }

  const periodoAtual = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const usagePorUsuario = new Map<string, AdminUsageRow>();
  for (const u of (usage ?? []) as AdminUsageRow[]) {
    if (u.period === periodoAtual) usagePorUsuario.set(u.user_id, u);
  }

  return ((profiles ?? []) as AdminProfileRow[]).map((p) => ({
    ...p,
    subscription: subPorUsuario.get(p.id) ?? null,
    usage: usagePorUsuario.get(p.id) ?? null,
  }));
}
