const KEY = Symbol.for('ainimation.updateNotice');
const REVISION = /^[a-f0-9]{16}$/;

export function startUpdateNotice({
  doc = document, win = window,
  request = (...args) => win.fetch(...args),
  navigate = url => win.location.replace(url),
} = {}) {
  if (doc[KEY]) return doc[KEY];
  // The notice belongs to the public home page, never an editor or a piece.
  if (!['/', '/index.html'].includes(win.location.pathname)) return null;
  const current = doc.querySelector('meta[name="ain-page-revision"]')?.content;
  if (!REVISION.test(current || '')) return null;
  const dismissed = new Set();
  let revision = '', notice, message, update, later, busy = false, stopped = false, controller;
  const english = () => /^en\b/i.test(doc.documentElement.lang);
  function translate() {
    if (!notice) return;
    message.textContent = english() ? 'A new version of AINimation is available.' : 'Hay una nueva versión de AINimation.';
    update.textContent = english() ? 'Update' : 'Actualizar';
    later.textContent = english() ? 'Later' : 'Más tarde';
    update.title = english() ? 'Reload this tab with the new version' : 'Recargar esta pestaña con la nueva versión';
  }
  function show(next) {
    revision = next;
    if (!notice) {
      notice = doc.createElement('aside');
      notice.className = 'ain-update-notice';
      notice.hidden = true;
      const status = doc.createElement('div');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      message = doc.createElement('span');
      status.append(message);
      const actions = doc.createElement('div');
      actions.className = 'ain-update-actions';
      update = doc.createElement('button');
      later = doc.createElement('button');
      update.type = later.type = 'button';
      later.className = 'ain-update-later';
      update.addEventListener('click', () => {
        // A fresh navigation on consent, preserving language, other params and hash.
        const target = new URL(win.location.href);
        target.searchParams.set('ain-version', revision);
        navigate(target.href);
      });
      later.addEventListener('click', () => {
        dismissed.add(revision);
        notice.hidden = true;
      });
      actions.append(update, later);
      notice.append(status, actions);
      doc.body.append(notice);
    }
    translate();
    notice.hidden = false;
    // No focus move, automatic reload, session changes or storage writes.
  }
  async function check() {
    if (stopped || busy || doc.visibilityState === 'hidden' || win.navigator.onLine === false) return;
    busy = true;
    controller = new win.AbortController();
    const timeout = win.setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL(win.location.href);
      url.hash = '';
      url.searchParams.delete('ain-version');
      url.searchParams.set('ain-update-check', String(Date.now()));
      const response = await request(url.href, {
        cache: 'no-store', credentials: 'omit', redirect: 'error',
        headers: {Accept: 'text/html'}, signal: controller.signal,
      });
      if (!response.ok || !/^text\/html\b/i.test(response.headers.get('content-type') || '')) return;
      const html = new win.DOMParser().parseFromString(await response.text(), 'text/html');
      const next = html.querySelector('meta[name="ain-page-revision"]')?.content;
      if (stopped || !REVISION.test(next || '')) return;
      if (next === current || dismissed.has(next)) {
        if (notice) notice.hidden = true;
      } else show(next);
    } catch {
      // Offline, timeout, redirects or failed deploys must never interrupt the page.
    } finally {
      win.clearTimeout(timeout);
      busy = false;
    }
  }
  const interval = win.setInterval(check, 60000);
  doc.addEventListener('visibilitychange', check);
  win.addEventListener('online', check);
  win.addEventListener('pageshow', check);
  win.addEventListener('ainimation:language', translate);
  const observer = new win.MutationObserver(translate);
  observer.observe(doc.documentElement, {attributes: true, attributeFilter: ['lang']});
  const api = {check, destroy() {
    stopped = true;
    controller?.abort();
    win.clearInterval(interval);
    doc.removeEventListener('visibilitychange', check);
    win.removeEventListener('online', check);
    win.removeEventListener('pageshow', check);
    win.removeEventListener('ainimation:language', translate);
    observer.disconnect();
    notice?.remove();
    delete doc[KEY];
  }};
  doc[KEY] = api;
  void check();
  return api;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') startUpdateNotice();
