import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Variáveis de ambiente não configuradas. Configure .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

/** URL base do projeto Supabase (usada em chamadas diretas, ex.: streaming SSE). */
export const SUPABASE_URL = supabaseUrl || 'https://placeholder.supabase.co';
/** Chave anônima (pública) do projeto. */
export const SUPABASE_ANON_KEY = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
