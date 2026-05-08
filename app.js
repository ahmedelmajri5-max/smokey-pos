const state = {
  screen: "dashboard",
  category: "الكل",
  orderType: "سفري خارجي",
  customerInfo: { name: "", phone: "" },
  payment: "نقدي",
  currentUser: null,
  nextOrder: 1,
  cart: [],
  orderSearch: "",
  orderStatusFilter: "الكل",
  orderDateFilter: "",
  editingOrderId: null,
  editingUserEmail: null,
  currentReport: "items",
  editingInventoryId: null,
  users: [
    { name: "المدير", email: "admin@smokey.local", password: "123456", role: "Admin", status: "نشط" },
    { name: "أحمد محمد", email: "cashier@smokey.local", password: "123456", role: "Cashier", status: "نشط" },
    { name: "قسم التجميع", email: "assembly@smokey.local", password: "123456", role: "Order Assembly User", status: "نشط" }
  ],
  products: [
    { id: 1, name: "برغر كلاسيك", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["شريحة برغر 120 غرام", "سلطة", "فلفل مشوي", "طماطم مشوي", "جبنة شرائح", "صوص", "خبزة برغر"], available: true },
    { id: 2, name: "برغر دبل", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["2 شريحة برغر 120 غرام", "سلطة", "فلفل مشوي", "طماطم مشوي", "جبنة شرائح", "صوص", "خبزة برغر"], available: true },
    { id: 3, name: "برغر تربل", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["3 شرائح برغر 120 غرام", "سلطة", "فلفل مشوي", "طماطم مشوي", "جبنة شرائح", "صوص", "خبزة برغر"], available: true },
    { id: 4, name: "برغر ماك", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["شريحة برغر 120 غرام", "فلفل هلابينو", "سلطة", "جبنة شرائح", "صوص ماك", "خبزة برغر"], available: true },
    { id: 5, name: "برغر بيق ماك", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["2 شريحة برغر 120 غرام", "فلفل هلابينو", "سلطة", "جبنة شرائح", "صوص ماك", "خبزة برغر"], available: true },
    { id: 6, name: "برغر أجبان", price: 0, category: "برغر", station: "الگرل", icon: "🧀", ingredients: ["شريحة برغر 120 غرام", "سلطة", "3 أنواع جبنة", "صوص", "خبزة برغر"], available: true },
    { id: 7, name: "برغر لوفي", price: 0, category: "برغر", station: "الگرل", icon: "🧀", ingredients: ["2 شريحة برغر 120 غرام", "سلطة", "3 أنواع جبنة دبل", "صوص", "هريسة", "خبزة برغر"], available: true },
    { id: 8, name: "برغر سموكي", price: 0, category: "برغر", station: "الگرل", icon: "🥪", ingredients: ["2 شريحة برغر 100 غرام", "3 شرائح جبنة", "بصل مكرمل", "خبزة برغر"], available: true },
    { id: 9, name: "ستيك دجاج", price: 0, category: "سندوتشات", station: "الگرل", icon: "🥙", ingredients: ["2 شريحة صدر دجاج", "سلطة", "طماطم", "صوص", "خبزة طويلة"], available: true },
    { id: 10, name: "فاهيتا أجبان دجاج", price: 0, category: "سندوتشات", station: "الگرل", icon: "🥙", ingredients: ["دجاج متبل", "3 أنواع جبنة", "صوص", "فلفل ألوان", "خبزة طويلة"], available: true },
    { id: 11, name: "فاهيتا لحم", price: 0, category: "سندوتشات", station: "الگرل", icon: "🥙", ingredients: ["لحم متبل", "3 أنواع جبنة", "هريسة", "جبنة", "خبزة طويلة"], available: true },
    { id: 12, name: "أفخاذ دجاج", price: 0, category: "دجاج", station: "الگرل", icon: "🍗", ingredients: ["أفخاذ دجاج مشوية", "سلطة مشوية", "طماطم", "شريحة جبنة", "صوص", "سلطة", "خبزة بيضاوية"], available: true },
    { id: 13, name: "تاكوس دجاج", price: 0, category: "تورتيلا", station: "التجميع", icon: "🌯", ingredients: ["دجاج متبل", "3 أنواع جبنة", "بطاطا مقلية", "صوص", "هريسة", "خبز تورتيلا"], available: true },
    { id: 14, name: "دبل راب", price: 0, category: "تورتيلا", station: "القلاية", icon: "🌯", ingredients: ["شرائح دجاج مقلي", "كاتشب", "هريسة", "مايونيز", "سلطة", "لانشون", "خبزة تورتيلا"], available: true },
    { id: 15, name: "توستر", price: 0, category: "تورتيلا", station: "القلاية", icon: "🌯", ingredients: ["شرائح دجاج مقلي", "سلطة", "جبنة شرائح", "فلفل هلابينو", "هريسة", "صوص", "خبز تورتيلا"], available: true },
    { id: 16, name: "تشكن رول", price: 0, category: "تورتيلا", station: "القلاية", icon: "🌯", ingredients: ["شرائح دجاج مقلي", "3 أنواع جبنة", "بطاطا مقلية", "صوص", "خبز تورتيلا"], available: true },
    { id: 17, name: "غراند تشكن", price: 0, category: "دجاج", station: "القلاية", icon: "🍗", ingredients: ["شرائح دجاج مقلي", "كولوسلو", "هريسة", "جبنة شرائح", "خيار مخلل", "صوص", "خبزة بيضاوية"], available: true },
    { id: 18, name: "بطاطا مقلية", price: 0, category: "سناكس", station: "سناكس", icon: "🍟", ingredients: ["بطاطا مقلية"], available: true },
    { id: 19, name: "حلقات بصل", price: 0, category: "سناكس", station: "سناكس", icon: "🧅", ingredients: ["حلقات بصل"], available: true },
    { id: 20, name: "بطاطا بالجبنة", price: 0, category: "سناكس", station: "سناكس", icon: "🧀", ingredients: ["بطاطا مقلية", "جبنة"], available: true },
    { id: 21, name: "أجنحة دجاج حارة", price: 0, category: "سناكس", station: "سناكس", icon: "🍗", ingredients: ["أجنحة دجاج مقلية", "صوص حار"], available: true }
  ],
  editingProductId: null,
  orders: [],
  inventory: [],
  inventoryTransactions: [],
  inventorySettings: {
    allowNegativeStock: false
  }
};

const STORAGE_KEY = "smokey-pos-orders-v3";
const USERS_STORAGE_KEY = "smokey-pos-users-v1";
const PRODUCTS_STORAGE_KEY = "smokey-pos-products-v2";
const INVENTORY_STORAGE_KEY = "smokey-pos-inventory-v1";
const INVENTORY_TX_STORAGE_KEY = "smokey-pos-inventory-transactions-v1";
const INVENTORY_SETTINGS_STORAGE_KEY = "smokey-pos-inventory-settings-v1";
const AUTH_STORAGE_KEY = "smokey-pos-current-user-v1";
const KITCHEN_BATCH_SIZE = 15;

const categories = ["الكل", "برغر", "سندوتشات", "تورتيلا", "دجاج", "سناكس"];
const orderTypes = ["صالة", "توصيل", "استلام", "سفري خارجي", "بريستو"];
const paymentMethods = ["نقدي", "صك", "تحويل", "بطاقة"];
const notePresets = [
  { code: "بدون صوص", label: "بدون صوص" },
  { code: "بدون هـ", label: "بدون هريسة" },
  { code: "بدون سلطة", label: "بدون سلطة" },
  { code: "+هـ", label: "زيادة هريسة" },
  { code: "+صوص", label: "زيادة صوص" },
  { code: "حار", label: "حار" }
];
const modifierActions = ["بدون", "زيادة", "إضافة"];
const commonModifierIngredients = ["هريسة", "صوص", "جبنة", "سلطة", "فلفل", "طماطم", "بصل", "مايونيز", "كاتشب", "خيار مخلل", "بطاطا مقلية"];
const defaultInventoryItems = [
  { id: "inv-burger-bun", name: "خبزة برغر", type: "bread", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-long-bun", name: "خبزة طويلة", type: "bread", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-oval-bun", name: "خبزة بيضاوية", type: "bread", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-tortilla-25", name: "تورتيلا 25 سم", type: "bread", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-tortilla-30", name: "تورتيلا 30 سم", type: "bread", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-beef-120", name: "شريحة برغر 120 غرام", type: "beef", unit: "slice", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-beef-100", name: "شريحة برغر 100 غرام", type: "beef", unit: "slice", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-fried-wrap-chicken", name: "دجاج مقلي للراب", type: "chicken", unit: "kg", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-fried-strips", name: "دجاج ستربس مقلي", type: "chicken", unit: "kg", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-chicken-steak", name: "دجاج ستيك", type: "chicken", unit: "kg", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-chicken-fajita", name: "فاهيتا دجاج", type: "chicken", unit: "kg", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-meat-fajita", name: "فاهيتا لحم", type: "meat", unit: "kg", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-chicken-thigh", name: "فخذ دجاج", type: "chicken", unit: "piece", current_quantity: 0, minimum_quantity: 0, is_active: true },
  { id: "inv-grand-chicken", name: "شريحة غراند تشكن", type: "chicken", unit: "slice", current_quantity: 0, minimum_quantity: 0, is_active: true }
];
const defaultProductRecipes = {
  "برغر كلاسيك": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 1]],
  "برغر دبل": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 2]],
  "برغر تربل": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 3]],
  "برغر ماك": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 1]],
  "برغر بيق ماك": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 2]],
  "برغر أجبان": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 1]],
  "برغر لوفي": [["خبزة برغر", 1], ["شريحة برغر 120 غرام", 2]],
  "برغر سموكي": [["خبزة برغر", 1], ["شريحة برغر 100 غرام", 2]],
  "ستيك دجاج": [["خبزة طويلة", 1], ["دجاج ستيك", 0.182]],
  "فاهيتا أجبان دجاج": [["خبزة طويلة", 1], ["فاهيتا دجاج", 0.25]],
  "فاهيتا لحم": [["خبزة طويلة", 1], ["فاهيتا لحم", 0.25]],
  "أفخاذ دجاج": [["خبزة بيضاوية", 1], ["فخذ دجاج", 1]],
  "تاكوس دجاج": [["تورتيلا 30 سم", 1], ["فاهيتا دجاج", 0.25]],
  "دبل راب": [["تورتيلا 25 سم", 1], ["دجاج مقلي للراب", 0.182]],
  "توستر": [["تورتيلا 25 سم", 1], ["دجاج ستربس مقلي", 0.182]],
  "تشكن رول": [["تورتيلا 30 سم", 1], ["دجاج ستربس مقلي", 0.182]],
  "غراند تشكن": [["خبزة بيضاوية", 1], ["شريحة غراند تشكن", 1]]
};
const itemIcons = {
  "برغر": ["🥪", "🧀", "🍔", "🥙"],
  "سندوتشات": ["🥙", "🥪", "🌯", "🥩"],
  "تورتيلا": ["🌯", "🥙", "🥪", "🍗"],
  "دجاج": ["🍗", "🍖", "🥪", "🌯"],
  "سناكس": ["🍟", "🧅", "🧀", "🍗"]
};
const roles = {
  "Admin": [
    "إدارة الأصناف والتصنيفات",
    "إدارة المستخدمين والصلاحيات",
    "متابعة التقارير والمبيعات",
    "إدارة الطابعات والإعدادات",
    "إلغاء وتعديل الطلبات",
    "عرض سجل العمليات"
  ],
  "Cashier": [
    "إنشاء طلب جديد",
    "اختيار نوع الطلب وطريقة الدفع",
    "طباعة فاتورة الكاشير",
    "تعديل الطلب قبل التأكيد",
    "عرض الطلبات الخاصة به",
    "إيقاف وتفعيل حالة الأصناف فقط",
    "عدم إظهار الأصناف الموقوفة في شاشة المبيعات"
  ],
  "Kitchen Staff": [
    "عرض طلبات القسم",
    "متابعة الأصناف الخاصة بالقسم",
    "قراءة الملاحظات والكميات"
  ],
  "Order Assembly User": [
    "عرض الطلبات قيد التجهيز",
    "رؤية كل أصناف الطلب",
    "تحويل الطلب إلى جاهز",
    "إيقاف وتفعيل حالة الأصناف فقط",
    "إرسال رقم الطلب لشاشة الزبائن"
  ],
  "Manager / Supervisor": [
    "متابعة التقارير",
    "متابعة الطلبات والمستخدمين",
    "مراقبة أداء الأقسام",
    "صلاحيات إشراف بدون تحكم كامل"
  ]
};
const roleScreens = {
  "Admin": ["dashboard", "pos", "orders", "items", "inventory", "kitchen", "customer", "printers", "users", "reports", "shifts"],
  "Cashier": ["pos", "orders", "items"],
  "Kitchen Staff": ["kitchen"],
  "Order Assembly User": ["kitchen", "customer", "items"],
  "Manager / Supervisor": ["dashboard", "orders", "users", "reports", "shifts"]
};
const mobileSettingsScreens = ["inventory", "printers", "users", "reports", "shifts"];
const printers = [
  ["طابعة الكاشير", "الفاتورة الكاملة للزبون"],
  ["طابعة القلاية", "الأصناف الخاصة بالقلاية فقط"],
  ["طابعة سناكس", "الأصناف الخاصة بقسم السناكس فقط"],
  ["طابعة الگرل", "الأصناف الخاصة بالگرل فقط"],
  ["طابعة التجميع", "الطلب كامل للمراجعة والتجهيز"],
  ["طابعة التسليم", "ملخص الطلب الجاهز أو رقم الطلب"]
];

