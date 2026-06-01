(function () {
  const collections = [
    ["orders", "orders"],
    ["products", "products"],
    ["inventory", "inventory"],
    ["inventoryTransactions", "inventoryTransactions"],
    ["users", "users"]
  ];

  function parsePayload(snapshot) {
    if (!snapshot.exists) return null;
    const payload = snapshot.data() || {};
    const raw = payload.data;
    if (typeof raw === "string") return JSON.parse(raw || "null");
    if (Array.isArray(raw) || raw && typeof raw === "object") return raw;
    return null;
  }

  function applySnapshot(stateKey, snapshot) {
    const data = parsePayload(snapshot);
    if (!Array.isArray(data)) return;
    state[stateKey] = data;
    window.__SMOKEY_FIREBASE_READY__ = true;
    if (stateKey === "products" && typeof renderCategories === "function") renderCategories();
    if (typeof renderAll === "function") renderAll();
  }

  function connectExternalSync() {
    if (!window.firebase || !window.SMOKEY_FIREBASE_CONFIG) {
      console.warn("Firebase is not ready for Smokey external sync.");
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(window.SMOKEY_FIREBASE_CONFIG);
    const db = firebase.firestore();
    window.smokeyFirebaseDb = db;
    window.__SMOKEY_EXTERNAL_FIREBASE_SOURCE__ = true;

    collections.forEach(([collectionName, stateKey]) => {
      db.collection(collectionName).doc("current").onSnapshot(
        (snapshot) => applySnapshot(stateKey, snapshot),
        (error) => console.error(`Smokey external sync failed for ${collectionName}`, error)
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connectExternalSync);
  } else {
    connectExternalSync();
  }
})();
