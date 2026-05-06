const state = {
  screen: "dashboard",
  category: "الكل",
  orderType: "سفري خارجي",
  payment: "نقدي",
  nextOrder: 1058,
  cart: [],
  orders: [
    { id: 1057, type: "بريستو", status: "قيد التجهيز", total: 66, cashier: "أحمد", time: "09:33 PM", items: [{ name: "Smokey Burger", qty: 2 }, { name: "Fries", qty: 2 }, { name: "Mirinda", qty: 2 }] },
    { id: 1056, type: "صالة", status: "قيد التجهيز", total: 35, cashier: "محمد", time: "09:32 PM", items: [{ name: "Chicken Grill", qty: 1 }, { name: "Fries", qty: 1 }, { name: "7up", qty: 1 }] },
    { id: 1055, type: "توصيل", status: "قيد التجهيز", total: 47, cashier: "أحمد", time: "09:31 PM", items: [{ name: "BBQ Burger", qty: 1 }, { name: "Onion Rings", qty: 1 }, { name: "Pepsi", qty: 1 }] },
    { id: 1054, type: "سفري خارجي", status: "جاهز", total: 68, cashier: "سالم", time: "09:30 PM", items: [{ name: "Smokey Burger", qty: 2 }, { name: "Fries", qty: 1 }, { name: "Pepsi", qty: 2 }] },
    { id: 1053, type: "سفري خارجي", status: "جاهز", total: 44, cashier: "سالم", time: "09:28 PM", items: [{ name: "Ribs", qty: 1 }, { name: "Water", qty: 2 }] },
    { id: 1051, type: "صالة", status: "جاهز", total: 70, cashier: "أحمد", time: "09:20 PM", items: [{ name: "Beef Steak", qty: 1 }, { name: "7up", qty: 2 }] },
    { id: 1050, type: "توصيل", status: "جاهز", total: 30, cashier: "محمد", time: "09:18 PM", items: [{ name: "Chicken Burger", qty: 1 }, { name: "Fries", qty: 1 }] }
  ]
};

const STORAGE_KEY = "smokey-pos-orders-v1";
const KITCHEN_BATCH_SIZE = 15;

const categories = ["الكل", "برجر", "مشويات", "مقليات", "مشروبات"];
const orderTypes = ["صالة", "توصيل", "سفري خارجي", "بريستو"];
const paymentMethods = ["نقدي", "بطاقة", "تحويل", "مختلط"];
const products = [
  { name: "Smokey Burger", price: 25, category: "برجر", station: "الگرل", icon: "🍔", available: true },
  { name: "BBQ Burger", price: 24, category: "برجر", station: "الگرل", icon: "🍔", available: true },
  { name: "Chicken Burger", price: 22, category: "برجر", station: "الگرل", icon: "🍔", available: true },
  { name: "Beef Steak", price: 45, category: "مشويات", station: "الگرل", icon: "🥩", available: true },
  { name: "Chicken Grill", price: 35, category: "مشويات", station: "الگرل", icon: "🍗", available: true },
  { name: "Ribs", price: 50, category: "مشويات", station: "الگرل", icon: "🥩", available: true },
  { name: "Fries", price: 8, category: "مقليات", station: "القلاية", icon: "🍟", available: true },
  { name: "Onion Rings", price: 10, category: "مقليات", station: "القلاية", icon: "🧅", available: true },
  { name: "Pepsi", price: 5, category: "مشروبات", station: "التجميع", icon: "🥤", available: true },
  { name: "7up", price: 5, category: "مشروبات", station: "التجميع", icon: "🥤", available: true },
  { name: "Mirinda", price: 5, category: "مشروبات", station: "التجميع", icon: "🥤", available: true },
  { name: "Water", price: 3, category: "مشروبات", station: "التجميع", icon: "💧", available: true }
];

const printers = [
  ["طابعة الكاشير", "الفاتورة الكاملة للزبون"],
  ["طابعة القلاية", "الأصناف الخاصة بالقلاية فقط"],
  ["طابعة الگرل", "الأصناف الخاصة بالگرل فقط"],
  ["طابعة التجميع", "الطلب كامل للمراجعة والتجهيز"],
  ["طابعة التسليم", "ملخص الطلب الجاهز أو رقم الطلب"]
];

const titles = {
  dashboard: "لوحة الإدارة",
  pos: "شاشة الكاشير",
  orders: "الطلبات",
  items: "إدارة الأصناف",
  kitchen: "شاشة التجميع",
  customer: "شاشة عرض الزبائن",
  printers: "إدارة الطابعات",
  reports: "التقارير",
  shifts: "الورديات"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatMoney(value) {
  return `${value} د.ل`;
}

function loadSavedOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.orders)) return;
    state.orders = saved.orders;
    state.nextOrder = Number(saved.nextOrder) || getNextOrderNumber();
    ensureKitchenBatches();
    saveOrders();
    $("#currentOrder").textContent = `#${state.nextOrder}`;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    orders: state.orders,
    nextOrder: state.nextOrder
  }));
}