const titles = {
  dashboard: "لوحة الإدارة",
  pos: "شاشة الكاشير",
  orders: "الطلبات",
  items: "إدارة الأصناف",
  inventory: "المخزون",
  kitchen: "شاشة التجميع",
  customer: "شاشة عرض الزبائن",
  printers: "إدارة الطابعات",
  reports: "التقارير",
  users: "المستخدمين",
  shifts: "الورديات"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function formatMoney(value) {
  return `${value} د.ل`;
}

function loadSavedUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
    if (Array.isArray(saved)) state.users = saved;
    normalizeUsers();
  } catch {
    localStorage.removeItem(USERS_STORAGE_KEY);
  }
}

function saveUsers() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users));
}

function normalizeUsers() {
  const defaults = [
    { name: "المدير", email: "admin@smokey.local", password: "123456", role: "Admin", status: "نشط" },
    { name: "أحمد محمد", email: "cashier@smokey.local", password: "123456", role: "Cashier", status: "نشط" },
    { name: "قسم التجميع", email: "assembly@smokey.local", password: "123456", role: "Order Assembly User", status: "نشط" }
  ];
  defaults.forEach((defaultUser) => {
    const existing = state.users.find((user) => (user.email || "").toLowerCase() === defaultUser.email) ||
      state.users.find((user) => !user.email && user.role === defaultUser.role && user.name === defaultUser.name);
    if (existing) {
      existing.name = existing.name || defaultUser.name;
      existing.email = existing.email || defaultUser.email;
      existing.password = existing.password || defaultUser.password;
      existing.role = existing.role || defaultUser.role;
      existing.status = existing.status || defaultUser.status;
    } else {
      state.users.unshift({ ...defaultUser });
    }
  });
  state.users.forEach((user, index) => {
    if (!user.email) user.email = `${user.role.toLowerCase().replaceAll(" ", "")}${index}@smokey.local`;
    if (!user.password) user.password = "123456";
    if (!user.status) user.status = "نشط";
  });
  saveUsers();
}

function loadSavedProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY));
    if (Array.isArray(saved)) state.products = saved;
    normalizeProductIcons();
    normalizeProductRecipes();
    saveProducts();
  } catch {
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  }
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(state.products));
}

function normalizeProductIcons() {
  state.products.forEach((product) => {
    if (product.category === "برجر") product.category = "برغر";
    if (product.category === "مشويات") product.category = "سندوتشات";
    if (product.category === "مقليات") product.category = "سناكس";
    if (product.category === "سناكس" && product.station === "القلاية") product.station = "سناكس";
    if (!product.ingredients) product.ingredients = [];
    if (!itemIcons[product.category]?.includes(product.icon)) product.icon = getDefaultIconForCategory(product.category);
  });
}

function loadSavedInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY));
    state.inventory = Array.isArray(saved) && saved.length ? saved : structuredClone(defaultInventoryItems);
  } catch {
    state.inventory = structuredClone(defaultInventoryItems);
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
  }
  normalizeInventoryItems();
  saveInventory();
}

function loadSavedInventoryTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_TX_STORAGE_KEY));
    state.inventoryTransactions = Array.isArray(saved) ? saved : [];
  } catch {
    state.inventoryTransactions = [];
    localStorage.removeItem(INVENTORY_TX_STORAGE_KEY);
  }
}

function loadInventorySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_STORAGE_KEY));
    if (saved && typeof saved === "object") {
      state.inventorySettings = {
        ...state.inventorySettings,
        allowNegativeStock: Boolean(saved.allowNegativeStock)
      };
    }
  } catch {
    localStorage.removeItem(INVENTORY_SETTINGS_STORAGE_KEY);
  }
}

function saveInventory() {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state.inventory));
}

function saveInventoryTransactions() {
  localStorage.setItem(INVENTORY_TX_STORAGE_KEY, JSON.stringify(state.inventoryTransactions));
}

function saveInventorySettings() {
  localStorage.setItem(INVENTORY_SETTINGS_STORAGE_KEY, JSON.stringify(state.inventorySettings));
}

function normalizeInventoryItems() {
  const existingNames = new Set(state.inventory.map((item) => item.name));
  defaultInventoryItems.forEach((item) => {
    if (!existingNames.has(item.name)) state.inventory.push({ ...item });
  });
  state.inventory.forEach((item) => {
    item.id = item.id || `inv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    item.type = item.type || "other";
    item.unit = item.unit || "piece";
    item.current_quantity = Number(item.current_quantity) || 0;
    item.minimum_quantity = Number(item.minimum_quantity) || 0;
    item.is_active = item.is_active !== false;
  });
}

function getInventoryItemByName(name) {
  return state.inventory.find((item) => item.name === name);
}

function recipeFromDefault(productName) {
  return (defaultProductRecipes[productName] || [])
    .map(([inventoryName, quantity]) => {
      const inventoryItem = getInventoryItemByName(inventoryName) || defaultInventoryItems.find((item) => item.name === inventoryName);
      return inventoryItem ? { inventory_item_id: inventoryItem.id, quantity_per_item: Number(quantity) } : null;
    })
    .filter(Boolean);
}

function normalizeProductRecipes() {
  state.products.forEach((product) => {
    if (!Array.isArray(product.recipe) || !product.recipe.length) {
      product.recipe = recipeFromDefault(product.name);
    } else {
      product.recipe = product.recipe
        .map((row) => ({
          inventory_item_id: row.inventory_item_id || row.inventoryId || row.id,
          quantity_per_item: Number(row.quantity_per_item ?? row.qty ?? row.quantity) || 0
        }))
        .filter((row) => row.inventory_item_id && row.quantity_per_item > 0);
    }
  });
}

function getDefaultIconForCategory(category) {
  if (itemIcons[category]) return itemIcons[category][0];
  return "🍽";
}

function renderItemIconOptions(selectedIcon = null) {
  const category = $("#itemCategory").value || "برغر";
  const icons = itemIcons[category] || ["🍽"];
  const selected = selectedIcon && icons.includes(selectedIcon) ? selectedIcon : icons[0];
  $("#itemIcon").innerHTML = icons.map((icon) => `<option value="${icon}" ${icon === selected ? "selected" : ""}>${icon}</option>`).join("");
}

function loadSavedOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.orders)) {
      saveOrders();
      $("#currentOrder").textContent = `#${state.nextOrder}`;
      return;
    }
    state.orders = saved.orders;
    state.nextOrder = Number(saved.nextOrder) || getNextOrderNumber();
    ensureKitchenBatches();
    ensurePaymentMethods();
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
  const maxOrder = state.orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 0);
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

function ensurePaymentMethods() {
  state.orders.forEach((order, index) => {
    if (!order.payment) order.payment = index % 3 === 0 ? "تحويل" : "نقدي";
    if (!order.createdAt) order.createdAt = Date.now();
  });
}

function setScreen(screen) {
  if (!canAccessScreen(screen)) screen = getDefaultScreenForUser();
  state.screen = screen;
  document.body.classList.toggle("customer-mode", screen === "customer");
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === screen));
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.screen === screen));
  $("#pageTitle").textContent = titles[screen];
  $(".sidebar").classList.remove("open");
  updateMobileSettingsNav();
}

function canAccessScreen(screen) {
  const role = state.currentUser?.role || "Admin";
  return roleScreens[role]?.includes(screen);
}

function getDefaultScreenForUser() {
  const role = state.currentUser?.role || "Admin";
  return roleScreens[role]?.[0] || "dashboard";
}

