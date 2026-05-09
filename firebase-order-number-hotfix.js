// Hotfix: intercept the confirm button and reserve order numbers atomically in Firebase.
// The original app binds click handlers before this file loads, so replacing confirmOrder alone is not enough.
(function () {
  if (!window.firebase || !window.firebase.firestore || typeof confirmOrder !== "function") {
    console.warn("Order number hotfix skipped: Firebase or confirmOrder is not ready.");
    return;
  }

  const db = window.firebase.app().firestore();
  const ordersRef = db.collection("orders");
  const counterRef = db.collection("counters").doc("orders");
  const originalConfirmOrderForHotfix = confirmOrder;
  let confirming = false;

  function getMaxLocalOrderId() {
    return (Array.isArray(state.orders) ? state.orders : []).reduce((max, order) => Math.max(max, Number(order && order.id) || 0), 0);
  }

  async function reserveNextOrderNumber() {
    return db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const counterNext = counterSnap.exists ? Number(counterSnap.data().next || 1) : 1;
      const localNext = Math.max(Number(state.nextOrder || 1), getMaxLocalOrderId() + 1);
      const reservedNumber = Math.max(counterNext, localNext);
      transaction.set(counterRef, {
        next: reservedNumber + 1,
        reservedAt: Date.now(),
        updatedAt: Date.now()
      }, { merge: true });
      return reservedNumber;
    });
  }

  function setCurrentOrderLabel() {
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${state.nextOrder}`;
  }

  function getOrderById(id) {
    return (Array.isArray(state.orders) ? state.orders : []).find((order) => Number(order && order.id) === Number(id));
  }

  async function pushSingleOrder(order) {
    if (!order || !order.id) return;
    const data = {
      ...order,
      id: Number(order.id),
      total: Number(order.total) || 0,
      createdAt: Number(order.createdAt) || Number(order.createdAtMs) || Date.now(),
      createdBy: order.createdBy || order.cashier || "المدير",
      updatedAt: Number(order.modifiedAtMs || order.updatedAt || 0) || null,
      updatedBy: order.modifiedBy || order.updatedBy || null,
      canceledAt: Number(order.deletedAtMs || order.canceledAt || 0) || null,
      canceledBy: order.deletedBy || order.canceledBy || null,
      syncedAt: Date.now()
    };
    await ordersRef.doc(String(order.id)).set(data, { merge: true });
  }

  async function atomicConfirmOrder() {
    if (confirming) return;
    confirming = true;

    const isEditing = Boolean(state.editingOrderId);

    try {
      if (isEditing) {
        originalConfirmOrderForHotfix();
        return;
      }

      const reservedNumber = await reserveNextOrderNumber();
      state.nextOrder = reservedNumber;
      setCurrentOrderLabel();

      // Now the original app will create the order using the reserved number.
      originalConfirmOrderForHotfix();

      const createdOrder = getOrderById(reservedNumber);
      if (createdOrder) {
        await pushSingleOrder(createdOrder);
      }

      state.nextOrder = Math.max(reservedNumber + 1, getMaxLocalOrderId() + 1, Number(state.nextOrder || 1));
      setCurrentOrderLabel();
      console.log(`Order #${reservedNumber} reserved atomically and saved.`);
    } catch (error) {
      console.warn("Atomic order confirmation failed. Normal confirm was not executed to avoid duplicate numbering.", error);
      alert("تعذر حجز رقم الطلب من Firebase. تأكد من الاتصال وحاول مرة ثانية.");
    } finally {
      confirming = false;
    }
  }

  // Replace global function for any future direct calls.
  confirmOrder = atomicConfirmOrder;

  // Most important part: stop the old click listener that app.js already registered.
  document.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest("#confirmOrder") : null;
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    atomicConfirmOrder();
  }, true);

  console.log("Smokey POS atomic order number hotfix is active and intercepting #confirmOrder.");
})();
