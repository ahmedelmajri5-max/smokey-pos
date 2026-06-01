const CACHE_NAME = "smokey-pos-external-v52";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css?v=51",
  "./app.js?v=52",
  "./manifest.json",
  "./firebase-config.js?v=52",
  "./external-readonly.js?v=52",
  "./external-sync.js?v=52",
  "./external-inventory.js?v=52",
  "./assets/smokey-logo.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const requestUrl = new URL(event.request.url);
          if (requestUrl.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
