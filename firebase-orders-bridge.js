// Firebase realtime bridge for experimental branch only.
// Keeps app.js mostly intact while making order creation atomic in Cloud Firestore.
(function () {
  const firebaseConfig = {
    apiKey: String.fromCharCode(65,73,122,97,83,121,65,56,68,118,104,45,108,52,85,51,115,56,76,100,75,108,110,104,87,121,72,57,99,57,49,79,122,105,71,78,95,70,69),
    authDomain: "restaurant-test-269e3.firebaseapp.com",
    projectId: "restaurant-test-269e3",
    storageBucket: "restaurant-test-269e3.firebasestorage.app",
    messagingSenderId: "301369717216",
    appId: "1:301369717216:web:b378ea41a4d94718ddfb85"
  };

  if (!window.firebase || !window.firebase.firestore || !window.state) {
    console.warn("Firebase bridge skipped. Firebase scripts or app state are not ready.");
    return;
  }

  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
  const db = app.firestore();
  const ordersRef = db.collection("orders");
  const productsRef = db.collection("products");
  const inventoryRef = db.collection("inventory");
  const inventoryTransactionsRef = db.collection("inventoryTransactions");
  const inventorySettingsRef = db.collection("appSettings").doc("inventory");
  const counterRef = db.collection("counters").doc("orders");

  const originalSaveOrders = typeof saveOrders === "function" ? saveOrders : null;
  const originalConfirmOrder = typeof confirmOrder === "function" ? confirmOrder : null;
  const originalDeleteOrder = typeof deleteOrder === "function" ? deleteOrder : null;
  const originalMarkReady = typeof markReady === "function" ? markReady : null;
  const originalSaveProducts = typeof saveProducts === "function" ? saveProducts : null;
  const originalSaveInventory = typeof saveInventory === "function" ? saveInventory : null;
  const originalSaveInventoryTransactions = typeof saveInventoryTransactions === "function" ? saveInventoryTransactions : null;
  const originalSaveInventorySettings = typeof saveInventorySettings === "function" ? saveInventorySettings : null;

  let applyingRemoteSnapshot = false;
  let confirmingOrder = false;
  let syncStarted = false;

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

  function getMaxLocalOrderId() {
    return (Array.isArray(state.orders) ? state.orders : []).reduce((max, order) => Math.max(max, Number(order && order.id) || 0), 0);
  }

  function syncCurrentOrderLabel() {
    state.nextOrder = Math.max(Number(state.nextOrder || 1), getMaxLocalOrderId() + 1);
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${state.nextOrder}`;
  }

  function persistOrdersLocalOnly() {
    if (originalSaveOrders) originalSaveOrders();
  }

  function safeRenderAll() {
    if (typeof renderAll === "function") renderAll();
  }

  function normalizeOrderForFirestore(order) {
    const createdAt = Number(order.createdAt) || Number(order.createdAtMs) || Date.now();
    return {
      ...order,
      id: Number(order.id),
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

  function normalizeOrderFromFirestore(doc) {
    const data = doc.data() || {};
    return {
      ...data,
      id: Number(data.id || doc.id),
      batchId: Number(data.batchId) || 1,
      total: Number(data.total) || 0,
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
    const id = String(tx.id || `${tx.orderId || "tx"}-${tx.createdAt || tx.time || Date.now()}-${Math.random().toString(16).slice(2)}`);
    return { ...tx, id, syncedAt: Date.now() };
  }

  function normalizeInventoryTxFromFirestore(doc) {
    const data = doc.data() || {};
    return { ...data, id: String(data.id || doc.id) };
  }

  async function pushCollection(items, ref, normalizer, idGetter) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length || applyingRemoteSnapshot) return;
    const batch = db.batch();
    let hasWrites = false;
    list.forEach((item) => {
      if (!item) return;
      const id = String(idGetter(item));
      if (!id || id === "undefined" || id === "null") return;
      batch.set(ref.doc(id), normalizer(item), { merge: true });
      hasWrites = true;
    });
    if (hasWrites) await batch.commit();
  }

  async function upsertOrder(order) {
    if (!order || !order.id) return;
    await ordersRef.doc(String(order.id)).set(normalizeOrderForFirestore(order), { merge: true });
  }

  function buildOrderPayload() {
    const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return {
      type: state.orderType,
      status: "قيد التجهيز",
      total,
      cashier: state.currentUser?.name || "المدير",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      createdAt: Date.now(),
      payment: typeof normalizePayment === "function" ? normalizePayment(state.payment) : state.payment,
      customer: typeof requiresCustomerInfo === "function" && requiresCustomerInfo(state.orderType) ? { ...state.customerInfo } : null,
      note: document.querySelector("#orderNote")?.value.trim() || "",
      items: state.cart.map(({ name, qty, price, notes, modifiers }) => ({
        name,
        qty,
        price: Number(price) || 0,
        notes: notes || [],
        modifiers: modifiers || []
      }))
    };
  }

  async function createOrderAtomically(orderPayload) {
    return db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const counterNext = counterSnap.exists ? Number(counterSnap.data().next || 1) : 1;
      const localNext = Math.max(Number(state.nextOrder || 1), getMaxLocalOrderId() + 1);
      const reservedNumber = Math.max(counterNext, localNext);
      const orderRef = ordersRef.doc(String(reservedNumber));
      const orderSnap = await transaction.get(orderRef);

      if (orderSnap.exists) {
        transaction.set(counterRef, { next: reservedNumber + 1, updatedAt: Date.now() }, { merge: true });
        throw new Error("ORDER_NUMBER_ALREADY_EXISTS");
      }

      const savedOrder = {
        id: reservedNumber,
        batchId: typeof getNextBatchId === "function" ? getNextBatchId() : 1,
        ...orderPayload
      };

      transaction.set(orderRef, normalizeOrderForFirestore(savedOrder));
      transaction.set(counterRef, { next: reservedNumber + 1, updatedAt: Date.now() }, { merge: true });
      return savedOrder;
    });
  }

  async function createOrderWithRetry(orderPayload) {
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await createOrderAtomically(orderPayload);
      } catch (error) {
        lastError = error;
        if (!String(error && error.message).includes("ORDER_NUMBER_ALREADY_EXISTS")) break;
      }
    }
    throw lastError;
  }

  async function confirmOrderWithFirebase() {
    if (confirmingOrder) return;
    if (!state.cart.length) return;

    const needsCustomerInfo = typeof requiresCustomerInfo === "function" && requiresCustomerInfo(state.orderType);
    if (needsCustomerInfo && (!state.customerInfo.name || !state.customerInfo.phone)) {
      if (typeof openCustomerInfoModal === "function") openCustomerInfoModal();
      return;
    }

    if (state.editingOrderId) {
      originalConfirmOrder();
      const editedOrder = (state.orders || []).find((order) => Number(order.id) === Number(state.editingOrderId));
      const latestOrder = editedOrder || (state.orders || [])[0];
      if (latestOrder) upsertOrder(latestOrder).catch((error) => console.warn("Firebase edit sync failed:", error));
      return;
    }

    const orderPayload = buildOrderPayload();
    const insufficient = typeof getInsufficientStock === "function" ? getInsufficientStock(orderPayload.items) : [];
    if (insufficient.length && !state.inventorySettings.allowNegativeStock) {
      if (typeof showStockWarning === "function") showStockWarning(insufficient);
      return;
    }
    if (insufficient.length && state.inventorySettings.allowNegativeStock) {
      console.warn("تنبيه بيع بمخزون غير كافٍ", insufficient.map(({ item, required, available }) => `${item.name}: ${required} / ${available}`));
    }

    confirmingOrder = true;
    const confirmButton = document.querySelector("#confirmOrder");
    if (confirmButton) confirmButton.disabled = true;

    try {
      const savedOrder = await createOrderWithRetry(orderPayload);
      state.orders.unshift(savedOrder);
      state.nextOrder = Math.max(Number(savedOrder.id) + 1, getMaxLocalOrderId() + 1);

      if (typeof deductInventoryForOrder === "function") deductInventoryForOrder(savedOrder);
      if (typeof printOrder === "function") printOrder(savedOrder, "فاتورة طلب");

      state.cart = [];
      state.customerInfo = { name: "", phone: "" };
      state.editingOrderId = null;
      if (confirmButton) confirmButton.textContent = "تأكيد الطلب وطباعة";
      const orderNote = document.querySelector("#orderNote");
      if (orderNote) orderNote.value = "";
      syncCurrentOrderLabel();
      persistOrdersLocalOnly();
      safeRenderAll();
    } catch (error) {
      console.warn("Atomic Firebase order confirmation failed:", error);
      alert("تعذر حفظ الطلب في Firebase. تأكد من الاتصال وحاول مرة ثانية. لم يتم إنشاء رقم طلب مكرر.");
    } finally {
      confirmingOrder = false;
      if (confirmButton) confirmButton.disabled = false;
    }
  }

  function patchOrderActions() {
    if (originalConfirmOrder) {
      confirmOrder = confirmOrderWithFirebase;
      document.addEventListener("click", (event) => {
        const button = event.target && event.target.closest ? event.target.closest("#confirmOrder") : null;
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        confirmOrderWithFirebase();
      }, true);
    }

    if (originalDeleteOrder) {
      deleteOrder = function deleteOrderFirebaseBridge(id) {
        originalDeleteOrder(id);
        const order = (state.orders || []).find((item) => Number(item.id) === Number(id));
        if (order) upsertOrder(order).catch((error) => console.warn("Firebase cancel sync failed:", error));
      };
    }

    if (originalMarkReady) {
      markReady = function markReadyFirebaseBridge(id) {
        originalMarkReady(id);
        const order = (state.orders || []).find((item) => Number(item.id) === Number(id));
        if (order) upsertOrder(order).catch((error) => console.warn("Firebase ready sync failed:", error));
      };
    }
  }

  if (originalSaveOrders) {
    saveOrders = function saveOrdersFirebaseBridge() {
      originalSaveOrders();
      syncCurrentOrderLabel();
    };
  }

  if (originalSaveProducts) {
    saveProducts = function saveProductsFirebaseBridge() {
      originalSaveProducts();
      pushCollection(state.products || [], productsRef, normalizeProductForFirestore, (product) => product.id).catch((error) => console.warn("Firebase products sync failed:", error));
    };
  }

  if (originalSaveInventory) {
    saveInventory = function saveInventoryFirebaseBridge() {
      originalSaveInventory();
      pushCollection(state.inventory || [], inventoryRef, normalizeInventoryForFirestore, (item) => item.id).catch((error) => console.warn("Firebase inventory sync failed:", error));
    };
  }

  if (originalSaveInventoryTransactions) {
    saveInventoryTransactions = function saveInventoryTransactionsFirebaseBridge() {
      originalSaveInventoryTransactions();
      pushCollection(state.inventoryTransactions || [], inventoryTransactionsRef, normalizeInventoryTxForFirestore, (tx) => tx.id || `${tx.orderId || "tx"}-${tx.createdAt || tx.time || Date.now()}`).catch((error) => console.warn("Firebase inventory transactions sync failed:", error));
    };
  }

  if (originalSaveInventorySettings) {
    saveInventorySettings = function saveInventorySettingsFirebaseBridge() {
      originalSaveInventorySettings();
      if (!applyingRemoteSnapshot) inventorySettingsRef.set({ ...(state.inventorySettings || {}), syncedAt: Date.now() }, { merge: true }).catch((error) => console.warn("Firebase inventory settings sync failed:", error));
    };
  }

  async function startProductsRealtimeSync() {
    const snap = await productsRef.limit(1).get();
    if (snap.empty && Array.isArray(state.products) && state.products.length) {
      await pushCollection(state.products, productsRef, normalizeProductForFirestore, (product) => product.id);
    }
    productsRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.products = snapshot.docs.map(normalizeProductFromFirestore).sort((a, b) => Number(a.id) - Number(b.id));
      if (originalSaveProducts) originalSaveProducts();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase products listener failed:", error);
    });
  }

  async function startInventoryRealtimeSync() {
    const snap = await inventoryRef.limit(1).get();
    if (snap.empty && Array.isArray(state.inventory) && state.inventory.length) {
      await pushCollection(state.inventory, inventoryRef, normalizeInventoryForFirestore, (item) => item.id);
    }
    inventoryRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.inventory = snapshot.docs.map(normalizeInventoryFromFirestore);
      if (originalSaveInventory) originalSaveInventory();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory listener failed:", error);
    });
  }

  async function startInventoryTransactionsRealtimeSync() {
    const snap = await inventoryTransactionsRef.limit(1).get();
    if (snap.empty && Array.isArray(state.inventoryTransactions) && state.inventoryTransactions.length) {
      await pushCollection(state.inventoryTransactions, inventoryTransactionsRef, normalizeInventoryTxForFirestore, (tx) => tx.id || `${tx.orderId || "tx"}-${tx.createdAt || tx.time || Date.now()}`);
    }
    inventoryTransactionsRef.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.inventoryTransactions = snapshot.docs.map(normalizeInventoryTxFromFirestore);
      if (originalSaveInventoryTransactions) originalSaveInventoryTransactions();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory transactions listener failed:", error);
    });
  }

  async function startInventorySettingsRealtimeSync() {
    const snap = await inventorySettingsRef.get();
    if (!snap.exists && state.inventorySettings) {
      await inventorySettingsRef.set({ ...(state.inventorySettings || {}), syncedAt: Date.now() }, { merge: true });
    }
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
      console.warn("Firebase inventory settings listener failed:", error);
    });
  }

  function startOrdersRealtimeSync() {
    ordersRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.orders = snapshot.docs.map(normalizeOrderFromFirestore);
      const maxId = getMaxLocalOrderId();
      state.nextOrder = Math.max(Number(state.nextOrder || 1), maxId + 1);
      persistOrdersLocalOnly();
      syncCurrentOrderLabel();
      safeRenderAll();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase orders listener failed. Using localStorage fallback.", error);
    });
  }

  patchOrderActions();

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
    console.log("Smokey POS Firebase bridge is active. New order numbers are reserved atomically on confirm only.");
  });
})();
