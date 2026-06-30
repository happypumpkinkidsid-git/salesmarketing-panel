// ============================================================
// Happy Pumpkin — service worker (offline-first app shell)
// Makes the dashboard + KOL Brief Generator installable & offline-capable.
// LIVE DATA stays live: API/auth/sheet requests are NEVER cached, so the KOL
// Command Center always reflects the shared cloud (or shows "Tidak tersambung"
// when offline) — it never serves stale data from this cache.
// ============================================================
const VERSION = 'hp-pwa-v1';
const STATIC  = 'hp-static-' + VERSION;

// Live data / auth / external data sources → always network, never cached.
function isLiveData(url) {
  return url.pathname.startsWith('/.netlify/functions/')
      || url.hostname.endsWith('supabase.co')
      || url.hostname.includes('docs.google.com');     // Google Sheets CSV
}
// Cross-origin assets worth caching so offline still works (Supabase JS, fonts).
function isCacheableCDN(url) {
  return url.hostname.includes('cdn.jsdelivr.net')
      || url.hostname.includes('fonts.googleapis.com')
      || url.hostname.includes('fonts.gstatic.com');
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                  // writes never touch the cache
  const url = new URL(req.url);

  // 1) Live data / auth → straight to network (Command Center stays live).
  if (isLiveData(url)) return;

  // 2) Page navigations (HTML) → network-first, fall back to cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        (await caches.open(STATIC)).put(req, fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // 3) Static assets (same-origin JS/CSS/img + whitelisted CDN/fonts) →
  //    stale-while-revalidate: instant from cache, refreshed in the background.
  if (url.origin === self.location.origin || isCacheableCDN(url)) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok) caches.open(STATIC).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
  }
});