function applyUserPermissions() {
  const allowed = roleScreens[state.currentUser?.role || "Admin"] || [];
  $$(".nav-item").forEach((button) => {
    button.hidden = !allowed.includes(button.dataset.screen);
  });
  document.body.classList.toggle("product-status-only", !canEditProducts());
  $("#itemForm").hidden = !canEditProducts();
  $("#inventoryForm").hidden = state.currentUser?.role !== "Admin";
  $("#userForm").hidden = state.currentUser?.role !== "Admin";
  $(".user-chip").textContent = state.currentUser?.name || "المدير";
  updateMobileSettingsNav();
}

function updateMobileSettingsNav() {
  const settingsNav = $(".mobile-settings-nav");
  const settingsToggle = $("#mobileSettingsToggle");
  if (!settingsNav || !settingsToggle) return;
  const allowed = roleScreens[state.currentUser?.role || "Admin"] || [];
  const hasSettings = mobileSettingsScreens.some((screen) => allowed.includes(screen));
  settingsNav.hidden = !hasSettings;
  settingsNav.classList.remove("open");
  settingsToggle.setAttribute("aria-expanded", "false");
  settingsToggle.classList.toggle("active", mobileSettingsScreens.includes(state.screen));
}

function canEditProducts() {
  return state.currentUser?.role === "Admin";
}

function canToggleProductStatus() {
  return ["Admin", "Cashier", "Order Assembly User"].includes(state.currentUser?.role || "Admin");
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
    if (requiresCustomerInfo(value)) openCustomerInfoModal();
    renderOrderTypes();
  });
}

function requiresCustomerInfo(type) {
  return type === "توصيل" || type === "استلام";
}

function openCustomerInfoModal() {
  const modal = document.createElement("div");
  modal.className = "customer-info-modal";
  modal.innerHTML = `
    <form class="customer-info-dialog" id="customerInfoForm">
      <div class="modifier-head">
        <div>
          <strong>بيانات ${state.orderType}</strong>
          <span>تظهر في طباعة الكاشير والتسليم والتجميع</span>
        </div>
        <button class="ghost-small" type="button" data-close-customer-info>إغلاق</button>
      </div>
      <label>
        <span>اسم الزبون</span>
        <input id="customerInfoName" type="text" value="${state.customerInfo.name || ""}" placeholder="اسم الزبون">
      </label>
      <label>
        <span>رقم الهاتف</span>
        <input id="customerInfoPhone" type="tel" inputmode="tel" value="${state.customerInfo.phone || ""}" placeholder="09xxxxxxxx">
      </label>
      <button class="primary-btn" type="submit">حفظ البيانات</button>
    </form>
  `;
  const close = () => modal.remove();
  modal.querySelector("[data-close-customer-info]").addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  modal.querySelector("#customerInfoForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.customerInfo = {
      name: modal.querySelector("#customerInfoName").value.trim(),
      phone: modal.querySelector("#customerInfoPhone").value.trim()
    };
    close();
  });
  document.body.appendChild(modal);
  modal.querySelector("#customerInfoName").focus();
}

function renderPaymentMethods() {
  renderButtons("#paymentMethods", paymentMethods, state.payment, (value) => {
    state.payment = value;
    renderPaymentMethods();
  });
}

function renderProducts() {
  const availableProducts = state.products.filter((product) => product.available);
  const filtered = state.category === "الكل" ? availableProducts : availableProducts.filter((p) => p.category === state.category);
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
  const product = state.products.find((item) => item.name === name);
  const existingLine = state.cart.find((item) => item.name === name);
  if (existingLine) existingLine.qty += 1;
  else state.cart.push({ ...product, lineId: Date.now() + Math.random(), qty: 1, notes: [], modifiers: [] });
  renderCart();
}

function changeQty(lineId, delta) {
  const item = state.cart.find((line) => String(line.lineId) === String(lineId));
  if (!item) return;
  item.qty += delta;
  state.cart = state.cart.filter((line) => line.qty > 0);
  renderCart();
}

function normalizeIngredientName(value) {
  return String(value || "")
    .replace(/^\d+\s*/, "")
    .replace(/120\s*غرام|100\s*غرام/g, "")
    .replace(/شريحة|شرائح|صدر|دجاج|برغر|متبل|مقلي|مقلية|مشوية|مشوي|خبزة|خبز|طويلة|بيضاوية|تورتيلا/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function simplifyIngredientName(value) {
  const clean = normalizeIngredientName(value);
  if (!clean) return "";
  if (clean.includes("صوص ماك")) return "صوص ماك";
  if (clean.includes("صوص حار")) return "صوص حار";
  if (clean.includes("صوص")) return "صوص";
  if (clean.includes("هريسة")) return "هريسة";
  if (clean.includes("جبنة") || clean.includes("أجبان")) return "جبنة";
  if (clean.includes("سلطة") || clean.includes("كولوسلو")) return clean.includes("كولوسلو") ? "كولوسلو" : "سلطة";
  if (clean.includes("فلفل")) return clean.includes("هلابينو") ? "فلفل هلابينو" : "فلفل";
  if (clean.includes("طماطم")) return "طماطم";
  if (clean.includes("بصل")) return "بصل";
  if (clean.includes("مايونيز")) return "مايونيز";
  if (clean.includes("كاتشب")) return "كاتشب";
  if (clean.includes("مخلل")) return "خيار مخلل";
  if (clean.includes("بطاطا")) return "بطاطا مقلية";
  if (clean.includes("لانشون")) return "لانشون";
  return clean;
}

function getModifierIngredients(item) {
  const product = state.products.find((productItem) => productItem.name === item.name) || item;
  const productIngredients = (product.ingredients || item.ingredients || [])
    .map(simplifyIngredientName)
    .filter(Boolean);
  return [...new Set([...productIngredients, ...commonModifierIngredients])].slice(0, 18);
}

function getLineModifiers(item) {
  return Array.isArray(item.modifiers) ? item.modifiers : [];
}

function formatModifier(modifier) {
  if (Array.isArray(modifier.parts) && modifier.parts.length) {
    return `${modifier.qty} ${modifier.parts.map((part) => `${part.action} ${part.ingredient}`).join(" و ")}`;
  }
  const ingredients = Array.isArray(modifier.ingredients)
    ? modifier.ingredients.join("، ")
    : modifier.ingredient;
  return `${modifier.qty} ${modifier.action} ${ingredients}`;
}

function renderModifierSummary(item) {
  const modifiers = getLineModifiers(item);
  const legacyNotes = item.notes || [];
  if (!modifiers.length && !legacyNotes.length) return "";
  return `
    <div class="modifier-summary">
      ${modifiers.map((modifier) => `<span>${formatModifier(modifier)}</span>`).join("")}
      ${legacyNotes.map((note) => `<span>${note}</span>`).join("")}
    </div>
  `;
}

function renderCart() {
  const list = $("#cartItems");
  if (!state.cart.length) {
    list.innerHTML = `<p>لا توجد أصناف في السلة.</p>`;
  } else {
    list.innerHTML = state.cart.map((item) => `
      <div class="cart-line">
        <div class="cart-main">
          <strong>${item.name}</strong>
          <small>${item.station}</small>
          ${renderModifierSummary(item)}
          <button class="modifier-open-btn" type="button" data-modifier-line="${item.lineId}">الإضافات</button>
        </div>
        <div class="qty-control">
          <button type="button" data-qty="${item.lineId}" data-delta="-1">-</button>
          <span>${item.qty}</span>
          <button type="button" data-qty="${item.lineId}" data-delta="1">+</button>
        </div>
        <strong>${formatMoney(item.price * item.qty)}</strong>
      </div>
    `).join("");
  }

  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  $("#subtotal").textContent = formatMoney(total);
  $("#total").textContent = formatMoney(total);
  $("#cartMiniTotal").textContent = `${state.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0)} صنف - ${formatMoney(total)}`;
  $$("#cartItems button").forEach((button) => {
    if (button.dataset.modifierLine) {
      button.addEventListener("click", () => openModifierEditor(button.dataset.modifierLine));
    } else {
      button.addEventListener("click", () => changeQty(button.dataset.qty, Number(button.dataset.delta)));
    }
  });
}

function toggleCartCollapse(forceOpen = null) {
  const panel = $(".cart-panel");
  const collapsed = forceOpen === null ? !panel.classList.contains("cart-collapsed") : !forceOpen;
  panel.classList.toggle("cart-collapsed", collapsed);
  $("#cartCollapseToggle").textContent = collapsed ? "سلة" : "−";
  $("#cartCollapseToggle").setAttribute("aria-label", collapsed ? "فتح السلة" : "تصغير السلة");
  $("#cartCollapseToggle").setAttribute("aria-expanded", String(!collapsed));
}

function openModifierEditor(lineId) {
  const item = state.cart.find((line) => String(line.lineId) === String(lineId));
  if (!item) return;
  item.modifiers = getLineModifiers(item);
  let selectedQty = 1;
  let selectedAction = modifierActions[0];
  let draftParts = [];
  const ingredients = getModifierIngredients(item);
  const modal = document.createElement("div");
  modal.className = "modifier-modal";
  modal.innerHTML = `
    <div class="modifier-dialog" role="dialog" aria-modal="true" aria-label="إضافات ${item.name}">
      <div class="modifier-head">
        <div>
          <strong>${item.name}</strong>
          <span>${item.qty} في السلة</span>
        </div>
        <button class="ghost-small" type="button" data-close-modifier>إغلاق</button>
      </div>
      <div class="modifier-section">
        <label>الكمية</label>
        <div class="modifier-picks" data-modifier-qtys>
          ${Array.from({ length: Math.max(1, Number(item.qty) || 1) }, (_, index) => index + 1).map((qty) => `
            <button class="${qty === selectedQty ? "active" : ""}" type="button" data-pick-qty="${qty}">${qty}</button>
          `).join("")}
        </div>
      </div>
      <div class="modifier-section">
        <label>العملية</label>
        <div class="modifier-picks" data-modifier-actions>
          ${modifierActions.map((action) => `
            <button class="${action === selectedAction ? "active" : ""}" type="button" data-pick-action="${action}">${action}</button>
          `).join("")}
        </div>
      </div>
      <div class="modifier-section">
        <label>مكونات الصنف</label>
        <div class="ingredient-picks">
          ${ingredients.map((ingredient) => `
            <button type="button" data-pick-ingredient="${ingredient}">${ingredient}</button>
          `).join("")}
        </div>
        <div class="modifier-selection" data-modifier-selection>اختر العملية ثم المكون، ويمكن تغيير العملية وإضافة مكون ثاني</div>
        <div class="modifier-draft-actions">
          <button class="primary-small modifier-add-btn" type="button" data-add-modifier>تم</button>
          <button class="ghost-small" type="button" data-clear-draft>مسح الاختيار</button>
        </div>
      </div>
      <div class="modifier-section">
        <label>الملاحظات المسجلة</label>
        <div class="modifier-list" data-modifier-list></div>
      </div>
      <button class="primary-btn" type="button" data-close-modifier>تأكيد</button>
    </div>
  `;

  const refreshActive = () => {
    modal.querySelectorAll("[data-pick-qty]").forEach((button) => button.classList.toggle("active", Number(button.dataset.pickQty) === selectedQty));
    modal.querySelectorAll("[data-pick-action]").forEach((button) => button.classList.toggle("active", button.dataset.pickAction === selectedAction));
    const selection = modal.querySelector("[data-modifier-selection]");
    selection.textContent = draftParts.length
      ? `${selectedQty} ${draftParts.map((part) => `${part.action} ${part.ingredient}`).join(" و ")}`
      : "اختر العملية ثم المكون، ويمكن تغيير العملية وإضافة مكون ثاني";
  };
  const refreshList = () => {
    const list = modal.querySelector("[data-modifier-list]");
    if (!item.modifiers.length) {
      list.innerHTML = `<p>لا توجد إضافات لهذا الصنف.</p>`;
      return;
    }
    list.innerHTML = item.modifiers.map((modifier, index) => `
      <div class="modifier-row">
        <span>${formatModifier(modifier)}</span>
        <button class="danger-small" type="button" data-remove-modifier="${index}">حذف</button>
      </div>
    `).join("");
    modal.querySelectorAll("[data-remove-modifier]").forEach((button) => {
      button.addEventListener("click", () => {
        item.modifiers.splice(Number(button.dataset.removeModifier), 1);
        refreshList();
        renderCart();
      });
    });
  };
  const closeModal = () => {
    modal.remove();
    renderCart();
  };

  modal.querySelectorAll("[data-close-modifier]").forEach((button) => button.addEventListener("click", closeModal));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  modal.querySelectorAll("[data-pick-qty]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedQty = Number(button.dataset.pickQty);
      refreshActive();
    });
  });
  modal.querySelectorAll("[data-pick-action]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAction = button.dataset.pickAction;
      refreshActive();
    });
  });
  modal.querySelectorAll("[data-pick-ingredient]").forEach((button) => {
    button.addEventListener("click", () => {
      const ingredient = button.dataset.pickIngredient;
      const exists = draftParts.some((part) => part.action === selectedAction && part.ingredient === ingredient);
      if (!exists) draftParts.push({ action: selectedAction, ingredient });
      refreshActive();
    });
  });
  modal.querySelector("[data-add-modifier]").addEventListener("click", () => {
    if (!draftParts.length) return;
    const key = draftParts.map((part) => `${part.action}:${part.ingredient}`).join("|");
    const existing = item.modifiers.find((modifier) => {
      const existingKey = Array.isArray(modifier.parts)
        ? modifier.parts.map((part) => `${part.action}:${part.ingredient}`).join("|")
        : `${modifier.action}:${Array.isArray(modifier.ingredients) ? modifier.ingredients.join(",") : modifier.ingredient}`;
      return existingKey === key;
    });
    if (existing) existing.qty += selectedQty;
    else item.modifiers.push({ qty: selectedQty, parts: draftParts.map((part) => ({ ...part })) });
    draftParts = [];
    refreshList();
    refreshActive();
    renderCart();
  });
  modal.querySelector("[data-clear-draft]").addEventListener("click", () => {
    draftParts = [];
    refreshActive();
  });

  document.body.appendChild(modal);
  refreshList();
  refreshActive();
}

