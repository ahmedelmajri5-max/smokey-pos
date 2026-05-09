// Mobile POS UX: bottom-sheet cart and app-like mobile behavior.
// Fixed: no global MutationObserver loop. Refresh is throttled and only reads cart state.
(function () {
  const mq = window.matchMedia("(max-width: 780px)");
  let initialized = false;
  let refreshQueued = false;
  let lastFabHtml = "";
  let lastPosActive = null;

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

  function refreshMobileStateNow() {
    refreshQueued = false;

    const shouldBePosActive = Boolean(mq.matches && isPosActive());
    if (lastPosActive !== shouldBePosActive) {
      document.body.classList.toggle("pos-mobile-active", shouldBePosActive);
      lastPosActive = shouldBePosActive;
    }

    const fab = document.querySelector(".mobile-cart-fab");
    if (fab) {
      const count = getCartItemsCount();
      const total = getCartTotal();
      const nextHtml = `<span>🛒 عرض السلة</span><small>${count} ${count === 1 ? "صنف" : "أصناف"}</small><strong>${money(total)}</strong>`;
      if (nextHtml !== lastFabHtml) {
        fab.innerHTML = nextHtml;
        lastFabHtml = nextHtml;
      }
    }
  }

  function refreshMobileState() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(refreshMobileStateNow);
  }

  function openCart() {
    if (!mq.matches) return;
    if (!document.body.classList.contains("mobile-cart-open")) {
      document.body.classList.add("mobile-cart-open");
    }
    const collapse = document.querySelector("#cartCollapseToggle");
    if (collapse) {
      collapse.textContent = "×";
      collapse.setAttribute("aria-expanded", "true");
    }
  }

  function closeCart() {
    if (document.body.classList.contains("mobile-cart-open")) {
      document.body.classList.remove("mobile-cart-open");
    }
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
      const target = event.target;
      if (!target || !target.closest) return;

      const fab = target.closest(".mobile-cart-fab");
      if (fab) {
        event.preventDefault();
        openCart();
        refreshMobileState();
        return;
      }

      const backdrop = target.closest(".mobile-cart-backdrop");
      if (backdrop) {
        event.preventDefault();
        closeCart();
        refreshMobileState();
        return;
      }

      const collapse = target.closest("#cartCollapseToggle");
      if (collapse && mq.matches) {
        event.preventDefault();
        document.body.classList.contains("mobile-cart-open") ? closeCart() : openCart();
        refreshMobileState();
        return;
      }

      if (target.closest(".product-card") || target.closest(".qty-control") || target.closest("#clearCart") || target.closest(".pay-row button")) {
        setTimeout(refreshMobileState, 120);
      }

      if (target.closest(".nav-item")) {
        closeCart();
        setTimeout(refreshMobileState, 80);
      }
    }, true);

    // Watch only screen class changes, not the whole body subtree. This avoids freezing loops.
    document.querySelectorAll(".screen").forEach((screen) => {
      new MutationObserver(refreshMobileState).observe(screen, { attributes: true, attributeFilter: ["class"] });
    });

    // Lightweight timer just for cart count changes caused by app.js rendering.
    setInterval(refreshMobileState, 1000);

    window.addEventListener("resize", refreshMobileState);
    window.addEventListener("orientationchange", () => setTimeout(refreshMobileState, 250));
    mq.addEventListener?.("change", refreshMobileState);
  }

  window.addEventListener("load", () => {
    bind();
    refreshMobileState();
    console.log("Smokey POS mobile layout hotfix is active without freeze loop.");
  });
})();
