// Keeps ready status stable while Firestore realtime snapshots catch up.
(function () {
  const READY_STATUS = "جاهز";
  const HOLD_MS = 90000;
  const pendingReady = new Map();
  let ordersListenerStarted = false;

  function getState() {
    return window.state || (typeof state !== "undefined" ? state : null);
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function toMillis(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (value && typeof value.toMillis === "function") return value.toMillis();
    if (value && typeof value.seconds === "number") return value.seconds * 1000;
    return 0;
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
    order.updatedAt = Math.max(toMillis(order.updatedAt), readyAt);
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

  function readyPayload(order, readyAt) {
    return {
      ...order,
      status: READY_STATUS,
      readyAt,
      modifiedAtMs: Math.max(Number(order.modifiedAtMs || 0), readyAt),
      updatedAt: readyAt,
      updatedBy: currentUserName(),
      syncedAt: Date.now()
    };
  }

  async function persistReady(order, docId, readyAt) {
    const db = getDb();
    if (!db || !order || !docId) throw new Error("FIREBASE_NOT_READY");
    await db.collection("orders").doc(docId).set(readyPayload(order, readyAt), { merge: true });
    if (order.onlineOrderId) {
      await db.collection("onlineOrders").doc(String(order.onlineOrderId)).set({
        status: READY_STATUS,
        liveStatus: READY_STATUS,
        readyAt,
        orderNumber: order.orderNumber || order.id,
        orderId: order.orderNumber || order.id,
        updatedAt: readyAt
      }, { merge: true });
    }
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

  async function forceReady(ref) {
    const order = findOrder(ref);
    if (!order) return false;
    const readyAt = Date.now();
    const docId = docIdForOrder(order) || String(ref || order.id);
    order.firebaseDocId = docId;
    pendingReady.set(docId, { id: order.id, readyAt, expiresAt: readyAt + HOLD_MS });
    markOrderReadyLocal(order, readyAt);
    saveLocalOrders();
    renderSafe();
    try {
      await persistReady(order, docId, readyAt);
      setTimeout(() => pendingReady.delete(docId), 7000);
    } catch (error) {
      console.warn("Firebase ready status sync failed", error);
      alert("تعذر تثبيت حالة الطلب جاهز في Firebase. تأكد من الاتصال وجرب مرة ثانية.");
    }
    return true;
  }

  function startRemoteGuard() {
    const db = getDb();
    if (!db || ordersListenerStarted) return;
    ordersListenerStarted = true;
    db.collection("orders").onSnapshot((snapshot) => {
      const now = Date.now();
      snapshot.docs.forEach((doc) => {
        const pending = pendingReady.get(doc.id);
        if (!pending || now > pending.expiresAt) return;
        const remote = doc.data() || {};
        if (remote.status !== READY_STATUS) {
          doc.ref.set({
            status: READY_STATUS,
            readyAt: pending.readyAt,
            modifiedAtMs: Math.max(Number(remote.modifiedAtMs || 0), pending.readyAt),
            updatedAt: pending.readyAt,
            updatedBy: currentUserName(),
            syncedAt: Date.now()
          }, { merge: true }).catch((error) => console.warn("Ready guard rewrite failed", error));
        }
      });
      setTimeout(reapplyPendingReady, 40);
      setTimeout(reapplyPendingReady, 350);
    }, (error) => console.warn("Ready guard listener failed", error));
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
      forceReady(ref).then((handled) => {
        if (!handled) previousMarkReady(ref);
      });
    };

    window.markReady = markReady;
    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest ? event.target.closest("[data-ready]") : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      forceReady(button.dataset.ready);
    }, true);
    setInterval(reapplyPendingReady, 700);
    startRemoteGuard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(patchMarkReady, 500), { once: true });
  else setTimeout(patchMarkReady, 500);
})();
