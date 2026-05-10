// Centralized Firebase action guard for the experiment branch.
// Keeps order status changes durable across refreshes and realtime snapshots.
(function () {
  const WAITING_STATUS = "قيد التجهيز";
  const READY_STATUS = "جاهز";
  const CANCELED_STATUS = "ملغي";
  const ONLINE_WAITING = "في انتظار الموافقة";
  const ONLINE_ACCEPTED = "مقبول";
  const ONLINE_DECLINED = "مرفوض";
  const LEGACY_CYCLE = "legacy";
  const PENDING_HOLD_MS = 20000;
  const pendingOrderPatches = new Map();

  function getState() {
    try { return window.state || (typeof state !== "undefined" ? state : null); }
    catch (error) { return window.state || null; }
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function currentUserName() {
    return getState()?.currentUser?.name || "المدير";
  }

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function activeCycleFromState() {
    const orders = getState()?.orders || [];
    const latest = orders.find((order) => order.orderCycle && order.orderCycle !== LEGACY_CYCLE);
    return latest?.orderCycle || LEGACY_CYCLE;
  }

  function docIdForOrder(order) {
    if (!order) return "";
    if (order.firebaseDocId) return String(order.firebaseDocId);
    const id = toNumber(order.orderNumber || order.id, 0);
    if (!id) return "";
    const cycle = order.orderCycle || activeCycleFromState();
    return `${cycle || LEGACY_CYCLE}-${id}`;
  }

  function findOrder(ref, preferredStatus) {
    const s = getState();
    const orders = Array.isArray(s?.orders) ? s.orders : [];
    const value = String(ref || "");
    const numeric = Number(value);
    const byDoc = orders.find((order) => String(order.firebaseDocId || "") === value || String(docIdForOrder(order)) === value);
    if (byDoc) return byDoc;
    const matches = orders.filter((order) => Number(order.id) === numeric || Number(order.orderNumber) === numeric)
      .sort((a, b) => toNumber(b.createdAt) - toNumber(a.createdAt));
    if (preferredStatus) return matches.find((order) => order.status === preferredStatus) || matches[0] || null;
    return matches[0] || null;
  }

  function saveLocalOrders() {
    try { if (typeof window.saveOrders === "function") window.saveOrders(); }
    catch (error) { console.warn("Local order save failed", error); }
  }

  function renderAllSafe() {
    try { if (typeof window.renderAll === "function") window.renderAll(); }
    catch (error) { console.warn("Render after order action failed", error); }
  }

  function upsertLocalOrder(order) {
    const s = getState();
    if (!s || !Array.isArray(s.orders) || !order) return;
    const docId = docIdForOrder(order);
    const index = s.orders.findIndex((item) => String(item.firebaseDocId || docIdForOrder(item)) === docId);
    if (index >= 0) s.orders[index] = { ...s.orders[index], ...order };
    else s.orders.unshift(order);
  }

  function normalizeOrderForWrite(order) {
    const now = Date.now();
    const id = toNumber(order.orderNumber || order.id, 0);
    const cycle = order.orderCycle || activeCycleFromState();
    const docId = order.firebaseDocId || docIdForOrder({ ...order, id, orderCycle: cycle });
    return {
      ...order,
      id,
      orderNumber: id,
      orderCycle: cycle,
      firebaseDocId: docId,
      batchId: toNumber(order.batchId, 1) || 1,
      total: toNumber(order.total, 0),
      createdAt: toNumber(order.createdAt, now),
      createdBy: order.createdBy || order.cashier || currentUserName(),
      updatedAt: toNumber(order.modifiedAtMs || order.updatedAt, 0) || null,
      canceledAt: toNumber(order.deletedAtMs || order.canceledAt, 0) || null,
      canceledBy: order.deletedBy || order.canceledBy || null,
      items: Array.isArray(order.items) ? order.items : [],
      syncedAt: now
    };
  }

  function rememberPending(docId, patch) {
    if (!docId) return;
    pendingOrderPatches.set(docId, { patch: { ...patch }, expiresAt: Date.now() + PENDING_HOLD_MS });
  }

  function applyPendingPatches() {
    const now = Date.now();
    let changed = false;
    pendingOrderPatches.forEach((entry, docId) => {
      if (entry.expiresAt < now) {
        pendingOrderPatches.delete(docId);
        return;
      }
      const order = findOrder(docId);
      if (order) {
        Object.assign(order, entry.patch);
        changed = true;
      }
    });
    if (changed) renderAllSafe();
  }

  async function writeOrder(order, patch) {
    const db = getDb();
    if (!db) throw new Error("FIREBASE_NOT_READY");
    const merged = { ...order, ...patch };
    const docId = docIdForOrder(merged);
    merged.firebaseDocId = docId;
    merged.orderCycle = merged.orderCycle || activeCycleFromState();
    rememberPending(docId, patch);
    upsertLocalOrder(merged);
    saveLocalOrders();
    renderAllSafe();
    await db.collection("orders").doc(docId).set(normalizeOrderForWrite(merged), { merge: true });
    return merged;
  }

  async function syncOnlineOrderStatus(order, patch) {
    const db = getDb();
    if (!db || !order?.onlineOrderId) return;
    const onlinePatch = {
      orderNumber: order.orderNumber || order.id,
      orderId: order.orderNumber || order.id,
      updatedAt: Date.now()
    };
    if (patch.status === READY_STATUS) {
      onlinePatch.status = READY_STATUS;
      onlinePatch.liveStatus = READY_STATUS;
      onlinePatch.readyAt = patch.readyAt || Date.now();
    } else if (patch.status === CANCELED_STATUS) {
      onlinePatch.status = CANCELED_STATUS;
      onlinePatch.liveStatus = CANCELED_STATUS;
      onlinePatch.canceledAt = patch.canceledAt || patch.deletedAtMs || Date.now();
      onlinePatch.canceledBy = patch.canceledBy || patch.deletedBy || currentUserName();
    }
    await db.collection("onlineOrders").doc(order.onlineOrderId).set(onlinePatch, { merge: true });
  }

  async function markOrderReady(ref) {
    const order = findOrder(ref, WAITING_STATUS);
    if (!order || order.status === READY_STATUS || order.status === CANCELED_STATUS) return;
    const now = Date.now();
    const patch = {
      status: READY_STATUS,
      readyAt: now,
      updatedAt: now,
      modifiedAtMs: now,
      updatedBy: currentUserName()
    };
    try {
      const saved = await writeOrder(order, patch);
      await syncOnlineOrderStatus(saved, patch);
    } catch (error) {
      console.warn("Firebase ready action failed", error);
      alert("تعذر حفظ حالة الطلب جاهز. تأكد من الاتصال وحاول مرة ثانية.");
    }
  }

  async function cancelOrder(ref) {
    const order = findOrder(ref);
    if (!order || order.status === CANCELED_STATUS) return;
    const ok = confirm(`تأكيد إلغاء الطلب #${order.id}؟`);
    if (!ok) return;
    const now = Date.now();
    const patch = {
      status: CANCELED_STATUS,
      canceledAt: now,
      canceledBy: currentUserName(),
      deletedAtMs: now,
      deletedAt: new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      deletedBy: currentUserName(),
      cancelAlert: true,
      inventoryReturned: true,
      updatedAt: now,
      modifiedAtMs: now
    };
    try {
      if (!order.inventoryReturned && typeof window.returnInventoryForOrder === "function") {
        window.returnInventoryForOrder(order);
      }
    } catch (error) {
      console.warn("Inventory return during cancel failed", error);
    }
    try {
      const saved = await writeOrder(order, patch);
      await syncOnlineOrderStatus(saved, patch);
      try { if (typeof window.printOrder === "function") window.printOrder(saved, "إلغاء طلب"); }
      catch (printError) { console.warn("Cancel print failed", printError); }
    } catch (error) {
      console.warn("Firebase cancel action failed", error);
      alert("تعذر حفظ إلغاء الطلب. تأكد من الاتصال وحاول مرة ثانية.");
    }
  }

  async function declineOnlineOrder(id) {
    const db = getDb();
    if (!db || !id) return;
    try {
      await db.collection("onlineOrders").doc(id).set({
        status: ONLINE_DECLINED,
        liveStatus: ONLINE_DECLINED,
        declinedAt: Date.now(),
        declinedBy: currentUserName()
      }, { merge: true });
    } catch (error) {
      console.warn("Decline online order failed", error);
      alert("تعذر رفض الطلب. حاول مرة ثانية.");
    }
  }

  async function approveOnlineOrder(id) {
    const db = getDb();
    const s = getState();
    if (!db || !id) return;
    const onlineRef = db.collection("onlineOrders").doc(id);
    let savedOrder = null;
    try {
      savedOrder = await db.runTransaction(async (transaction) => {
        const onlineSnap = await transaction.get(onlineRef);
        if (!onlineSnap.exists) throw new Error("ONLINE_ORDER_MISSING");
        const online = onlineSnap.data() || {};
        if (online.status !== ONLINE_WAITING) throw new Error("ONLINE_ORDER_ALREADY_HANDLED");

        const counterRef = db.collection("counters").doc("orders");
        const counterSnap = await transaction.get(counterRef);
        const counter = counterSnap.exists ? counterSnap.data() || {} : {};
        const cycle = counter.activeCycle || counter.cycle || activeCycleFromState();
        let orderNumber = Math.max(toNumber(counter.next, toNumber(s?.nextOrder, 1)), 1);
        let orderRef = db.collection("orders").doc(`${cycle}-${orderNumber}`);
        let orderSnap = await transaction.get(orderRef);
        let guard = 0;
        while (orderSnap.exists && guard < 100) {
          orderNumber += 1;
          orderRef = db.collection("orders").doc(`${cycle}-${orderNumber}`);
          orderSnap = await transaction.get(orderRef);
          guard += 1;
        }
        if (orderSnap.exists) throw new Error("ORDER_NUMBER_RANGE_BUSY");

        const now = Date.now();
        const order = {
          id: orderNumber,
          orderNumber,
          orderCycle: cycle,
          firebaseDocId: `${cycle}-${orderNumber}`,
          type: online.type || "استلام",
          status: WAITING_STATUS,
          total: toNumber(online.total, 0),
          cashier: currentUserName(),
          createdBy: currentUserName(),
          time: new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: now,
          payment: "نقدي",
          customer: online.customer || null,
          note: online.note || "",
          items: Array.isArray(online.items) ? online.items : [],
          source: "online",
          onlineOrderId: id,
          batchId: typeof window.getNextBatchId === "function" ? window.getNextBatchId() : 1,
          syncedAt: now
        };

        transaction.set(orderRef, normalizeOrderForWrite(order));
        transaction.set(counterRef, { next: orderNumber + 1, activeCycle: cycle, updatedAt: now }, { merge: true });
        transaction.set(onlineRef, {
          status: ONLINE_ACCEPTED,
          liveStatus: WAITING_STATUS,
          orderNumber,
          orderId: orderNumber,
          acceptedAt: now,
          acceptedBy: order.cashier
        }, { merge: true });
        return order;
      });
    } catch (error) {
      console.warn("Approve online order transaction failed", error);
      alert(`تعذر قبول الطلب. ${error.message || "حاول مرة ثانية."}`);
      return;
    }

    upsertLocalOrder(savedOrder);
    if (s) s.nextOrder = Math.max(toNumber(s.nextOrder, 1), toNumber(savedOrder.id, 0) + 1);
    saveLocalOrders();
    renderAllSafe();

    try { if (typeof window.deductInventoryForOrder === "function") window.deductInventoryForOrder(savedOrder); }
    catch (inventoryError) { console.warn("Inventory deduction after online approval failed", inventoryError); }

    try { if (typeof window.printOrder === "function") window.printOrder(savedOrder, "طلب أونلاين مقبول"); }
    catch (printError) { console.warn("Online approval print failed", printError); }
  }

  function installCustomerLiveStatusPatch() {
    const params = new URLSearchParams(location.search);
    const isCustomer = params.get("customer") === "1" || params.get("public") === "1" || params.get("menu") === "1" || location.hash === "#customer-order";
    if (!isCustomer) return;
    const id = localStorage.getItem("smokey-last-online-order");
    const db = getDb();
    if (!id || !db) return;
    db.collection("onlineOrders").doc(id).onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      const el = document.querySelector("#customerOrderStatus");
      if (!el) return;
      const status = data.liveStatus || data.status;
      if (status === ONLINE_WAITING) el.textContent = "طلبك في انتظار موافقة الكاشير.";
      else if (status === WAITING_STATUS || data.status === ONLINE_ACCEPTED) el.textContent = `تمت الموافقة على طلبك. رقم الطلب #${data.orderNumber || data.orderId || "-"} والطلب قيد التجهيز.`;
      else if (status === READY_STATUS) el.textContent = data.type === "توصيل" ? "طلبكم جاهز بانتظار الدليفري." : "طلبكم جاهز.";
      else if (status === CANCELED_STATUS) el.textContent = "تم إلغاء الطلب. الرجاء التواصل مع المطعم.";
      else if (status === ONLINE_DECLINED) el.textContent = "تم رفض الطلب. الرجاء التواصل مع المطعم.";
    }, (error) => console.warn("Customer live status patch failed", error));
  }

  function handleCapturedClick(event) {
    const target = event.target && event.target.closest ? event.target.closest("[data-ready], [data-delete-order], [data-approve-online], [data-decline-online]") : null;
    if (!target || target.disabled) return;

    if (target.dataset.ready) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      markOrderReady(target.dataset.ready);
      return;
    }

    if (target.dataset.deleteOrder) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      cancelOrder(target.dataset.deleteOrder);
      return;
    }

    if (target.dataset.approveOnline) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      approveOnlineOrder(target.dataset.approveOnline);
      return;
    }

    if (target.dataset.declineOnline) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      declineOnlineOrder(target.dataset.declineOnline);
    }
  }

  document.addEventListener("click", handleCapturedClick, true);
  setInterval(applyPendingPatches, 700);

  try { window.markReady = markOrderReady; markReady = markOrderReady; } catch (error) { window.markReady = markOrderReady; }
  try { window.deleteOrder = cancelOrder; deleteOrder = cancelOrder; } catch (error) { window.deleteOrder = cancelOrder; }
  try { window.approveOnlineOrder = approveOnlineOrder; } catch (error) {}
  try { window.declineOnlineOrder = declineOnlineOrder; } catch (error) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installCustomerLiveStatusPatch, { once: true });
  else installCustomerLiveStatusPatch();

  console.log("Smokey Firebase order action guard is active.");
})();
