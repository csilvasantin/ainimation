// Navigation remembers only the verified session's expiry in this tab. Google
// credentials stay in memory in the existing auth flow; this is not API access.
const KEY = 'ainimation:site-session';
const EVENT = 'ainimation:site-session-changed';

export function sessionExpiry(win, now = Date.now()) {
  try {
    const expiresAt = JSON.parse(win.sessionStorage.getItem(KEY) || 'null')?.expiresAt;
    return Number.isFinite(expiresAt) && expiresAt > now && expiresAt <= now + 3600000 ? expiresAt : 0;
  } catch { return 0; }
}

export function clearSiteSession(win) {
  try { win.sessionStorage.removeItem(KEY); } catch {}
  win.dispatchEvent(new Event(EVENT));
}

// Call only after the existing server has accepted the Google credential.
export function rememberVerifiedSession(credential, win, now = Date.now()) {
  try {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(payload)).exp;
    if (!Number.isFinite(exp) || exp * 1000 <= now) throw Error('Expired session');
    win.sessionStorage.setItem(KEY, JSON.stringify({expiresAt: Math.min(exp * 1000, now + 3600000)}));
    win.dispatchEvent(new Event(EVENT));
  } catch { clearSiteSession(win); }
}

export function mountSessionNavigation(doc, win) {
  const links = doc.querySelectorAll('[data-session-only]');
  if (!links.length) return;
  let timer;
  const refresh = () => {
    win.clearTimeout(timer);
    const expiresAt = sessionExpiry(win);
    for (const link of links) link.hidden = !expiresAt;
    if (expiresAt) timer = win.setTimeout(refresh, expiresAt - Date.now() + 1);
  };
  win.addEventListener(EVENT, refresh);
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  refresh();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') mountSessionNavigation(document, window);