function toggleItemNote(lineId, code) {
  const item = state.cart.find((line) => String(line.lineId) === String(lineId));
  if (!item) return;
  item.notes = item.notes || [];
  if (item.notes.includes(code)) item.notes = item.notes.filter((note) => note !== code);
  else item.notes.push(code);
  renderCart();
}

function confirmOrder() {
  if (!state.cart.length) return;
  if (requiresCustomerInfo(state.orderType) && (!state.customerInfo.name || !state.customerInfo.phone)) {
    openCustomerInfoModal();
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderPayload = {
    type: state.orderType,
    status: "قيد التجهيز",
    total,
    cashier: state.currentUser?.name || "المدير",
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    createdAt: Date.now(),
    payment: normalizePayment(state.payment),
    customer: requiresCustomerInfo(state.orderType) ? { ...state.customerInfo } : null,
    note: $("#orderNote").value.trim(),
    items: state.cart.map(({ name, qty, price, notes, modifiers }) => ({
      name,
      qty,
      price: Number(price) || 0,
      notes: notes || [],
      modifiers: modifiers || []
    }))
  };
  const editingOrder = state.editingOrderId ? state.orders.find((order) => order.id === Number(state.editingOrderId)) : null;
  let returnedForEdit = false;
  if (editingOrder && editingOrder.status !== "ملغي" && !editingOrder.inventoryReturned) {
    applyInventoryMovement(editingOrder.items, "return", editingOrder.id, 1, "إرجاع مؤقت قبل تعديل الطلب");
    editingOrder.inventoryReturned = true;
    returnedForEdit = true;
  }
  const insufficient = getInsufficientStock(orderPayload.items);
  if (insufficient.length && !state.inventorySettings.allowNegativeStock) {
    if (returnedForEdit) {
      applyInventoryMovement(editingOrder.items, "sale", editingOrder.id, -1, "إعادة خصم بعد إلغاء التعديل");
      editingOrder.inventoryReturned = false;
    }
    showStockWarning(insufficient);
    return;
  }
  if (insufficient.length && state.inventorySettings.allowNegativeStock) {
    console.warn("تنبيه بيع بمخزون غير كافٍ", insufficient.map(({ item, required, available }) => `${item.name}: ${formatQty(required)} / ${formatQty(available)}`));
  }
  let savedOrder;
  if (state.editingOrderId) {
    savedOrder = state.orders.find((order) => order.id === Number(state.editingOrderId));
    if (!savedOrder) return;
    const previousStatus = savedOrder.status;
    const editIsLate = Date.now() - (Number(savedOrder.createdAt) || Date.now()) > 60000;
    Object.assign(savedOrder, orderPayload, {
      status: previousStatus === "ملغي" ? "ملغي" : previousStatus,
      createdAt: savedOrder.createdAt || orderPayload.createdAt,
      modifiedBy: state.currentUser?.name || "المدير",
      modifiedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      modifiedAtMs: Date.now(),
      modifiedAlert: editIsLate,
      inventoryReturned: false
    });
    state.editingOrderId = null;
    if (savedOrder.status !== "ملغي") deductInventoryForOrder(savedOrder);
    printOrder(savedOrder, "تعديل طلب");
  } else {
    savedOrder = {
    id: state.nextOrder,
    batchId: getNextBatchId(),
      ...orderPayload
    };
    state.orders.unshift(savedOrder);
    state.nextOrder += 1;
    deductInventoryForOrder(savedOrder);
    printOrder(savedOrder, "فاتورة طلب");
  }
  state.cart = [];
  state.customerInfo = { name: "", phone: "" };
  $("#confirmOrder").textContent = "تأكيد الطلب وطباعة";
  $("#currentOrder").textContent = `#${state.nextOrder}`;
  $("#orderNote").value = "";
  saveOrders();
  renderAll();
}

function markReady(id) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (order) {
    order.status = "جاهز";
    order.readyAt = Date.now();
  }
  saveOrders();
  renderAll();
}

function renderOrdersTable() {
  const query = state.orderSearch.trim().replace("#", "");
  const dateRange = getOrdersDateRange();
  const visibleOrders = state.orders.filter((order) => {
    const matchesSearch = !query || String(order.id).includes(query) || (order.type || "").includes(query) || (order.cashier || "").includes(query);
    const matchesStatus = state.orderStatusFilter === "الكل" || order.status === state.orderStatusFilter;
    const matchesDate = isInRange(order.createdAt, dateRange);
    return matchesSearch && matchesStatus && matchesDate;
  });
  $("#ordersTable").innerHTML = visibleOrders.map((order) => `
    <tr>
      <td>#${order.id}</td>
      <td>${order.type}</td>
      <td>${formatMoney(order.total)}</td>
      <td><span class="status-pill ${order.status === "جاهز" ? "on" : order.status === "ملغي" ? "cancel" : "wait"}">${order.status}</span></td>
      <td>${order.cashier}</td>
      <td>
        <div class="table-actions">
          <button class="ghost-small" type="button" data-print-order="${order.id}">طباعة</button>
          <button class="ghost-small" type="button" data-edit-order="${order.id}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>تعديل</button>
          <button class="danger-small" type="button" data-delete-order="${order.id}" ${order.status === "ملغي" || !canManageOrder(order) ? "disabled" : ""}>إلغاء</button>
        </div>
      </td>
    </tr>
  `).join("");
  if (!visibleOrders.length) {
    $("#ordersTable").innerHTML = `<tr><td colspan="6">لا توجد طلبات مطابقة.</td></tr>`;
  }
  $$("[data-print-order]").forEach((button) => {
    button.addEventListener("click", () => printOrderById(button.dataset.printOrder, "فاتورة طلب"));
  });
  $$("[data-edit-order]").forEach((button) => {
    button.addEventListener("click", () => editOrder(button.dataset.editOrder));
  });
  $$("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder));
  });
}

function setDefaultOrderDateFilter() {
  const dayRange = getBusinessDayRange();
  const date = formatDateInput(new Date(dayRange.start));
  state.orderDateFilter = date;
  $("#orderDateFilter").value = date;
}

function getOrdersDateRange() {
  const value = state.orderDateFilter || formatDateInput(new Date(getBusinessDayRange().start));
  const start = new Date(`${value}T01:00:00`).getTime();
  const endDate = new Date(`${value}T01:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  return { start, end: endDate.getTime() };
}

function editOrder(id) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (!order || !canManageOrder(order)) return;
  state.editingOrderId = order.id;
  state.orderType = order.type;
  state.payment = normalizePayment(order.payment);
  state.customerInfo = order.customer ? { ...order.customer } : { name: "", phone: "" };
  state.cart = order.items.map((item) => {
    const product = state.products.find((productItem) => productItem.name === item.name) || {};
    return {
      ...product,
      name: item.name,
      price: Number(item.price ?? product.price ?? 0),
      station: product.station || "التجميع",
      lineId: Date.now() + Math.random(),
      qty: item.qty,
      notes: item.notes || [],
      modifiers: item.modifiers || []
    };
  });
  $("#orderNote").value = order.note || "";
  $("#confirmOrder").textContent = `حفظ تعديل #${order.id} وطباعة`;
  setScreen("pos");
  renderAll();
}

function deleteOrder(id) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (!order || !canManageOrder(order) || order.status === "ملغي") return;
  const ok = confirm(`تأكيد إلغاء الطلب #${order.id}؟`);
  if (!ok) return;
  order.status = "ملغي";
  order.deletedBy = state.currentUser?.name || "المدير";
  order.deletedAt = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  order.deletedAtMs = Date.now();
  order.cancelAlert = true;
  returnInventoryForOrder(order);
  saveOrders();
  printOrder(order, "إلغاء طلب");
  renderAll();
}

