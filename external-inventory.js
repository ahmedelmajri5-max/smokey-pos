(function () {
  function canUseExternalInventory() {
    const role = state.currentUser?.role || "";
    return role === "Admin" || role === "Manager / Supervisor" || role === "Manager" || role === "Supervisor";
  }

  window.addInventoryFromExternal = async function addInventoryFromExternal(inventoryItemId, quantity, note = "") {
    if (!canUseExternalInventory()) {
      alert("إضافة كميات المخزون متاحة فقط للأدمن أو المشرف.");
      return false;
    }
    if (!window.smokeyFirebaseDb) {
      alert("مزامنة Firebase غير جاهزة. حاول بعد لحظات.");
      return false;
    }

    const numericQuantity = Number(quantity);
    if (!inventoryItemId || !Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      alert("يرجى إدخال كمية صحيحة.");
      return false;
    }

    const id = `pending-inventory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date();
    await window.smokeyFirebaseDb.collection("pendingInventoryActions").doc(id).set({
      id,
      type: "purchase",
      inventoryItemId,
      quantity: numericQuantity,
      note,
      userId: state.currentUser?.email || state.currentUser?.name || "",
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
      applied: false
    });

    alert("تم إرسال إضافة المخزون للمنظومة المحلية لاعتمادها.");
    return true;
  };
})();
