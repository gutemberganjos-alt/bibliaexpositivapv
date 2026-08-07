// Meta Pixel (Facebook Ads) — o snippet base já está no index.html.
// Este módulo só concentra os eventos de conversão que fazem diferença pra
// otimização de anúncio: CompleteRegistration, InitiateCheckout e Purchase.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

/**
 * Dispara `disparar()` no máximo uma vez por `chave` (guardado no localStorage).
 * Usado nos eventos que representam um marco (cadastro, compra) — sem isso,
 * eles disparariam de novo a cada vez que o app carrega.
 */
export function trackOnce(chave: string, disparar: () => void) {
  try {
    if (localStorage.getItem(chave) === '1') return;
    localStorage.setItem(chave, '1');
  } catch {
    // localStorage indisponível (modo privado etc.) — dispara sem dedupe.
  }
  disparar();
}

export function trackCompleteRegistration() {
  fbq('track', 'CompleteRegistration');
}

export function trackInitiateCheckout(params: { value: number; plano: string; ciclo: string }) {
  fbq('track', 'InitiateCheckout', {
    value: params.value,
    currency: 'BRL',
    content_name: params.plano,
    content_category: params.ciclo,
  });
}

export function trackPurchase(params: { value: number; plano: string }) {
  fbq('track', 'Purchase', {
    value: params.value,
    currency: 'BRL',
    content_name: params.plano,
  });
}
