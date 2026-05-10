// Single source of truth for Firebase order actions on the experiment branch.
// It prevents duplicate online approvals, keeps status changes durable, and
// keeps operational screens focused on the active order-number cycle.
(function () {
  const WAITING = "قيد التجهيز";
  const READY = "جاهز";
  const CANCELED = "ملغي";
  const ONLINE_WAITING = "في انتظار الموافقة";
  const ONLINE_ACCEPTED = "مقبول";
  const ONLINE_DECLINED = "مرفوض";
  const LEGACY_CYCLE = "legacy";
  const pendingApprovals = new Set();
  let activeCycle = "";

  function getState() {
    try { return window.state || (typeof state !== "undefined" ? state : null); }
    catch { return window.state || null; }
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function now() {
    return Date.now();
  }

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function sanitize(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(sanitize).filter((item) => item !== undefined);
    if (value && typeof value === "object") {
      if (typeof value.toDate === "function" || typeof value.toMillis === "function") return value;
      const out = {};
      Object.entries(value).forEach(([key, entry]) => {
        const clean = sanitize(entry);
        if (clean !== undefined) out[key] = clean;
      });
      return out;
    }
    return value;
  }

  function currentUserName() {
    return getState()?.currentUser?.name || "المدير";
  }

  function getActiveCycle() {
    if (activeCycle) return activeCycle;
    if (window.__smokeyActiveOrderCycle) return window.__smokeyActiveOrderCycle;
    const latest = [...(getState()?.orders || [])]
      .filter((order) => order.orderCycle && order.orderCycle !== LEGACY_CYCLE)
      .sort((a, b) => toNumber(b.createdAt) - toNumber(a.createdAt))[0];
    return latest?.orderCycle || LEGACY_CYCLE;
  }

  function docIdForOrder(order) {
    if (!order) return "";
    if (order.firebaseDocId) return String(order.firebaseDocId);
    const id = toNumber(order.orderNumber || order.id, 0);
    if (!id) return "";
    const cycle = order.orderCycle || getActiveCycle();
    return `${cycle || LEGACY_CYCLE}-${id}`;
  }

  function orderRef(order) {
    return order?.firebaseDocId || docIdForOrder(order) || String(order?.id || "");
  }

  function findOrder(ref, preferredStatus) {
    const list = Array.isArray(getState()?.orders) ? getState().orders : [];
    const value = String(ref || "");
    const numeric = Number(value);
    const byDoc = list.find((order) => String(order.firebaseDocId || "") === value || docIdForOrder(order) === value);
    if (byDoc) return byDoc;
    const matches = list
      .filter((order) => Number(order.id) === numeric || Number(order.orderNumber) === numeric)
      .sort((a, b) => toNumber(b.createdAt) - toNumber(a.createdAt));
    return (preferredStatus ? matches.find((order) => order.status === preferredStatus) : null) || matches[0] || null;
  }

  function normalizeOrder(order) {
    const time = now();
    const id = toNumber(order.orderNumber || order.id, 0);
    const cycle = order.orderCycle || getActiveCycle();
    const docId = order.firebaseDocId || docIdForOrder({ ...order, id, orderCycle: cycle });
    return sanitize({
      ...order,
      id,
      orderNumber: id,
      orderCycle: cycle,
      firebaseDocId: docId,
      batchId: toNumber(order.batchId, 1) || 1,
      total: toNumber(order.total, 0),
      createdAt: toNumber(order.createdAt, time),
      createdBy: order.createdBy || order.cashier || currentUserName(),
      updatedAt: toNumber(order.updatedAt || order.modifiedAtMs, 0) || null,
      canceledAt: toNumber(order.canceledAt || order.deletedAtMs, 0) || null,
      canceledBy: order.canceledBy || order.deletedBy || null,
      items: Array.isArray(order.items) ? order.items : [],
      syncedAt: time
    });
  }

  function upsertLocal(order) {
    const s = getState();
    if (!s || !Array.isArray(s.orders) || !order) return;
    const ref = orderRef(order);
    const index = s.orders.findIndex((item) => orderRef(item) === ref || (order.onlineOrderId && item.onlineOrderId === order.onlineOrderId));
    if (index >= 0) s.orders[index] = { ...s.orders[index], ...order };
    else s.orders.unshift(order);
  }

  function saveAndRender() {
    try { if (typeof window.saveOrders === "function") window.saveOrders(); } catch (error) { console.warn("saveOrders failed", error); }
    try { if (typeof window.renderAll === "function") window.renderAll(); } catch (error) { console.warn("renderAll failed", error); }
  }

  async function writeOrder(order, patch) {
    const db = getDb();
    if (!db) throw new Error("Firebase غير جاهز");
    const merged = normalizeOrder({ ...order, ...patch });
    upsertLocal(merged);
    saveAndRender();
    await db.collection("orders").doc(merged.firebaseDocId).set(merged, { merge: true });
    return merged;
  }

  async function syncOnline(order, patch) {
    const db = getDb();
    if (!db || !order?.onlineOrderId) return;
    const data = {
      orderNumber: order.orderNumber || order.id,
      orderId: order.orderNumber || order.id,
      orderDocId: order.firebaseDocId,
      firebaseDocId: order.firebaseDocId,
      updatedAt: now()
    };
    if (patch.status === READY) Object.assign(data, { status: READY, liveStatus: READY, readyAt: patch.readyAt || now() });
    if (patch.status === CANCELED) Object.assign(data, { status: CANCELED, liveStatus: CANCELED, canceledAt: patch.canceledAt || now(), canceledBy: currentUserName() });
    await db.collection("onlineOrders").doc(order.onlineOrderId).set(sanitize(data), { merge: true });
  }

  async function markReady(ref) {
    const order = findOrder(ref, WAITING);
    if (!order || order.status === READY || order.status === CANCELED) return;
    const time = now();
    const patch = { status: READY, readyAt: time, updatedAt: time, modifiedAtMs: time, updatedBy: currentUserName() };
    try {
      const saved = await writeOrder(order, patch);
      await syncOnline(saved, patch);
    } catch (error) {
      console.warn("Ready action failed", error);
      alert(`تعذر حفظ حالة الطلب جاهز: ${error.message || error.code || "خطأ غير معروف"}`);
    }
  }

  async function cancelOrder(ref) {
    const order = findOrder(ref);
    if (!order || order.status === CANCELED) return;
    if (!confirm(`تأكيد إلغاء الطلب #${order.id}؟`)) return;
    const time = now();
    const patch = {
      status: CANCELED,
      canceledAt: time,
      canceledBy: currentUserName(),
      deletedAtMs: time,
      deletedAt: new Date(time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      deletedBy: currentUserName(),
      cancelAlert: true,
      inventoryReturned: true,
      updatedAt: time,
      modifiedAtMs: time
    };
    try {
      if (!order.inventoryReturned && typeof window.returnInventoryForOrder === "function") window.returnInventoryForOrder(order);
      const saved = await writeOrder(order, patch);
      await syncOnline(saved, patch);
      if (typeof window.printOrder === "function") window.printOrder(saved, "إلغاء طلب");
    } catch (error) {
      console.warn("Cancel action failed", error);
      alert(`تعذر حفظ إلغاء الطلب: ${error.message || error.code || "خطأ غير معروف"}`);
    }
  }

  async function approveOnline(id) {
    const db = getDb();
    const s = getState();
    if (!db || !id || pendingApprovals.has(id)) return;
    pendingApprovals.add(id);
    const onlineRef = db.collection("onlineOrders").doc(id);
    let savedOrder = null;
    try {
      savedOrder = await db.runTransaction(async (tx) => {
        const onlineSnap = await tx.get(onlineRef);
        if (!onlineSnap.exists) throw new Error("ONLINE_ORDER_MISSING");
        const online = onlineSnap.data() || {};

        if (online.orderDocId || online.firebaseDocId) {
          const existingId = String(online.orderDocId || online.firebaseDocId);
          const existingSnap = await tx.get(db.collection("orders").doc(existingId));
          if (existingSnap.exists) return { idempotent: true, ...(existingSnap.data() || {}), firebaseDocId: existingId };
        }

        if (online.status !== ONLINE_WAITING) {
          return { idempotent: true, alreadyHandled: true, orderNumber: online.orderNumber || online.orderId || null };
        }

        const counterRef = db.collection("counters").doc("orders");
        const counterSnap = await tx.get(counterRef);
        const counter = counterSnap.exists ? counterSnap.data() || {} : {};
        const cycle = counter.activeCycle || counter.cycle || getActiveCycle();
        let orderNumber = Math.max(toNumber(counter.next, toNumber(s?.nextOrder, 1)), 1);
        let orderRefDoc = db.collection("orders").doc(`${cycle}-${orderNumber}`);
        let orderSnap = await tx.get(orderRefDoc);
        let guard = 0;
        while (orderSnap.exists && guard < 100) {
          orderNumber += 1;
          orderRefDoc = db.collection("orders").doc(`${cycle}-${orderNumber}`);
          orderSnap = await tx.get(orderRefDoc);
          guard += 1;
        }
        if (orderSnap.exists) throw new Error("ORDER_NUMBER_RANGE_BUSY");

        const time = now();
        const order = normalizeOrder({
          id: orderNumber,
          orderNumber,
          orderCycle: cycle,
          firebaseDocId: `${cycle}-${orderNumber}`,
          type: online.type || "استلام",
          status: WAITING,
          total: toNumber(online.total, 0),
          cashier: currentUserName(),
          createdBy: currentUserName(),
          time: new Date(time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: time,
          payment: "نقدي",
          customer: online.customer || null,
          note: online.note || "",
          items: Array.isArray(online.items) ? online.items : [],
          source: "online",
          onlineOrderId: id,
          batchId: typeof window.getNextBatchId === "function" ? window.getNextBatchId() : 1
        });

        tx.set(orderRefDoc, order);
        tx.set(counterRef, { next: orderNumber + 1, activeCycle: cycle, updatedAt: time }, { merge: true });
        tx.set(onlineRef, sanitize({
          status: ONLINE_ACCEPTED,
          liveStatus: WAITING,
          orderNumber,
          orderId: orderNumber,
          orderDocId: order.firebaseDocId,
          firebaseDocId: order.firebaseDocId,
          acceptedAt: time,
          acceptedBy: order.cashier
        }), { merge: true });
        return order;
      });
    } catch (error) {
      console.warn("Approve online order failed", error);
      alert(`تعذر قبول الطلب: ${error.message || error.code || "حاول مرة ثانية"}`);
      return;
    } finally {
      pendingApprovals.delete(id);
    }

    if (!savedOrder || savedOrder.idempotent || savedOrder.alreadyHandled) {
      saveAndRender();
      return;
    }
    upsertLocal(savedOrder);
    if (s) s.nextOrder = Math.max(toNumber(s.nextOrder, 1), toNumber(savedOrder.id, 0) + 1);
    saveAndRender();
    try { if (typeof window.deductInventoryForOrder === "function") window.deductInventoryForOrder(savedOrder); } catch (error) { console.warn("Inventory deduction failed", error); }
    try { if (typeof window.printOrder === "function") window.printOrder(savedOrder, "طلب أونلاين مقبول"); } catch (error) { console.warn("Approval print failed", error); }
  }

  async function declineOnline(id) {
    const db = getDb();
    if (!db || !id) return;
    try {
      await db.collection("onlineOrders").doc(id).set(sanitize({
        status: ONLINE_DECLINED,
        liveStatus: ONLINE_DECLINED,
        declinedAt: now(),
        declinedBy: currentUserName()
      }), { merge: true });
    } catch (error) {
      console.warn("Decline online order failed", error);
      alert(`تعذر رفض الطلب: ${error.message || error.code || "خطأ غير معروف"}`);
    }
  }

  function operationalOrders() {
    const cycle = getActiveCycle();
    const map = new Map();
    (getState()?.orders || []).forEach((order) => {
      const orderCycle = order.orderCycle || (String(order.firebaseDocId || "").includes("-") ? String(order.firebaseDocId).split("-").slice(0, -1).join("-") : LEGACY_CYCLE);
      const inCycle = cycle === LEGACY_CYCLE ? (!order.orderCycle || orderCycle === LEGACY_CYCLE) : orderCycle === cycle;
      if (!inCycle) return;
      const key = `number:${order.id}`;
      const previous = map.get(key);
      if (!previous || toNumber(order.createdAt) >= toNumber(previous.createdAt)) map.set(key, order);
    });
    return [...map.values()];
  }

  function itemNotes(item) {
    try { return typeof window.renderItemNotes === "function" ? window.renderItemNotes(item) : ""; }
    catch { return ""; }
  }

  function renderKitchenStable() {
    try { if (typeof window.ensureKitchenBatches === "function") window.ensureKitchenBatches(); } catch {}
    try { if (typeof window.renderKitchenAlerts === "function") window.renderKitchenAlerts(); } catch {}
    const root = document.querySelector("#kitchenOrders");
    const prep = document.querySelector("#prepTotals");
    if (!root) return;
    const making = operationalOrders()
      .filter((order) => order.status === WAITING)
      .sort((a, b) => toNumber(a.createdAt) - toNumber(b.createdAt) || toNumber(a.id) - toNumber(b.id));
    root.innerHTML = making.map((order) => `
      <article class="kitchen-card">
        <h3>#${order.id}</h3>
        <span class="status-pill wait">${order.type || "-"}</span>
        ${order.customer ? `<p class="customer-kitchen-info">${order.customer.name || "-"} - ${order.customer.phone || "-"}</p>` : ""}
        <p>${order.time || ""}</p>
        <ul>${(order.items || []).map((item) => `<li><span>${item.name}${itemNotes(item)}</span><b>${item.qty}x</b></li>`).join("")}</ul>
        <button class="primary-small" type="button" data-ready="${orderRef(order) || order.id}">الطلب جاهز</button>
      </article>
    `).join("");
    root.querySelectorAll("[data-ready]").forEach((button) => button.addEventListener("click", () => markReady(button.dataset.ready)));
    if (prep) {
      try { prep.innerHTML = typeof window.renderPrepGroups === "function" ? window.renderPrepGroups(making) : ""; }
      catch { prep.innerHTML = ""; }
    }
  }

  function renderCustomerDisplayStable() {
    const readyRoot = document.querySelector("#readyOrders");
    const makingRoot = document.querySelector("#makingOrders");
    if (!readyRoot || !makingRoot) return;
    const orders = operationalOrders();
    const making = orders.filter((order) => order.status === WAITING).sort((a, b) => toNumber(a.createdAt) - toNumber(b.createdAt)).slice(0, 20);
    const ready = orders.filter((order) => order.status === READY).sort((a, b) => toNumber(a.readyAt || a.updatedAt || a.createdAt) - toNumber(b.readyAt || b.updatedAt || b.createdAt)).slice(-40);
    readyRoot.innerHTML = ready.map((order) => `<div class="order-number">${order.id}</div>`).join("");
    makingRoot.innerHTML = making.map((order) => `<div class="order-number">${order.id}</div>`).join("");
    try { if (typeof window.renderDashboard === "function") window.renderDashboard(); } catch {}
  }

  function patchRenderers() {
    try { window.renderKitchen = renderKitchenStable; renderKitchen = renderKitchenStable; } catch { window.renderKitchen = renderKitchenStable; }
    try { window.renderCustomerDisplay = renderCustomerDisplayStable; renderCustomerDisplay = renderCustomerDisplayStable; } catch { window.renderCustomerDisplay = renderCustomerDisplayStable; }
  }

  function startCycleListener() {
    const db = getDb();
    if (!db || window.__smokeyStableCycleListener) return;
    window.__smokeyStableCycleListener = true;
    db.collection("counters").doc("orders").onSnapshot((doc) => {
      const data = doc.exists ? doc.data() || {} : {};
      activeCycle = data.activeCycle || data.cycle || activeCycle || LEGACY_CYCLE;
      window.__smokeyActiveOrderCycle = activeCycle;
      saveAndRender();
    }, (error) => console.warn("Active cycle listener failed", error));
  }

  function captureActions(event) {
    const target = event.target && event.target.closest
      ? event.target.closest("[data-ready], [data-delete-order], [data-approve-online], [data-decline-online]")
      : null;
    if (!target || target.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (target.dataset.ready) return markReady(target.dataset.ready);
    if (target.dataset.deleteOrder) return cancelOrder(target.dataset.deleteOrder);
    if (target.dataset.approveOnline) {
      target.disabled = true;
      return approveOnline(target.dataset.approveOnline).finally(() => { target.disabled = false; });
    }
    if (target.dataset.declineOnline) return declineOnline(target.dataset.declineOnline);
  }

  document.addEventListener("click", captureActions, true);
  patchRenderers();
  setTimeout(patchRenderers, 600);
  setTimeout(startCycleListener, 800);

  try { window.markReady = markReady; markReady = markReady; } catch { window.markReady = markReady; }
  try { window.deleteOrder = cancelOrder; deleteOrder = cancelOrder; } catch { window.deleteOrder = cancelOrder; }
  window.approveOnlineOrder = approveOnline;
  window.declineOnlineOrder = declineOnline;

  console.log("Smokey stable Firebase order actions loaded.");
})();
