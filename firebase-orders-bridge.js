// Firebase realtime bridge for experimental branch only.
// This keeps app.js intact and syncs orders with Cloud Firestore.
(function () {
  const firebaseConfig = {
    apiKey: String.fromCharCode(65,73,122,97,83,121,65,56,68,118,104,45,108,52,85,51,115,56,76,100,75,108,110,104,87,121,72,57,99,57,49,79,122,105,71,78,95,70,69),
    authDomain: "restaurant-test-269e3.firebaseapp.com",
    projectId: "restaurant-test-269e3",
    storageBucket: "restaurant-test-269e3.firebasestorage.app",
    messagingSenderId: "301369717216",
    appId: "1:301369717216:web:b378ea41a4d94718ddfb85"
  };

  if (!window.firebase || !window.firebase.firestore) {
    console.warn("Firebase scripts are not loaded. Smokey POS will continue using localStorage.");
    return;
  }

  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
  const db = app.firestore();
  const ordersRef = db.collection("orders");
  const counterRef = db.collection("counters").doc("orders");

  let applyingRemoteSnapshot = false;
  let syncStarted = false;
  const originalSaveOrders = saveOrders;
  const originalConfirmOrder = confirmOrder;

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

  function formatTimeValue(value) {
    const millis = toMillis(value);
    if (!millis) return "-";
    return new Date(millis).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
  }

  function formatOrderTimes(order) {
    const rows = [`إنشاء: ${formatTimeValue(order.createdAt || order.createdAtMs || order.created_at)}`];
    if (order.modifiedAtMs || order.updatedAt || order.modifiedAt) rows.push(`تعديل: ${formatTimeValue(order.modifiedAtMs || order.updatedAt || order.modifiedAt)}`);
    if (order.deletedAtMs || order.canceledAt || order.deletedAt) rows.push(`إلغاء: ${formatTimeValue(order.deletedAtMs || order.canceledAt || order.deletedAt)}`);
    return rows.map((row, index) => index ? `<small>${row}</small>` : `<div>${row}</div>`).join("");
  }

  function normalizeOrderForFirestore(order) {
    return {
      ...order,
      id: Number(order.id),
      total: Number(order.total) || 0,
      createdAt: Number(order.createdAt) || Date.now(),
      createdBy: order.createdBy || order.cashier || "المدير",
      updatedAt: Number(order.modifiedAtMs || order.updatedAt || 0) || null,
      updatedBy: order.modifiedBy || order.updatedBy || null,
      canceledAt: Number(order.deletedAtMs || order.canceledAt || 0) || null,
      canceledBy: order.deletedBy || order.canceledBy || null,
      syncedAt: Date.now()
    };
  }

  function normalizeOrderFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      ...data,
      id: Number(data.id || doc.id),
      createdAt: toMillis(data.createdAt) || Number(data.createdAt) || Date.now(),
      modifiedAtMs: toMillis(data.updatedAt || data.modifiedAtMs) || Number(data.modifiedAtMs || 0) || undefined,
      deletedAtMs: toMillis(data.canceledAt || data.deletedAtMs) || Number(data.deletedAtMs || 0) || undefined,
      cashier: data.cashier || data.createdBy || "المدير",
      items: Array.isArray(data.items) ? data.items : []
    };
  }

  async function reserveOrderNumber() {
    return db.runTransaction(async (transaction) => {
      const snap = await transaction.get(counterRef);
      const currentNext = snap.exists ? Number(snap.data().next || 1) : Number(state.nextOrder || 1);
      const safeNext = Math.max(currentNext, Number(state.nextOrder || 1));
      transaction.set(counterRef, { next: safeNext + 1, updatedAt: Date.now() }, { merge: true });
      return safeNext;
    });
  }

  async function pushOrdersToFirestore() {
    if (applyingRemoteSnapshot) return;
    const batch = db.batch();
    let maxId = 0;
    state.orders.forEach((order) => {
      if (!order || !order.id) return;
      maxId = Math.max(maxId, Number(order.id) || 0);
      batch.set(ordersRef.doc(String(order.id)), normalizeOrderForFirestore(order), { merge: true });
    });
    if (maxId) batch.set(counterRef, { next: Math.max(Number(state.nextOrder || 1), maxId + 1), updatedAt: Date.now() }, { merge: true });
    await batch.commit();
  }

  saveOrders = function saveOrdersFirebaseBridge() {
    originalSaveOrders();
    if (!applyingRemoteSnapshot) {
      pushOrdersToFirestore().catch((error) => console.warn("Firebase orders sync failed:", error));
    }
  };

  confirmOrder = async function confirmOrderFirebaseBridge() {
    if (!state.editingOrderId) {
      try {
        const reservedId = await reserveOrderNumber();
        state.nextOrder = reservedId;
        const currentOrder = document.querySelector("#currentOrder");
        if (currentOrder) currentOrder.textContent = `#${state.nextOrder}`;
      } catch (error) {
        console.warn("Could not reserve Firebase order number. Falling back to local counter.", error);
      }
    }
    originalConfirmOrder();
  };

  renderOrdersTable = function renderOrdersTableFirebaseBridge() {
    const query = state.orderSearch.trim().replace("#", "");
    const dateRange = getOrdersDateRange();
    const visibleOrders = state.orders.filter((order) => {
      const matchesSearch = !query || String(order.id).includes(query) || (order.type || "").includes(query) || (order.cashier || "").includes(query);
      const matchesStatus = state.orderStatusFilter === "الكل" || order.status === state.orderStatusFilter;
      const matchesDate = isInRange(order.createdAt, dateRange);
      return matchesSearch && matchesStatus && matchesDate;
    });

    const table = document.querySelector("#ordersTable");
    if (!table) return;

    table.innerHTML = visibleOrders.map((order) => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.type || "-"}</td>
        <td>${formatMoney(Number(order.total) || 0)}</td>
        <td><span class="status-pill ${order.status === "جاهز" ? "on" : order.status === "ملغي" ? "cancel" : "wait"}">${order.status || "قيد التجهيز"}</span></td>
        <td class="order-times-cell">${formatOrderTimes(order)}</td>
        <td>${order.cashier || order.createdBy || "-"}</td>
        <td>
          <div class="table-actions">
            <button class="ghost-small" type="button" data-print-order="${order.id}">طباعة</button>
            <button class="ghost-small" type="button" data-edit-order="${order.id}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>تعديل</button>
            <button class="danger-small" type="button" data-delete-order="${order.id}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>إلغاء</button>
          </div>
        </td>
      </tr>
    `).join("");

    if (!visibleOrders.length) {
      table.innerHTML = `<tr><td colspan="7">لا توجد طلبات مطابقة.</td></tr>`;
    }

    document.querySelectorAll("[data-print-order]").forEach((button) => {
      button.addEventListener("click", () => printOrderById(button.dataset.printOrder, "فاتورة طلب"));
    });
    document.querySelectorAll("[data-edit-order]").forEach((button) => {
      button.addEventListener("click", () => editOrder(button.dataset.editOrder));
    });
    document.querySelectorAll("[data-delete-order]").forEach((button) => {
      button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder));
    });
  };

  function startOrdersRealtimeSync() {
    if (syncStarted) return;
    syncStarted = true;

    ordersRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.orders = snapshot.docs.map(normalizeOrderFromFirestore);
      const maxId = state.orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
      state.nextOrder = Math.max(Number(state.nextOrder || 1), maxId + 1);
      originalSaveOrders();
      renderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase realtime listener failed. Using localStorage fallback.", error);
    });

    if (state.orders.length) {
      pushOrdersToFirestore().catch((error) => console.warn("Initial Firebase push failed:", error));
    }
  }

  window.addEventListener("load", () => {
    startOrdersRealtimeSync();
    console.log("Smokey POS Firebase orders realtime bridge is active without API key prompt.");
  });
})();