function canManageOrder(order) {
  const role = state.currentUser?.role || "Admin";
  return role === "Admin" || role === "Manager / Supervisor" || role === "Cashier";
}

function buildInventoryRequirements(items) {
  const requirements = new Map();
  items.forEach((orderItem) => {
    const product = state.products.find((productItem) => productItem.name === orderItem.name);
    const recipe = product?.recipe || orderItem.recipe || [];
    recipe.forEach((row) => {
      const inventoryId = row.inventory_item_id;
      const qty = Number(orderItem.qty || 0) * Number(row.quantity_per_item || 0);
      if (!inventoryId || qty <= 0) return;
      requirements.set(inventoryId, (requirements.get(inventoryId) || 0) + qty);
    });
  });
  return requirements;
}

function getInsufficientStock(items) {
  const requirements = buildInventoryRequirements(items);
  return [...requirements.entries()]
    .map(([inventoryId, required]) => {
      const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(inventoryId));
      if (!item) return null;
      const available = Number(item.current_quantity) || 0;
      return available < required ? { item, required, available } : null;
    })
    .filter(Boolean);
}

function showStockWarning(insufficient) {
  const lines = insufficient
    .map(({ item, required, available }) => `- ${item.name}: المطلوب ${formatQty(required)}، المتوفر ${formatQty(available)}`)
    .join("\n");
  alert(`المخزون غير كافٍ:\n${lines}`);
}

function applyInventoryMovement(items, transactionType, orderId, multiplier, note) {
  const requirements = buildInventoryRequirements(items);
  requirements.forEach((required, inventoryId) => {
    const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(inventoryId));
    if (!item) return;
    const before = Number(item.current_quantity) || 0;
    const quantity = required * multiplier;
    const after = before + quantity;
    item.current_quantity = after;
    recordInventoryTransaction(item, transactionType, quantity, before, after, orderId, note);
  });
  saveInventory();
}

function deductInventoryForOrder(order) {
  applyInventoryMovement(order.items, "sale", order.id, -1, "خصم بيع");
  const lowItems = state.inventory.filter((item) => item.is_active && Number(item.current_quantity) <= Number(item.minimum_quantity));
  if (lowItems.length) {
    console.warn("تنبيه مخزون منخفض", lowItems.map((item) => `${item.name}: ${formatQty(item.current_quantity)}`));
  }
}

function returnInventoryForOrder(order) {
  if (order.inventoryReturned) return;
  applyInventoryMovement(order.items, "return", order.id, 1, "إرجاع بعد إلغاء الطلب");
  order.inventoryReturned = true;
}

function printOrderById(id, title) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (order) printOrder(order, title);
}

function getOrderItemPrice(item) {
  const savedPrice = Number(item.price);
  if (Number.isFinite(savedPrice)) return savedPrice;
  const product = state.products.find((productItem) => productItem.name === item.name);
  return Number(product?.price || 0);
}

function renderCustomerInfo(order) {
  if (!order.customer || (!order.customer.name && !order.customer.phone)) return "";
  return `
    <p>الزبون: ${order.customer.name || "-"}</p>
    <p>الهاتف: ${order.customer.phone || "-"}</p>
  `;
}

function printOrder(order, title) {
  const rows = order.items.map((item) => {
    const qty = Number(item.qty || 0);
    const price = getOrderItemPrice(item);
    return `
      <tr>
        <td>${item.name}</td>
        <td>${qty}</td>
        <td>${formatMoney(price)}</td>
        <td>${formatMoney(price * qty)}</td>
      </tr>
    `;
  }).join("");
  const receipt = window.open("", "_blank", "width=380,height=620");
  if (!receipt) return;
  receipt.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} #${order.id}</title>
      <style>
        * { box-sizing: border-box; }
        body { width: 80mm; max-width: 100%; margin: 0 auto; font-family: Arial, sans-serif; padding: 12px; color: #111; font-size: 13px; }
        h1, h2, p { margin: 0 0 8px; }
        h1 { font-size: 22px; text-align: center; }
        h2 { font-size: 18px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; table-layout: fixed; }
        td, th { border-bottom: 1px solid #ddd; padding: 7px 3px; text-align: right; vertical-align: top; word-break: break-word; }
        th { font-size: 12px; }
        th:nth-child(2), td:nth-child(2) { width: 34px; text-align: center; }
        th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { width: 58px; }
        .total { font-size: 18px; font-weight: 800; }
        .meta { display: grid; gap: 4px; margin-top: 10px; }
        .receipt-actions { position: sticky; top: 0; background: white; padding-bottom: 10px; margin-bottom: 10px; }
        .print-btn { width: 100%; min-height: 44px; border: 0; border-radius: 8px; background: #e50909; color: white; font-weight: 800; font-size: 16px; }
        @page { margin: 6mm; }
        @media print {
          body { width: auto; padding: 0; }
          .receipt-actions { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-actions">
        <button class="print-btn" type="button" onclick="window.print()">طباعة الفاتورة</button>
      </div>
      <h1>Smokey BBQ & Grill</h1>
      <h2>${title} #${order.id}</h2>
      <div class="meta">
        <p>النوع: ${order.type}</p>
        ${renderCustomerInfo(order)}
        <p>الحالة: ${order.status}</p>
        <p>الكاشير: ${order.cashier}</p>
        <p>الدفع: ${normalizePayment(order.payment)}</p>
        <p>الوقت: ${order.time || ""}</p>
        ${order.note ? `<p>ملاحظة: ${order.note}</p>` : ""}
        ${order.modifiedBy ? `<p>آخر تعديل: ${order.modifiedBy} - ${order.modifiedAt || ""}</p>` : ""}
        ${order.deletedBy ? `<p>حذف بواسطة: ${order.deletedBy} - ${order.deletedAt || ""}</p>` : ""}
      </div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">الإجمالي: ${formatMoney(order.total)}</p>
      <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));<\/script>
    </body>
    </html>
  `);
  receipt.document.close();
}

function renderItemsTable() {
  const canEdit = canEditProducts();
  const canToggle = canToggleProductStatus();
  $("#itemsTable").innerHTML = state.products.map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.station}</td>
      <td>${formatMoney(product.price)}</td>
      <td>
        <select class="table-select" data-product-status="${product.id}" ${!canToggle ? "disabled" : ""}>
          <option value="true" ${product.available ? "selected" : ""}>متوفر</option>
          <option value="false" ${!product.available ? "selected" : ""}>موقوف</option>
        </select>
      </td>
      <td>${canEdit ? `<button class="primary-small" type="button" data-edit-product="${product.id}">تعديل</button>` : `<span class="muted-cell">حالة فقط</span>`}</td>
    </tr>
  `).join("");
  $$("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => editProduct(Number(button.dataset.editProduct)));
  });
  $$("[data-product-status]").forEach((select) => {
    select.addEventListener("change", () => updateProductStatus(Number(select.dataset.productStatus), select.value === "true"));
  });
}

function updateProductStatus(id, available) {
  if (!canToggleProductStatus()) return;
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  product.available = available;
  saveProducts();
  renderProducts();
  renderItemsTable();
}

