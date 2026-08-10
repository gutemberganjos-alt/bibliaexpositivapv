// Service worker — estratégia corrigida.
// PROBLEMA ANTIGO: cache-first para TUDO + nome de cache fixo (v1) + sem limpeza.
// O index.html antigo ficava preso no cache e apontava para bundles JS que já não
// existiam após o deploy => tela branca em visitantes recorrentes.
//
// AGORA:
//  - HTML/navegação: NETWORK-FIRST (sempre pega a versão nova; cache só como fallback offline).
//  - Assets versionados (/assets, /icons): cache-first (o nome tem hash, é seguro).
//  - activate: apaga caches de versões anteriores e assume o controle na hora.

const VERSION = 'v6';
const CACHE_NAME = `biblia-pv-${VERSION}`;
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function ehAssetVersionado(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // não intercepta terceiros (Supabase, Stripe, fontes)

  // Navegação / HTML: rede primeiro, cache só se estiver offline.
  const ehNavegacao = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (ehNavegacao) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // BUG ANTIGO: guardava QUALQUER navegação sob OFFLINE_URL. Depois que
          // passaram a existir páginas públicas estáticas (/estudo/..., /tema/...),
          // visitar uma delas fazia o fallback offline do app virar aquela página.
          // Só o "/" alimenta o fallback.
          if (url.pathname === '/' || url.pathname === '/index.html') {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(OFFLINE_URL, copia)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Assets com hash no nome: cache primeiro (rápido e seguro).
  if (ehAssetVersionado(url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      })),
    );
    return;
  }

  // Demais: rede, com cache como último recurso.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
