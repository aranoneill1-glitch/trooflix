// Trooflix service worker — minimal static caching
const CACHE = "trooflix-v1";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle same-origin; don't touch API calls (must hit network)
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Stale-while-revalidate for assets, network-first for HTML pages
  const isHTML = req.headers.get("accept")?.includes("text/html");
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
  } else {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
