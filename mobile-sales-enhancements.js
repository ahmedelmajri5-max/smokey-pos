// Mobile POS and customer order enhancements for the Firebase experiment branch.
(function () {
  const CUSTOMER_QUERY_KEYS = ["customer", "public", "menu"];
  const MOBILE_CATEGORIES = ["الكل", "برغر", "دجاج", "سندوتشات", "تورتيلا", "سناكس", "مشروبات"];
  const FALLBACK_IMAGES = {
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80",
    chicken: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=700&q=80",
    wrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=700&q=80",
    fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80",
    drinks: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=80",
    default: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=700&q=80"
  };

  let originalRenderProducts = null;
  let originalRenderCategories = null;
  let originalRenderCart = null;
  let onlineUnsubscribe = null;
  let customerOrderUnsubscribe = null;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function getState() {
    return window.state || (typeof state !== "undefined" ? state : null);
  }

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function isCustomerLink() {
    const params = new URLSearchParams(location.search);
    return CUSTOMER_QUERY_KEYS.some((key) => params.get(key) === "1" || params.get(key) === "true") || location.hash === "#customer-order";
  }

  function isMobileLike() {
    return document.body.classList.contains("public-order-mode") || window.matchMedia("(max-width: 780px)").matches;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function formatMoneySafe(value) {
    if (typeof window.formatMoney === "function") return window.formatMoney(value);
    return `${Number(value || 0)} د.ل`;
  }

  function productImage(product) {
    if (product.imageData) return product.imageData;
    if (product.imageUrl) return product.imageUrl;
    const text = `${product.name || ""} ${product.category || ""}`;
    if (/مشروب|ميرندا|سفن|بيبسي|كوكا|ماء/.test(text)) return FALLBACK_IMAGES.drinks;
    if (/سناكس|بطاطا|بصل|أجنحة/.test(text)) return FALLBACK_IMAGES.fries;
    if (/تورتيلا|راب|تاكوس|توستر|رول/.test(text)) return FALLBACK_IMAGES.wrap;
    if (/دجاج|تشكن|فاهيتا|ستيك/.test(text)) return FALLBACK_IMAGES.chicken;
    if (/برغر|برجر/.test(text)) return FALLBACK_IMAGES.burger;
    return FALLBACK_IMAGES.default;
  }

  function regularLineFor(productName) {
    const s = getState();
    return s?.cart?.find((line) => line.name === productName && !(line.notes || []).length && !(line.modifiers || []).length) || null;
  }

  function cartQtyFor(productName) {
    const s = getState();
    return (s?.cart || []).filter((line) => line.name === productName).reduce((sum, line) => sum + Number(line.qty || 0), 0);
  }

  function refreshProductCounters() {
    $$("[data-mobile-product]").forEach((card) => {
      const qty = cartQtyFor(card.dataset.mobileProduct);
      const counter = card.querySelector("[data-mobile-counter]");
      if (counter) counter.textContent = qty;
      card.classList.toggle("has-qty", qty > 0);
    });
  }

  function addProduct(productName) {
    if (typeof window.addToCart === "function") window.addToCart(productName);
    else {
      const s = getState();
      const product = s.products.find((item) => item.name === productName);
      if (!product) return;
      const existing = regularLineFor(productName);
      if (existing) existing.qty += 1;
      else s.cart.push({ ...product, lineId: Date.now() + Math.random(), qty: 1, notes: [], modifiers: [] });
      if (typeof window.renderCart === "function") window.renderCart();
    }
    refreshProductCounters();
    updateMobileReviewBar();
  }

  function removeProduct(productName) {
    const s = getState();
    if (!s) return;
    const line = regularLineFor(productName) || [...s.cart].reverse().find((item) => item.name === productName);
    if (!line) return;
    line.qty -= 1;
    s.cart = s.cart.filter((item) => Number(item.qty || 0) > 0);
    if (typeof window.renderCart === "function") window.renderCart();
    refreshProductCounters();
    updateMobileReviewBar();
  }

  function openNotes(productName) {
    addProduct(productName);
    const line = regularLineFor(productName) || [...(getState()?.cart || [])].reverse().find((item) => item.name === productName);
    if (line && typeof window.openModifierEditor === "function") window.openModifierEditor(line.lineId);
  }

  function enhancedRenderCategories() {
    if (!isMobileLike() && typeof originalRenderCategories === "function") {
      originalRenderCategories();
      return;
    }
    const s = getState();
    const root = $("#categories");
    if (!s || !root) return;
    root.innerHTML = MOBILE_CATEGORIES.map((category) => `
      <button class="category-chip ${s.category === category ? "active" : ""}" type="button" data-mobile-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
    `).join("");
    $$('[data-mobile-category]', root).forEach((button) => {
      button.addEventListener("click", () => {
        s.category = button.dataset.mobileCategory;
        enhancedRenderCategories();
        if (typeof window.renderProducts === "function") window.renderProducts();
      });
    });
  }

  function enhancedRenderProducts() {
    if (!isMobileLike() && typeof originalRenderProducts === "function") {
      originalRenderProducts();
      return;
    }
    const s = getState();
    const root = $("#products");
    if (!s || !root) return;
    const available = (s.products || []).filter((product) => product.available !== false);
    const filtered = s.category === "الكل" ? available : available.filter((product) => product.category === s.category);
    root.innerHTML = filtered.map((product) => {
      const qty = cartQtyFor(product.name);
      return `
        <article class="mobile-menu-card ${qty ? "has-qty" : ""}" data-mobile-product="${escapeHtml(product.name)}">
          <button class="mobile-menu-image" type="button" data-add-mobile-product="${escapeHtml(product.name)}" aria-label="إضافة ${escapeHtml(product.name)}">
            <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.name)}" loading="lazy">
          </button>
          <div class="mobile-menu-info">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.category || "")} · ${formatMoneySafe(product.price)}</span>
          </div>
          <div class="mobile-menu-actions">
            <button class="round-action danger" type="button" data-dec-mobile-product="${escapeHtml(product.name)}" aria-label="ناقص">−</button>
            <b data-mobile-counter>${qty}</b>
            <button class="round-action" type="button" data-add-mobile-product="${escapeHtml(product.name)}" aria-label="زائد">+</button>
            <button class="note-action" type="button" data-note-mobile-product="${escapeHtml(product.name)}">ملاحظات</button>
          </div>
        </article>
      `;
    }).join("");
    if (!filtered.length) root.innerHTML = `<p class="empty-products">لا توجد أصناف في هذا التصنيف.</p>`;
    $$('[data-add-mobile-product]', root).forEach((button) => button.addEventListener("click", () => addProduct(button.dataset.addMobileProduct)));
    $$('[data-dec-mobile-product]', root).forEach((button) => button.addEventListener("click", () => removeProduct(button.dataset.decMobileProduct)));
    $$('[data-note-mobile-product]', root).forEach((button) => button.addEventListener("click", () => openNotes(button.dataset.noteMobileProduct)));
  }

  function ensureMobileReviewBar() {
    if ($("#mobileOrderReviewBar")) return;
    const pos = $("#pos");
    if (!pos) return;
    pos.insertAdjacentHTML("beforeend", `
      <div class="mobile-order-review-bar" id="mobileOrderReviewBar">
        <button type="button" id="openMobileCart">مراجعة السلة <span id="mobileCartCount">0</span></button>
        <strong id="mobileCartTotal">0 د.ل</strong>
        <button class="primary" type="button" id="mobileConfirmOrder">تأكيد الطلب</button>
      </div>
    `);
    $("#openMobileCart")?.addEventListener("click", () => document.body.classList.toggle("mobile-cart-open", true));
    $("#mobileConfirmOrder")?.addEventListener("click", () => $("#confirmOrder")?.click());
    $(".cart-panel")?.addEventListener("click", (event) => {
      if (event.target && event.target.id === "cartCollapseToggle") document.body.classList.toggle("mobile-cart-open", false);
    });
  }

  function updateMobileReviewBar() {
    ensureMobileReviewBar();
    const s = getState();
    if (!s) return;
    const qty = (s.cart || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const total = (s.cart || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
    const count = $("#mobileCartCount");
    const totalEl = $("#mobileCartTotal");
    if (count) count.textContent = qty;
    if (totalEl) totalEl.textContent = formatMoneySafe(total);
    document.body.classList.toggle("has-mobile-cart", qty > 0);
  }

  function enhanceRenderers() {
    if (typeof window.renderProducts === "function" && !originalRenderProducts) {
      originalRenderProducts = window.renderProducts;
      window.renderProducts = enhancedRenderProducts;
      try { renderProducts = enhancedRenderProducts; } catch (error) {}
    }
    if (typeof window.renderCategories === "function" && !originalRenderCategories) {
      originalRenderCategories = window.renderCategories;
      window.renderCategories = enhancedRenderCategories;
      try { renderCategories = enhancedRenderCategories; } catch (error) {}
    }
    if (typeof window.renderCart === "function" && !originalRenderCart) {
      originalRenderCart = window.renderCart;
      window.renderCart = function enhancedRenderCart() {
        originalRenderCart();
        refreshProductCounters();
        updateMobileReviewBar();
      };
      try { renderCart = window.renderCart; } catch (error) {}
    }
  }

  function injectProductImageField() {
    const iconSelect = $("#itemIcon");
    if (!iconSelect || $("#itemImageUrl")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "product-image-editor";
    wrapper.innerHTML = `
      <label><span>صورة الصنف</span><input id="itemImageUrl" type="url" placeholder="رابط الصورة أو ارفع صورة من الجهاز"></label>
      <label class="file-pick"><span>رفع صورة</span><input id="itemImageFile" type="file" accept="image/*"></label>
      <img id="itemImagePreview" alt="معاينة صورة الصنف">
      <small>لو ما أضفتش صورة، تظهر صورة تلقائية مؤقتة حسب التصنيف.</small>
    `;
    iconSelect.closest("label")?.insertAdjacentElement("afterend", wrapper);
    $("#itemImageFile")?.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        wrapper.dataset.imageData = String(reader.result || "");
        $("#itemImagePreview").src = wrapper.dataset.imageData;
        $("#itemImagePreview").classList.add("show");
      };
      reader.readAsDataURL(file);
    });
    $("#itemImageUrl")?.addEventListener("input", (event) => {
      const value = event.target.value.trim();
      if (value) {
        $("#itemImagePreview").src = value;
        $("#itemImagePreview").classList.add("show");
        wrapper.dataset.imageData = "";
      }
    });

    $("#itemForm")?.addEventListener("submit", () => {
      const name = $("#itemName")?.value.trim();
      const imageUrl = $("#itemImageUrl")?.value.trim() || "";
      const imageData = wrapper.dataset.imageData || "";
      const editingId = getState()?.editingProductId;
      setTimeout(() => {
        const s = getState();
        const product = (s?.products || []).find((item) => String(item.id) === String(editingId)) || (s?.products || []).find((item) => item.name === name);
        if (!product) return;
        if (imageData) {
          product.imageData = imageData;
          delete product.imageUrl;
        } else if (imageUrl) {
          product.imageUrl = imageUrl;
          delete product.imageData;
        }
        if (imageData || imageUrl) {
          if (typeof window.saveProducts === "function") window.saveProducts();
          if (typeof window.renderProducts === "function") window.renderProducts();
          if (typeof window.renderItemsTable === "function") window.renderItemsTable();
        }
        resetImageEditor();
      }, 80);
    }, true);

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest?.("[data-edit-product]");
      if (!editButton) return;
      setTimeout(() => {
        const product = (getState()?.products || []).find((item) => String(item.id) === String(editButton.dataset.editProduct));
        if (!product) return;
        $("#itemImageUrl").value = product.imageUrl || "";
        wrapper.dataset.imageData = product.imageData || "";
        const preview = $("#itemImagePreview");
        preview.src = product.imageData || product.imageUrl || productImage(product);
        preview.classList.add("show");
      }, 60);
    }, true);

    $("#cancelItemEdit")?.addEventListener("click", resetImageEditor);
  }

  function resetImageEditor() {
    const wrapper = $(".product-image-editor");
    const preview = $("#itemImagePreview");
    if ($("#itemImageUrl")) $("#itemImageUrl").value = "";
    if ($("#itemImageFile")) $("#itemImageFile").value = "";
    if (wrapper) wrapper.dataset.imageData = "";
    if (preview) {
      preview.removeAttribute("src");
      preview.classList.remove("show");
    }
  }

  function normalizeSettingsLabel() {
    const label = $("#mobileSettingsToggle b");
    if (label) label.textContent = "إعدادات";
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function installCustomerMode() {
    if (!isCustomerLink()) return;
    const s = getState();
    if (!s) return;
    document.body.classList.add("public-order-mode");
    s.currentUser = { name: "زبون", role: "Customer", status: "نشط" };
    s.orderType = "استلام";
    s.payment = "نقدي";
    $("#loginView")?.classList.add("hidden");
    if (typeof window.setScreen === "function") window.setScreen("pos");
    else $("#pos")?.classList.add("active");
    ensureCustomerHeader();
    ensureCustomerSubmit();
    enhancedRenderCategories();
    enhancedRenderProducts();
    updateMobileReviewBar();
  }

  function ensureCustomerHeader() {
    if ($("#customerOrderHeader")) return;
    const posProducts = $(".pos-products");
    if (!posProducts) return;
    posProducts.insertAdjacentHTML("afterbegin", `
      <section class="customer-order-header" id="customerOrderHeader">
        <h2>Smokey BBQ & Grill</h2>
        <p>اختار طلبك، وبعدها الكاشير يقبل الطلب ويطلع لك رقم الطلب.</p>
        <div class="customer-type-row">
          <button class="active" type="button" data-customer-type="استلام">استلام</button>
          <button type="button" data-customer-type="توصيل">توصيل</button>
        </div>
        <div class="customer-info-row">
          <input id="publicCustomerName" type="text" placeholder="الاسم">
          <input id="publicCustomerPhone" type="tel" inputmode="tel" placeholder="رقم الهاتف">
        </div>
        <textarea id="publicCustomerNote" rows="2" placeholder="ملاحظة للطلب أو العنوان لو توصيل"></textarea>
        <div class="customer-order-status" id="customerOrderStatus"></div>
      </section>
    `);
    $$('[data-customer-type]').forEach((button) => {
      button.addEventListener("click", () => {
        $$('[data-customer-type]').forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        getState().orderType = button.dataset.customerType;
      });
    });
  }

  function ensureCustomerSubmit() {
    if ($("#customerSubmitOrder")) return;
    const bar = $("#mobileOrderReviewBar") || $("#pos");
    if (!bar) return;
    $("#confirmOrder")?.classList.add("hidden-for-public");
    const button = document.createElement("button");
    button.id = "customerSubmitOrder";
    button.type = "button";
    button.className = "customer-submit-order";
    button.textContent = "إرسال الطلب للكاشير";
    button.addEventListener("click", submitCustomerOrder);
    bar.appendChild(button);
  }

  async function submitCustomerOrder() {
    const s = getState();
    const db = getDb();
    if (!db) {
      alert("الاتصال غير جاهز. حاول مرة ثانية.");
      return;
    }
    if (!s.cart.length) {
      alert("اختار صنف واحد على الأقل.");
      return;
    }
    const name = $("#publicCustomerName")?.value.trim() || "";
    const phone = $("#publicCustomerPhone")?.value.trim() || "";
    if (!name || !phone) {
      alert("اكتب الاسم ورقم الهاتف.");
      return;
    }
    const total = s.cart.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
    const payload = {
      status: "في انتظار الموافقة",
      type: s.orderType || "استلام",
      customer: { name, phone },
      note: $("#publicCustomerNote")?.value.trim() || "",
      items: s.cart.map(({ name, qty, price, notes, modifiers }) => ({ name, qty, price: Number(price) || 0, notes: notes || [], modifiers: modifiers || [] })),
      total,
      source: "customer-link",
      createdAt: Date.now()
    };
    const button = $("#customerSubmitOrder");
    if (button) button.disabled = true;
    try {
      const ref = await db.collection("onlineOrders").add(payload);
      localStorage.setItem("smokey-last-online-order", ref.id);
      s.cart = [];
      if (typeof window.renderCart === "function") window.renderCart();
      showCustomerStatus("تم إرسال الطلب. في انتظار موافقة الكاشير.");
      listenToCustomerOrder(ref.id);
    } catch (error) {
      console.warn("Customer order submit failed", error);
      alert("تعذر إرسال الطلب. تأكد من الإنترنت وحاول مرة ثانية.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function showCustomerStatus(message) {
    const status = $("#customerOrderStatus");
    if (status) status.textContent = message;
  }

  function listenToCustomerOrder(id) {
    const db = getDb();
    if (!db || !id) return;
    if (customerOrderUnsubscribe) customerOrderUnsubscribe();
    customerOrderUnsubscribe = db.collection("onlineOrders").doc(id).onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      if (data.status === "مقبول") showCustomerStatus(`تم قبول الطلب. رقم طلبك #${data.orderNumber || data.orderId || "-"}`);
      else if (data.status === "مرفوض") showCustomerStatus("تم رفض الطلب. الرجاء التواصل مع المطعم.");
      else showCustomerStatus("طلبك في انتظار موافقة الكاشير.");
    });
  }

  function installOnlineOrdersPanel() {
    if (isCustomerLink()) return;
    const db = getDb();
    if (!db || onlineUnsubscribe) return;
    const posProducts = $(".pos-products");
    if (!posProducts || $("#onlineOrdersPanel")) return;
    posProducts.insertAdjacentHTML("afterbegin", `
      <section class="online-orders-panel" id="onlineOrdersPanel">
        <div><strong>طلبات الزبائن أونلاين</strong><span>تحتاج موافقة الكاشير قبل دخول التجميع</span></div>
        <div id="onlineOrdersList"><p>لا توجد طلبات في الانتظار.</p></div>
      </section>
    `);
    onlineUnsubscribe = db.collection("onlineOrders").where("status", "==", "في انتظار الموافقة").onSnapshot((snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) })).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
      renderOnlineOrders(rows);
    }, (error) => console.warn("Online orders listener failed", error));
  }

  function renderOnlineOrders(rows) {
    const list = $("#onlineOrdersList");
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = `<p>لا توجد طلبات في الانتظار.</p>`;
      return;
    }
    list.innerHTML = rows.map((order) => `
      <article class="online-order-card">
        <div><strong>${escapeHtml(order.customer?.name || "زبون")}</strong><span>${escapeHtml(order.type || "-")} · ${escapeHtml(order.customer?.phone || "-")}</span></div>
        <small>${(order.items || []).map((item) => `${item.qty}x ${item.name}`).join("، ")}</small>
        <b>${formatMoneySafe(order.total)}</b>
        <div class="online-order-actions">
          <button type="button" data-approve-online="${escapeHtml(order.id)}">قبول</button>
          <button class="danger" type="button" data-decline-online="${escapeHtml(order.id)}">رفض</button>
        </div>
      </article>
    `).join("");
    $$('[data-approve-online]', list).forEach((button) => button.addEventListener("click", () => approveOnlineOrder(button.dataset.approveOnline)));
    $$('[data-decline-online]', list).forEach((button) => button.addEventListener("click", () => declineOnlineOrder(button.dataset.declineOnline)));
  }

  async function approveOnlineOrder(id) {
    const db = getDb();
    if (!db) return;
    const onlineRef = db.collection("onlineOrders").doc(id);
    try {
      const savedOrder = await db.runTransaction(async (transaction) => {
        const onlineSnap = await transaction.get(onlineRef);
        if (!onlineSnap.exists) throw new Error("ONLINE_ORDER_MISSING");
        const online = onlineSnap.data() || {};
        if (online.status !== "في انتظار الموافقة") throw new Error("ONLINE_ORDER_ALREADY_HANDLED");
        const counterRef = db.collection("counters").doc("orders");
        const counterSnap = await transaction.get(counterRef);
        const counter = counterSnap.exists ? counterSnap.data() || {} : {};
        const cycle = counter.activeCycle || counter.cycle || "legacy";
        let orderNumber = Math.max(Number(counter.next || getState()?.nextOrder || 1), 1);
        let orderRef = db.collection("orders").doc(`${cycle}-${orderNumber}`);
        let orderSnap = await transaction.get(orderRef);
        let guard = 0;
        while (orderSnap.exists && guard < 50) {
          orderNumber += 1;
          orderRef = db.collection("orders").doc(`${cycle}-${orderNumber}`);
          orderSnap = await transaction.get(orderRef);
          guard += 1;
        }
        const order = {
          id: orderNumber,
          orderNumber,
          orderCycle: cycle,
          firebaseDocId: `${cycle}-${orderNumber}`,
          type: online.type || "استلام",
          status: "قيد التجهيز",
          total: Number(online.total) || 0,
          cashier: getState()?.currentUser?.name || "الكاشير",
          createdBy: getState()?.currentUser?.name || "الكاشير",
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          payment: "نقدي",
          customer: online.customer || null,
          note: online.note || "",
          items: Array.isArray(online.items) ? online.items : [],
          source: "online",
          onlineOrderId: id,
          batchId: typeof window.getNextBatchId === "function" ? window.getNextBatchId() : 1,
          syncedAt: Date.now()
        };
        transaction.set(orderRef, order);
        transaction.set(counterRef, { next: orderNumber + 1, activeCycle: cycle, updatedAt: Date.now() }, { merge: true });
        transaction.update(onlineRef, { status: "مقبول", orderNumber, orderId: orderNumber, acceptedAt: Date.now(), acceptedBy: order.cashier });
        return order;
      });
      if (typeof window.deductInventoryForOrder === "function") window.deductInventoryForOrder(savedOrder);
      if (typeof window.printOrder === "function") window.printOrder(savedOrder, "طلب أونلاين مقبول");
      if (typeof window.renderAll === "function") window.renderAll();
    } catch (error) {
      console.warn("Approve online order failed", error);
      alert("تعذر قبول الطلب. حاول مرة ثانية.");
    }
  }

  async function declineOnlineOrder(id) {
    const db = getDb();
    if (!db) return;
    await db.collection("onlineOrders").doc(id).set({ status: "مرفوض", declinedAt: Date.now(), declinedBy: getState()?.currentUser?.name || "الكاشير" }, { merge: true });
  }

  ready(() => {
    enhanceRenderers();
    injectProductImageField();
    normalizeSettingsLabel();
    ensureMobileReviewBar();
    installCustomerMode();
    setTimeout(() => {
      installOnlineOrdersPanel();
      if (typeof window.renderCategories === "function") window.renderCategories();
      if (typeof window.renderProducts === "function") window.renderProducts();
      if (typeof window.renderCart === "function") window.renderCart();
    }, 250);
    window.addEventListener("resize", () => {
      if (typeof window.renderCategories === "function") window.renderCategories();
      if (typeof window.renderProducts === "function") window.renderProducts();
    });
  });
})();
