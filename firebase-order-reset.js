// Admin-only order reset control for the Firebase test branch.
// Keeps the action explicit because it clears current orders and starts numbering from #1.
(function () {
  const RESET_BUTTON_ID = "resetOrderNumbers";
  const ORDERS_STORAGE_KEY = "smokey-pos-orders-v3";

  function getState() {
    try {
      if (typeof state !== "undefined") return state;
      return window.state || null;
    } catch (error) {
      return window.state || null;
    }
  }

  function isAdmin() {
    const appState = getState();
    return appState && appState.currentUser && appState.currentUser.role === "Admin";
  }

  function setCurrentOrderLabel(value) {
    const appState = getState();
    if (appState) appState.nextOrder = value;
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${value}`;
  }

  async function deleteOrdersInBatches(db) {
    const ordersRef = db.collection("orders");
    let deleted = 0;
    while (true) {
      const snapshot = await ordersRef.limit(400).get();
      if (snapshot.empty) break;
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snapshot.size;
      if (snapshot.size < 400) break;
    }
    return deleted;
  }

  async function resetOrderNumbers(button) {
    const appState = getState();
    if (!appState || !window.firebase || !window.firebase.firestore) {
      alert("Firebase غير جاهز. افتح الصفحة من جديد وحاول مرة ثانية.");
      return;
    }
    if (!isAdmin()) {
      alert("تصفير أرقام الطلبات متاح للمدير فقط.");
      return;
    }

    const firstConfirm = confirm(
      "هل أنت متأكد من تصفير أرقام المنظومة؟\n\n" +
      "سيتم حذف كل الطلبات الحالية من شاشة الطلبات والداش بورد في كل الأجهزة، وسيبدأ الطلب القادم من #1.\n" +
      "الأصناف والمخزون والمستخدمون لن يتغيروا."
    );
    if (!firstConfirm) return;

    const finalConfirm = confirm("تأكيد أخير: اضغط موافق فقط لو تبي بداية جديدة للطلبات من #1.");
    if (!finalConfirm) return;

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "جاري التصفير...";

    try {
      const db = window.firebase.firestore();
      const deletedCount = await deleteOrdersInBatches(db);
      await db.collection("counters").doc("orders").set({
        next: 1,
        resetAt: Date.now(),
        resetBy: appState.currentUser.email || appState.currentUser.name || "Admin",
        deletedOrders: deletedCount
      }, { merge: true });

      appState.orders = [];
      appState.nextOrder = 1;
      try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([])); } catch (error) {}
      setCurrentOrderLabel(1);
      if (typeof renderAll === "function") renderAll();
      alert("تم تصفير أرقام الطلبات. الطلب القادم سيكون #1.");
    } catch (error) {
      console.warn("Order number reset failed:", error);
      alert("تعذر تصفير أرقام الطلبات. تأكد من الاتصال وحاول مرة ثانية.");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function installResetButton() {
    const appState = getState();
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

    if (appState && appState.currentUser && appState.currentUser.role !== "Admin") button.hidden = true;
  }

  function refreshResetButtonVisibility() {
    const button = document.querySelector(`#${RESET_BUTTON_ID}`);
    if (button) button.hidden = !isAdmin();
  }

  function boot() {
    installResetButton();
    refreshResetButtonVisibility();
    const observer = new MutationObserver(() => {
      installResetButton();
      refreshResetButtonVisibility();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
