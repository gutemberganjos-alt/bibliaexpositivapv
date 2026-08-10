import { supabase } from './supabase';

/** Quantas gerações a pessoa ganha para testar antes de assinar. */
export const TESTE_GRATIS_LIMITE = 3;

export interface QuotaStatus {
  /** Tem assinatura ativa (ou faz parte de uma igreja assinante). */
  active: boolean;
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  /** Está no teste grátis (ainda não assinou). */
  trial: boolean;
}

export const QUOTA_INICIAL: QuotaStatus = {
  active: false,
  tier: 'free',
  used: 0,
  limit: TESTE_GRATIS_LIMITE,
  remaining: TESTE_GRATIS_LIMITE,
  trial: true,
};

/**
 * Lê a situação da franquia sem consumir nada (RPC `quota_status`, que usa o
 * auth.uid() da sessão). Para quem não assinou, devolve quantas das gerações
 * gratuitas ainda restam.
 */
export async function fetchQuotaStatus(): Promise<QuotaStatus | null> {
  const { data, error } = await supabase.rpc('quota_status');
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    active: row.active === true,
    tier: String(row.tier ?? 'free'),
    used: Number(row.used ?? 0),
    limit: Number(row.limit_val ?? 0),
    remaining: Number(row.remaining ?? 0),
    trial: row.trial === true,
  };
}

/** Frase curta para o contador na tela ("2 de 3 estudos gratuitos"). */
export function rotuloRestantes(q: QuotaStatus): string {
  if (!q.trial) return `${q.remaining} de ${q.limit} gerações restantes neste mês`;
  if (q.remaining <= 0) return 'Teste grátis encerrado';
  if (q.remaining === 1) return 'Resta 1 geração gratuita';
  return `Restam ${q.remaining} de ${q.limit} gerações gratuitas`;
}
