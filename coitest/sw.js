/* Cross-origin isolation helper for the COI test page.
 *
 * It only adds COOP/COEP headers to same-origin responses; nothing is cached.
 * On the old ZenouMath domain it would sit in front of the permanent redirect
 * (and could return the destination inside the old URL), so a registration on
 * that host clears itself instead. The destination keeps the full behaviour,
 * because the isolation test needs crossOriginIsolated there.
 */
const LEGACY_HOST = /^(www\.)?zenoumath\.space$/i.test(self.location.hostname);

if (LEGACY_HOST) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      try { await self.clients.claim(); } catch (e) {}
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (e) {}
      try { await self.registration.unregister(); } catch (e) {}
    })());
  });
} else {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (e) => {
    if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;
    e.respondWith((async () => {
      const r = await fetch(e.request);
      const h = new Headers(r.headers);
      h.set('Cross-Origin-Opener-Policy', 'same-origin');
      h.set('Cross-Origin-Embedder-Policy', 'require-corp');
      h.set('Cross-Origin-Resource-Policy', 'cross-origin');
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
    })());
  });
}
