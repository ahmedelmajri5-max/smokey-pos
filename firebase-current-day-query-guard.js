// Limits heavy realtime listeners to the active business day before the bridge starts them.
(function () {
  if (!window.firebase || !window.firebase.firestore || window.__smokeyCurrentDayQueryGuard) return;
  window.__smokeyCurrentDayQueryGuard = true;

  function businessRange(reference = new Date()) {
    const start = new Date(reference);
    start.setHours(1, 0, 0, 0);
    if (reference.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }

  const CollectionRef = window.firebase.firestore.CollectionReference;
  if (!CollectionRef || !CollectionRef.prototype) return;

  const originalOrderBy = CollectionRef.prototype.orderBy;
  const originalOnSnapshot = CollectionRef.prototype.onSnapshot;

  CollectionRef.prototype.orderBy = function guardedOrderBy(fieldPath, directionStr) {
    if (this.path === "orders" && String(fieldPath) === "createdAt") {
      const range = businessRange();
      return this
        .where("createdAt", ">=", range.start)
        .where("createdAt", "<", range.end)
        .orderBy(fieldPath, directionStr);
    }
    return originalOrderBy.apply(this, arguments);
  };

  CollectionRef.prototype.onSnapshot = function guardedCollectionSnapshot() {
    if (this.path === "inventoryTransactions") {
      const range = businessRange();
      const query = this
        .where("created_at_ms", ">=", range.start)
        .where("created_at_ms", "<", range.end)
        .orderBy("created_at_ms", "desc")
        .limit(250);
      return query.onSnapshot.apply(query, arguments);
    }
    return originalOnSnapshot.apply(this, arguments);
  };

  console.log("Smokey Firebase current-day query guard loaded.");
})();
