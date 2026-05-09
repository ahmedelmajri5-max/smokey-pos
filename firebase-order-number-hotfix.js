// Hotfix: reserve order numbers atomically only when confirming a new order.
// This prevents two devices from creating the same order number.
(function () {
  if (!window.firebase || !window.firebase.firestore || typeof confirmOrder !== "function") {
    console.warn("Order number hotfix skipped: Firebase or confirmOrder is not ready.");
    return;
  }

  const db = window.firebase.app().firestore();
  const ordersRef = db.collection("orders");
  const counterRef = db.collection("counters").doc("orders");
  const previousConfirmOrder = confirmOrder;
  let reserving = false;

  function getMaxLocalOrderId() {
    return (Array.isArray(state.orders) ? state.orders : []).reduce((max, order) => Math.max(max, Number(order && order.id) || 0), 0);
  }

  async function reserveNextOrderNumber() {
    return db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const counterNext = counterSnap.exists ? Number(counterSnap.data().next || 1) : 1;
      const localNext = Math.max(Number(state.nextOrder || 1), getMaxLocalOrderId() + 1);
      const nextNumber = Math.max(counterNext, localNext);
      transaction.set(counterRef, { next: nextNumber + 1, updatedAt: Date.now() }, { merge: true });
      return nextNumber;
    });
  }

  function setCurrentOrderLabel() {
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${state.nextOrder}`;
  }

  function findNewestLocalOrder(id) {
    return (Array.isArray(state.orders) ? state.orders : []).find((order) => Number(order && order.id) === Number(id));
  }

  async function forcePushSingleOrder(order) {
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

  confirmOrder = async function confirmOrderAtomicNumberHotfix() {
    if (reserving) return;
    const isEditing = Boolean(state.editingOrderId);

    if (!isEditing) {
      reserving = true;
      try {
        const reservedNumber = await reserveNextOrderNumber();
        state.nextOrder = reservedNumber;
        setCurrentOrderLabel();
        previousConfirmOrder();
        const createdOrder = findNewestLocalOrder(reservedNumber);
        if (createdOrder) {
          await forcePushSingleOrder(createdOrder);
          state.nextOrder = Math.max(Number(state.nextOrder || 1), reservedNumber + 1, getMaxLocalOrderId() + 1);
          setCurrentOrderLabel();
        }
      } catch (error) {
        console.warn("Atomic order number reservation failed. Falling back to normal confirm.", error);
        previousConfirmOrder();
      } finally {
        reserving = false;
      }
      return;
    }

    previousConfirmOrder();
  };

  console.log("Smokey POS atomic order number hotfix is active.");
})();
