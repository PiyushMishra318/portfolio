const staticCacheName = "piyush-portfolio-v4";
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});