export const WELCOME = '您好，这里是 LEGAVIK 客服。请勿在聊天中发送助记词、私钥、恢复密码或 Recovery Kit 内容，我们的工作人员永远不会向您索取这些信息。';
export const AWAY = '我们会在下一个工作时段开始后 30 分钟内回复您。';
export function outsideBusinessHours(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', {timeZone:'Australia/Sydney', weekday:'short', hour:'2-digit', hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return ['Sat','Sun'].includes(parts.weekday) || Number(parts.hour) < 9 || Number(parts.hour) >= 18;
}
export function setCrispEmail(win, email) {
  const value = typeof email === 'string' ? email.trim() : '';
  if (!value || typeof win.$crisp?.push !== 'function') return false;
  win.$crisp.push(['set','user:email',[value]]);
  return true;
}
export async function bindCrispIdentity(win) {
  if (typeof win.$crisp?.push !== 'function') return false;
  let auth, generation = 0, signedOut = false, sessionReady = false;
  let attempts = 0, timer;
  const applyVerifiedUser = async () => {
    if (!auth || !sessionReady || signedOut) return false;
    const current = ++generation;
    try {
      const {data, error} = await auth.getUser();
      return current === generation && !signedOut && !error && setCrispEmail(win, data?.user?.email);
    } catch {
      return false;
    }
  };
  const attach = () => {
    if (auth) return;
    const candidate = win.LEGAVIK_SUPABASE_CLIENT?.auth;
    if (!candidate?.getUser) return;
    auth = candidate;
    if (timer) win.clearTimeout(timer);
    auth.onAuthStateChange?.((event) => {
      if (event === 'SIGNED_OUT') {
        signedOut = true;
        generation++;
        win.$crisp.push(['do','session:reset']);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        signedOut = false;
        // Do not call Supabase auth inside its synchronous auth-state callback.
        Promise.resolve().then(applyVerifiedUser);
      }
    });
    void applyVerifiedUser();
  };
  win.$crisp.push(['on','session:loaded',()=>{
    sessionReady = true;
    attach();
    void applyVerifiedUser();
  }]);
  win.$crisp.push(['on','chat:opened',()=>{ attach(); void applyVerifiedUser(); }]);
  // Covers binding to an SDK that has already loaded its existing session.
  try { sessionReady = Boolean(win.$crisp.get?.('session:identifier')); } catch { /* not ready */ }
  const poll = () => {
    attach();
    if (!auth && ++attempts < 120 && typeof win.setTimeout === 'function') timer = win.setTimeout(poll, 250);
  };
  poll();
  return true;
}
export function installCrisp(win = window, doc = document, date = new Date()) {
  const config = win.SKREK_PUBLIC_CONFIG, crisp = config?.crisp;
  const location = win.location;
  if (config?.supabaseUrl !== 'https://vtaielvbknzunowmskkc.supabase.co' || crisp?.enabled !== true || crisp?.safetySettingsConfirmed !== true) return false;
  if (location.origin !== 'https://sixtrees778899-stack.github.io' || !/^\/LEGAVIK-cc-batch9-4-qa\/web\/(?:account|v3-crypto)\/index\.html$/.test(location.pathname)) return false;
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(crisp.websiteId || '') || win.CRISP_WEBSITE_ID) return false;
  win.$crisp = [];
  win.CRISP_WEBSITE_ID = crisp.websiteId;
  win.CRISP_RUNTIME_CONFIG = {locale:'zh'};
  let shown = false;
  win.$crisp.push(['on','chat:opened',()=>{
    if (shown) return;
    shown = true;
    win.$crisp.push(['do','message:show',['text', WELCOME + (outsideBusinessHours(date) ? '\n' + AWAY : '')]]);
  }]);
  void bindCrispIdentity(win);
  const script = doc.createElement('script');
  script.src = 'https://client.crisp.chat/l.js'; script.async = true;
  script.onerror = () => { /* Chat availability must not affect the account application. */ };
  doc.head.appendChild(script);
  return true;
}
if (typeof window !== 'undefined') installCrisp();
