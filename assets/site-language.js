// One UI language across the public header, Login and the authoring surfaces.
(function (win, doc) {
  'use strict';
  const keys = ['ain_lang', 'ainimation:ui:language', 'ain-lang'];
  const choiceKey = 'ainimation:language-choice';
  const valid = value => value === 'es' || value === 'en';
  function detect() {
    // An explicit choice survives old bookmarks and links with another lang.
    try { const chosen = win.localStorage.getItem(choiceKey); if (valid(chosen)) return chosen; } catch {}
    const requested = new URLSearchParams(win.location.search).get('lang');
    if (valid(requested)) return requested;
    for (const key of keys) {
      try { const stored = win.localStorage.getItem(key); if (valid(stored)) return stored; } catch {}
    }
    return /^es/i.test(win.navigator.language || '') ? 'es' : 'en';
  }
  let current = detect();
  function links() {
    for (const link of doc.querySelectorAll('header a[href], [data-language-link]')) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) continue;
      try {
        const url = new URL(href, win.location.href);
        if (url.origin !== win.location.origin || !(/\/$|\.html$/.test(url.pathname))) continue;
        url.searchParams.set('lang', current);
        link.setAttribute('href', url.pathname + url.search + url.hash);
      } catch {}
    }
  }
  function remember(language) {
    if (!valid(language)) return;
    current = language;
    for (const key of keys) { try { win.localStorage.setItem(key, language); } catch {} }
    doc.documentElement.lang = language;
    try {
      const url = new URL(win.location.href);
      if (url.searchParams.has('lang') && url.searchParams.get('lang') !== language) {
        url.searchParams.set('lang', language);
        win.history.replaceState(win.history.state, '', url);
      }
    } catch {}
    links();
    win.dispatchEvent(new win.CustomEvent('ainimation:language', {detail: {language}}));
  }
  win.AINLanguage = {read: () => current, remember, links, set: language => {
    if (!valid(language)) return;
    try { win.localStorage.setItem(choiceKey, language); } catch {}
    if (typeof win.AINSetLanguage === 'function') win.AINSetLanguage(language);
    else remember(language);
  }};
  remember(current);
})(window, document);
