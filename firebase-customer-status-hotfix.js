// Keeps the public customer status panel attached to the latest submitted online order.
(function () {
  const ONLINE_WAITING = "في انتظار الموافقة";
  const ONLINE_ACCEPTED = "مقبول";
  const ONLINE_DECLINED = "مرفوض";
  const MAKING = "قيد التجهيز";
  const READY = "جاهز";
  const CANCELED = "ملغي";
  let watchedId = "";
  let unsubscribe = null;

  function isCustomerPage() {
    const params = new URLSearchParams(location.search);
    return params.get("customer") === "1" || params.get("public") === "1" || params.get("menu") === "1" || location.hash === "#customer-order" || document.body.classList.contains("public-order-mode");
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function setStatus(message) {
    const el = document.querySelector("#customerOrderStatus");
    if (el) el.textContent = message;
  }

  function renderStatus(data) {
    const status = data.liveStatus || data.status;
    if (status === ONLINE_WAITING) setStatus("طلبك في انتظار موافقة الكاشير.");
    else if (status === MAKING || data.status === ONLINE_ACCEPTED) setStatus(`تمت الموافقة على طلبك. رقم الطلب #${data.orderNumber || data.orderId || "-"} والطلب قيد التجهيز.`);
    else if (status === READY) setStatus(data.type === "توصيل" ? "طلبكم جاهز بانتظار الدليفري." : "طلبكم جاهز.");
    else if (status === CANCELED) setStatus("تم إلغاء الطلب. الرجاء التواصل مع المطعم.");
    else if (status === ONLINE_DECLINED) setStatus("تم رفض الطلب. الرجاء التواصل مع المطعم.");
  }

  function attachLatestOrder() {
    if (!isCustomerPage()) return;
    const db = getDb();
    const id = localStorage.getItem("smokey-last-online-order") || "";
    if (!db || !id || id === watchedId) return;
    watchedId = id;
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection("onlineOrders").doc(id).onSnapshot((doc) => {
      if (doc.exists) renderStatus(doc.data() || {});
    }, (error) => console.warn("Customer order status listener failed", error));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachLatestOrder, { once: true });
  else attachLatestOrder();
  setInterval(attachLatestOrder, 1000);
})();