function formatQty(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function renderInventory() {
  if (!$("#inventoryTable")) return;
  $("#allowNegativeStock").checked = Boolean(state.inventorySettings.allowNegativeStock);
  $("#inventoryTable").innerHTML = state.inventory.map((item) => {
    const low = Number(item.current_quantity) <= Number(item.minimum_quantity);
    return `
      <tr class="${low ? "low-stock-row" : ""}">
        <td>${item.name}</td>
        <td>${item.type}</td>
        <td>${item.unit}</td>
        <td>${formatQty(item.current_quantity)}</td>
        <td>${formatQty(item.minimum_quantity)}</td>
        <td><span class="status-pill ${item.is_active ? "on" : "cancel"}">${item.is_active ? "نشط" : "موقوف"}</span></td>
        <td>
          <div class="stock-add-row">
            <input type="number" min="0" step="0.001" placeholder="مثال 200" data-stock-add-input="${item.id}">
            <button class="ghost-small" type="button" data-stock-add="${item.id}">إضافة</button>
          </div>
        </td>
        <td><button class="primary-small" type="button" data-edit-inventory="${item.id}">تعديل</button></td>
      </tr>
    `;
  }).join("");
  if (!state.inventory.length) {
    $("#inventoryTable").innerHTML = `<tr><td colspan="8">لا توجد مواد مخزون.</td></tr>`;
  }
  $$("#inventoryTable [data-edit-inventory]").forEach((button) => {
    button.addEventListener("click", () => editInventoryItem(button.dataset.editInventory));
  });
  $$("#inventoryTable [data-stock-add]").forEach((button) => {
    button.addEventListener("click", () => addInventoryPurchase(button.dataset.stockAdd));
  });
  renderInventoryTransactions();
}

function renderInventoryTransactions() {
  if (!$("#inventoryTransactionsTable")) return;
  const recent = [...state.inventoryTransactions].sort((a, b) => Number(b.created_at_ms || 0) - Number(a.created_at_ms || 0)).slice(0, 80);
  $("#inventoryTransactionsTable").innerHTML = recent.map((tx) => {
    const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(tx.inventory_item_id));
    return `
      <tr>
        <td>${tx.created_at || ""}</td>
        <td>${item?.name || tx.inventory_item_id}</td>
        <td>${tx.transaction_type}</td>
        <td>${formatQty(tx.quantity)}</td>
        <td>${formatQty(tx.quantity_before)}</td>
        <td>${formatQty(tx.quantity_after)}</td>
        <td>${tx.order_id ? `#${tx.order_id}` : "-"}</td>
        <td>${tx.user_id || "-"}</td>
        <td>${tx.note || ""}</td>
      </tr>
    `;
  }).join("");
  if (!recent.length) {
    $("#inventoryTransactionsTable").innerHTML = `<tr><td colspan="9">لا توجد حركات مخزون بعد.</td></tr>`;
  }
}

function resetInventoryForm() {
  state.editingInventoryId = null;
  $("#inventoryFormTitle").textContent = "إضافة مادة مخزون";
  $("#inventoryForm").reset();
  $("#inventoryType").value = "bread";
  $("#inventoryUnit").value = "piece";
  $("#inventoryActive").checked = true;
  $("#allowNegativeStock").checked = Boolean(state.inventorySettings.allowNegativeStock);
}

function editInventoryItem(id) {
  const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(id));
  if (!item) return;
  state.editingInventoryId = item.id;
  $("#inventoryFormTitle").textContent = "تعديل مادة مخزون";
  $("#inventoryName").value = item.name;
  $("#inventoryType").value = item.type;
  $("#inventoryUnit").value = item.unit;
  $("#inventoryCurrentQty").value = item.current_quantity;
  $("#inventoryMinimumQty").value = item.minimum_quantity;
  $("#inventoryActive").checked = item.is_active;
}

function saveInventoryItem(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "Admin") return;
  state.inventorySettings.allowNegativeStock = $("#allowNegativeStock").checked;
  saveInventorySettings();
  const data = {
    name: $("#inventoryName").value.trim(),
    type: $("#inventoryType").value,
    unit: $("#inventoryUnit").value,
    current_quantity: Number($("#inventoryCurrentQty").value) || 0,
    minimum_quantity: Number($("#inventoryMinimumQty").value) || 0,
    is_active: $("#inventoryActive").checked
  };
  if (!data.name) return;
  if (state.editingInventoryId) {
    const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(state.editingInventoryId));
    if (!item) return;
    const before = Number(item.current_quantity) || 0;
    Object.assign(item, data);
    if (before !== data.current_quantity) {
      recordInventoryTransaction(item, "adjustment", data.current_quantity - before, before, data.current_quantity, null, "تعديل يدوي للكمية");
    }
  } else {
    const item = { id: `inv-${Date.now()}`, ...data };
    state.inventory.push(item);
    if (data.current_quantity !== 0) {
      recordInventoryTransaction(item, "purchase", data.current_quantity, 0, data.current_quantity, null, "إضافة مادة مخزون");
    }
  }
  saveInventory();
  normalizeProductRecipes();
  saveProducts();
  resetInventoryForm();
  renderInventory();
  renderRecipeEditor(getRecipeFromEditor());
}

function addInventoryPurchase(id) {
  if (state.currentUser?.role !== "Admin") return;
  const item = state.inventory.find((inventoryItem) => String(inventoryItem.id) === String(id));
  const input = $(`[data-stock-add-input="${id}"]`);
  const quantity = Number(input?.value);
  if (!item || !Number.isFinite(quantity) || quantity <= 0) return;
  const before = Number(item.current_quantity) || 0;
  const after = before + quantity;
  item.current_quantity = after;
  recordInventoryTransaction(item, "purchase", quantity, before, after, null, "إضافة كمية واردة");
  saveInventory();
  input.value = "";
  renderInventory();
}

function recordInventoryTransaction(item, transactionType, quantity, before, after, orderId = null, note = "") {
  state.inventoryTransactions.unshift({
    id: `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    inventory_item_id: item.id,
    order_id: orderId,
    transaction_type: transactionType,
    quantity: Number(quantity) || 0,
    quantity_before: Number(before) || 0,
    quantity_after: Number(after) || 0,
    user_id: state.currentUser?.email || state.currentUser?.name || "",
    note,
    created_at: new Date().toLocaleString("ar-LY"),
    created_at_ms: Date.now()
  });
  saveInventoryTransactions();
}

function resetItemForm() {
  state.editingProductId = null;
  $("#itemFormTitle").textContent = "إضافة صنف";
  $("#itemForm").reset();
  $("#itemCategory").value = "برغر";
  renderItemIconOptions();
  renderRecipeEditor([]);
  $("#itemAvailable").checked = true;
}

function editProduct(id) {
  if (!canEditProducts()) return;
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  state.editingProductId = id;
  $("#itemFormTitle").textContent = "تعديل صنف";
  $("#itemName").value = product.name;
  $("#itemPrice").value = product.price;
  $("#itemCategory").value = product.category;
  $("#itemStation").value = product.station;
  renderItemIconOptions(product.icon);
  $("#itemAvailable").checked = product.available;
  renderRecipeEditor(product.recipe || []);
  setScreen("items");
}

function syncItemIconWithCategory() {
  renderItemIconOptions();
}

function renderRecipeEditor(recipe = []) {
  const root = $("#recipeRows");
  if (!root) return;
  const rows = recipe.length ? recipe : [{ inventory_item_id: "", quantity_per_item: 1 }];
  root.innerHTML = rows.map((row) => renderRecipeRow(row)).join("");
  bindRecipeRowButtons();
}

function renderRecipeRow(row = {}) {
  const activeInventory = state.inventory.filter((item) => item.is_active);
  return `
    <div class="recipe-row">
      <select class="recipe-inventory">
        <option value="">اختر مادة</option>
        ${activeInventory.map((item) => `
          <option value="${item.id}" ${String(row.inventory_item_id || "") === String(item.id) ? "selected" : ""}>${item.name} (${item.unit})</option>
        `).join("")}
      </select>
      <input class="recipe-quantity" type="number" min="0" step="0.001" value="${Number(row.quantity_per_item || 1)}">
      <button class="danger-small" type="button" data-remove-recipe>Remove</button>
    </div>
  `;
}

function bindRecipeRowButtons() {
  $$("#recipeRows [data-remove-recipe]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".recipe-row").remove();
      if (!$("#recipeRows").children.length) addRecipeEditorRow();
    });
  });
}

function addRecipeEditorRow() {
  $("#recipeRows").insertAdjacentHTML("beforeend", renderRecipeRow());
  bindRecipeRowButtons();
}

function getRecipeFromEditor() {
  return $$("#recipeRows .recipe-row")
    .map((row) => ({
      inventory_item_id: row.querySelector(".recipe-inventory")?.value,
      quantity_per_item: Number(row.querySelector(".recipe-quantity")?.value)
    }))
    .filter((row) => row.inventory_item_id && row.quantity_per_item > 0);
}

function saveProduct(event) {
  event.preventDefault();
  if (!canEditProducts()) return;
  const productData = {
    name: $("#itemName").value.trim(),
    price: Number($("#itemPrice").value),
    category: $("#itemCategory").value.trim(),
    station: $("#itemStation").value,
    icon: $("#itemIcon").value.trim() || "🍽",
    available: $("#itemAvailable").checked,
    recipe: getRecipeFromEditor()
  };
  if (state.editingProductId) {
    const product = state.products.find((item) => item.id === state.editingProductId);
    Object.assign(product, productData);
  } else {
    state.products.push({ id: Date.now(), ...productData });
  }
  saveProducts();
  resetItemForm();
  renderCategories();
  renderProducts();
  renderItemsTable();
}

function renderKitchen() {
  ensureKitchenBatches();
  renderKitchenAlerts();
  const making = state.orders
    .filter((order) => order.status === "قيد التجهيز")
    .sort((a, b) => a.id - b.id);
  $("#kitchenOrders").innerHTML = making.map((order) => `
    <article class="kitchen-card">
      <h3>#${order.id}</h3>
      <span class="status-pill wait">${order.type}</span>
      ${order.customer ? `<p class="customer-kitchen-info">${order.customer.name || "-"} - ${order.customer.phone || "-"}</p>` : ""}
      <p>${order.time}</p>
      <ul>${order.items.map((item) => `<li><span>${item.name}${renderItemNotes(item)}</span><b>${item.qty}x</b></li>`).join("")}</ul>
      <button class="primary-small" type="button" data-ready="${order.id}">الطلب جاهز</button>
    </article>
  `).join("");

  $$("#kitchenOrders button").forEach((button) => {
    button.addEventListener("click", () => markReady(button.dataset.ready));
  });

  $("#prepTotals").innerHTML = renderPrepGroups(making);
}

function renderKitchenAlerts() {
  const alerts = state.orders
    .filter((order) => (order.status === "ملغي" && order.cancelAlert) || order.modifiedAlert)
    .sort((a, b) => (Number(b.deletedAtMs || b.modifiedAtMs || 0) - Number(a.deletedAtMs || a.modifiedAtMs || 0)));

  $("#kitchenAlerts").innerHTML = alerts.map((order) => {
    const isCancel = order.status === "ملغي" && order.cancelAlert;
    const title = isCancel ? "طلب ملغي" : "تعديل متأخر";
    const meta = isCancel
      ? `${order.deletedBy || "الكاشير"} - ${order.deletedAt || ""}`
      : `${order.modifiedBy || "الكاشير"} - ${order.modifiedAt || ""}`;
    return `
      <article class="kitchen-alert ${isCancel ? "cancel" : "modify"}">
        <div>
          <strong>${title} #${order.id}</strong>
          <span>${meta}</span>
        </div>
        <button class="ghost-small" type="button" data-ack-alert="${order.id}" data-alert-type="${isCancel ? "cancel" : "modify"}">تم العلم</button>
      </article>
    `;
  }).join("");

  $$("[data-ack-alert]").forEach((button) => {
    button.addEventListener("click", () => acknowledgeKitchenAlert(button.dataset.ackAlert, button.dataset.alertType));
  });
}

function acknowledgeKitchenAlert(id, type) {
  const order = state.orders.find((item) => item.id === Number(id));
  if (!order) return;
  if (type === "cancel") order.cancelAlert = false;
  if (type === "modify") order.modifiedAlert = false;
  saveOrders();
  renderKitchen();
}

function renderItemNotes(item) {
  const notes = [
    ...getLineModifiers(item).map(formatModifier),
    ...(item.notes || [])
  ];
  if (!notes.length) return "";
  return `<em class="kitchen-notes">${notes.join("، ")}</em>`;
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
  renderDashboard();
}

