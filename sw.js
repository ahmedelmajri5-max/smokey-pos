const CACHE_NAME = "smokey-pos-v72-current-day-sync";
const ENHANCEMENT_SCRIPTS = `
  <link rel="stylesheet" href="./mobile-sales-enhancements.css?v=1">
  <script src="./mobile-sales-enhancements.js?v=2"></script>
`;
const ORDER_ACTION_GUARD_SCRIPT = `<script src="./firebase-order-actions-stable.js?v=1"></script>`;
const CUSTOMER_STATUS_GUARD_SCRIPT = `<script src="./firebase-customer-status-hotfix.js?v=1"></script>`;
const FIREBASE_QUERY_GUARD_SCRIPT = `<script src="./firebase-current-day-query-guard.js?v=1"></script>`;
const ORDER_RANGE_LOADER_SCRIPT = `<script src="./firebase-order-range-loader.js?v=1"></script>`;
const FIREBASE_BRIDGE_SCRIPTS = `
  <script>
    (function () {
      function fixSmokeyLogoPath() {
        document.querySelectorAll('img').forEach(function (img) {
          var src = img.getAttribute('src') || '';
          if (src.indexOf('WhatsApp Image') !== -1 || src.indexOf('smokey-logo.jpeg') !== -1) {
            img.src = './assets/smokey-logo.jpeg';
          }
        });
      }
      try { if (typeof state !== 'undefined') window.state = state; } catch (error) {}
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixSmokeyLogoPath);
      else fixSmokeyLogoPath();
    })();
  </script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>
  ${FIREBASE_QUERY_GUARD_SCRIPT}
  <script src="./firebase-orders-bridge.js?v=10"></script>
  ${ORDER_RANGE_LOADER_SCRIPT}
  <script src="./firebase-order-reset.js?v=3"></script>
  ${ORDER_ACTION_GUARD_SCRIPT}
  ${CUSTOMER_STATUS_GUARD_SCRIPT}
  ${ENHANCEMENT_SCRIPTS}
`;
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css?v=51",
  "./app.js?v=51",
  "./firebase-orders-bridge.js?v=10",
  "./firebase-current-day-query-guard.js?v=1",
  "./firebase-order-range-loader.js?v=1",
  "./firebase-order-reset.js?v=3",
  "./firebase-order-actions-stable.js?v=1",
  "./firebase-customer-status-hotfix.js?v=1",
  "./mobile-sales-enhancements.css?v=1",
  "./mobile-sales-enhancements.js?v=2",
  "./manifest.json",
  "./assets/smokey-logo.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

async function injectFirebaseBridge(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  if (html.includes("firebase-order-actions-stable.js?v=1") && html.includes("firebase-current-day-query-guard.js?v=1") && html.includes("firebase-order-range-loader.js?v=1")) {
    return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
  }
  const scripts = html.includes("firebase-order-reset.js?v=3")
    ? `${FIREBASE_QUERY_GUARD_SCRIPT}\n${ORDER_RANGE_LOADER_SCRIPT}\n${ENHANCEMENT_SCRIPTS}\n${ORDER_ACTION_GUARD_SCRIPT}\n${CUSTOMER_STATUS_GUARD_SCRIPT}`
    : FIREBASE_BRIDGE_SCRIPTS;
  const patched = html.replace("</body>", `${scripts}\n</body>`);
  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
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
    caches.match(event.request).then((cached) => cached || fetch(event.request, { cache: "no-store" }).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
