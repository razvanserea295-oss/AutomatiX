/* Promix Automatix — service worker KILL-SWITCH.
 *
 * The previous PWA service worker (promix-pwa-v3-responsive) cached the app
 * shell and assets, AND — because its "never cache /api" guard only matched the
 * bare "/api" prefix, NOT the multi-tenant "/t/<slug>/api/..." paths the app
 * actually calls — it also cached tenant API responses (e.g.
 * /t/promix/api/shared-files). That stranded clients on STALE DATA: uploaded
 * files didn't appear, edits seemed to revert, lists flapped — the data looked
 * "split-brain" while the server was perfectly consistent.
 *
 * This self-destructing worker neutralises all of it: it caches NOTHING (no
 * fetch handler, so every request goes straight to the network), purges every
 * existing cache, unregisters itself, and reloads any controlled tab so it
 * picks up the fresh, SW-free app. index.html is served no-store, so once the
 * caches are gone the app always loads fresh.
 *
 * To re-enable a real PWA service worker later, replace this file — and make the
 * "never cache" guard also exclude "/t/<slug>/api" and "/t/<slug>/ai" — then
 * bump VERSION so clients pick it up on their next navigation.
 */
const VERSION = 'promix-pwa-killswitch-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Purge every cache the old worker created.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    // 2. Take control of open tabs so we can reload them.
    try { await self.clients.claim(); } catch (e) { /* ignore */ }
    // 3. Reload controlled tabs — they re-fetch index.html (no-store) and the
    //    current main bundle, which no longer registers any service worker.
    try {
      const wins = await self.clients.matchAll({ type: 'window' });
      for (const win of wins) {
        try { await win.navigate(win.url); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    // 4. Remove ourselves entirely.
    try { await self.registration.unregister(); } catch (e) { /* ignore */ }
  })());
});

// NO fetch handler — nothing is intercepted, nothing is cached; every request
// goes straight to the network.