function renderDashboard() {
  const dayRange = getBusinessDayRange();
  const activeOrders = state.orders.filter((order) => order.status !== "ملغي");
  const todayOrders = activeOrders.filter((order) => isInRange(order.createdAt, dayRange));
  const canceledToday = state.orders.filter((order) => order.status === "ملغي" && isInRange(order.createdAt, dayRange));
  const weekRange = getBusinessWeekRange();
  const weekOrders = activeOrders.filter((order) => isInRange(order.createdAt, weekRange));
  const readyOrders = todayOrders.filter((order) => order.status === "جاهز");
  const makingOrders = todayOrders.filter((order) => order.status === "قيد التجهيز");
  const salesTotal = sumOrders(todayOrders);
  const weekSalesTotal = sumOrders(weekOrders);
  const averageTotal = todayOrders.length ? Math.round(salesTotal / todayOrders.length) : 0;
  const topItem = getTopSoldItem(todayOrders);
  const weekTopItem = getTopSoldItem(weekOrders);
  const topCashier = getTopCashier(todayOrders);
  const prepAverage = getAveragePrepMinutes(todayOrders);
  const todayPayments = getPaymentTotals(todayOrders);
  const weekPayments = getPaymentTotals(weekOrders);

  $("#todaySales").textContent = formatMoney(salesTotal);
  $("#ordersCount").textContent = todayOrders.length;
  $("#readyCount").textContent = readyOrders.length;
  $("#makingCount").textContent = makingOrders.length;
  $("#canceledCount").textContent = canceledToday.length;
  $("#topItemName").textContent = topItem.name;
  $("#topItemCount").textContent = `${topItem.qty} طلب`;
  $("#topCashierName").textContent = topCashier.name;
  $("#topCashierCount").textContent = `${topCashier.count} فاتورة`;
  $("#avgOrderValue").textContent = formatMoney(averageTotal);
  $("#avgPrepTime").textContent = `${prepAverage} دقيقة`;
  $("#cashierTotals").innerHTML = renderCashierTotals(todayOrders);

  $("#weekSales").textContent = formatMoney(weekSalesTotal);
  $("#weekOrdersCount").textContent = weekOrders.length;
  $("#weekTopItemName").textContent = weekTopItem.name;
  $("#weekTopItemCount").textContent = weekTopItem.qty;
  renderPaymentBreakdown(todayPayments, {
    cashShare: "#cashPaymentShare",
    checkShare: "#checkPaymentShare",
    cashTotal: "#cashPaymentTotal",
    checkTotal: "#checkPaymentTotal",
    donut: "#paymentDonut"
  });
  renderPaymentBreakdown(weekPayments, {
    cashShare: "#weekCashPaymentShare",
    checkShare: "#weekCheckPaymentShare",
    cashTotal: "#weekCashPaymentTotal",
    checkTotal: "#weekCheckPaymentTotal",
    donut: "#weekPaymentDonut"
  });
  renderWeeklySalesChart(weekOrders, weekRange);
}

function sumOrders(orders) {
  return orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
}

function isInRange(value, range) {
  const time = Number(value) || 0;
  return time >= range.start && time < range.end;
}

function getBusinessDayRange(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(1, 0, 0, 0);
  if (reference.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function getBusinessWeekRange(reference = new Date()) {
  const dayRange = getBusinessDayRange(reference);
  const start = new Date(dayRange.start);
  const diffFromFriday = (start.getDay() - 5 + 7) % 7;
  start.setDate(start.getDate() - diffFromFriday);
  start.setHours(1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

function getPaymentTotals(orders) {
  return orders.reduce((totals, order) => {
    const payment = normalizePayment(order.payment);
    if (payment === "صك") totals.check += Number(order.total) || 0;
    else if (payment === "نقدي") totals.cash += Number(order.total) || 0;
    else totals.other += Number(order.total) || 0;
    return totals;
  }, { cash: 0, check: 0, other: 0 });
}

function renderPaymentBreakdown(totals, selectors) {
  const total = totals.cash + totals.check;
  const cashShare = total ? Math.round((totals.cash / total) * 100) : 0;
  const checkShare = total ? 100 - cashShare : 0;
  $(selectors.cashShare).textContent = `${cashShare}%`;
  $(selectors.checkShare).textContent = `${checkShare}%`;
  $(selectors.cashTotal).textContent = formatMoney(totals.cash);
  $(selectors.checkTotal).textContent = formatMoney(totals.check);
  $(selectors.donut).style.setProperty("--cash", `${cashShare}%`);
}

function getAveragePrepMinutes(orders) {
  const readyOrders = orders.filter((order) => order.readyAt && order.createdAt);
  if (!readyOrders.length) return 0;
  const totalMinutes = readyOrders.reduce((sum, order) => sum + ((Number(order.readyAt) - Number(order.createdAt)) / 60000), 0);
  return Math.max(1, Math.round(totalMinutes / readyOrders.length));
}

function renderCashierTotals(orders) {
  const totals = {};
  orders.forEach((order) => {
    totals[order.cashier] = (totals[order.cashier] || 0) + (Number(order.total) || 0);
  });
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `<p>لا توجد مبيعات اليوم.</p>`;
  return rows.map(([name, total]) => `<div class="prep-row"><span>${name}</span><strong>${formatMoney(total)}</strong></div>`).join("");
}

function renderWeeklySalesChart(orders, weekRange) {
  const dayLabels = ["جمعة", "سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس"];
  const totals = Array.from({ length: 7 }, (_, index) => {
    const start = weekRange.start + index * 86400000;
    const end = start + 86400000;
    return sumOrders(orders.filter((order) => isInRange(order.createdAt, { start, end })));
  });
  const max = Math.max(...totals, 1);
  $("#weeklySalesChart").innerHTML = totals.map((total) => `<span title="${formatMoney(total)}" style="--h:${Math.max(6, Math.round((total / max) * 100))}%"></span>`).join("");
  $("#weeklySalesDays").innerHTML = dayLabels.map((day) => `<span>${day}</span>`).join("");
}

function getTopSoldItem(orders) {
  const totals = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      totals[item.name] = (totals[item.name] || 0) + Number(item.qty || 0);
    });
  });
  const [name, qty] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  return { name, qty };
}

function getTopCashier(orders) {
  const totals = {};
  orders.forEach((order) => {
    totals[order.cashier] = (totals[order.cashier] || 0) + 1;
  });
  const [name, count] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  return { name, count };
}

function normalizePayment(payment) {
  if (payment === "صك") return "صك";
  if (payment === "تحويل" || payment === "بطاقة") return "تحويل";
  return "نقدي";
}

