const CACHE_NAME = "smokey-pos-v52-firebase-orders-test";
const FIREBASE_BRIDGE_SCRIPTS = `
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>
  <script src="./firebase-orders-bridge.js?v=1"></script>
`;
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css?v=51",
  "./app.js?v=51",
  "./firebase-orders-bridge.js?v=1",
  "./manifest.json",
  "./assets/smokey-logo.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE).catch(() => undefined))
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

async function injectFirebaseBridge(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  if (html.includes("firebase-orders-bridge.js")) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const patched = html.replace("</body>", `${FIREBASE_BRIDGE_SCRIPTS}\n</body>`);
  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(injectFirebaseBridge)
        .catch(() => caches.match("./index.html").then((cached) => cached ? injectFirebaseBridge(cached) : caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
