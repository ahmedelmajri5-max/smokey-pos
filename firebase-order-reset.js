// Admin-only order cycle control for the Firebase test branch.
// Resets the visible order number to #1 without deleting historical orders.
(function () {
  const RESET_BUTTON_ID = "resetOrderNumbers";
  const ORDERS_STORAGE_KEY = "smokey-pos-orders-v3";
  const LEGACY_CYCLE = "legacy";

  let activeCycle = LEGACY_CYCLE;
  let counterNext = 1;
  let confirmingOrder = false;
  const docIdByOrderKey = new Map();

  function getState() {
    try {
      if (typeof state !== "undefined") return state;
      return window.state || null;
    } catch (error) {
      return window.state || null;
    }
  }

  function getDb() {
    if (!window.firebase || !window.firebase.firestore) return null;
    return window.firebase.firestore();
  }

  function orderKey(cycle, id) {
    return `${cycle || LEGACY_CYCLE}:${Number(id) || 0}`;
  }

  function isAdmin() {
    const appState = getState();
    return appState && appState.currentUser && appState.currentUser.role === "Admin";
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

  function normalizeOrderDoc(doc) {
    const data = doc.data() || {};
    const cycle = data.orderCycle || data.resetCycle || LEGACY_CYCLE;
    const id = Number(data.id || data.orderNumber || doc.id);
    const order = {
      ...data,
      id,
      orderNumber: id,
      orderCycle: cycle,
      firebaseDocId: doc.id,
      batchId: Number(data.batchId) || 1,
      total: Number(data.total) || 0,
      createdAt: toMillis(data.createdAt) || Number(data.createdAt) || Date.now(),
      modifiedAtMs: toMillis(data.updatedAt || data.modifiedAtMs) || Number(data.modifiedAtMs || 0) || undefined,
      deletedAtMs: toMillis(data.canceledAt || data.deletedAtMs) || Number(data.deletedAtMs || 0) || undefined,
      cashier: data.cashier || data.createdBy || "المدير",
      items: Array.isArray(data.items) ? data.items : []
    };
    docIdByOrderKey.set(orderKey(cycle, id), doc.id);
    return order;
  }

  function isActiveOrder(order) {
    if (!order || order.archived) return false;
    const cycle = order.orderCycle || LEGACY_CYCLE;
    return cycle === activeCycle;
  }

  function getActiveOrders() {
    const appState = getState();
    if (!appState || !Array.isArray(appState.orders)) return [];
    return appState.orders.filter(isActiveOrder).map((order) => {
      if (!order.firebaseDocId) {
        order.firebaseDocId = docIdByOrderKey.get(orderKey(order.orderCycle || LEGACY_CYCLE, order.id)) || order.firebaseDocId;
      }
      return order;
    });
  }

  function setCurrentOrderLabel(value) {
    const appState = getState();
    const next = Number(value) || 1;
    if (appState) appState.nextOrder = next;
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${next}`;
  }

  function refreshNextLabel() {
    const activeOrders = getActiveOrders();
    const maxActive = activeOrders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
    setCurrentOrderLabel(Math.max(Number(counterNext) || 1, maxActive + 1, 1));
  }

  function saveActiveOrdersLocal() {
    const appState = getState();
    if (!appState) return;
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify({ orders: getActiveOrders(), nextOrder: appState.nextOrder || 1 }));
    } catch (error) {}
  }

  function patchRenderAllFilter() {
    if (window.__smokeyOrderCycleRenderPatched) return;
    window.__smokeyOrderCycleRenderPatched = true;
    const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
    if (!originalRenderAll) return;
    renderAll = function renderAllWithActiveOrderCycle() {
      const appState = getState();
      if (appState && Array.isArray(appState.orders)) {
        appState.orders = getActiveOrders();
      }
      refreshNextLabel();
      return originalRenderAll();
    };
  }

  function buildOrderPayload() {
    const appState = getState();
    const total = appState.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return {
      type: appState.orderType,
      status: "قيد التجهيز",
      total,
      cashier: appState.currentUser?.name || "المدير",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      createdAt: Date.now(),
      payment: typeof normalizePayment === "function" ? normalizePayment(appState.payment) : appState.payment,
      customer: typeof requiresCustomerInfo === "function" && requiresCustomerInfo(appState.orderType) ? { ...appState.customerInfo } : null,
      note: document.querySelector("#orderNote")?.value.trim() || "",
      items: appState.cart.map(({ name, qty, price, notes, modifiers }) => ({
        name,
        qty,
        price: Number(price) || 0,
        notes: notes || [],
        modifiers: modifiers || []
      }))
    };
  }

  function normalizeOrderForFirestore(order) {
    const createdAt = Number(order.createdAt) || Number(order.createdAtMs) || Date.now();
    return {
      ...order,
      id: Number(order.id),
      orderNumber: Number(order.id),
      orderCycle: order.orderCycle || activeCycle || LEGACY_CYCLE,
      firebaseDocId: order.firebaseDocId || null,
      archived: false,
      batchId: Number(order.batchId) || 1,
      total: Number(order.total) || 0,
      createdAt,
      createdBy: order.createdBy || order.cashier || "المدير",
      updatedAt: Number(order.modifiedAtMs || order.updatedAt || 0) || null,
      updatedBy: order.modifiedBy || order.updatedBy || null,
      canceledAt: Number(order.deletedAtMs || order.canceledAt || 0) || null,
      canceledBy: order.deletedBy || order.canceledBy || null,
      items: Array.isArray(order.items) ? order.items : [],
      syncedAt: Date.now()
    };
  }

  async function upsertOrderByDocId(order) {
    const db = getDb();
    if (!db || !order) return;
    const cycle = order.orderCycle || activeCycle || LEGACY_CYCLE;
    const docId = order.firebaseDocId || docIdByOrderKey.get(orderKey(cycle, order.id)) || `${cycle}-${Number(order.id)}`;
    order.firebaseDocId = docId;
    order.orderCycle = cycle;
    await db.collection("orders").doc(docId).set(normalizeOrderForFirestore(order), { merge: true });
  }

  async function createOrderAtomically(orderPayload) {
    const appState = getState();
    const db = getDb();
    return db.runTransaction(async (transaction) => {
      const counterRef = db.collection("counters").doc("orders");
      const counterSnap = await transaction.get(counterRef);
      const counter = counterSnap.exists ? counterSnap.data() || {} : {};
      const cycle = counter.activeCycle || counter.cycle || activeCycle || LEGACY_CYCLE;
      const maxActive = getActiveOrders().reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
      let reservedNumber = Math.max(Number(counter.next || 1), Number(appState.nextOrder || 1), maxActive + 1, 1);
      let docId = `${cycle}-${reservedNumber}`;
      let orderRef = db.collection("orders").doc(docId);
      let orderSnap = await transaction.get(orderRef);
      let guard = 0;
      while (orderSnap.exists && guard < 50) {
        reservedNumber += 1;
        docId = `${cycle}-${reservedNumber}`;
        orderRef = db.collection("orders").doc(docId);
        orderSnap = await transaction.get(orderRef);
        guard += 1;
      }
      if (orderSnap.exists) throw new Error("ORDER_NUMBER_RANGE_BUSY");

      const savedOrder = {
        id: reservedNumber,
        orderNumber: reservedNumber,
        orderCycle: cycle,
        firebaseDocId: docId,
        batchId: typeof getNextBatchId === "function" ? getNextBatchId() : 1,
        ...orderPayload
      };

      transaction.set(orderRef, normalizeOrderForFirestore(savedOrder));
      transaction.set(counterRef, { next: reservedNumber + 1, activeCycle: cycle, updatedAt: Date.now() }, { merge: true });
      return savedOrder;
    });
  }

  async function confirmOrderWithCycles() {
    const appState = getState();
    if (confirmingOrder || !appState || !appState.cart.length) return;

    if (typeof requiresCustomerInfo === "function" && requiresCustomerInfo(appState.orderType) && (!appState.customerInfo.name || !appState.customerInfo.phone)) {
      if (typeof openCustomerInfoModal === "function") openCustomerInfoModal();
      return;
    }

    const orderPayload = buildOrderPayload();
    const editingOrder = appState.editingOrderId ? appState.orders.find((order) => Number(order.id) === Number(appState.editingOrderId)) : null;
    let returnedForEdit = false;
    if (editingOrder && editingOrder.status !== "ملغي" && !editingOrder.inventoryReturned && typeof applyInventoryMovement === "function") {
      applyInventoryMovement(editingOrder.items, "return", editingOrder.id, 1, "إرجاع مؤقت قبل تعديل الطلب");
      editingOrder.inventoryReturned = true;
      returnedForEdit = true;
    }

    const insufficient = typeof getInsufficientStock === "function" ? getInsufficientStock(orderPayload.items) : [];
    if (insufficient.length && !appState.inventorySettings.allowNegativeStock) {
      if (returnedForEdit && typeof applyInventoryMovement === "function") {
        applyInventoryMovement(editingOrder.items, "sale", editingOrder.id, -1, "إعادة خصم بعد إلغاء التعديل");
        editingOrder.inventoryReturned = false;
      }
      if (typeof showStockWarning === "function") showStockWarning(insufficient);
      return;
    }

    confirmingOrder = true;
    const confirmButton = document.querySelector("#confirmOrder");
    if (confirmButton) confirmButton.disabled = true;

    try {
      let savedOrder;
      if (appState.editingOrderId) {
        savedOrder = editingOrder;
        if (!savedOrder) return;
        const previousStatus = savedOrder.status;
        const editIsLate = Date.now() - (Number(savedOrder.createdAt) || Date.now()) > 60000;
        Object.assign(savedOrder, orderPayload, {
          status: previousStatus === "ملغي" ? "ملغي" : previousStatus,
          createdAt: savedOrder.createdAt || orderPayload.createdAt,
          modifiedBy: appState.currentUser?.name || "المدير",
          modifiedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          modifiedAtMs: Date.now(),
          modifiedAlert: editIsLate,
          inventoryReturned: false
        });
        appState.editingOrderId = null;
        if (savedOrder.status !== "ملغي" && typeof deductInventoryForOrder === "function") deductInventoryForOrder(savedOrder);
        if (typeof printOrder === "function") printOrder(savedOrder, "تعديل طلب");
        await upsertOrderByDocId(savedOrder);
      } else {
        savedOrder = await createOrderAtomically(orderPayload);
        appState.orders.unshift(savedOrder);
        counterNext = Number(savedOrder.id) + 1;
        if (typeof deductInventoryForOrder === "function") deductInventoryForOrder(savedOrder);
        if (typeof printOrder === "function") printOrder(savedOrder, "فاتورة طلب");
      }

      appState.cart = [];
      appState.customerInfo = { name: "", phone: "" };
      appState.editingOrderId = null;
      if (confirmButton) confirmButton.textContent = "تأكيد الطلب وطباعة";
      const orderNote = document.querySelector("#orderNote");
      if (orderNote) orderNote.value = "";
      refreshNextLabel();
      saveActiveOrdersLocal();
      if (typeof renderAll === "function") renderAll();
    } catch (error) {
      console.warn("Order cycle confirmation failed:", error);
      alert("تعذر حفظ الطلب في Firebase. لم يتم إنشاء رقم طلب مكرر.");
    } finally {
      confirmingOrder = false;
      if (confirmButton) confirmButton.disabled = false;
    }
  }

  function patchConfirmButton() {
    if (window.__smokeyOrderCycleConfirmPatched) return;
    window.__smokeyOrderCycleConfirmPatched = true;
    try { confirmOrder = confirmOrderWithCycles; } catch (error) {}
    window.addEventListener("click", (event) => {
      const button = event.target && event.target.closest ? event.target.closest("#confirmOrder") : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      confirmOrderWithCycles();
    }, true);
  }

  function patchOrderStatusActions() {
    if (window.__smokeyOrderCycleActionsPatched) return;
    window.__smokeyOrderCycleActionsPatched = true;

    if (typeof deleteOrder === "function") {
      deleteOrder = function deleteOrderWithDocCycle(id) {
        const appState = getState();
        const order = appState.orders.find((item) => Number(item.id) === Number(id));
        if (!order || (typeof canManageOrder === "function" && !canManageOrder(order)) || order.status === "ملغي") return;
        const ok = confirm(`تأكيد إلغاء الطلب #${order.id}؟`);
        if (!ok) return;
        order.status = "ملغي";
        order.deletedBy = appState.currentUser?.name || "المدير";
        order.deletedAt = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        order.deletedAtMs = Date.now();
        order.cancelAlert = true;
        if (typeof returnInventoryForOrder === "function") returnInventoryForOrder(order);
        if (typeof printOrder === "function") printOrder(order, "إلغاء طلب");
        upsertOrderByDocId(order).catch((error) => console.warn("Cancel sync failed:", error));
        saveActiveOrdersLocal();
        if (typeof renderAll === "function") renderAll();
      };
    }

    if (typeof markReady === "function") {
      markReady = function markReadyWithDocCycle(id) {
        const appState = getState();
        const order = appState.orders.find((item) => Number(item.id) === Number(id));
        if (!order) return;
        order.status = "جاهز";
        order.readyAt = Date.now();
        upsertOrderByDocId(order).catch((error) => console.warn("Ready sync failed:", error));
        saveActiveOrdersLocal();
        if (typeof renderAll === "function") renderAll();
      };
    }
  }

  async function archiveOrdersInBatches(db, resetBy, newCycle) {
    const snapshot = await db.collection("orders").get();
    let archived = 0;
    let batch = db.batch();
    let batchSize = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      if (data.archived) continue;
      batch.update(doc.ref, {
        archived: true,
        archivedAt: Date.now(),
        archivedBy: resetBy,
        archivedBeforeCycle: newCycle
      });
      archived += 1;
      batchSize += 1;
      if (batchSize >= 400) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }
    if (batchSize) await batch.commit();
    return archived;
  }

  async function resetOrderNumbers(button) {
    const appState = getState();
    const db = getDb();
    if (!appState || !db) {
      alert("Firebase غير جاهز. افتح الصفحة من جديد وحاول مرة ثانية.");
      return;
    }
    if (!isAdmin()) {
      alert("تصفير أرقام الطلبات متاح للمدير فقط.");
      return;
    }

    const firstConfirm = confirm(
      "هل أنت متأكد من تصفير أرقام المنظومة؟\n\n" +
      "سيتم أرشفة الطلبات الحالية وإخفاؤها من شاشة الطلبات والداش بورد، لكن لن يتم حذفها من Firebase.\n" +
      "الطلب القادم سيبدأ من #1، والأصناف والمخزون والمستخدمون لن يتغيروا."
    );
    if (!firstConfirm) return;

    const finalConfirm = confirm("تأكيد أخير: الطلبات القديمة ستبقى محفوظة كأرشيف، والرقم القادم سيكون #1.");
    if (!finalConfirm) return;

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "جاري التصفير...";

    try {
      const resetBy = appState.currentUser.email || appState.currentUser.name || "Admin";
      const newCycle = `cycle-${Date.now()}`;
      const archivedCount = await archiveOrdersInBatches(db, resetBy, newCycle);
      await db.collection("counters").doc("orders").set({
        next: 1,
        activeCycle: newCycle,
        resetAt: Date.now(),
        resetBy,
        archivedOrders: archivedCount
      }, { merge: true });

      activeCycle = newCycle;
      counterNext = 1;
      appState.orders = [];
      appState.nextOrder = 1;
      saveActiveOrdersLocal();
      setCurrentOrderLabel(1);
      if (typeof renderAll === "function") renderAll();
      alert("تم تصفير أرقام الطلبات بدون حذف الطلبات القديمة. الطلب القادم سيكون #1.");
    } catch (error) {
      console.warn("Order number reset failed:", error);
      alert("تعذر تصفير أرقام الطلبات. تأكد من الاتصال وحاول مرة ثانية.");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function installResetButton() {
    const strip = document.querySelector(".order-strip");
    if (!strip || document.querySelector(`#${RESET_BUTTON_ID}`)) return;

    const button = document.createElement("button");
    button.id = RESET_BUTTON_ID;
    button.type = "button";
    button.className = "danger-small reset-order-numbers-btn";
    button.textContent = "تصفير أرقام الطلبات";
    button.style.marginInlineStart = "8px";
    button.hidden = !isAdmin();
    button.addEventListener("click", () => resetOrderNumbers(button));
    strip.appendChild(button);
  }

  function refreshResetButtonVisibility() {
    const button = document.querySelector(`#${RESET_BUTTON_ID}`);
    if (button) button.hidden = !isAdmin();
  }

  function startCounterListener() {
    const db = getDb();
    if (!db || window.__smokeyOrderCycleCounterListener) return;
    window.__smokeyOrderCycleCounterListener = true;
    db.collection("counters").doc("orders").onSnapshot((doc) => {
      const data = doc.exists ? doc.data() || {} : {};
      activeCycle = data.activeCycle || data.cycle || activeCycle || LEGACY_CYCLE;
      counterNext = Number(data.next || counterNext || 1);
      const appState = getState();
      if (appState && Array.isArray(appState.orders)) appState.orders = getActiveOrders();
      refreshNextLabel();
      if (typeof renderAll === "function") renderAll();
    });
  }

  function startActiveOrdersListener() {
    const db = getDb();
    if (!db || window.__smokeyOrderCycleOrdersListener) return;
    window.__smokeyOrderCycleOrdersListener = true;
    db.collection("orders").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const appState = getState();
      if (!appState) return;
      const activeOrders = snapshot.docs.map(normalizeOrderDoc).filter(isActiveOrder);
      appState.orders = activeOrders;
      refreshNextLabel();
      saveActiveOrdersLocal();
      if (typeof renderAll === "function") renderAll();
    }, (error) => console.warn("Active order cycle listener failed:", error));
  }

  function boot() {
    patchRenderAllFilter();
    patchConfirmButton();
    patchOrderStatusActions();
    installResetButton();
    refreshResetButtonVisibility();
    startCounterListener();
    startActiveOrdersListener();
    const observer = new MutationObserver(() => {
      installResetButton();
      refreshResetButtonVisibility();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