function renderPaymentSummary() {
  renderDashboard();
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

function setDefaultReportDates() {
  const dayRange = getBusinessDayRange();
  const date = formatDateInput(new Date(dayRange.start));
  $("#reportFrom").value = date;
  $("#reportTo").value = date;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getReportRange() {
  const fromValue = $("#reportFrom").value || formatDateInput(new Date(getBusinessDayRange().start));
  const toValue = $("#reportTo").value || fromValue;
  const start = new Date(`${fromValue}T01:00:00`).getTime();
  const endDate = new Date(`${toValue}T01:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  return { start, end: endDate.getTime(), fromValue, toValue };
}

function getReportOrders(includeCanceled = false) {
  const range = getReportRange();
  const orders = state.orders.filter((order) => isInRange(order.createdAt, range) && (includeCanceled || order.status !== "ملغي"));
  return { orders, range };
}

function renderReports() {
  if (state.currentReport === "sales") renderSalesReport();
  else if (state.currentReport === "operations") renderOperationsReport();
  else renderItemsReport();
}

function setReportHeader(title, range) {
  $("#reportTitle").textContent = title;
  $("#reportRangeLabel").textContent = `من ${range.fromValue} إلى ${range.toValue} - التشغيل من 1:00 صباحاً`;
}

function renderItemsReport() {
  state.currentReport = "items";
  const { orders, range } = getReportOrders(false);
  const canceledCount = state.orders.filter((order) => order.status === "ملغي" && isInRange(order.createdAt, range)).length;
  setReportHeader("تقرير الأصناف", range);
  const rows = getItemSalesRows(orders);
  $("#reportBody").innerHTML = `
    <div class="report-summary">
      <article><span>عدد الطلبات</span><strong>${orders.length}</strong></article>
      <article><span>طلبات ملغية</span><strong>${canceledCount}</strong></article>
      <article><span>إجمالي الكميات</span><strong>${rows.reduce((sum, row) => sum + row.qty, 0)}</strong></article>
      <article><span>إجمالي المبيعات</span><strong>${formatMoney(sumOrders(orders))}</strong></article>
    </div>
    ${renderReportTable(["الصنف", "الكمية المباعة", "إجمالي تقريبي"], rows.map((row) => [row.name, row.qty, formatMoney(row.total)]))}
  `;
}

function renderSalesReport() {
  state.currentReport = "sales";
  const { orders, range } = getReportOrders(false);
  const canceledCount = state.orders.filter((order) => order.status === "ملغي" && isInRange(order.createdAt, range)).length;
  setReportHeader("تقرير المبيعات", range);
  const payments = getPaymentTotals(orders);
  const cashierRows = getGroupedSalesRows(orders, "cashier");
  const typeRows = getGroupedSalesRows(orders, "type");
  $("#reportBody").innerHTML = `
    <div class="report-summary">
      <article><span>إجمالي المبيعات</span><strong>${formatMoney(sumOrders(orders))}</strong></article>
      <article><span>عدد الطلبات</span><strong>${orders.length}</strong></article>
      <article><span>طلبات ملغية</span><strong>${canceledCount}</strong></article>
      <article><span>نقدي</span><strong>${formatMoney(payments.cash)}</strong></article>
      <article><span>صك</span><strong>${formatMoney(payments.check)}</strong></article>
    </div>
    <h3>المبيعات حسب الكاشير</h3>
    ${renderReportTable(["الكاشير", "عدد الطلبات", "الإجمالي"], cashierRows.map((row) => [row.name, row.count, formatMoney(row.total)]))}
    <h3>المبيعات حسب نوع الطلب</h3>
    ${renderReportTable(["نوع الطلب", "عدد الطلبات", "الإجمالي"], typeRows.map((row) => [row.name, row.count, formatMoney(row.total)]))}
  `;
}

function renderOperationsReport() {
  state.currentReport = "operations";
  const { orders, range } = getReportOrders(true);
  setReportHeader("تقرير التشغيل", range);
  const activeOrders = orders.filter((order) => order.status !== "ملغي");
  const ready = activeOrders.filter((order) => order.status === "جاهز");
  const making = activeOrders.filter((order) => order.status === "قيد التجهيز");
  const canceled = orders.filter((order) => order.status === "ملغي");
  $("#reportBody").innerHTML = `
    <div class="report-summary">
      <article><span>إجمالي الطلبات</span><strong>${orders.length}</strong></article>
      <article><span>طلبات جاهزة</span><strong>${ready.length}</strong></article>
      <article><span>قيد التجهيز</span><strong>${making.length}</strong></article>
      <article><span>طلبات ملغية</span><strong>${canceled.length}</strong></article>
      <article><span>متوسط التجهيز</span><strong>${getAveragePrepMinutes(activeOrders)} دقيقة</strong></article>
      <article><span>التعديلات المتأخرة</span><strong>${orders.filter((order) => order.modifiedAlert || order.modifiedBy).length}</strong></article>
    </div>
    <h3>ملخص الحالات</h3>
    ${renderReportTable(["الحالة", "العدد"], [["جاهز", ready.length], ["قيد التجهيز", making.length], ["ملغي", canceled.length]])}
  `;
}

function getItemSalesRows(orders) {
  const totals = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!totals[item.name]) totals[item.name] = { name: item.name, qty: 0, total: 0 };
      const price = getOrderItemPrice(item);
      totals[item.name].qty += Number(item.qty || 0);
      totals[item.name].total += price * Number(item.qty || 0);
    });
  });
  return Object.values(totals).sort((a, b) => b.qty - a.qty);
}

function getGroupedSalesRows(orders, field) {
  const groups = {};
  orders.forEach((order) => {
    const name = order[field] || "-";
    if (!groups[name]) groups[name] = { name, count: 0, total: 0 };
    groups[name].count += 1;
    groups[name].total += Number(order.total) || 0;
  });
  return Object.values(groups).sort((a, b) => b.total - a.total);
}

function renderReportTable(headers, rows) {
  if (!rows.length) return `<p>لا توجد نتائج في هذه الفترة.</p>`;
  return `
    <div class="table-wrap report-table">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function printReport(type = state.currentReport) {
  state.currentReport = type;
  renderReports();
  const title = $("#reportTitle").textContent;
  const range = $("#reportRangeLabel").textContent;
  const body = $("#reportBody").innerHTML;
  const page = window.open("", "_blank", "width=900,height=700");
  if (!page) return;
  page.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
        h1, h2, h3, p { margin: 0 0 10px; }
        h1 { text-align: center; font-size: 24px; }
        .meta { text-align: center; margin-bottom: 18px; color: #555; }
        .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
        .report-summary article { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
        .report-summary span { display: block; color: #666; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border-bottom: 1px solid #ddd; padding: 9px; text-align: right; }
        th { background: #f3f3f3; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h1>مطعم سموكي</h1>
      <h2>${title}</h2>
      <p class="meta">${range}</p>
      ${body}
      <script>window.print();<\/script>
    </body>
    </html>
  `);
  page.document.close();
}

function renderUserRoles() {
  const select = $("#newUserRole");
  select.innerHTML = Object.keys(roles).map((role) => `<option value="${role}">${role}</option>`).join("");
  renderRolePermissions();
}

function renderRolePermissions() {
  const role = $("#newUserRole").value || "Admin";
  $("#rolePermissions").innerHTML = `
    <strong>صلاحيات ${role}</strong>
    <ul>${roles[role].map((permission) => `<li>${permission}</li>`).join("")}</ul>
  `;
}

function renderUsersTable() {
  const canManageUsers = state.currentUser?.role === "Admin";
  $("#usersTable").innerHTML = state.users.map((user) => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><code>${user.password}</code></td>
      <td>${user.role}</td>
      <td>${roles[user.role]?.slice(0, 3).join("، ") || "-"}</td>
      <td><span class="status-pill on">${user.status}</span></td>
      <td>
        ${canManageUsers ? `
          <div class="table-actions">
            <button class="ghost-small" type="button" data-edit-user="${user.email}">تعديل</button>
            <button class="danger-small" type="button" data-delete-user="${user.email}" ${user.email === state.currentUser?.email ? "disabled" : ""}>حذف</button>
          </div>
        ` : `<span class="muted-cell">عرض فقط</span>`}
      </td>
    </tr>
  `).join("");
  $$("[data-edit-user]").forEach((button) => {
    button.addEventListener("click", () => editUser(button.dataset.editUser));
  });
  $$("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.deleteUser));
  });
}

function addUser(event) {
  event.preventDefault();
  if (state.currentUser?.role !== "Admin") return;
  const email = $("#newUserEmail").value.trim().toLowerCase();
  const userData = {
    name: $("#newUserName").value.trim(),
    email,
    password: $("#newUserPassword").value,
    role: $("#newUserRole").value,
    status: "نشط"
  };
  const duplicate = state.users.some((user) => (user.email || "").toLowerCase() === email && user.email !== state.editingUserEmail);
  if (duplicate) {
    alert("الإيميل مستخدم من قبل.");
    return;
  }
  if (state.editingUserEmail) {
    const user = state.users.find((item) => item.email === state.editingUserEmail);
    if (user) Object.assign(user, userData);
  } else {
    state.users.push(userData);
  }
  saveUsers();
  resetUserForm();
  renderUsersTable();
}

function editUser(email) {
  if (state.currentUser?.role !== "Admin") return;
  const user = state.users.find((item) => item.email === email);
  if (!user) return;
  state.editingUserEmail = user.email;
  $("#userFormTitle").textContent = "تعديل مستخدم";
  $("#saveUserButton").textContent = "حفظ التعديل";
  $("#newUserName").value = user.name;
  $("#newUserEmail").value = user.email;
  $("#newUserPassword").value = user.password;
  $("#newUserRole").value = user.role;
  renderRolePermissions();
}

function deleteUser(email) {
  if (state.currentUser?.role !== "Admin" || email === state.currentUser?.email) return;
  const user = state.users.find((item) => item.email === email);
  if (!user) return;
  const ok = confirm(`تأكيد حذف المستخدم ${user.name}؟`);
  if (!ok) return;
  state.users = state.users.filter((item) => item.email !== email);
  if (state.editingUserEmail === email) resetUserForm();
  saveUsers();
  renderUsersTable();
}

function resetUserForm() {
  state.editingUserEmail = null;
  $("#userFormTitle").textContent = "إضافة مستخدم";
  $("#saveUserButton").textContent = "إضافة المستخدم";
  $("#userForm").reset();
  renderUserRoles();
}

function saveAuthSession(user, persistent = false) {
  const payload = JSON.stringify({ email: user.email, persistent });
  sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
  if (persistent) localStorage.setItem(AUTH_STORAGE_KEY, payload);
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

function clearAuthSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function restoreAuthSession() {
  const saved = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
  if (!saved) return false;
  try {
    const { email } = JSON.parse(saved);
    normalizeUsers();
    const user = state.users.find((item) => (item.email || "").toLowerCase() === String(email || "").toLowerCase() && item.status === "نشط");
    if (!user) {
      clearAuthSession();
      return false;
    }
    state.currentUser = user;
    $("#loginView").classList.add("hidden");
    applyUserPermissions();
    setScreen(getDefaultScreenForUser());
    return true;
  } catch {
    clearAuthSession();
    return false;
  }
}

function login(event) {
  event.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  normalizeUsers();
  const user = state.users.find((item) => (item.email || "").toLowerCase() === email && String(item.password) === String(password) && item.status === "نشط");
  if (!user) {
    $("#loginError").textContent = "بيانات الدخول غير صحيحة أو الحساب موقوف.";
    return;
  }
  state.currentUser = user;
  saveAuthSession(user, $("#rememberLogin").checked);
  $("#loginError").textContent = "";
  $("#loginView").classList.add("hidden");
  applyUserPermissions();
  setScreen(getDefaultScreenForUser());
}

function logout() {
  state.currentUser = null;
  clearAuthSession();
  document.body.classList.remove("customer-mode");
  $("#loginError").textContent = "";
  $("#loginEmail").value = "";
  $("#loginPassword").value = "";
  $("#rememberLogin").checked = false;
  $("#loginView").classList.remove("hidden");
}

function renderAll() {
  renderCategories();
  renderOrderTypes();
  renderPaymentMethods();
  renderProducts();
  renderCart();
  renderOrdersTable();
  renderItemsTable();
  renderInventory();
  renderKitchen();
  renderCustomerDisplay();
  renderPaymentSummary();
  renderPrinters();
  renderUsersTable();
  renderReports();
}

function init() {
  loadSavedOrders();
  loadSavedUsers();
  loadSavedInventory();
  loadSavedInventoryTransactions();
  loadInventorySettings();
  loadSavedProducts();
  $("#loginForm").addEventListener("submit", login);
  $("#logoutButton").addEventListener("click", logout);
  restoreAuthSession();
  $("#orderSearch").addEventListener("input", (event) => {
    state.orderSearch = event.target.value;
    renderOrdersTable();
  });
  $("#orderStatusFilter").addEventListener("change", (event) => {
    state.orderStatusFilter = event.target.value;
    renderOrdersTable();
  });
  setDefaultOrderDateFilter();
  $("#orderDateFilter").addEventListener("change", (event) => {
    state.orderDateFilter = event.target.value;
    renderOrdersTable();
  });
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setScreen(button.dataset.screen));
  });
  $("#mobileSettingsToggle").addEventListener("click", () => {
    const settingsNav = $(".mobile-settings-nav");
    const isOpen = settingsNav.classList.toggle("open");
    $("#mobileSettingsToggle").setAttribute("aria-expanded", String(isOpen));
  });
  $("#cartCollapseToggle").addEventListener("click", () => toggleCartCollapse());
  $("#cartMiniToggle").addEventListener("click", () => toggleCartCollapse(true));
  $("#clearCart").addEventListener("click", () => {
    state.cart = [];
    state.editingOrderId = null;
    $("#confirmOrder").textContent = "تأكيد الطلب وطباعة";
    renderCart();
  });
  $("#confirmOrder").addEventListener("click", confirmOrder);
  $("#itemForm").addEventListener("submit", saveProduct);
  $("#cancelItemEdit").addEventListener("click", resetItemForm);
  $("#itemCategory").addEventListener("change", syncItemIconWithCategory);
  $("#addRecipeRow").addEventListener("click", addRecipeEditorRow);
  $("#inventoryForm").addEventListener("submit", saveInventoryItem);
  $("#cancelInventoryEdit").addEventListener("click", resetInventoryForm);
  $("#allowNegativeStock").addEventListener("change", (event) => {
    state.inventorySettings.allowNegativeStock = event.target.checked;
    saveInventorySettings();
  });
  $("#userForm").addEventListener("submit", addUser);
  $("#cancelUserEdit").addEventListener("click", resetUserForm);
  $("#newUserRole").addEventListener("change", renderRolePermissions);
  renderUserRoles();
  setDefaultReportDates();
  $("#showItemsReport").addEventListener("click", renderItemsReport);
  $("#showSalesReport").addEventListener("click", renderSalesReport);
  $("#showOpsReport").addEventListener("click", renderOperationsReport);
  $("#reportFrom").addEventListener("change", renderReports);
  $("#reportTo").addEventListener("change", renderReports);
  $$("[data-print-report]").forEach((button) => {
    button.addEventListener("click", () => printReport(button.dataset.printReport));
  });
  $("#customerExit").addEventListener("click", () => setScreen("dashboard"));
  $(".menu-toggle").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  setInterval(() => {
    $("#clock").textContent = new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
  }, 1000);
  renderRecipeEditor([]);
  resetInventoryForm();
  renderAll();
}

init();
