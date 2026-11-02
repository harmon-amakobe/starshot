// The build replaces both constants after copying all shared media and notices.
const RELEASE = __STARSHOT_RELEASE__;
const INVENTORY = __STARSHOT_PRECACHE__;
const SCOPE = self.registration.scope;
const PREFIX = 'starshot-release:' + SCOPE + ':';
const CACHE = PREFIX + RELEASE;
const ASSETS = new Map(INVENTORY.map(({ path, integrity }) => [new URL(path, SCOPE).href, integrity]));

self.addEventListener('install', event => {
  // Integrity makes a partial or stale CDN response fail the whole installation.
  // The existing worker stays active until this complete release is available.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    [...ASSETS].map(([url, integrity]) => new Request(url, { integrity, cache: 'reload' })),
  )));
});

self.addEventListener('activate', event => {
  // No skipWaiting: an in-flight game keeps its code and data until its tabs close.
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)))));
  // Do not claim an uncontrolled page: it may still be running an older build.
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  const asset = url.href === SCOPE ? new URL('index.html', SCOPE).href : url.href;
  if (!ASSETS.has(asset)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(asset);
    if (hit) return hit;
    // Storage eviction must not turn the cache into a mixture of release versions.
    const response = await fetch(new Request(asset, { integrity: ASSETS.get(asset), cache: 'reload' }));
    if (response.ok) await cache.put(asset, response.clone());
    return response;
  }));
});
