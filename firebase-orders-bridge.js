// Firebase realtime bridge for experimental branch only.
// Syncs shared POS data with Firestore and reserves new order numbers atomically on confirm.
(function () {
  const firebaseConfig = {
    apiKey: String.fromCharCode(65,73,122,97,83,121,65,56,68,118,104,45,108,52,85,51,115,56,76,100,75,108,110,104,87,121,72,57,99,57,49,79,122,105,71,78,95,70,69),
    authDomain: "restaurant-test-269e3.firebaseapp.com",
    projectId: "restaurant-test-269e3",
    storageBucket: "restaurant-test-269e3.firebasestorage.app",
    messagingSenderId: "301369717216",
    appId: "1:301369717216:web:b378ea41a4d94718ddfb85"
  };

  if (!window.firebase || !window.firebase.firestore || typeof state === "undefined") {
    console.warn("Firebase bridge skipped. Firebase scripts or POS state are not ready.");
    return;
  }

  window.state = state;

  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
  const db = app.firestore();
  const refs = {
    orders: db.collection("orders"),
    products: db.collection("products"),
    inventory: db.collection("inventory"),
    inventoryTransactions: db.collection("inventoryTransactions"),
    users: db.collection("users"),
    inventorySettings: db.collection("appSettings").doc("inventory"),
    orderCounter: db.collection("counters").doc("orders")
  };

  const LEGACY_CYCLE = "legacy";
  const original = {
    saveOrders: typeof saveOrders === "function" ? saveOrders : null,
    confirmOrder: typeof confirmOrder === "function" ? confirmOrder : null,
    deleteOrder: typeof deleteOrder === "function" ? deleteOrder : null,
    markReady: typeof markReady === "function" ? markReady : null,
    editOrder: typeof editOrder === "function" ? editOrder : null,
    printOrderById: typeof printOrderById === "function" ? printOrderById : null,
    saveProducts: typeof saveProducts === "function" ? saveProducts : null,
    saveInventory: typeof saveInventory === "function" ? saveInventory : null,
    saveInventoryTransactions: typeof saveInventoryTransactions === "function" ? saveInventoryTransactions : null,
    saveInventorySettings: typeof saveInventorySettings === "function" ? saveInventorySettings : null,
    saveUsers: typeof saveUsers === "function" ? saveUsers : null
  };

  let applyingRemoteSnapshot = false;
  let confirmingOrder = false;
  let syncStarted = false;
  let activeCycle = LEGACY_CYCLE;
  let counterNext = Number(state.nextOrder || 1) || 1;

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
    const cycle = order.orderCycle || activeCycle || LEGACY_CYCLE;
    const id = Number(order.id || order.orderNumber);
    if (!id) return "";
    return cycle === LEGACY_CYCLE ? String(id) : `${cycle}-${id}`;
  }

  function findOrderByRef(ref) {
    const value = String(ref || "");
    const numeric = Number(value);
    const orders = Array.isArray(state.orders) ? state.orders : [];
    return orders.find((order) => String(order.firebaseDocId || "") === value)
      || orders.find((order) => String(docIdForOrder(order)) === value)
      || orders.find((order) => Number(order.id) === numeric)
      || null;
  }

  function setCurrentOrderLabel(next) {
    state.nextOrder = Math.max(Number(next || counterNext || 1), 1);
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${state.nextOrder}`;
  }

  function localSave(fn) {
    if (typeof fn === "function") fn();
  }

  function renderEverything() {
    setCurrentOrderLabel(counterNext);
    if (typeof renderAll === "function") renderAll();
    setCurrentOrderLabel(counterNext);
  }

  function formatTime(value) {
    const millis = toMillis(value);
    if (!millis) return "-";
    return new Date(millis).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
  }

  function orderTimeMarkup(order) {
    const rows = [`إنشاء: ${formatTime(order.createdAt || order.createdAtMs)}`];
    if (order.modifiedAtMs || order.updatedAt || order.modifiedAt) rows.push(`تعديل: ${formatTime(order.modifiedAtMs || order.updatedAt || order.modifiedAt)}`);
    if (order.deletedAtMs || order.canceledAt || order.deletedAt) rows.push(`إلغاء: ${formatTime(order.deletedAtMs || order.canceledAt || order.deletedAt)}`);
    return rows.map((row, index) => index ? `<small>${row}</small>` : `<div>${row}</div>`).join("");
  }

  function sortByNumericId(list) {
    return [...list].sort((a, b) => Number(a.id) - Number(b.id));
  }

  function upsertById(list, item) {
    const id = String(item && item.id);
    const index = list.findIndex((entry) => String(entry && entry.id) === id);
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.push(item);
  }

  function normalizeOrderForFirestore(order) {
    const createdAt = Number(order.createdAt) || Number(order.createdAtMs) || Date.now();
    const orderNumber = Number(order.orderNumber || order.id);
    const cycle = order.orderCycle || activeCycle || LEGACY_CYCLE;
    const docId = order.firebaseDocId || `${cycle}-${orderNumber}`;
    return {
      ...order,
      id: orderNumber,
      orderNumber,
      orderCycle: cycle,
      firebaseDocId: docId,
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
    const parsedDocNumber = /^\d+$/.test(doc.id) ? Number(doc.id) : 0;
    const id = Number(data.orderNumber || data.id || parsedDocNumber);
    const cycle = data.orderCycle || data.resetCycle || (parsedDocNumber ? LEGACY_CYCLE : activeCycle || LEGACY_CYCLE);
    return {
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
    const id = String(tx.id || `${tx.order_id || tx.orderId || "tx"}-${tx.created_at_ms || tx.createdAt || Date.now()}-${Math.random().toString(16).slice(2)}`);
    return { ...tx, id, syncedAt: Date.now() };
  }

  function normalizeInventoryTxFromFirestore(doc) {
    const data = doc.data() || {};
    return { ...data, id: String(data.id || doc.id) };
  }

  function normalizeUserForFirestore(user) {
    return { ...user, id: String(user.email || user.name || Date.now()), syncedAt: Date.now() };
  }

  function normalizeUserFromFirestore(doc) {
    const data = doc.data() || {};
    const user = { ...data };
    delete user.id;
    delete user.syncedAt;
    return user.email ? user : { ...user, email: doc.id };
  }

  async function pushCollection(items, ref, normalizer, idGetter) {
    if (applyingRemoteSnapshot) return;
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return;
    const batch = db.batch();
    let hasWrites = false;
    list.forEach((item) => {
      const id = String(idGetter(item));
      if (!id || id === "undefined" || id === "null") return;
      batch.set(ref.doc(id), normalizer(item), { merge: true });
      hasWrites = true;
    });
    if (hasWrites) await batch.commit();
  }

  async function syncUsersExact() {
    if (applyingRemoteSnapshot) return;
    const users = Array.isArray(state.users) ? state.users : [];
    const remote = await refs.users.get();
    const localIds = new Set(users.map((user) => String(user.email || user.name)).filter(Boolean));
    const batch = db.batch();
    remote.docs.forEach((doc) => {
      if (!localIds.has(doc.id)) batch.delete(doc.ref);
    });
    users.forEach((user) => {
      const id = String(user.email || user.name);
      if (id) batch.set(refs.users.doc(id), normalizeUserForFirestore(user), { merge: true });
    });
    await batch.commit();
  }

  async function upsertOrder(order) {
    if (!order || !order.id) return;
    const docId = docIdForOrder(order) || `${activeCycle}-${Number(order.id)}`;
    order.firebaseDocId = docId;
    order.orderCycle = order.orderCycle || activeCycle || LEGACY_CYCLE;
    await refs.orders.doc(docId).set(normalizeOrderForFirestore(order), { merge: true });
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
      const counterSnap = await transaction.get(refs.orderCounter);
      const counter = counterSnap.exists ? counterSnap.data() || {} : {};
      const cycle = counter.activeCycle || counter.cycle || activeCycle || LEGACY_CYCLE;
      let reservedNumber = Math.max(Number(counter.next || state.nextOrder || 1), 1);
      let docId = `${cycle}-${reservedNumber}`;
      let orderRef = refs.orders.doc(docId);
      let orderSnap = await transaction.get(orderRef);
      let guard = 0;

      while (orderSnap.exists && guard < 50) {
        reservedNumber += 1;
        docId = `${cycle}-${reservedNumber}`;
        orderRef = refs.orders.doc(docId);
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
      transaction.set(refs.orderCounter, { next: reservedNumber + 1, activeCycle: cycle, updatedAt: Date.now() }, { merge: true });
      return savedOrder;
    });
  }

  async function confirmOrderWithFirebase() {
    if (confirmingOrder || !state.cart.length) return;

    const needsCustomerInfo = typeof requiresCustomerInfo === "function" && requiresCustomerInfo(state.orderType);
    if (needsCustomerInfo && (!state.customerInfo.name || !state.customerInfo.phone)) {
      if (typeof openCustomerInfoModal === "function") openCustomerInfoModal();
      return;
    }

    if (state.editingOrderId || state.editingOrderRef) {
      const editingOrder = findOrderByRef(state.editingOrderRef || state.editingOrderId);
      if (!editingOrder) return;
      const editingRef = editingOrder.firebaseDocId || docIdForOrder(editingOrder);
      original.confirmOrder();
      const editedOrder = findOrderByRef(editingRef) || findOrderByRef(state.editingOrderId) || editingOrder;
      if (editedOrder) {
        editedOrder.firebaseDocId = editingRef;
        editedOrder.orderCycle = editedOrder.orderCycle || editingOrder.orderCycle || activeCycle;
        upsertOrder(editedOrder).catch((error) => console.warn("Firebase edit sync failed:", error));
      }
      state.editingOrderRef = null;
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
      const savedOrder = await createOrderAtomically(orderPayload);
      state.orders.unshift(savedOrder);
      counterNext = Number(savedOrder.id) + 1;
      setCurrentOrderLabel(counterNext);
      if (typeof deductInventoryForOrder === "function") deductInventoryForOrder(savedOrder);
      if (typeof printOrder === "function") printOrder(savedOrder, "فاتورة طلب");

      state.cart = [];
      state.customerInfo = { name: "", phone: "" };
      state.editingOrderId = null;
      state.editingOrderRef = null;
      if (confirmButton) confirmButton.textContent = "تأكيد الطلب وطباعة";
      const orderNote = document.querySelector("#orderNote");
      if (orderNote) orderNote.value = "";
      localSave(original.saveOrders);
      renderEverything();
    } catch (error) {
      console.warn("Atomic Firebase order confirmation failed:", error);
      alert("تعذر حفظ الطلب في Firebase. تأكد من الاتصال وحاول مرة ثانية. لم يتم إنشاء رقم طلب مكرر.");
    } finally {
      confirmingOrder = false;
      if (confirmButton) confirmButton.disabled = false;
    }
  }

  function patchOrderActions() {
    if (original.confirmOrder) {
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

    if (original.deleteOrder) {
      deleteOrder = function deleteOrderFirebaseBridge(ref) {
        const order = findOrderByRef(ref);
        if (!order) return;
        const docId = order.firebaseDocId || docIdForOrder(order);
        original.deleteOrder(order.id);
        const updatedOrder = findOrderByRef(docId) || order;
        updatedOrder.firebaseDocId = docId;
        updatedOrder.orderCycle = updatedOrder.orderCycle || order.orderCycle || activeCycle;
        upsertOrder(updatedOrder).catch((error) => console.warn("Firebase cancel sync failed:", error));
      };
    }

    if (original.markReady) {
      markReady = function markReadyFirebaseBridge(ref) {
        const order = findOrderByRef(ref);
        if (!order) return;
        const docId = order.firebaseDocId || docIdForOrder(order);
        order.status = "جاهز";
        order.readyAt = Date.now();
        order.firebaseDocId = docId;
        upsertOrder(order).catch((error) => console.warn("Firebase ready sync failed:", error));
        renderEverything();
      };
    }

    if (original.editOrder) {
      editOrder = function editOrderFirebaseBridge(ref) {
        const order = findOrderByRef(ref);
        if (!order) return;
        state.editingOrderRef = order.firebaseDocId || docIdForOrder(order);
        original.editOrder(order.id);
      };
    }

    if (original.printOrderById) {
      printOrderById = function printOrderFirebaseBridge(ref, title) {
        const order = findOrderByRef(ref);
        if (order && typeof printOrder === "function") printOrder(order, title || "فاتورة طلب");
      };
    }
  }

  function patchLocalSaves() {
    if (original.saveOrders) {
      saveOrders = function saveOrdersFirebaseBridge() {
        original.saveOrders();
        setCurrentOrderLabel(counterNext);
      };
    }
    if (original.saveProducts) {
      saveProducts = function saveProductsFirebaseBridge() {
        original.saveProducts();
        pushCollection(state.products || [], refs.products, normalizeProductForFirestore, (product) => product.id).catch((error) => console.warn("Firebase products sync failed:", error));
      };
    }
    if (original.saveInventory) {
      saveInventory = function saveInventoryFirebaseBridge() {
        original.saveInventory();
        pushCollection(state.inventory || [], refs.inventory, normalizeInventoryForFirestore, (item) => item.id).catch((error) => console.warn("Firebase inventory sync failed:", error));
      };
    }
    if (original.saveInventoryTransactions) {
      saveInventoryTransactions = function saveInventoryTransactionsFirebaseBridge() {
        original.saveInventoryTransactions();
        pushCollection(state.inventoryTransactions || [], refs.inventoryTransactions, normalizeInventoryTxForFirestore, (tx) => tx.id || `${tx.order_id || tx.orderId || "tx"}-${tx.created_at_ms || tx.createdAt || Date.now()}`).catch((error) => console.warn("Firebase inventory transaction sync failed:", error));
      };
    }
    if (original.saveInventorySettings) {
      saveInventorySettings = function saveInventorySettingsFirebaseBridge() {
        original.saveInventorySettings();
        if (!applyingRemoteSnapshot) refs.inventorySettings.set({ ...(state.inventorySettings || {}), syncedAt: Date.now() }, { merge: true }).catch((error) => console.warn("Firebase inventory settings sync failed:", error));
      };
    }
    if (original.saveUsers) {
      saveUsers = function saveUsersFirebaseBridge() {
        original.saveUsers();
        syncUsersExact().catch((error) => console.warn("Firebase users sync failed:", error));
      };
    }
  }

  function renderOrdersTableRealtime() {
    const table = document.querySelector("#ordersTable");
    if (!table) return;
    const query = state.orderSearch.trim().replace("#", "");
    const dateRange = getOrdersDateRange();
    const visibleOrders = state.orders.filter((order) => {
      const matchesSearch = !query || String(order.id).includes(query) || (order.type || "").includes(query) || (order.cashier || "").includes(query);
      const matchesStatus = state.orderStatusFilter === "الكل" || order.status === state.orderStatusFilter;
      const matchesDate = isInRange(order.createdAt, dateRange);
      return matchesSearch && matchesStatus && matchesDate;
    });

    table.innerHTML = visibleOrders.map((order) => {
      const ref = order.firebaseDocId || docIdForOrder(order) || order.id;
      return `
      <tr>
        <td>#${order.id}</td>
        <td>${order.type || "-"}</td>
        <td>${formatMoney(Number(order.total) || 0)}</td>
        <td><span class="status-pill ${order.status === "جاهز" ? "on" : order.status === "ملغي" ? "cancel" : "wait"}">${order.status || "قيد التجهيز"}</span></td>
        <td class="order-times-cell">${orderTimeMarkup(order)}</td>
        <td>${order.cashier || order.createdBy || "-"}</td>
        <td>
          <div class="table-actions">
            <button class="ghost-small" type="button" data-print-order="${ref}">طباعة</button>
            <button class="ghost-small" type="button" data-edit-order="${ref}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>تعديل</button>
            <button class="danger-small" type="button" data-delete-order="${ref}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>إلغاء</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    if (!visibleOrders.length) table.innerHTML = `<tr><td colspan="7">لا توجد طلبات مطابقة.</td></tr>`;
    document.querySelectorAll("[data-print-order]").forEach((button) => button.addEventListener("click", () => printOrderById(button.dataset.printOrder, "فاتورة طلب")));
    document.querySelectorAll("[data-edit-order]").forEach((button) => button.addEventListener("click", () => editOrder(button.dataset.editOrder)));
    document.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder)));
  }

  function patchRenderers() {
    renderOrdersTable = renderOrdersTableRealtime;
  }

  async function seedCollectionIfEmpty(ref, localItems, normalizer, idGetter) {
    const snap = await ref.limit(1).get();
    if (snap.empty && Array.isArray(localItems) && localItems.length) {
      await pushCollection(localItems, ref, normalizer, idGetter);
    }
  }

  function startCounterRealtimeSync() {
    refs.orderCounter.onSnapshot((doc) => {
      const data = doc.exists ? doc.data() || {} : {};
      activeCycle = data.activeCycle || data.cycle || activeCycle || LEGACY_CYCLE;
      counterNext = Math.max(Number(data.next || counterNext || 1), 1);
      setCurrentOrderLabel(counterNext);
    }, (error) => console.warn("Firebase order counter listener failed:", error));
  }

  function startOrdersRealtimeSync() {
    refs.orders.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      state.orders = snapshot.docs.map(normalizeOrderFromFirestore);
      localSave(original.saveOrders);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase orders listener failed:", error);
    });
  }

  async function startProductsRealtimeSync() {
    await seedCollectionIfEmpty(refs.products, state.products, normalizeProductForFirestore, (product) => product.id);
    refs.products.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      snapshot.docChanges().forEach((change) => {
        const product = normalizeProductFromFirestore(change.doc);
        if (change.type === "removed") state.products = state.products.filter((item) => Number(item.id) !== Number(product.id));
        else upsertById(state.products, product);
      });
      state.products = sortByNumericId(state.products);
      localSave(original.saveProducts);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase products listener failed:", error);
    });
  }

  async function startInventoryRealtimeSync() {
    await seedCollectionIfEmpty(refs.inventory, state.inventory, normalizeInventoryForFirestore, (item) => item.id);
    refs.inventory.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      snapshot.docChanges().forEach((change) => {
        const item = normalizeInventoryFromFirestore(change.doc);
        if (change.type === "removed") state.inventory = state.inventory.filter((entry) => String(entry.id) !== String(item.id));
        else upsertById(state.inventory, item);
      });
      localSave(original.saveInventory);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory listener failed:", error);
    });
  }

  async function startInventoryTransactionsRealtimeSync() {
    await seedCollectionIfEmpty(refs.inventoryTransactions, state.inventoryTransactions, normalizeInventoryTxForFirestore, (tx) => tx.id || `${tx.order_id || tx.orderId || "tx"}-${tx.created_at_ms || tx.createdAt || Date.now()}`);
    refs.inventoryTransactions.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      snapshot.docChanges().forEach((change) => {
        const tx = normalizeInventoryTxFromFirestore(change.doc);
        if (change.type === "removed") state.inventoryTransactions = state.inventoryTransactions.filter((entry) => String(entry.id) !== String(tx.id));
        else upsertById(state.inventoryTransactions, tx);
      });
      localSave(original.saveInventoryTransactions);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory transactions listener failed:", error);
    });
  }

  async function startInventorySettingsRealtimeSync() {
    const snap = await refs.inventorySettings.get();
    if (!snap.exists && state.inventorySettings) await refs.inventorySettings.set({ ...(state.inventorySettings || {}), syncedAt: Date.now() }, { merge: true });
    refs.inventorySettings.onSnapshot((doc) => {
      if (!doc.exists) return;
      applyingRemoteSnapshot = true;
      state.inventorySettings = { ...(state.inventorySettings || {}), ...(doc.data() || {}) };
      delete state.inventorySettings.syncedAt;
      localSave(original.saveInventorySettings);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase inventory settings listener failed:", error);
    });
  }

  async function startUsersRealtimeSync() {
    await seedCollectionIfEmpty(refs.users, state.users, normalizeUserForFirestore, (user) => user.email || user.name);
    refs.users.onSnapshot((snapshot) => {
      applyingRemoteSnapshot = true;
      snapshot.docChanges().forEach((change) => {
        const user = normalizeUserFromFirestore(change.doc);
        const userId = String(user.email || change.doc.id);
        if (change.type === "removed") state.users = state.users.filter((entry) => String(entry.email || entry.name) !== userId);
        else {
          const index = state.users.findIndex((entry) => String(entry.email || entry.name) === userId);
          if (index >= 0) state.users[index] = { ...state.users[index], ...user };
          else state.users.push(user);
        }
      });
      if (typeof normalizeUsers === "function") normalizeUsers();
      else localSave(original.saveUsers);
      renderEverything();
      applyingRemoteSnapshot = false;
    }, (error) => {
      applyingRemoteSnapshot = false;
      console.warn("Firebase users listener failed:", error);
    });
  }

  patchLocalSaves();
  patchOrderActions();
  patchRenderers();

  window.addEventListener("load", async () => {
    if (syncStarted) return;
    syncStarted = true;
    startCounterRealtimeSync();
    startOrdersRealtimeSync();
    await Promise.allSettled([
      startProductsRealtimeSync(),
      startInventoryRealtimeSync(),
      startInventoryTransactionsRealtimeSync(),
      startInventorySettingsRealtimeSync(),
      startUsersRealtimeSync()
    ]);
    console.log("Smokey POS Firebase realtime bridge is active with non-destructive order number cycles.");
  });
})();
