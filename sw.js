/* ZenouMath, migration worker.
 *
 * ZenouMath now lives at https://stop-smoking-campaign.pages.dev/ and this
 * origin answers with a permanent redirect. Any worker left registered here
 * would stand in front of that redirect: it could serve the cached arcade, or
 * follow the 301 internally and return the new page while the address bar
 * still showed the old host. So this version retires the offline shell
 * instead of maintaining it.
 *
 *   · It registers no fetch handler, so every request goes to the network and
 *     the browser sees the redirect as a real navigation.
 *   · On activation it claims the open pages, deletes every Cache Storage
 *     entry the old shell created, and unregisters itself, so the browser
 *     forgets the registration.
 *
 * Browsers check the worker script for updates on the next visit to the
 * origin, so shipping this before the DNS switch is what lets returning
 * visitors clear the old shell.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      await self.clients.claim();
    } catch (e) { /* no window clients to claim */ }

    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) { /* storage blocked: nothing else can be cleared */ }

    try {
      await self.registration.unregister();
    } catch (e) { /* already unregistered */ }
  })());
});
