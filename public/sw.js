/* Promix Automatix — service worker (PWA shell).
 *
 * Makes the web app installable (Chrome / Android "Add to home screen") and
 * lets PWABuilder/Bubblewrap wrap https://automatix.online into a signed APK
 * (Trusted Web Activity). The APK is a thin client: all data + auth stay on the
 * Automatix server, exactly like the LAN tablets today.
 *
 * Caching strategy (safe for an actively-deployed, server-driven ERP):
 *   - /api, /ai, SSE, any non-GET   → ALWAYS network, never cached (no stale
 *     data, no stale auth — the SW never touches the API).
 *   - navigations (HTML)            → network-first; offline → cached shell.
 *     Network-first guarantees the latest hashed-bundle references after a deploy.
 *   - /assets/* (Vite content-hashed) → cache-first (immutable).
 *   - other same-origin GETs (fonts/icons) → stale-while-revalidate.
 */
const VERSION = 'promix-pwa-v2-ui-audit';
const SHELL = VERSION + '-shell';
const ASSETS = VERSION + '-assets';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.add('/')).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;                 // cross-origin → browser default
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ai')) return; // never cache API/SSE

  // App navigations → network-first (always fresh after deploy), offline → cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/', { ignoreSearch: true }).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Vite content-hashed assets → network-first with cache fallback.
  // This is safer for stale SW/partial deploy scenarios on dynamic imports.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Other same-origin GETs (fonts, icons, manifest) → stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
