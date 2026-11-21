/* ZenouMath, service worker.
 *
 * Deliberately small: a stale shell beats a blank page when the network drops,
 * but nobody wants yesterday's catalogue forever. So:
 *   · HTML / CSS / JSON  -> network first, cache as a fallback
 *   · Other assets       -> cache first, refreshed in the background
 *
 * Clean URLs matter here: with no .html on any public path, "is this a page?"
 * is answered by a request with no file extension, not by a filename match.
 * That is the `extensionless` test below.
 *
 * Bump CACHE_VERSION when the shell changes shape. v3 dropped the .html
 * redirect stubs: they shadowed their own directory index on GitHub Pages,
 * so any cached copy of one has to go.
 */
const CACHE_VERSION = 'zenou-arcade-v19';
const SHELL = [
  '/',
  '/css/style.css',
  '/css/arcade-shell.css',
  '/css/arcade-discover.css?v=19',
  '/css/settings.css',
  '/css/plus.css',
  '/css/consent.css',
  '/js/zenou-plus.js',
  '/js/settings.js',
  '/js/supabase.js',
  '/js/account-sync.js',
  '/js/username-auth.js',
  '/css/interface.css',
  '/css/interface.css?v=19',
  '/js/motion.js',
  '/js/atmosphere.js',
  '/js/consent.js',
  '/assets/favicon.png',
  '/assets/favicon.svg',
  '/assets/ui-icons.svg',
  '/assets/logo-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('zenou-arcade-') && k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch other origins
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  const extensionless = !/\.[a-z0-9]+$/i.test(url.pathname);
  const networkFirst = req.mode === 'navigate'
    || extensionless
    || /\.(css|json|webmanifest)$/i.test(url.pathname)
    || url.pathname.endsWith('/');

  if (networkFirst) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => await caches.match(req)
          || (req.mode === 'navigate' && await caches.match('/'))
          || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    })
  );
});
