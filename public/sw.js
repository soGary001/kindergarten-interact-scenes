// Minimal service worker: makes the app installable and caches the static shell
// (HTML, JS, CSS, images, audio) cache-first for instant loads. It never touches
// /api (POST, skipped) or cross-origin requests, so ASR always hits the network.
const CACHE = "eft-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok && res.type === "basic") cache.put(e.request, res.clone());
      return res;
    }),
  );
});
