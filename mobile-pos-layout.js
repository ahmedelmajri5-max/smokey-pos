// Mobile POS UX: bottom-sheet cart and app-like mobile behavior.
(function () {
  const mq = window.matchMedia("(max-width: 780px)");
  let initialized = false;

  function getCartItemsCount() {
    return (Array.isArray(state.cart) ? state.cart : []).reduce((sum, item) => sum + (Number(item.qty ?? item.quantity ?? 1) || 1), 0);
  }

  function getCartTotal() {
    return Number((Array.isArray(state.cart) ? state.cart : []).reduce((sum, item) => {
      const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
      const price = Number(item.price ?? item.unitPrice ?? item.total ?? 0) || 0;
      return sum + qty * price;
    }, 0));
  }

  function money(value) {
    if (typeof formatMoney === "function") return formatMoney(value);
    return `${Number(value || 0)} د.ل`;
  }

  function ensureMobileElements() {
    if (!document.querySelector(".mobile-cart-backdrop")) {
      const backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "mobile-cart-backdrop";
      backdrop.setAttribute("aria-label", "إغلاق السلة");
      document.body.appendChild(backdrop);
    }

    if (!document.querySelector(".mobile-cart-fab")) {
      const fab = document.createElement("button");
      fab.type = "button";
      fab.className = "mobile-cart-fab";
      fab.innerHTML = `<span>🛒 عرض السلة</span><small>0 أصناف</small><strong>0 د.ل</strong>`;
      document.body.appendChild(fab);
    }
  }

  function isPosActive() {
    return document.querySelector("#pos.screen.active") !== null;
  }

  function refreshMobileState() {
    document.body.classList.toggle("pos-mobile-active", mq.matches && isPosActive());
    const fab = document.querySelector(".mobile-cart-fab");
    if (fab) {
      const count = getCartItemsCount();
      const total = getCartTotal();
      fab.innerHTML = `<span>🛒 عرض السلة</span><small>${count} ${count === 1 ? "صنف" : "أصناف"}</small><strong>${money(total)}</strong>`;
    }
  }

  function openCart() {
    if (!mq.matches) return;
    document.body.classList.add("mobile-cart-open");
    const collapse = document.querySelector("#cartCollapseToggle");
    if (collapse) {
      collapse.textContent = "×";
      collapse.setAttribute("aria-expanded", "true");
    }
  }

  function closeCart() {
    document.body.classList.remove("mobile-cart-open");
    const collapse = document.querySelector("#cartCollapseToggle");
    if (collapse) {
      collapse.textContent = "−";
      collapse.setAttribute("aria-expanded", "false");
    }
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    ensureMobileElements();

    document.addEventListener("click", (event) => {
      const fab = event.target.closest(".mobile-cart-fab");
      if (fab) {
        event.preventDefault();
        openCart();
        return;
      }

      const backdrop = event.target.closest(".mobile-cart-backdrop");
      if (backdrop) {
        event.preventDefault();
        closeCart();
        return;
      }

      const collapse = event.target.closest("#cartCollapseToggle");
      if (collapse && mq.matches) {
        event.preventDefault();
        document.body.classList.contains("mobile-cart-open") ? closeCart() : openCart();
      }

      const product = event.target.closest(".product-card");
      if (product && mq.matches) {
        setTimeout(refreshMobileState, 80);
      }

      const nav = event.target.closest(".nav-item");
      if (nav) {
        closeCart();
        setTimeout(refreshMobileState, 80);
      }
    }, true);

    const observer = new MutationObserver(() => refreshMobileState());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    window.addEventListener("resize", refreshMobileState);
    window.addEventListener("orientationchange", () => setTimeout(refreshMobileState, 250));
    mq.addEventListener?.("change", refreshMobileState);
  }

  window.addEventListener("load", () => {
    bind();
    refreshMobileState();
    console.log("Smokey POS mobile layout hotfix is active.");
  });
})();
