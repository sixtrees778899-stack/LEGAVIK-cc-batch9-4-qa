export const WELCOME = '您好，这里是 LEGAVIK 客服。请勿在聊天中发送或念出助记词、私钥、恢复密码或 Recovery Kit 内容，我们的工作人员永远不会向您索取这些信息。';
export const AWAY = '我们会在下一个工作时段开始后 30 分钟内回复您。';
export function outsideBusinessHours(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', {timeZone:'Australia/Sydney', weekday:'short', hour:'2-digit', hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return ['Sat','Sun'].includes(parts.weekday) || Number(parts.hour) < 9 || Number(parts.hour) >= 18;
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
  const script = doc.createElement('script');
  script.src = 'https://client.crisp.chat/l.js'; script.async = true;
  script.onerror = () => { /* Chat availability must not affect the account application. */ };
  doc.head.appendChild(script);
  return true;
}
if (typeof window !== 'undefined') installCrisp();