function getNextOrderNumber() {
  const maxOrder = state.orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 1057);
  return maxOrder + 1;
}

function ensureKitchenBatches() {
  const sortedOrders = [...state.orders].sort((a, b) => a.id - b.id);
  let changed = false;
  sortedOrders.forEach((order, index) => {
    if (!Number.isFinite(Number(order.batchId))) {
      order.batchId = Math.floor(index / KITCHEN_BATCH_SIZE) + 1;
      changed = true;
    }
  });
  return changed;
}

function getNextBatchId() {
  ensureKitchenBatches();
  const maxBatch = state.orders.reduce((max, order) => Math.max(max, Number(order.batchId) || 1), 1);
  const ordersInLastBatch = state.orders.filter((order) => Number(order.batchId) === maxBatch).length;
  return ordersInLastBatch >= KITCHEN_BATCH_SIZE ? maxBatch + 1 : maxBatch;
}

function setScreen(screen) {
  state.screen = screen;
  document.body.classList.toggle("customer-mode", screen === "customer");
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === screen));
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.screen === screen));
  $("#pageTitle").textContent = titles[screen];
  $(".sidebar").classList.remove("open");
}

function renderButtons(container, values, active, onClick) {
  const root = $(container);
  root.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.className = value === active ? "active" : "";
    button.addEventListener("click", () => onClick(value));
    root.appendChild(button);
  });
}

function renderCategories() {
  renderButtons("#categories", categories, state.category, (value) => {
    state.category = value;
    renderCategories();
    renderProducts();
  });
}

function renderOrderTypes() {
  renderButtons("#orderTypes", orderTypes, state.orderType, (value) => {
    state.orderType = value;
    renderOrderTypes();
  });
}

function renderPaymentMethods() {
  renderButtons("#paymentMethods", paymentMethods, state.payment, (value) => {
    state.payment = value;
    renderPaymentMethods();
  });
}

function renderProducts() {
  const filtered = state.category === "الكل" ? products : products.filter((p) => p.category === state.category);
  $("#products").innerHTML = filtered.map((product) => `
    <button class="product-card" type="button" data-product="${product.name}">
      <span class="product-visual">${product.icon}</span>
      <strong>${product.name}</strong>
      <span>${formatMoney(product.price)}</span>
    </button>
  `).join("");

  $$("#products .product-card").forEach((card) => {
    card.addEventListener("click", () => addToCart(card.dataset.product));
  });
}

function addToCart(name) {
  const product = products.find((item) => item.name === name);
  const existing = state.cart.find((item) => item.name === name);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...product, qty: 1 });
  renderCart();
}

function changeQty(name, delta) {
  const item = state.cart.find((line) => line.name === name);
  if (!item) return;
  item.qty += delta;
  state.cart = state.cart.filter((line) => line.qty > 0);
  renderCart();
}

function renderCart() {
  const list = $("#cartItems");
  if (!state.cart.length) {
    list.innerHTML = `<p>لا توجد أصناف في السلة.</p>`;
  } else {
    list.innerHTML = state.cart.map((item) => `
      <div class="cart-line">
        <div>
          <strong>${item.name}</strong>
          <small>${item.station}</small>
        </div>
        <div class="qty-control">
          <button type="button" data-qty="${item.name}" data-delta="-1">-</button>
          <span>${item.qty}</span>
          <button type="button" data-qty="${item.name}" data-delta="1">+</button>
        </div>
        <strong>${formatMoney(item.price * item.qty)}</strong>
      </div>
    `).join("");
  }

  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  $("#subtotal").textContent = formatMoney(total);
  $("#total").textContent = formatMoney(total);
  $$("#cartItems button").forEach((button) => {
    button.addEventListener("click", () => changeQty(button.dataset.qty, Number(button.dataset.delta)));
  });
}

function confirmOrder() {
  if (!state.cart.length) return;
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  state.orders.unshift({
    id: state.nextOrder,
    type: state.orderType,
    status: "قيد التجهيز",
    total,
    cashier: "المدير",
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    batchId: getNextBatchId(),
    items: state.cart.map(({ name, qty }) => ({ name, qty }))
  });
  state.nextOrder += 1;
  state.cart = [];
  $("#currentOrder").textContent = `#${state.nextOrder}`;
  $("#orderNote").value = "";
  saveOrders();
  renderAll();
}

function markReady(id) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (order) order.status = "جاهز";
  saveOrders();
  renderAll();
}

