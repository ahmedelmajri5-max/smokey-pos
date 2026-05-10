// Admin-only order number reset control for the Firebase test branch.
// Resets the next visible order number to #1 without deleting, hiding, or archiving orders.
(function () {
  const RESET_BUTTON_ID = "resetOrderNumbers";

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

  function isAdmin() {
    const appState = getState();
    return Boolean(appState && appState.currentUser && appState.currentUser.role === "Admin");
  }

  function setCurrentOrderLabel(next) {
    const value = Number(next) || 1;
    const appState = getState();
    if (appState) appState.nextOrder = value;
    const currentOrder = document.querySelector("#currentOrder");
    if (currentOrder) currentOrder.textContent = `#${value}`;
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

    const ok = confirm(
      "هل أنت متأكد من تصفير رقم الطلب القادم؟\n\n" +
      "الطلب القادم سيبدأ من #1.\n" +
      "لن يتم حذف أي طلب، ولن يتم إخفاء أي طلب، وستبقى كل الطلبات القديمة ظاهرة في الطلبات والتقارير حسب التاريخ والوقت."
    );
    if (!ok) return;

    const finalOk = confirm("تأكيد أخير: سيتم فقط جعل رقم الطلب القادم #1، بدون حذف أي بيانات.");
    if (!finalOk) return;

    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "جاري التصفير...";

    try {
      const resetBy = appState.currentUser.email || appState.currentUser.name || "Admin";
      const newCycle = `cycle-${Date.now()}`;
      await db.collection("counters").doc("orders").set({
        next: 1,
        activeCycle: newCycle,
        resetAt: Date.now(),
        resetBy
      }, { merge: true });

      appState.nextOrder = 1;
      setCurrentOrderLabel(1);
      if (typeof renderAll === "function") renderAll();
      alert("تم تصفير رقم الطلب القادم إلى #1 بدون حذف أو إخفاء الطلبات القديمة.");
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

  function startCounterLabelListener() {
    const db = getDb();
    if (!db || window.__smokeyOrderResetCounterListener) return;
    window.__smokeyOrderResetCounterListener = true;
    db.collection("counters").doc("orders").onSnapshot((doc) => {
      const data = doc.exists ? doc.data() || {} : {};
      if (data.next) setCurrentOrderLabel(Number(data.next) || 1);
    }, (error) => console.warn("Order reset counter listener failed:", error));
  }

  function boot() {
    installResetButton();
    refreshResetButtonVisibility();
    startCounterLabelListener();
    const observer = new MutationObserver(() => {
      installResetButton();
      refreshResetButtonVisibility();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
