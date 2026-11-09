// ../legavik-environment-build-0GypEj/src/shared/public-deployment.js
function publicDeployment(config, location) {
  const d = config?.deployment;
  if (!d || !["qa", "production"].includes(d.environment) || !["test", "live"].includes(d.stripeMode)) return null;
  if (d.stripeMode !== (d.environment === "qa" ? "test" : "live")) return null;
  try {
    const site = new URL(d.siteUrl), backend = new URL(config.supabaseUrl);
    if (site.protocol !== "https:" || backend.protocol !== "https:" || site.search || site.hash || site.username || site.password) return null;
    if (backend.origin !== d.supabaseUrl || backend.href !== d.supabaseUrl + "/") return null;
    if (!/^legavik-[a-z0-9-]+-\d{8}-[1-9]\d*$/.test(d.release ?? "")) return null;
    if (d.environment === "production" && (/-qa-/.test(d.release) || site.hostname.endsWith(".github.io") && site.href !== "https://sixtrees778899-stack.github.io/LEGAVIK-production-preview")) return null;
    if (location) {
      const origin = location.origin ?? `${location.protocol ?? "https:"}//${location.hostname}`;
      if (origin !== site.origin || !location.pathname.startsWith(site.pathname.replace(/\/$/, "") + "/")) return null;
    }
    return d;
  } catch {
    return null;
  }
}

// ../legavik-environment-build-0GypEj/web/support/crisp-loader.js
var WELCOME = "\u60A8\u597D\uFF0C\u8FD9\u91CC\u662F LEGAVIK \u5BA2\u670D\u3002\u8BF7\u52FF\u5728\u804A\u5929\u4E2D\u53D1\u9001\u52A9\u8BB0\u8BCD\u3001\u79C1\u94A5\u3001\u6062\u590D\u5BC6\u7801\u6216 Recovery Kit \u5185\u5BB9\uFF0C\u6211\u4EEC\u7684\u5DE5\u4F5C\u4EBA\u5458\u6C38\u8FDC\u4E0D\u4F1A\u5411\u60A8\u7D22\u53D6\u8FD9\u4E9B\u4FE1\u606F\u3002";
var AWAY = "\u6211\u4EEC\u4F1A\u5728\u4E0B\u4E00\u4E2A\u5DE5\u4F5C\u65F6\u6BB5\u5F00\u59CB\u540E 30 \u5206\u949F\u5185\u56DE\u590D\u60A8\u3002";
function outsideBusinessHours(date = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(date).map((p) => [p.type, p.value]));
  return ["Sat", "Sun"].includes(parts.weekday) || Number(parts.hour) < 9 || Number(parts.hour) >= 18;
}
function setCrispEmail(win, email) {
  const value = typeof email === "string" ? email.trim() : "";
  if (!value || typeof win.$crisp?.push !== "function") return false;
  win.$crisp.push(["set", "user:email", [value]]);
  return true;
}
async function bindCrispIdentity(win, onSessionLoaded = () => {
}) {
  if (typeof win.$crisp?.push !== "function") return false;
  const status = (value) => {
    if (win.document?.documentElement) win.document.documentElement.dataset.crispIdentity = value;
  };
  status("WAITING_AUTH_AND_SESSION");
  let auth, generation = 0, signedOut = false, sessionReady = false;
  let attempts = 0, timer;
  const applyVerifiedUser = async () => {
    if (!auth || !sessionReady || signedOut) return false;
    const current = ++generation;
    try {
      const { data, error } = await auth.getUser();
      if (current !== generation || signedOut) return false;
      const sent = !error && setCrispEmail(win, data?.user?.email);
      if (sent) onSessionLoaded();
      status(sent ? "EMAIL_QUEUED" : error ? "AUTH_LOOKUP_FAILED" : "NO_LOGGED_IN_EMAIL");
      return sent;
    } catch {
      status("AUTH_LOOKUP_FAILED");
      return false;
    }
  };
  const attach = () => {
    if (auth) return;
    const candidate = win.LEGAVIK_SUPABASE_CLIENT?.auth;
    if (!candidate?.getUser) return;
    auth = candidate;
    status(sessionReady ? "AUTH_AND_SESSION_READY" : "WAITING_CRISP_SESSION");
    if (timer) win.clearTimeout(timer);
    auth.onAuthStateChange?.((event) => {
      if (event === "SIGNED_OUT") {
        signedOut = true;
        sessionReady = false;
        generation++;
        status("SIGNED_OUT");
        win.$crisp.push(["do", "session:reset"]);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        signedOut = false;
        Promise.resolve().then(applyVerifiedUser);
      }
    });
    void applyVerifiedUser();
  };
  win.$crisp.push(["on", "session:loaded", () => {
    sessionReady = true;
    onSessionLoaded();
    status(auth ? "AUTH_AND_SESSION_READY" : "WAITING_AUTH");
    attach();
    void applyVerifiedUser();
  }]);
  win.$crisp.push(["on", "user:email:changed", () => {
    if (sessionReady) onSessionLoaded();
  }]);
  win.$crisp.push(["on", "message:sent", () => {
    if (!sessionReady) return;
    onSessionLoaded();
    if (typeof win.setTimeout === "function") win.setTimeout(() => {
      if (sessionReady) onSessionLoaded();
    }, 1e3);
  }]);
  win.$crisp.push(["on", "chat:opened", () => {
    attach();
    void applyVerifiedUser();
  }]);
  try {
    sessionReady = Boolean(win.$crisp.get?.("session:identifier"));
  } catch {
  }
  if (sessionReady) onSessionLoaded();
  const poll = () => {
    attach();
    if (!auth && ++attempts < 120 && typeof win.setTimeout === "function") timer = win.setTimeout(poll, 250);
  };
  poll();
  return true;
}
function installCrisp(win = window, doc = document, date = /* @__PURE__ */ new Date()) {
  const config = win.SKREK_PUBLIC_CONFIG, crisp = config?.crisp;
  const location = win.location;
  const deployment = publicDeployment(config, location);
  if (!deployment || crisp?.enabled !== true || crisp?.safetySettingsConfirmed !== true) return false;
  const base = new URL(deployment.siteUrl).pathname.replace(/\/$/, "");
  if (![base + "/web/account/index.html", base + "/web/v3-crypto/index.html"].includes(location.pathname)) return false;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(crisp.websiteId || "") || win.CRISP_WEBSITE_ID) return false;
  win.$crisp = [];
  win.CRISP_WEBSITE_ID = crisp.websiteId;
  win.CRISP_RUNTIME_CONFIG = { locale: "zh" };
  const tagQa = () => {
    win.$crisp.push(["set", "session:segments", [[deployment.environment]]]);
    if (doc.documentElement) doc.documentElement.dataset.crispQaTag = "QUEUED";
  };
  let shown = false;
  win.$crisp.push(["on", "chat:opened", () => {
    if (shown) return;
    shown = true;
    win.$crisp.push(["do", "message:show", ["text", WELCOME + (outsideBusinessHours(date) ? "\n" + AWAY : "")]]);
  }]);
  void bindCrispIdentity(win, tagQa);
  const script = doc.createElement("script");
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  script.onerror = () => {
  };
  doc.head.appendChild(script);
  return true;
}
if (typeof window !== "undefined") installCrisp();
export {
  AWAY,
  WELCOME,
  bindCrispIdentity,
  installCrisp,
  outsideBusinessHours,
  setCrispEmail
};
