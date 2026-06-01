(function () {
  const messages = {
    order: "إنشاء الطلبات وتعديلها متاح فقط من المنظومة المحلية داخل المطعم.",
    print: "الطباعة متاحة فقط من المنظومة المحلية.",
    product: "تعديل الأصناف متاح فقط من المنظومة المحلية.",
    users: "إدارة المستخدمين متاحة فقط من المنظومة المحلية.",
    inventory: "إضافة كميات المخزون متاحة فقط للأدمن أو المشرف."
  };

  function canAddInventory() {
    const role = state.currentUser?.role || "";
    return role === "Admin" || role === "Manager / Supervisor" || role === "Manager" || role === "Supervisor";
  }

  function lockUi() {
    document.body.classList.add("external-read-only-mode");
    [
      "#confirmOrder",
      "#itemForm",
      "#userForm",
      "#inventoryForm",
      "[data-print-order]",
      "[data-edit-order]",
      "[data-delete-order]",
      "[data-ready]",
      "[data-edit-product]",
      "[data-product-status]",
      "[data-edit-user]",
      "[data-delete-user]",
      "[data-print-report]"
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.style.display = "none";
        element.setAttribute("aria-hidden", "true");
      });
    });

    document.querySelectorAll("[data-stock-add], [data-stock-add-input]").forEach((element) => {
      element.hidden = !canAddInventory();
    });
    document.querySelectorAll("[data-edit-inventory]").forEach((element) => {
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
    });
  }

  function blockEvent(event, message) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    alert(message);
  }

  function handleClick(event) {
    const target = event.target.closest(
      "#confirmOrder, [data-print-order], [data-edit-order], [data-delete-order], [data-ready], [data-edit-product], [data-edit-user], [data-delete-user], [data-print-report], [data-stock-add]"
    );
    if (!target) return;

    if (target.matches("[data-stock-add]")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!canAddInventory()) {
        alert(messages.inventory);
        return;
      }
      const itemId = target.dataset.stockAdd;
      const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(itemId));
      const input = document.querySelector(`[data-stock-add-input="${itemId}"]`);
      const quantity = Number(input?.value);
      if (!item || !Number.isFinite(quantity) || quantity <= 0) return;
      if (typeof window.addInventoryFromExternal !== "function") {
        alert("مزامنة المخزون غير جاهزة. حاول بعد لحظات.");
        return;
      }
      window.addInventoryFromExternal(item.id, quantity, `إضافة كمية واردة: ${item.name}`);
      input.value = "";
      return;
    }

    const message = target.matches("[data-print-order], [data-print-report]") ? messages.print
      : target.matches("[data-edit-product]") ? messages.product
      : target.matches("[data-edit-user], [data-delete-user]") ? messages.users
      : messages.order;
    blockEvent(event, message);
  }

  function handleSubmit(event) {
    if (event.target.matches("#itemForm")) blockEvent(event, messages.product);
    if (event.target.matches("#userForm")) blockEvent(event, messages.users);
    if (event.target.matches("#inventoryForm")) blockEvent(event, "تعديل مواد المخزون متاح فقط من المنظومة المحلية. من هنا يمكنك إضافة كمية واردة فقط.");
  }

  function handleChange(event) {
    if (event.target.matches("[data-product-status]")) blockEvent(event, messages.product);
  }

  document.addEventListener("click", handleClick, true);
  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("change", handleChange, true);

  const originalRenderAll = window.renderAll;
  if (typeof originalRenderAll === "function") {
    window.renderAll = function renderAllExternalLocked() {
      originalRenderAll();
      lockUi();
    };
  }

  const originalApplyUserPermissions = window.applyUserPermissions;
  if (typeof originalApplyUserPermissions === "function") {
    window.applyUserPermissions = function applyUserPermissionsExternalLocked() {
      const managerScreens = roleScreens["Manager / Supervisor"] || [];
      if (!managerScreens.includes("inventory")) managerScreens.push("inventory");
      originalApplyUserPermissions();
      lockUi();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lockUi);
  } else {
    lockUi();
  }
})();
