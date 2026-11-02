self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/upload") || event.request.url.includes("r2.cloudflarestorage.com")) return;

  // Pass-through fetch to satisfy PWA requirements
  event.respondWith(fetch(event.request).catch(() => new Response("Offline")));
});
