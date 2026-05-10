// Keeps ready status stable while Firestore realtime snapshots catch up.
(function () {
  const READY_STATUS = "جاهز";
  const HOLD_MS = 20000;
  const pendingReady = new Map();

  function getState() {
    return window.state || (typeof state !== "undefined" ? state : null);
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function docIdForOrder(order) {
    if (!order) return "";
    if (order.firebaseDocId) return String(order.firebaseDocId);
    const id = Number(order.orderNumber || order.id);
    if (!id) return "";
    if (order.orderCycle) return `${order.orderCycle}-${id}`;
    return String(id);
  }

  function findOrder(ref) {
    const s = getState();
    const list = Array.isArray(s?.orders) ? s.orders : [];
    const value = String(ref || "");
    const numeric = Number(value);
    return list.find((order) => String(order.firebaseDocId || "") === value)
      || list.find((order) => docIdForOrder(order) === value)
      || list.find((order) => Number(order.id) === numeric)
      || null;
  }

  function currentUserName() {
    return getState()?.currentUser?.name || "الكاشير";
  }

  function markOrderReadyLocal(order, readyAt) {
    if (!order) return;
    order.status = READY_STATUS;
    order.readyAt = readyAt;
    order.modifiedAtMs = Math.max(Number(order.modifiedAtMs || 0), readyAt);
    order.updatedAt = Math.max(Number(order.updatedAt || 0), readyAt);
    order.updatedBy = currentUserName();
  }

  function saveLocalOrders() {
    try {
      const s = getState();
      if (!s) return;
      localStorage.setItem("smokey-pos-orders-v3", JSON.stringify({ orders: s.orders || [], nextOrder: s.nextOrder || 1 }));
    } catch (error) {
      console.warn("Ready status local save failed", error);
    }
  }

  function renderSafe() {
    if (typeof window.renderAll === "function") window.renderAll();
    else if (typeof renderAll === "function") renderAll();
  }

  async function persistReady(order, docId, readyAt) {
    const db = getDb();
    if (!db || !order || !docId) throw new Error("FIREBASE_NOT_READY");
    const payload = {
      ...order,
      status: READY_STATUS,
      readyAt,
      modifiedAtMs: Math.max(Number(order.modifiedAtMs || 0), readyAt),
      updatedAt: readyAt,
      updatedBy: currentUserName(),
      syncedAt: Date.now()
    };
    await db.collection("orders").doc(docId).set(payload, { merge: true });
  }

  function reapplyPendingReady() {
    let changed = false;
    const now = Date.now();
    pendingReady.forEach((entry, docId) => {
      if (now > entry.expiresAt) {
        pendingReady.delete(docId);
        return;
      }
      const order = findOrder(docId) || findOrder(entry.id);
      if (order && order.status !== READY_STATUS) {
        markOrderReadyLocal(order, entry.readyAt);
        changed = true;
      }
    });
    if (changed) {
      saveLocalOrders();
      renderSafe();
    }
  }

  function patchMarkReady() {
    if (window.__smokeyReadyStatusHotfixInstalled) return;
    const previousMarkReady = typeof markReady === "function" ? markReady : null;
    if (!previousMarkReady) {
      setTimeout(patchMarkReady, 300);
      return;
    }

    window.__smokeyReadyStatusHotfixInstalled = true;
    markReady = function markReadyStable(ref) {
      const order = findOrder(ref);
      if (!order) return previousMarkReady(ref);
      const readyAt = Date.now();
      const docId = docIdForOrder(order) || String(ref || order.id);
      pendingReady.set(docId, { id: order.id, readyAt, expiresAt: readyAt + HOLD_MS });
      markOrderReadyLocal(order, readyAt);
      saveLocalOrders();
      renderSafe();
      persistReady(order, docId, readyAt)
        .then(() => {
          setTimeout(() => pendingReady.delete(docId), 4000);
        })
        .catch((error) => {
          console.warn("Firebase ready status sync failed", error);
          alert("تعذر تثبيت حالة الطلب جاهز في Firebase. تأكد من الاتصال وجرب مرة ثانية.");
        });
    };

    window.markReady = markReady;
    setInterval(reapplyPendingReady, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(patchMarkReady, 500), { once: true });
  else setTimeout(patchMarkReady, 500);
})();
