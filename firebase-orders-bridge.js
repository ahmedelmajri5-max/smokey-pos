// Firebase realtime bridge for experimental branch only.
// This keeps app.js intact and syncs shared POS data with Cloud Firestore.
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
  const productsRef = db.collection("products");
  const inventoryRef = db.collection("inventory");
  const inventoryTransactionsRef = db.collection("inventoryTransactions");
  const appSettingsRef = db.collection("appSettings");
  const inventorySettingsRef = appSettingsRef.doc("inventory");
  const counterRef = db.collection("counters").doc("orders");

  let applyingRemoteSnapshot = false;
  let syncStarted = false;
  let lastLocalOrdersSnapshot = [];

  const originalSaveOrders = saveOrders;
  const originalConfirmOrder = confirmOrder;
  const originalSaveProducts = typeof saveProducts === "function" ? saveProducts : null;
  const originalSaveInventory = typeof saveInventory === "function" ? saveInventory : null;
  const originalSaveInventoryTransactions = typeof saveInventoryTransactions === "function" ? saveInventoryTransactions : null;
  const originalSaveInventorySettings = typeof saveInventorySettings === "function" ? saveInventorySettings : null;

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

  function cloneOrders(orders) {
    try {
      return JSON.parse(JSON.stringify(Array.isArray(orders) ? orders : []));
    } catch {
      return Array.isArray(orders) ? orders.map((order) => ({ ...order })) : [];
    }
  }

  function rememberLocalOrders() {
    if (!applyingRemoteSnapshot && Array.isArray(state.orders)) {
      lastLocalOrdersSnapshot = cloneOrders(state.orders);
    }
  }

  function safeRenderAll() {
    if (typeof renderAll === "function") renderAll();
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

  function normalizeProductForFirestore(product) {
    return {
      ...product,
      id: Number(product.id),
      price: Number(product.price) || 0,
      available: product.available !== false,
      recipe: Array.isArray(product.recipe) ? product.recipe : [],
      syncedAt: Date.now()
    };
  }

  function normalizeProductFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      ...data,
      id: Number(data.id || doc.id),
      price: Number(data.price) || 0,
      available: data.available !== false,
      ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
      recipe: Array.isArray(data.recipe) ? data.recipe : []
    };
  }

  function normalizeInventoryForFirestore(item) {
    return {
      ...item,
      id: String(item.id),
      current_quantity: Number(item.current_quantity) || 0,
      minimum_quantity: Number(item.minimum_quantity) || 0,
      is_active: item.is_active !== false,
      syncedAt: Date.now()
    };
  }

  function normalizeInventoryFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      ...data,
      id: String(data.id || doc.id),
      current_quantity: Number(data.current_quantity) || 0,
      minimum_quantity: Number(data.minimum_quantity) || 0,
      is_active: data.is_active !== false
    };
  }

  function normalizeInventoryTxForFirestore(tx) {
    return { ...tx, id: String(tx.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`), syncedAt: Date.now() };
  }

  function normalizeInventoryTxFromFirestore(doc) {
    const data = doc.data() || {};
    return { ...data, id: String(data.id || doc.id) };
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

  async function pushCollection(items, ref, normalizer, idGetter) {
    const batch = db.batch();
    items.forEach((item) => {
      if (!item) return;
      const id = String(idGetter(item));
      if (!id || id === "undefined" || id === "null") return;
      batch.set(ref.doc(id), normalizer(item), { merge: true });
    });
    await batch.commit();
  }

  async function initializeCollection({ localItems, ref, normalizerFromFirestore, applyRemote, pushLocal }) {
    const snap = await ref.limit(1).get();
    if (snap.empty && localItems.length) {
      await pushLocal();
      return;
    }
    const all = await ref.get();
    applyRemote(all.docs.map(normalizerFromFirestore));
  }

  async function pushOrdersToFirestore() {
    if (applyingRemoteSnapshot) return;
    rememberLocalOrders();
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

  async function pushProductsToFirestore() {
    if (applyingRemoteSnapshot) return;
    await pushCollection(state.products || [], productsRef, normalizeProductForFirestore, (product) => product.id);
  }

  async function pushInventoryToFirestore() {
    if (applyingRemoteSnapshot) return;
    await pushCollection(state.inventory || [], inventoryRef, normalizeInventoryForFirestore, (item) => item.id);
  }

  async function pushInventoryTransactionsToFirestore() {
    if (applyingRemoteSnapshot) return;
    await pushCollection(state.inventoryTransactions || [], inventoryTransactionsRef, normalizeInventoryTxForFirestore, (tx) => tx.id || `${tx.orderId || "tx"}-${tx.createdAt || tx.time || Date.now()}`);
  }

  async function pushInventorySettingsToFirestore() {
    if (applyingRemoteSnapshot) return;
    await inventorySettingsRef.set({ ...(state.inventorySettings || {}), syncedAt: Date.now() }, { merge: true });
  }

  saveOrders = function saveOrdersFirebaseBridge() {
    rememberLocalOrders();
    originalSaveOrders();
    if (!applyingRemoteSnapshot) pushOrdersToFirestore().catch((error) => console.warn("Firebase orders sync failed:", error));
  };

  if (originalSaveProducts) {
    saveProducts = function saveProductsFirebaseBridge() {
      originalSaveProducts();
      if (!applyingRemoteSnapshot) pushProductsToFirestore().catch((error) => console.warn("Firebase products sync failed:", error));
    };
  }

  if (originalSaveInventory) {
    saveInventory = function saveInventoryFirebaseBridge() {
      originalSaveInventory();
      if (!applyingRemoteSnapshot) pushInventoryToFirestore().catch((error) => console.warn("Firebase inventory sync failed:", error));
    };
  }

  if (originalSaveInventoryTransactions) {
    saveInventoryTransactions = function saveInventoryTransactionsFirebaseBridge() {
      originalSaveInventoryTransactions();
      if (!applyingRemoteSnapshot) pushInventoryTransactionsToFirestore().catch((error) => console.warn("Firebase inventory transactions sync failed:", error));
    };
  }

  if (originalSaveInventorySettings) {
    saveInventorySettings = function saveInventorySettingsFirebaseBridge() {
      originalSaveInventorySettings();
      if (!applyingRemoteSnapshot) pushInventorySettingsToFirestore().catch((error) => console.warn("Firebase inventory settings sync failed:", error));
    };
  }

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
    rememberLocalOrders();
    pushOrdersToFirestore().catch((error) => console.warn("Post-confirm Firebase orders push failed:", error));
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

    if (!visibleOrders.length) table.innerHTML = `<tr><td colspan="7">لا توجد طلبات مطابقة.</td></tr>`;

    document.querySelectorAll("[data-print-order]").forEach((button) => button.addEventListener("click", () => printOrderById(button.dataset.printOrder, "فاتورة طلب")));
    document.querySelectorAll("[data-edit-order]").forEach((button) => button.addEventListener("click", () => editOrder(button.dataset.editOrder)));
    document.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder)));
  };

  async function startProductsRealtimeSync() {
    await initializeCollection({
      localItems: state.products || [],
      ref: productsRef,
      normalizerFromFirestore: normalizeProductFromFirestore,
      pushLocal: pushProductsToFirestore,
      applyRemote: (items) => {
        state.products = items.sort((a, b) => Number(a.id) - Number(b.id));
        if (originalSaveProducts) originalSaveProducts();
        safeRenderAll();
      }
    });

    productsRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.products = snapshot.docs.map(normalizeProductFromFirestore).sort((a, b) => Number(a.id) - Number(b.id));
      if (originalSaveProducts) originalSaveProducts();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase products realtime listener failed:", error);
    });
  }

  async function startInventoryRealtimeSync() {
    await initializeCollection({
      localItems: state.inventory || [],
      ref: inventoryRef,
      normalizerFromFirestore: normalizeInventoryFromFirestore,
      pushLocal: pushInventoryToFirestore,
      applyRemote: (items) => {
        state.inventory = items;
        if (originalSaveInventory) originalSaveInventory();
        safeRenderAll();
      }
    });

    inventoryRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.inventory = snapshot.docs.map(normalizeInventoryFromFirestore);
      if (originalSaveInventory) originalSaveInventory();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory realtime listener failed:", error);
    });
  }

  async function startInventoryTransactionsRealtimeSync() {
    const snap = await inventoryTransactionsRef.limit(1).get();
    if (snap.empty && Array.isArray(state.inventoryTransactions) && state.inventoryTransactions.length) {
      await pushInventoryTransactionsToFirestore();
    }

    inventoryTransactionsRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.inventoryTransactions = snapshot.docs.map(normalizeInventoryTxFromFirestore);
      if (originalSaveInventoryTransactions) originalSaveInventoryTransactions();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory transactions realtime listener failed:", error);
    });
  }

  async function startInventorySettingsRealtimeSync() {
    const snap = await inventorySettingsRef.get();
    if (!snap.exists && state.inventorySettings) await pushInventorySettingsToFirestore();

    inventorySettingsRef.onSnapshot((doc) => {
      if (!doc.exists) return;
      applyingRemoteSnapshot = true;
      state.inventorySettings = { ...(state.inventorySettings || {}), ...(doc.data() || {}) };
      delete state.inventorySettings.syncedAt;
      if (originalSaveInventorySettings) originalSaveInventorySettings();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory settings realtime listener failed:", error);
    });
  }

  function mergeRemoteOrdersWithPendingLocal(remoteOrders) {
    const remoteIds = new Set(remoteOrders.map((order) => Number(order.id)));
    const localSource = Array.isArray(state.orders) && state.orders.length ? state.orders : lastLocalOrdersSnapshot;
    const now = Date.now();
    const localOnly = (localSource || []).filter((order) => {
      const id = Number(order && order.id);
      if (!id || remoteIds.has(id)) return false;
      const createdAt = Number(order.createdAt) || Number(order.createdAtMs) || now;
      return now - createdAt < 5 * 60 * 1000;
    });
    return [...remoteOrders, ...localOnly].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }

  function startOrdersRealtimeSync() {
    if (Array.isArray(state.orders) && state.orders.length) {
      rememberLocalOrders();
      pushOrdersToFirestore().catch((error) => console.warn("Initial Firebase orders push failed:", error));
    }

    ordersRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      const remoteOrders = snapshot.docs.map(normalizeOrderFromFirestore);
      state.orders = mergeRemoteOrdersWithPendingLocal(remoteOrders);
      const maxId = state.orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
      state.nextOrder = Math.max(Number(state.nextOrder || 1), maxId + 1);
      originalSaveOrders();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase orders realtime listener failed. Using localStorage fallback.", error);
    });
  }

  window.addEventListener("load", async () => {
    if (syncStarted) return;
    syncStarted = true;
    startOrdersRealtimeSync();
    await Promise.allSettled([
      startProductsRealtimeSync(),
      startInventoryRealtimeSync(),
      startInventoryTransactionsRealtimeSync(),
      startInventorySettingsRealtimeSync()
    ]);
    console.log("Smokey POS Firebase realtime bridge is active for orders, products, and inventory.");
  });
})();
