const staticCacheName = "piyush-portfolio-v5";
const filesToCache = [
  "index.html",
  "main.css",
  "main.js",
  "responsive.js",
  "utm.js",
  "d",
  "blank.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => cache.addAll(filesToCache))
  );
});

self.addEventListener("fetch", (event) => {
  const { pathname } = new URL(event.request.url);

  // Proxied product apps (Vercel rewrites) must bypass the SW — intercepting
  // cross-origin rewrites here causes uncaught "Failed to fetch" rejections.
  if (pathname.startsWith("/products/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => Response.error());
    })
  );
});