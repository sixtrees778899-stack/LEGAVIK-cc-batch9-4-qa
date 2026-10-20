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
export async function bindCrispIdentity(win, onSessionLoaded = () => {}) {
  if (typeof win.$crisp?.push !== 'function') return false;
  const status = value => { if (win.document?.documentElement) win.document.documentElement.dataset.crispIdentity = value; };
  status('WAITING_AUTH_AND_SESSION');
  let auth, generation = 0, signedOut = false, sessionReady = false;
  let attempts = 0, timer;
  const applyVerifiedUser = async () => {
    if (!auth || !sessionReady || signedOut) return false;
    const current = ++generation;
    try {
      const {data, error} = await auth.getUser();
      if (current !== generation || signedOut) return false;
      const sent = !error && setCrispEmail(win, data?.user?.email);
      if (sent) onSessionLoaded();
      status(sent ? 'EMAIL_QUEUED' : error ? 'AUTH_LOOKUP_FAILED' : 'NO_LOGGED_IN_EMAIL');
      return sent;
    } catch {
      status('AUTH_LOOKUP_FAILED');
      return false;
    }
  };
  const attach = () => {
    if (auth) return;
    const candidate = win.LEGAVIK_SUPABASE_CLIENT?.auth;
    if (!candidate?.getUser) return;
    auth = candidate;
    status(sessionReady ? 'AUTH_AND_SESSION_READY' : 'WAITING_CRISP_SESSION');
    if (timer) win.clearTimeout(timer);
    auth.onAuthStateChange?.((event) => {
      if (event === 'SIGNED_OUT') {
        signedOut = true;
        sessionReady = false;
        generation++;
        status('SIGNED_OUT');
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
    onSessionLoaded();
    status(auth ? 'AUTH_AND_SESSION_READY' : 'WAITING_AUTH');
    attach();
    void applyVerifiedUser();
  }]);
  // Email binding can merge/change the conversation. Append again after the SDK
  // acknowledges the identity change; never read or retain the event's email.
  win.$crisp.push(['on','user:email:changed',()=>{ if (sessionReady) onSessionLoaded(); }]);
  // A new conversation from the widget may be persisted only on first send.
  // Ignore message contents; append the environment tag after that boundary.
  win.$crisp.push(['on','message:sent',()=>{
    if (!sessionReady) return;
    onSessionLoaded();
    // The first send can race server-side conversation creation. One bounded
    // post-send append covers persistence without loops or message inspection.
    if (typeof win.setTimeout === 'function') win.setTimeout(()=>{
      if (sessionReady) onSessionLoaded();
    }, 1000);
  }]);
  win.$crisp.push(['on','chat:opened',()=>{ attach(); void applyVerifiedUser(); }]);
  // Covers binding to an SDK that has already loaded its existing session.
  try { sessionReady = Boolean(win.$crisp.get?.('session:identifier')); } catch { /* not ready */ }
  if (sessionReady) onSessionLoaded();
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
  // This loader is QA-only (origin/path/backend gates above). Add, never replace,
  // routing tags. Wait for the session, then reapply after email binding.
  const tagQa = () => {
    win.$crisp.push(['set','session:segments',[['qa']]]);
    if (doc.documentElement) doc.documentElement.dataset.crispQaTag = 'QUEUED';
  };
  let shown = false;
  win.$crisp.push(['on','chat:opened',()=>{
    if (shown) return;
    shown = true;
    win.$crisp.push(['do','message:show',['text', WELCOME + (outsideBusinessHours(date) ? '\n' + AWAY : '')]]);
  }]);
  void bindCrispIdentity(win, tagQa);
  const script = doc.createElement('script');
  script.src = 'https://client.crisp.chat/l.js'; script.async = true;
  script.onerror = () => { /* Chat availability must not affect the account application. */ };
  doc.head.appendChild(script);
  return true;
}
if (typeof window !== 'undefined') installCrisp();
