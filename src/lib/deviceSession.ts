import { supabase } from './supabase';

/**
 * Impede que a mesma conta seja usada em dois aparelhos ao mesmo tempo.
 * Cada navegador guarda um ID próprio (localStorage, não sincroniza entre
 * aparelhos). Ao logar de verdade, esse ID vira o "dono" da conta no banco —
 * qualquer outro aparelho logado antes passa a falhar na próxima checagem.
 */
const KEY = 'bexpv_device_session_id';

function lerOuCriar(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Chamar logo após um login/cadastro bem-sucedido (evento SIGNED_IN de verdade). */
export async function claimDeviceSession(): Promise<void> {
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  await supabase.rpc('claim_session', { p_session_id: id });
}

/**
 * Confere se esse aparelho ainda é o dono da conta. Se outro aparelho logou
 * depois, devolve false — a chamada quem decide o que fazer (geralmente
 * deslogar com uma mensagem clara).
 */
export async function isDeviceSessionActive(): Promise<boolean> {
  const id = lerOuCriar();
  const { data, error } = await supabase.rpc('session_is_active', { p_session_id: id });
  if (error) return true; // falha de rede não deve deslogar ninguém à toa
  return data === true;
}

/** ID desse aparelho, para mandar junto nas chamadas que consomem franquia. */
export function deviceSessionId(): string {
  return lerOuCriar();
}
