(function () {
  "use strict";

  const DEFAULT_USERS = [
    { id: "admin", name: "ادمن", email: "admin@smokey.local", password: "123456", role: "Admin", active: true },
    { id: "cashier1", name: "كاشير 1", email: "cashier1@smokey.local", password: "123456", role: "Cashier", active: true },
    { id: "cashier2", name: "كاشير 2", email: "cashier2@smokey.local", password: "123456", role: "Cashier", active: true },
    { id: "assembly", name: "تجميع", email: "assembly@smokey.local", password: "123456", role: "Order Assembly User", active: true },
    { id: "supervisor", name: "مشرف", email: "supervisor@smokey.local", password: "123456", role: "Manager / Supervisor", active: true }
  ];
  const BATCH_SIZE = 15;
  const $ = (selector) => document.querySelector(selector);
  const role = () => (window.state?.currentUser?.role === "Supervisor" ? "Manager / Supervisor" : window.state?.currentUser?.role || "Admin");
  const canQty = () => ["Admin", "Manager / Supervisor"].includes(role());
  const isAdmin = () => role() === "Admin";
  const pushOnce = (list, value) => Array.isArray(list) && !list.includes(value) && list.push(value);

  function ensureUsers() {
    if (!Array.isArray(window.state.users)) window.state.users = [];
    DEFAULT_USERS.forEach((user) => {
      const existing = window.state.users.find((item) => item.id === user.id || item.email === user.email);
      if (existing) {
        existing.role = existing.role === "Supervisor" ? "Manager / Supervisor" : existing.role || user.role;
        existing.password = existing.password || user.password;
        existing.active = existing.active !== false;
      } else {
        window.state.users.push({ ...user });
      }
    });
    try { if (typeof window.saveUsers === "function") window.saveUsers(); } catch (error) {}
  }

  function withSupervisorAsAdmin(callback) {
    if (role() !== "Manager / Supervisor") return callback();
    const original = window.state.currentUser;
    window.state.currentUser = { ...original, role: "Admin" };
    try { return callback(); } finally { window.state.currentUser = original; }
  }

  function patchPermissions() {
    try {
      if (typeof roles !== "undefined") {
        pushOnce(roles.Cashier, "عرض وطباعة تقرير الأصناف فقط");
        pushOnce(roles["Manager / Supervisor"], "إضافة وتعديل كميات المخزون");
      }
      if (typeof roleScreens !== "undefined") {
        pushOnce(roleScreens.Cashier, "reports");
        pushOnce(roleScreens["Manager / Supervisor"], "inventory");
      }
    } catch (error) {}

    const style = document.getElementById("online-permissions-dashboard-style") || document.createElement("style");
    style.id = "online-permissions-dashboard-style";
    style.textContent = "body.cashier-report-only #showSalesReport,body.cashier-report-only #showOpsReport,body.cashier-report-only [data-print-report='sales'],body.cashier-report-only [data-print-report='operations']{display:none!important}";
    if (!style.parentNode) document.head.appendChild(style);

    const originalApply = window.applyUserPermissions;
    if (typeof originalApply === "function" && !originalApply.__onlineV2) {
      window.applyUserPermissions = function () {
        originalApply();
        document.body.classList.toggle("cashier-report-only", role() === "Cashier");
      };
      window.applyUserPermissions.__onlineV2 = true;
    }

    const originalNormalize = window.normalizeUsers;
    if (typeof originalNormalize === "function" && !originalNormalize.__onlineV2) {
      window.normalizeUsers = function (users) {
        const normalized = originalNormalize(users);
        DEFAULT_USERS.forEach((user) => {
          const exists = normalized.some((item) => item.id === user.id || item.email === user.email);
          if (!exists) normalized.push({ ...user });
        });
        return normalized.map((user) => ({ ...user, role: user.role === "Supervisor" ? "Manager / Supervisor" : user.role }));
      };
      window.normalizeUsers.__onlineV2 = true;
    }

    window.canManageInventoryQuantities = canQty;
    window.canManageInventoryCatalog = isAdmin;
    ensureUsers();
    try { if (typeof window.applyUserPermissions === "function") window.applyUserPermissions(); } catch (error) {}
  }

  function patchReports() {
    const originalRender = window.renderReports;
    if (typeof originalRender === "function" && !originalRender.__onlineV2) {
      window.renderReports = function () {
        if (role() === "Cashier") window.state.currentReport = "items";
        return originalRender();
      };
      window.renderReports.__onlineV2 = true;
    }

    const originalPrint = window.printReport;
    if (typeof originalPrint === "function" && !originalPrint.__onlineV2) {
      window.printReport = function (type) {
        return originalPrint(role() === "Cashier" ? "items" : type);
      };
      window.printReport.__onlineV2 = true;
    }
  }

  function lockInventoryFields() {
    const catalog = new Set(["#inventoryName", "#inventoryType", "#inventoryUnit", "#inventoryActive", "#allowNegativeStock"]);
    ["#inventoryName", "#inventoryType", "#inventoryUnit", "#inventoryCurrentQty", "#inventoryMinimumQty", "#inventoryActive", "#allowNegativeStock"].forEach((selector) => {
      const field = $(selector);
      if (field) field.disabled = !canQty() || (!isAdmin() && catalog.has(selector));
    });
    document.querySelectorAll(".stock-add-input,.stock-add-button").forEach((field) => { field.disabled = !canQty(); });
  }

  function patchInventory() {
    const originalRender = window.renderInventory;
    if (typeof originalRender === "function" && !originalRender.__onlineV2) {
      window.renderInventory = function () {
        const result = originalRender();
        lockInventoryFields();
        return result;
      };
      window.renderInventory.__onlineV2 = true;
    }

    const originalSave = window.saveInventoryItem;
    if (typeof originalSave === "function" && !originalSave.__onlineV2) {
      window.saveInventoryItem = function (event) {
        if (!canQty()) {
          event.preventDefault();
          return;
        }
        if (role() === "Manager / Supervisor" && !window.state.editingInventoryId) {
          event.preventDefault();
          alert("المشرف يقدر يعدل كميات مواد موجودة فقط.");
          return;
        }
        return withSupervisorAsAdmin(() => originalSave(event));
      };
      window.saveInventoryItem.__onlineV2 = true;
    }

    const originalAdd = window.addInventoryPurchase;
    if (typeof originalAdd === "function" && !originalAdd.__onlineV2) {
      window.addInventoryPurchase = function (id) {
        if (!canQty()) return;
        return withSupervisorAsAdmin(() => originalAdd(id));
      };
      window.addInventoryPurchase.__onlineV2 = true;
    }
  }

  function dayRange() {
    if (typeof window.getBusinessDayRange === "function") return window.getBusinessDayRange(Date.now());
    const start = new Date(); start.setHours(1, 0, 0, 0);
    if (Date.now() < start.getTime()) start.setDate(start.getDate() - 1);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }

  function weekRange() {
    if (typeof window.getBusinessWeekRange === "function") return window.getBusinessWeekRange(Date.now());
    const range = dayRange();
    const start = new Date(range.start);
    start.setDate(start.getDate() - ((start.getDay() + 2) % 7));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start: start.getTime(), end: end.getTime() };
  }

  function averageBatchMinutes(orders) {
    const groups = {};
    (orders || []).forEach((order) => {
      const id = Number(order.batchId) || Math.floor(((Number(order.id) || 1) - 1) / BATCH_SIZE) + 1;
      (groups[id] ||= []).push(order);
    });
    const minutes = Object.values(groups)
      .filter((batch) => batch.length >= BATCH_SIZE && batch.every((order) => order.status !== "قيد التجهيز"))
      .map((batch) => {
        const starts = batch.map((order) => Number(order.createdAt) || 0).filter(Boolean);
        const ends = batch.map((order) => Number(order.readyAt || order.deletedAtMs || order.modifiedAtMs || 0)).filter(Boolean);
        if (!starts.length || !ends.length) return 0;
        return (Math.max(...ends) - Math.min(...starts)) / 60000;
      })
      .filter((value) => value > 0);
    if (!minutes.length) return 0;
    return Math.max(1, Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length));
  }

  function updateDashboardBatchMetrics() {
    const avgPrep = $("#avgPrepTime");
    if (avgPrep && !$("#avgBatchTime")) {
      const card = document.createElement("article");
      card.className = "mini-card";
      card.innerHTML = "<span>متوسط ورقة 15 طلب</span><strong id=\"avgBatchTime\">0 دقيقة</strong><small>من أول طلب في الورقة إلى اختفائها</small>";
      avgPrep.closest(".mini-card")?.after(card);
    }
    const weekTop = $("#weekTopItemCount");
    if (weekTop && !$("#weekAvgBatchTime")) {
      const card = document.createElement("article");
      card.className = "metric-card accent-blue";
      card.innerHTML = "<span>متوسط ورقة 15 طلب</span><strong id=\"weekAvgBatchTime\">0 دقيقة</strong>";
      weekTop.closest(".metric-card")?.after(card);
    }
    const day = dayRange();
    const week = weekRange();
    const orders = window.state?.orders || [];
    const todayOrders = orders.filter((order) => (Number(order.createdAt) || 0) >= day.start && (Number(order.createdAt) || 0) < day.end);
    const weekOrders = orders.filter((order) => (Number(order.createdAt) || 0) >= week.start && (Number(order.createdAt) || 0) < week.end);
    if ($("#avgBatchTime")) $("#avgBatchTime").textContent = `${averageBatchMinutes(todayOrders)} دقيقة`;
    if ($("#weekAvgBatchTime")) $("#weekAvgBatchTime").textContent = `${averageBatchMinutes(weekOrders)} دقيقة`;
  }

  function patchDashboard() {
    const originalRender = window.renderDashboard;
    if (typeof originalRender === "function" && !originalRender.__onlineV2) {
      window.renderDashboard = function () {
        const result = originalRender();
        updateDashboardBatchMetrics();
        return result;
      };
      window.renderDashboard.__onlineV2 = true;
    }
    updateDashboardBatchMetrics();
  }

  function init(tries = 50) {
    if (!window.state) {
      if (tries > 0) setTimeout(() => init(tries - 1), 100);
      return;
    }
    patchPermissions();
    patchReports();
    patchInventory();
    patchDashboard();
    try {
      if (typeof window.renderAll === "function") window.renderAll();
    } catch (error) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
  else init();
})();
