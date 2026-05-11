// Loads historical orders only when the user opens a date filter/report range.
(function () {
  if (window.__smokeyOrderRangeLoader) return;
  window.__smokeyOrderRangeLoader = true;

  const loadedRanges = new Set();
  const pendingRanges = new Set();
  const LIMIT = 350;

  function getState() {
    try { return window.state || (typeof state !== "undefined" ? state : null); }
    catch { return window.state || null; }
  }

  function getDb() {
    if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
    return window.firebase.app().firestore();
  }

  function toMillis(value) {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (value && typeof value.toMillis === "function") return value.toMillis();
    if (value && typeof value.seconds === "number") return value.seconds * 1000;
    return 0;
  }

  function rangeKey(range) {
    return `${Number(range?.start || 0)}-${Number(range?.end || 0)}`;
  }

  function normalizeOrder(doc) {
    const data = doc.data() || {};
    const id = Number(data.orderNumber || data.id || 0);
    return {
      ...data,
      id,
      orderNumber: id,
      firebaseDocId: data.firebaseDocId || doc.id,
      createdAt: toMillis(data.createdAt) || Number(data.createdAt) || Date.now(),
      modifiedAtMs: toMillis(data.updatedAt || data.modifiedAtMs) || Number(data.modifiedAtMs || 0) || undefined,
      deletedAtMs: toMillis(data.canceledAt || data.deletedAtMs) || Number(data.deletedAtMs || 0) || undefined,
      cashier: data.cashier || data.createdBy || "المدير",
      items: Array.isArray(data.items) ? data.items : []
    };
  }

  function mergeOrders(orders) {
    const s = getState();
    if (!s) return;
    const refs = new Set(orders.map((order) => String(order.firebaseDocId || order.id)));
    const kept = (Array.isArray(s.orders) ? s.orders : []).filter((order) => !refs.has(String(order.firebaseDocId || order.id)));
    s.orders = [...orders, ...kept].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    try { if (typeof window.saveOrders === "function") window.saveOrders(); } catch {}
  }

  async function ensureRange(range) {
    const db = getDb();
    if (!db || !range) return;
    const key = rangeKey(range);
    if (loadedRanges.has(key) || pendingRanges.has(key)) return;
    pendingRanges.add(key);
    try {
      const snap = await db.collection("orders")
        .where("createdAt", ">=", Number(range.start))
        .where("createdAt", "<", Number(range.end))
        .orderBy("createdAt", "desc")
        .limit(LIMIT)
        .get();
      mergeOrders(snap.docs.map(normalizeOrder));
      loadedRanges.add(key);
      try { if (typeof window.renderAll === "function") window.renderAll(); } catch {}
    } catch (error) {
      console.warn("Smokey order range load failed", error);
    } finally {
      pendingRanges.delete(key);
    }
  }

  function patchWhenReady() {
    if (typeof window.renderOrdersTable === "function" && !window.renderOrdersTable.__rangeLoaderPatched) {
      const originalRenderOrdersTable = window.renderOrdersTable;
      window.renderOrdersTable = function renderOrdersTableWithRangeLoader() {
        try { if (typeof window.getOrdersDateRange === "function") ensureRange(window.getOrdersDateRange()); } catch {}
        return originalRenderOrdersTable.apply(this, arguments);
      };
      window.renderOrdersTable.__rangeLoaderPatched = true;
      try { renderOrdersTable = window.renderOrdersTable; } catch {}
    }

    if (typeof window.renderReports === "function" && !window.renderReports.__rangeLoaderPatched) {
      const originalRenderReports = window.renderReports;
      window.renderReports = function renderReportsWithRangeLoader() {
        try { if (typeof window.getReportRange === "function") ensureRange(window.getReportRange()); } catch {}
        return originalRenderReports.apply(this, arguments);
      };
      window.renderReports.__rangeLoaderPatched = true;
      try { renderReports = window.renderReports; } catch {}
    }
  }

  patchWhenReady();
  window.addEventListener("load", patchWhenReady);
  setTimeout(patchWhenReady, 500);

  window.loadSmokeyOrdersRange = ensureRange;
  console.log("Smokey Firebase order range loader loaded.");
})();