function renderOrdersTable() {
  $("#ordersTable").innerHTML = state.orders.map((order) => `
    <tr>
      <td>#${order.id}</td>
      <td>${order.type}</td>
      <td>${formatMoney(order.total)}</td>
      <td><span class="status-pill ${order.status === "جاهز" ? "on" : order.status === "ملغي" ? "cancel" : "wait"}">${order.status}</span></td>
      <td>${order.cashier}</td>
    </tr>
  `).join("");
}

function renderItemsTable() {
  $("#itemsTable").innerHTML = products.map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.station}</td>
      <td>${formatMoney(product.price)}</td>
      <td><span class="status-pill on">متوفر</span></td>
    </tr>
  `).join("");
}

function renderKitchen() {
  ensureKitchenBatches();
  const making = state.orders
    .filter((order) => order.status === "قيد التجهيز")
    .sort((a, b) => a.id - b.id);
  $("#kitchenOrders").innerHTML = making.map((order) => `
    <article class="kitchen-card">
      <h3>#${order.id}</h3>
      <span class="status-pill wait">${order.type}</span>
      <p>${order.time}</p>
      <ul>${order.items.map((item) => `<li><span>${item.name}</span><b>${item.qty}x</b></li>`).join("")}</ul>
      <button class="primary-small" type="button" data-ready="${order.id}">الطلب جاهز</button>
    </article>
  `).join("");

  $$("#kitchenOrders button").forEach((button) => {
    button.addEventListener("click", () => markReady(button.dataset.ready));
  });

  $("#prepTotals").innerHTML = renderPrepGroups(making);
}

function renderPrepGroups(orders) {
  if (!orders.length) return `<p>لا توجد طلبات قيد التجهيز.</p>`;

  const groups = groupOrdersByBatch(orders);
  return groups.map(([batchId, group], index) => {
    const totals = getItemsTotals(group);
    const title = index === 0 ? "أول 15 أوردر" : "15 أوردر القادم";
    const range = `#${group[0].id} - #${group[group.length - 1].id}`;
    return `
      <section class="prep-group">
        <div class="prep-group-title">
          <strong>${title}</strong>
          <span>${range}</span>
        </div>
        ${Object.entries(totals).map(([name, qty]) => `
          <div class="prep-row"><span>${name}</span><strong>${qty}</strong></div>
        `).join("")}
      </section>
    `;
  }).join("");
}

function groupOrdersByBatch(orders) {
  const groups = new Map();
  orders.forEach((order) => {
    const batchId = Number(order.batchId) || 1;
    if (!groups.has(batchId)) groups.set(batchId, []);
    groups.get(batchId).push(order);
  });
  return [...groups.entries()]
    .sort(([batchA], [batchB]) => batchA - batchB)
    .map(([batchId, group]) => [batchId, group.sort((a, b) => a.id - b.id)]);
}

function getItemsTotals(orders) {
  return orders.reduce((totals, order) => {
    order.items.forEach((item) => {
      totals[item.name] = (totals[item.name] || 0) + item.qty;
    });
    return totals;
  }, {});
}

function renderCustomerDisplay() {
  const makingSource = state.orders
    .filter((order) => order.status === "قيد التجهيز")
    .sort((a, b) => a.id - b.id)
    .slice(0, 20);
  const readySource = state.orders
    .filter((order) => order.status === "جاهز")
    .sort((a, b) => a.id - b.id)
    .slice(0, 40);
  const ready = readySource.map((order) => ({ id: order.id }));
  const making = makingSource.map((order) => ({ id: order.id }));
  $("#readyOrders").innerHTML = ready.map((order) => `<div class="order-number">${order.id}</div>`).join("");
  $("#makingOrders").innerHTML = making.map((order) => `<div class="order-number">${order.id}</div>`).join("");
  $("#readyCount").textContent = ready.length;
  $("#makingCount").textContent = making.length;
  $("#ordersCount").textContent = state.orders.length + 140;
}

function renderPrinters() {
  $("#printersGrid").innerHTML = printers.map(([name, description]) => `
    <article class="printer-card">
      <h2>${name}</h2>
      <p>${description}</p>
      <span class="status-pill on">متصلة</span>
    </article>
  `).join("");
}

function renderAll() {
  renderCategories();
  renderOrderTypes();
  renderPaymentMethods();
  renderProducts();
  renderCart();
  renderOrdersTable();
  renderItemsTable();
  renderKitchen();
  renderCustomerDisplay();
  renderPrinters();
}

function init() {
  loadSavedOrders();
  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#loginView").classList.add("hidden");
  });
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.screen));
  });
  $("#clearCart").addEventListener("click", () => {
    state.cart = [];
    renderCart();
  });
  $("#confirmOrder").addEventListener("click", confirmOrder);
  $("#customerExit").addEventListener("click", () => setScreen("dashboard"));
  $(".menu-toggle").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  setInterval(() => {
    $("#clock").textContent = new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
  }, 1000);
  renderAll();
}

init();
