// Starshot offline cache. Same-origin GETs only; no third-party requests exist.
// Pages: network first (so new deployments show up), cache as fallback.
// Hashed build assets: cache first.
const CACHE = "starshot-v1";
// Only Starshot's own caches are ever deleted: another app on the same origin
// (GitHub Pages serves many sites from one) keeps its caches.
const OWN_PREFIX = "starshot-";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(OWN_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Never let an error page (404, 500) replace the cached app shell.
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { cacheName: CACHE }).then((hit) => hit || caches.match("./", { cacheName: CACHE })),
        ),
    );
    return;
  }
  event.respondWith(
    caches.match(req, { cacheName: CACHE }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
