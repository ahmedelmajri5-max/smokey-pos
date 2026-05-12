// Fix login handling for users loaded from Firebase/localStorage with active=true.
(function () {
  const AUTH_KEY = "smokey-pos-current-user-v1";
  const DEFAULT_USERS = [
    { id: "admin", name: "ادمن", email: "admin@smokey.local", password: "123456", role: "Admin", active: true, status: "نشط" },
    { id: "cashier1", name: "كاشير 1", email: "cashier1@smokey.local", password: "123456", role: "Cashier", active: true, status: "نشط" },
    { id: "cashier2", name: "كاشير 2", email: "cashier2@smokey.local", password: "123456", role: "Cashier", active: true, status: "نشط" },
    { id: "assembly", name: "تجميع", email: "assembly@smokey.local", password: "123456", role: "Order Assembly User", active: true, status: "نشط" },
    { id: "supervisor", name: "مشرف", email: "supervisor@smokey.local", password: "123456", role: "Manager / Supervisor", active: true, status: "نشط" }
  ];

  function getState() {
    try { return typeof state !== "undefined" ? state : window.state; } catch (_) { return window.state; }
  }

  function normalizeRole(role) {
    return role === "Supervisor" ? "Manager / Supervisor" : role;
  }

  function isActive(user) {
    if (!user) return false;
    if (user.active === false || user.status === "موقوف") return false;
    return true;
  }

  function normalizeAuthUsers() {
    const s = getState();
    if (!s) return [];
    if (!Array.isArray(s.users)) s.users = [];

    DEFAULT_USERS.forEach((defaultUser) => {
      const email = defaultUser.email.toLowerCase();
      let existing = s.users.find((user) => (user.email || "").toLowerCase() === email)
        || s.users.find((user) => user.id && user.id === defaultUser.id);
      if (!existing) {
        s.users.push({ ...defaultUser });
        return;
      }
      existing.id = existing.id || defaultUser.id;
      existing.name = existing.name || defaultUser.name;
      existing.email = existing.email || defaultUser.email;
      existing.password = existing.password || defaultUser.password;
      existing.role = normalizeRole(existing.role || defaultUser.role);
      existing.status = existing.active === false ? "موقوف" : "نشط";
      existing.active = existing.status === "نشط";
    });

    s.users.forEach((user, index) => {
      if (!user.email) user.email = `${String(user.role || "user").toLowerCase().replaceAll(" ", "")}${index}@smokey.local`;
      if (!user.password) user.password = "123456";
      user.role = normalizeRole(user.role || "Cashier");
      if (user.active === false) user.status = "موقوف";
      if (user.status !== "موقوف") user.status = "نشط";
      user.active = user.status === "نشط";
    });

    try { if (typeof saveUsers === "function") saveUsers(); } catch (_) {}
    return s.users;
  }

  function saveSession(user, persistent) {
    const payload = JSON.stringify({ email: user.email, persistent: !!persistent });
    sessionStorage.setItem(AUTH_KEY, payload);
    if (persistent) localStorage.setItem(AUTH_KEY, payload);
    else localStorage.removeItem(AUTH_KEY);
  }

  function clearSession() {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
  }

  function showAppFor(user) {
    const s = getState();
    if (!s || !user) return false;
    s.currentUser = user;
    document.querySelector("#loginView")?.classList.add("hidden");
    try { if (typeof applyUserPermissions === "function") applyUserPermissions(); } catch (_) {}
    try {
      if (typeof setScreen === "function") setScreen(typeof getDefaultScreenForUser === "function" ? getDefaultScreenForUser() : "dashboard");
    } catch (_) {}
    return true;
  }

  function patchedRestoreAuthSession() {
    const saved = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
    if (!saved) return false;
    try {
      const { email } = JSON.parse(saved);
      const users = normalizeAuthUsers();
      const user = users.find((item) => (item.email || "").toLowerCase() === String(email || "").toLowerCase() && isActive(item));
      if (!user) {
        clearSession();
        return false;
      }
      return showAppFor(user);
    } catch (_) {
      clearSession();
      return false;
    }
  }

  function patchedLogin(event) {
    event?.preventDefault?.();
    const email = (document.querySelector("#loginEmail")?.value || "").trim().toLowerCase();
    const password = document.querySelector("#loginPassword")?.value || "";
    const users = normalizeAuthUsers();
    const user = users.find((item) => (item.email || "").toLowerCase() === email && String(item.password) === String(password) && isActive(item));
    const error = document.querySelector("#loginError");
    if (!user) {
      if (error) error.textContent = "بيانات الدخول غير صحيحة أو الحساب موقوف.";
      return;
    }
    saveSession(user, !!document.querySelector("#rememberLogin")?.checked);
    if (error) error.textContent = "";
    showAppFor(user);
  }

  function install() {
    normalizeAuthUsers();
    const form = document.querySelector("#loginForm");
    if (form) {
      try { if (typeof login === "function") form.removeEventListener("submit", login); } catch (_) {}
      form.addEventListener("submit", patchedLogin);
    }
    try { login = patchedLogin; } catch (_) { window.login = patchedLogin; }
    try { restoreAuthSession = patchedRestoreAuthSession; } catch (_) { window.restoreAuthSession = patchedRestoreAuthSession; }
    patchedRestoreAuthSession();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
