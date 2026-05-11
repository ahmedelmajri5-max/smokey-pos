(function () {
  "use strict";

  const DEFAULT_USERS = [
    { id: "admin", name: "ادمن", email: "admin@smokey.local", password: "123456", role: "Admin", active: true },
    { id: "cashier1", name: "كاشير 1", email: "cashier1@smokey.local", password: "123456", role: "Cashier", active: true },
    { id: "cashier2", name: "كاشير 2", email: "cashier2@smokey.local", password: "123456", role: "Cashier", active: true },
    { id: "assembly", name: "تجميع", email: "assembly@smokey.local", password: "123456", role: "Order Assembly User", active: true },
    { id: "supervisor", name: "مشرف", email: "supervisor@smokey.local", password: "123456", role: "Manager / Supervisor", active: true }
  ];
  const KITCHEN_BATCH_SIZE_FALLBACK = 15;

  function qs(selector) {
    return document.querySelector(selector);
  }

  function uniquePush(list, value) {
    if (Array.isArray(list) && !list.includes(value)) list.push(value);
  }

  function normalizeRoleName(role) {
    if (role === "Supervisor") return "Manager / Supervisor";
    return role;
  }

  function canManageInventoryQuantitiesOnline() {
    const role = normalizeRoleName(window.state?.currentUser?.role || "Admin");
    return role === "Admin" || role === "Manager / Supervisor";
  }

  function canManageInventoryCatalogOnline() {
    return normalizeRoleName(window.state?.currentUser?.role || "Admin") === "Admin";
  }

  function ensureOnlineUsers() {
    if (!window.state) return;
    if (!Array.isArray(window.state.users)) window.state.users = [];
    DEFAULT_USERS.forEach((user) => {
      const existing = window.state.users.find((item) => item.email === user.email || item.id === user.id);
      if (existing) {
        existing.role = normalizeRoleName(existing.role || user.role);
        existing.active = existing.active !== false;
        existing.password = existing.password || user.password;
      } else {
        window.state.users.push({ ...user });
      }
    });
    try {
      if (typeof window.saveUsers === "function") window.saveUsers();
    } catch (error) {
      console.warn("Unable to persist online default users", error);
    }
  }

  function patchUsersAndPermissions() {
    try {
      if (typeof roles !== "undefined") {
        uniquePush(roles.Cashier, "عرض وطباعة تقرير الأصناف فقط");
        uniquePush(roles["Manager / Supervisor"], "إضافة وتعديل كميات المخزون");
      }
    } catch (error) {
      console.warn("Unable to patch roles", error);
    }

    try {
      if (typeof roleScreens !== "undefined") {
        uniquePush(roleScreens.Cashier, "reports");
        uniquePush(roleScreens["Manager / Supervisor"], "inventory");
      }
    } catch (error) {
      console.warn("Unable to patch role screens", error);
    }

    try {
      const originalNormalizeUsers = window.normalizeUsers;
      if (typeof originalNormalizeUsers === "function" && !originalNormalizeUsers.__smokeyOnlinePatched) {
        window.normalizeUsers = function patchedNormalizeUsers(users) {
          const normalized = originalNormalizeUsers(users);
          DEFAULT_USERS.forEach((user) => {
            const existing = normalized.find((item) => item.email === user.email || item.id === user.id);
            if (existing) existing.role = normalizeRoleName(existing.role || user.role);
            else normalized.push({ ...user });
          });
          return normalized;
        };
        window.normalizeUsers.__smokeyOnlinePatched = true;
      }
    } catch (error) {
      console.warn("Unable to patch normalizeUsers", error);
    }

    try {
      const originalApplyUserPermissions = window.applyUserPermissions;
      if (typeof originalApplyUserPermissions === "function" && !originalApplyUserPermissions.__smokeyOnlinePatched) {
        window.applyUserPermissions = function patchedApplyUserPermissions() {
          originalApplyUserPermissions();
          document.body.classList.toggle("cashier-report-only", window.state?.currentUser?.role === "Cashier");
        };
        window.applyUserPermissions.__smokeyOnlinePatched = true;
      }
    } catch (error) {
      console.warn("Unable to patch permission UI", error);
    }

    window.canManageInventoryQuantities = canManageInventoryQuantitiesOnline;
    window.canManageInventoryCatalog = canManageInventoryCatalogOnline;
    ensureOnlineUsers();
    try {
      if (typeof window.applyUserPermissions === "function") window.applyUserPermissions();
    } catch (error) {
      console.warn("Unable to refresh permissions", error);
    }
  }

  function injectOnlineStyles() {
    if (document.getElementById("online-permissions-dashboard-style")) return;
    const style = document.createElement("style");
    style.id = "online-permissions-dashboard-style";
    style.textContent = `
      body.cashier-report-only #showSalesReport,
      body.cashier-report-only #showOpsReport,
      body.cashier-report-only [data-print-report="sales"],
      body.cashier-report-only [data-print-report="operations"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function patchReports() {
    try {
      const originalRenderReports = window.renderReports;
      if (typeof originalRenderReports === "function" && !originalRenderReports.__smokeyOnlinePatched) {
        window.renderReports = function patchedRenderReports() {
          if (window.state?.currentUser?.role === "Cashier") window.state.currentReport = "items";
          return originalRenderReports();
        };
        window.renderReports.__smokeyOnlinePatched = true;
      }

      const originalPrintReport = window.printReport;
      if (typeof originalPrintReport === "function" && !originalPrintReport.__smokeyOnlinePatched) {
        window.printReport = function patchedPrintReport(type) {
          const selectedType = window.state?.currentUser?.role === "Cashier" ? "items" : (type || window.state?.currentReport);
          return originalPrintReport(selectedType);
        };
        window.printReport.__smokeyOnlinePatched = true;
      }
    } catch (error) {
      console.warn("Unable to patch reports", error);
    }
  }

  function patchInventory() {
    try {
      const originalRenderInventory = window.renderInventory;
      if (typeof originalRenderInventory === "function" && !originalRenderInventory.__smokeyOnlinePatched) {
        window.renderInventory = function patchedRenderInventory() {
          const result = originalRenderInventory();
          applyInventoryFieldPermissions();
          return result;
        };
        window.renderInventory.__smokeyOnlinePatched = true;
      }

      const originalAddInventoryPurchase = window.addInventoryPurchase;
      if (typeof originalAddInventoryPurchase === "function" && !originalAddInventoryPurchase.__smokeyOnlinePatched) {
        window.addInventoryPurchase = function patchedAddInventoryPurchase(id) {
          if (!canManageInventoryQuantitiesOnline()) return;
          const originalUser = window.state?.currentUser;
          if (originalUser && normalizeRoleName(originalUser.role) === "Manager / Supervisor") {
            window.state.currentUser = { ...originalUser, role: "Admin" };
            try {
              return originalAddInventoryPurchase(id);
            } finally {
              window.state.currentUser = originalUser;
            }
          }
          return originalAddInventoryPurchase(id);
        };
        window.addInventoryPurchase.__smokeyOnlinePatched = true;
      }
    } catch (error) {
      console.warn("Unable to patch inventory", error);
    }
  }

  function applyInventoryFieldPermissions() {
    const canManageQty = canManageInventoryQuantitiesOnline();
    const canManageCatalog = canManageInventoryCatalogOnline();
    const catalogFields = new Set(["#inventoryName", "#inventoryType", "#inventoryUnit", "#inventoryActive", "#allowNegativeStock"]);
    ["#inventoryName", "#inventoryType", "#inventoryUnit", "#inventoryCurrentQty", "#inventoryMinimumQty", "#inventoryActive", "#allowNegativeStock"].forEach((selector) => {
      const field = qs(selector);
      if (!field) return;
      field.disabled = !canManageQty || (!canManageCatalog && catalogFields.has(selector));
    });

    document.querySelectorAll(".stock-add-input, .stock-add-button").forEach((field) => {
      field.disabled = !canManageQty;
    });
  }

  function getBatchId(order) {
    const size = Number(window.KITCHEN_BATCH_SIZE || KITCHEN_BATCH_SIZE_FALLBACK);
    return Number(order.batchId) || Math.floor(((Number(order.id) || 1) - 1) / size) + 1;
  }

  function getAverageBatchMinutesOnline(orders) {
    const size = Number(window.KITCHEN_BATCH_SIZE || KITCHEN_BATCH_SIZE_FALLBACK);
    const batches = {};
    (orders || []).forEach((order) => {
      const batchId = getBatchId(order);
      if (!batches[batchId]) batches[batchId] = [];
      batches[batchId].push(order);
    });

    const minutes = Object.values(batches)
      .filter((batch) => batch.length >= size && batch.every((order) => order.status !== "قيد التجهيز"))
      .map((batch) => {
        const starts = batch.map((order) => Number(order.createdAt) || 0).filter(Boolean);
        const ends = batch.map((order) => Number(order.readyAt || order.deletedAtMs || order.modifiedAtMs || 0)).filter(Boolean);
        const start = starts.length ? Math.min(...starts) : 0;
        const end = ends.length ? Math.max(...ends) : 0;
        return start && end && end >= start ? (end - start) / 60000 : 0;
      })
      .filter((value) => value > 0);

    if (!minutes.length) return 0;
    const total = minutes.reduce((sum, value) => sum + value, 0);
    return Math.max(1, Math.round(total / minutes.length));
  }

  function getDayRangeForDashboard() {
    if (typeof window.getBusinessDayRange === "function") return window.getBusinessDayRange(Date.now());
    const start = new Date();
    start.setHours(1, 0, 0, 0);
    if (Date.now() < start.getTime()) start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }

  function getWeekRangeForDashboard() {
    if (typeof window.getBusinessWeekRange === "function") return window.getBusinessWeekRange(Date.now());
    const dayRange = getDayRangeForDashboard();
    const start = new Date(dayRange.start);
    const diff = (start.getDay() + 2) % 7;
    start.setDate(start.getDate() - diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: start.getTime(), end: end.getTime() };
  }

  function insertBatchMetricCards() {
    const avgPrep = qs("#avgPrepTime");
    if (avgPrep && !qs("#avgBatchTime")) {
      const card = document.createElement("article");
      card.className = "mini-card";
      card.innerHTML = "<span>متوسط ورقة 15 طلب</span><strong id=\"avgBatchTime\">0 دقيقة</strong><small>من أول طلب في الورقة إلى اختفائها</small>";
      avgPrep.closest(".mini-card")?.after(card);
    }

    const weekTop = qs("#weekTopItemCount");
    if (weekTop && !qs("#weekAvgBatchTime")) {
      const card = document.createElement("article");
      card.className = "metric-card accent-blue";
      card.innerHTML = "<span>متوسط ورقة 15 طلب</span><strong id=\"weekAvgBatchTime\">0 دقيقة</strong>";
      weekTop.closest(".metric-card")?.after(card);
    }
  }

  function updateBatchMetrics() {
    if (!window.state?.orders) return;
    insertBatchMetricCards();
    const dayRange = getDayRangeForDashboard();
    const weekRange = getWeekRangeForDashboard();
    const todayOrders = window.state.orders.filter((order) => (Number(order.createdAt) || 0) >= dayRange.start && (Number(order.createdAt) || 0) < dayRange.end);
    const weekOrders = window.state.orders.filter((order) => (Number(order.createdAt) || 0) >= weekRange.start && (Number(order.createdAt) || 0) < weekRange.end);
    const dayTarget = qs("#avgBatchTime");
    const weekTarget = qs("#weekAvgBatchTime");
    if (dayTarget) dayTarget.textContent = `${getAverageBatchMinutesOnline(todayOrders)} دقيقة`;
    if (weekTarget) weekTarget.textContent = `${getAverageBatchMinutesOnline(weekOrders)} دقيقة`;
  }

  function patchDashboard() {
    try {
      const originalRenderDashboard = window.renderDashboard;
      if (typeof originalRenderDashboard === "function" && !originalRenderDashboard.__smokeyOnlinePatched) {
        window.renderDashboard = function patchedRenderDashboard() {
          const result = originalRenderDashboard();
          updateBatchMetrics();
          return result;
        };
        window.renderDashboard.__smokeyOnlinePatched = true;
      }
      updateBatchMetrics();
    } catch (error) {
      console.warn("Unable to patch dashboard", error);
    }
  }

  function initOnlinePatch(attemptsLeft) {
    if (!window.state) {
      if (attemptsLeft > 0) window.setTimeout(() => initOnlinePatch(attemptsLeft - 1), 100);
      return;
    }
    injectOnlineStyles();
    patchUsersAndPermissions();
    patchReports();
    patchInventory();
    patchDashboard();
    try {
      if (typeof window.renderAll === "function") window.renderAll();
      else {
        if (typeof window.renderUsers === "function") window.renderUsers();
        if (typeof window.renderReports === "function") window.renderReports();
        if (typeof window.renderInventory === "function") window.renderInventory();
        if (typeof window.renderDashboard === "function") window.renderDashboard();
      }
    } catch (error) {
      console.warn("Unable to refresh online patch UI", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initOnlinePatch(50));
  } else {
    initOnlinePatch(50);
  }
})();
