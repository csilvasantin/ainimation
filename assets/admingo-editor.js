/* ============================================================================
 * admingo-editor.js — Ventana Script y ventana Mensaje de Admingo (Studio)
 * ----------------------------------------------------------------------------
 * Script: un ámbito por pestaña (película · fotograma/marca · sprite), resaltado,
 * autocompletado (Tab), errores con nº de línea, ES⇄EN, importar/exportar .admingo.
 * Mensaje: sentencias sueltas en vivo, también durante Play (como en Director).
 * Guarda en plan.scripts = { movie, frames: {MARCA: src}, sprites: {nombre: src} }.
 * ========================================================================== */
(function () {
  "use strict";
  const A = () => window.Admingo;
  const adm = (window.ainAdmingo = window.ainAdmingo || {});
  const lang = () => ((document.documentElement.lang || "es").startsWith("en") ? "en" : "es");
  const L = (es, en) => (lang() === "en" ? en : es);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const plan = () => window.currentPlan?.() || null;
  let win = null, msg = null, scope = "movie", saveTimer = null, checkTimer = null;

  function scriptsOf(p) { const s = p?.scripts || {}; return { movie: s.movie || "", frames: { ...(s.frames || {}) }, sprites: { ...(s.sprites || {}) } }; }
  function getSrc(p = plan()) { const s = scriptsOf(p); if (scope === "movie") return s.movie; const [k, n] = scope.split(/:(.+)/); return (k === "frame" ? s.frames[n] : s.sprites[n]) || ""; }
  function setSrc(text) {
    const p = plan(); if (!p) return; const s = scriptsOf(p);
    if (scope === "movie") s.movie = text; else { const [k, n] = scope.split(/:(.+)/); const bag = k === "frame" ? s.frames : s.sprites; if (text.trim()) bag[n] = text; else delete bag[n]; }
    p.scripts = s; window.saveFilmPlan?.(p);
  }
  function markers() { const total = Number(window.ainTransport?.totalFrames) || 240; return window.loadTimelineMarkers?.(total) || []; }
  function sprites(p = plan()) { const out = []; (p?.stageItems || []).forEach((i) => i.spriteName && out.push(i.spriteName)); (p?.cast || []).forEach((m) => m?.onStage && m.spriteName && out.push(m.spriteName)); return [...new Set(out)]; }

  /* --------------------------------------------------------- resaltado --- */
  function highlight(text) {
    const W = A()?.WORDS || {}, F = A()?.FACTS || {};
    return text.split("\n").map((line) => {
      let out = "", rest = line;
      const re = /(--.*$)|("[^"\n]*"?|«[^»\n]*»?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_\u00c0-\u024f][\w\u00c0-\u024f]*)|([^\w"«-]+|-)/y;
      let m; re.lastIndex = 0;
      while (re.lastIndex < rest.length && (m = re.exec(rest))) {
        if (m[1]) out += `<i class="c">${esc(m[1])}</i>`;
        else if (m[2]) out += `<i class="s">${esc(m[2])}</i>`;
        else if (m[3]) out += `<i class="n">${esc(m[3])}</i>`;
        else if (m[4]) { const f = A()?.fold(m[4]) || m[4].toLowerCase(); out += F[f] ? `<i class="f">${esc(m[4])}</i>` : W[f] ? `<i class="k">${esc(m[4])}</i>` : esc(m[4]); }
        else out += esc(m[0]);
      }
      return out;
    }).join("\n") + "\n";
  }

  /* ------------------------------------------------------- comprobación --- */
  function check() {
    if (!win || !A()) return [];
    const r = A().parse(win.ta.value, scope.split(":")[0]);
    const errs = r.errors;
    const lines = win.ta.value.split("\n").length;
    const bad = new Set(errs.map((e) => e.line));
    win.gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<b class="${bad.has(i + 1) ? "err" : ""}" title="${esc(errs.filter((e) => e.line === i + 1).map((e) => L(e.es, e.en)).join(" · "))}">${i + 1}</b>`).join("");
    const all = A().compileScripts(scriptsOf(plan()));
    const compiled = all.rules.length;
    win.errors.innerHTML = errs.length
      ? errs.map((e) => `<button type="button" data-adm-goto-line="${e.line}">⚠ ${L("Línea", "Line")} ${e.line}: ${esc(L(e.es, e.en))}</button>`).join("")
      : `<span class="ok">✓ ${L("Sin errores", "No errors")} · ${Object.keys(r.handlers).length} ${L("manejadores", "handlers")}${compiled ? ` · ${compiled} ${L("bajados a reglas XPL", "compiled to XPL rules")}` : ""}${all.errors.length ? ` · ⚠ ${all.errors.length} ${L("errores en otros ámbitos", "errors in other scopes")}` : ""}</span>`;
    win.errors.querySelectorAll("[data-adm-goto-line]").forEach((b) => (b.onclick = () => gotoLine(Number(b.dataset.admGotoLine))));
    return errs;
  }
  function gotoLine(n) { const ls = win.ta.value.split("\n"); let pos = 0; for (let i = 0; i < n - 1; i++) pos += ls[i].length + 1; win.ta.focus(); win.ta.setSelectionRange(pos, pos + (ls[n - 1] || "").length); }
  function paint() { win.hl.innerHTML = highlight(win.ta.value); syncScroll(); }
  function syncScroll() { win.hl.scrollTop = win.ta.scrollTop; win.hl.scrollLeft = win.ta.scrollLeft; win.gutter.scrollTop = win.ta.scrollTop; }

  /* ------------------------------------------------------ autocompletar --- */
  let acItems = [], acIndex = 0;
  function candidates() {
    const K = A()?.KEYWORDS || { es: [], en: [], facts: [] }, p = plan();
    const c = [...K.es, ...K.en, ...K.facts, ...sprites(p).map((n) => `"${n}"`), ...markers().map((m) => `"${m.label}"`)];
    (p?.menu?.items || []).forEach((i) => c.push(`"${(i.name && (i.name[lang()] || i.name.es)) || i.id}"`));
    const vars = (win.ta.value.match(/\b(?:global|poner .+ en|put .+ into|fijar|set)\s+([A-Za-z_]\w*)/g) || []).map((s) => s.split(/\s+/).pop());
    return [...new Set([...c, ...vars])];
  }
  function wordBefore() { const v = win.ta.value, e = win.ta.selectionStart; const m = v.slice(0, e).match(/("?[\wÀ-ɏ(]+(?: [\wÀ-ɏ]+)?)$/); return m ? m[1] : ""; }
  function updateAC() {
    const w = wordBefore(); const f = A()?.fold(w) || w.toLowerCase();
    if (w.replace(/"/g, "").length < 2) return hideAC();
    acItems = candidates().filter((c) => (A()?.fold(c) || c.toLowerCase()).startsWith(f) && c.length > w.length).slice(0, 8);
    if (!acItems.length) return hideAC();
    acIndex = 0; renderAC(w);
  }
  function renderAC(w) {
    win.ac.innerHTML = acItems.map((c, i) => `<button type="button" class="${i === acIndex ? "on" : ""}" data-i="${i}">${esc(c)}</button>`).join("") + `<small>Tab ↹</small>`;
    win.ac.hidden = false; win.ac.dataset.word = w;
    win.ac.querySelectorAll("button").forEach((b) => (b.onmousedown = (e) => { e.preventDefault(); acIndex = Number(b.dataset.i); acceptAC(); }));
  }
  function hideAC() { if (win) win.ac.hidden = true; acItems = []; }
  function acceptAC() {
    const c = acItems[acIndex]; if (!c) return; const w = win.ac.dataset.word || ""; const e = win.ta.selectionStart;
    win.ta.setRangeText(c, e - w.length, e, "end"); hideAC(); onInput();
  }

  /* ------------------------------------------------------------ ventana --- */
  function scopeOptions() {
    const p = plan(); const s = scriptsOf(p);
    const opt = (v, label, has) => `<option value="${esc(v)}" ${v === scope ? "selected" : ""}>${has ? "● " : ""}${esc(label)}</option>`;
    return opt("movie", L("Película (movie script)", "Movie script"), !!s.movie.trim()) +
      `<optgroup label="${L("Fotograma · marca", "Frame · marker")}">${markers().map((m) => opt(`frame:${m.label}`, `🚩 ${m.label}`, !!(s.frames[m.label] || "").trim())).join("")}</optgroup>` +
      `<optgroup label="${L("Comportamiento de sprite", "Sprite behaviour")}">${sprites(p).map((n) => opt(`sprite:${n}`, `◆ ${n}`, !!(s.sprites[n] || "").trim())).join("")}</optgroup>`;
  }
  function openScript(sc) {
    ensureCSS();
    if (!win) {
      const el = document.createElement("section"); el.className = "adm-win"; el.setAttribute("aria-label", "Script · Admingo");
      el.innerHTML = `<header class="adm-head"><i></i><i></i><i></i><b>Script · Admingo</b><a href="/help/admingo.html" target="_blank" rel="noopener" title="${L("Ayuda de Admingo", "Admingo help")}">?</a><button type="button" data-adm-close aria-label="${L("Cerrar", "Close")}">✕</button></header>
        <div class="adm-tools"><select data-adm-scope aria-label="${L("Ámbito", "Scope")}"></select>
          <button type="button" data-adm-check title="${L("Comprobar", "Check")}">✓</button>
          <button type="button" data-adm-lang title="${L("Traducir palabras clave ES⇄EN", "Translate keywords ES⇄EN")}">ES⇄EN</button>
          <button type="button" data-adm-export title="${L("Exportar .admingo", "Export .admingo")}">⬇</button>
          <button type="button" data-adm-import title="${L("Importar .admingo", "Import .admingo")}">⬆</button>
          <button type="button" data-adm-open-msg title="${L("Ventana Mensaje", "Message window")}">💬</button></div>
        <div class="adm-ed"><div class="adm-gutter"></div><pre class="adm-hl" aria-hidden="true"></pre><textarea class="adm-ta" spellcheck="false" autocapitalize="off" autocomplete="off" data-adm-editor aria-label="${L("Código Admingo", "Admingo code")}"></textarea><div class="adm-ac" hidden></div></div>
        <div class="adm-errors" aria-live="polite"></div>`;
      document.body.append(el);
      win = { el, ta: el.querySelector(".adm-ta"), hl: el.querySelector(".adm-hl"), gutter: el.querySelector(".adm-gutter"), errors: el.querySelector(".adm-errors"), ac: el.querySelector(".adm-ac"), sel: el.querySelector("[data-adm-scope]") };
      win.ta.addEventListener("input", onInput);
      win.ta.addEventListener("scroll", syncScroll);
      win.ta.addEventListener("keydown", (e) => {
        if (!win.ac.hidden && acItems.length) {
          if (e.key === "Tab") { e.preventDefault(); acceptAC(); return; }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); acIndex = (acIndex + (e.key === "ArrowDown" ? 1 : acItems.length - 1)) % acItems.length; renderAC(win.ac.dataset.word); return; }
          if (e.key === "Escape") { hideAC(); return; }
        }
        if (e.key === "Tab") { e.preventDefault(); win.ta.setRangeText("  ", win.ta.selectionStart, win.ta.selectionEnd, "end"); onInput(); }
      });
      win.ta.addEventListener("blur", () => setTimeout(hideAC, 150));
      win.sel.addEventListener("change", () => { flush(); scope = win.sel.value; load(); });
      el.querySelector("[data-adm-close]").onclick = () => { flush(); el.hidden = true; };
      el.querySelector("[data-adm-check]").onclick = () => check();
      el.querySelector("[data-adm-open-msg]").onclick = () => openMessage();
      el.querySelector("[data-adm-lang]").onclick = () => { const v = win.ta.value; const toEn = /(^|\n)\s*(al |fin|si |fijar|poner|ir a|en reposo)/i.test(v); win.ta.value = A().translate(v, toEn ? "en" : "es"); onInput(); };
      el.querySelector("[data-adm-export]").onclick = () => { flush(); const blob = new Blob([A().toFile(scriptsOf(plan()))], { type: "text/plain" }); const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${((plan()?.title) || "pieza").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.admingo` }); document.body.append(a); a.click(); a.remove(); };
      el.querySelector("[data-adm-import]").onclick = () => { const i = Object.assign(document.createElement("input"), { type: "file", accept: ".admingo,text/plain" }); i.onchange = async () => { const t = await i.files[0].text(); const p = plan(); p.scripts = A().fromFile(t); window.saveFilmPlan?.(p); load(); }; i.click(); };
      dragBy(el.querySelector(".adm-head"), el);
    }
    if (sc) scope = sc;
    win.el.hidden = false; load(); win.ta.focus();
  }
  function load() { win.sel.innerHTML = scopeOptions(); win.sel.value = scope; if (win.sel.value !== scope) { scope = "movie"; win.sel.value = scope; } win.ta.value = getSrc(); paint(); check(); }
  function onInput() { paint(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 200); clearTimeout(checkTimer); checkTimer = setTimeout(() => { check(); }, 250); updateAC(); }
  function flush() { if (!win) return; clearTimeout(saveTimer); if (win.ta.value !== getSrc()) { setSrc(win.ta.value); const o = win.sel.selectedOptions[0]; if (o) o.textContent = (win.ta.value.trim() ? "● " : "") + o.textContent.replace(/^● /, ""); } }

  /* ------------------------------------------------------ ventana Mensaje --- */
  function openMessage() {
    ensureCSS();
    if (!msg) {
      const el = document.createElement("section"); el.className = "adm-msg"; el.setAttribute("aria-label", "Mensaje · Admingo");
      el.innerHTML = `<header class="adm-head"><i></i><i></i><i></i><b>${L("Mensaje", "Message")} · Admingo</b><button type="button" data-adm-msg-close aria-label="${L("Cerrar", "Close")}">✕</button></header>
        <div class="adm-log" data-adm-log></div>
        <label class="adm-prompt"><span>›</span><input data-adm-msg-input spellcheck="false" autocomplete="off" placeholder='${L('ir a marca "PAGO" · put the cartCount', 'go to marker "PAGO" · put the cartCount')}'></label>`;
      document.body.append(el);
      msg = { el, log: el.querySelector("[data-adm-log]"), input: el.querySelector("[data-adm-msg-input]"), hist: [], hi: 0 };
      el.querySelector("[data-adm-msg-close]").onclick = () => { el.hidden = true; };
      msg.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { const line = msg.input.value.trim(); if (!line) return; msg.hist.push(line); msg.hi = msg.hist.length; msg.input.value = ""; runMessage(line); }
        if (e.key === "ArrowUp" && msg.hist.length) { msg.hi = Math.max(0, msg.hi - 1); msg.input.value = msg.hist[msg.hi]; e.preventDefault(); }
        if (e.key === "ArrowDown" && msg.hist.length) { msg.hi = Math.min(msg.hist.length, msg.hi + 1); msg.input.value = msg.hist[msg.hi] || ""; e.preventDefault(); }
        e.stopPropagation();
      });
      dragBy(el.querySelector(".adm-head"), el);
      (adm.logs || []).slice(-20).forEach(addLog);
    }
    msg.el.hidden = false; msg.input.focus();
  }
  function addLog(m) {
    if (!msg) return;
    const row = document.createElement("div");
    row.className = `adm-l ${m.level || "out"}`;
    row.textContent = m.level === "cmd" ? `› ${m.text}` : m.level === "error" ? `⚠ ${L(m.es, m.en)}` : m.level === "say" ? `🗣 ${m.text}` : String(m.text ?? "");
    msg.log.append(row); msg.log.scrollTop = msg.log.scrollHeight;
  }
  adm.onLog = (m) => { addLog(m); if (m.level === "error" && win && !win.el.hidden) win.errors.insertAdjacentHTML("afterbegin", `<span class="run">⚠ ${esc(L(m.es, m.en))}</span>`); };
  function runMessage(line) {
    addLog({ level: "cmd", text: line });
    const vm = (adm.running?.() && adm.vm) || adm.freshVM?.();
    if (!vm) return addLog({ level: "error", es: "Admingo no está cargado", en: "Admingo is not loaded" });
    vm.message(line);
  }
  adm.message = (line) => { openMessage(); runMessage(line); };
  const origSay = () => {};
  // «decir» también se ve en la ventana Mensaje
  const hostSay = adm.host?.say;
  if (adm.host) adm.host.say = (t) => { addLog({ level: "say", text: t }); return hostSay ? hostSay(t) : origSay(); };

  /* ------------------------------------------------------------ comunes --- */
  function dragBy(handle, el) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button,a")) return;
      const r = el.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      const mv = (ev) => { el.style.left = `${ev.clientX - sx}px`; el.style.top = `${ev.clientY - sy}px`; el.style.right = "auto"; el.style.bottom = "auto"; };
      const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); };
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); e.preventDefault();
    });
  }
  let css = false;
  function ensureCSS() {
    if (css) return; css = true;
    const st = document.createElement("style");
    st.textContent = `
      .adm-win,.adm-msg{position:fixed;z-index:100001;background:#14110f;color:#f3f1ea;border:1px solid #3a3a3a;border-radius:10px;box-shadow:0 18px 40px rgba(0,0,0,.5);font:12px Inter,system-ui,sans-serif;display:flex;flex-direction:column}
      .adm-win{left:90px;top:90px;width:min(620px,calc(100vw - 120px));height:min(560px,calc(100vh - 140px))}
      .adm-msg{left:90px;bottom:24px;width:min(520px,calc(100vw - 120px));height:220px}
      .adm-win[hidden],.adm-msg[hidden]{display:none}
      .adm-head{display:flex;gap:6px;align-items:center;padding:8px 10px;background:#1d1916;border-bottom:1px solid #3a3a3a;border-radius:10px 10px 0 0;cursor:move;text-transform:uppercase;letter-spacing:.04em}
      .adm-head i{width:9px;height:9px;border-radius:50%;background:#ff5f57}.adm-head i+i{background:#febc2e}.adm-head i+i+i{background:#28c840}.adm-head b{flex:1;margin-left:6px}
      .adm-head button,.adm-head a{all:unset;cursor:pointer;padding:0 4px;color:#f3f1ea}
      .adm-tools{display:flex;gap:6px;padding:6px 8px;border-bottom:1px solid #2c2724}.adm-tools select{flex:1;min-width:0}
      .adm-tools select,.adm-tools button{background:#221e1b;color:#f3f1ea;border:1px solid #3a3a3a;border-radius:6px;padding:4px 7px;font:inherit;cursor:pointer}
      .adm-ed{position:relative;flex:1;min-height:0;display:flex;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}
      .adm-gutter{width:38px;overflow:hidden;padding:8px 0;text-align:right;color:#6e6257;background:#100d0b;user-select:none}.adm-gutter b{display:block;font-weight:400;padding-right:6px}.adm-gutter b.err{color:#fff;background:#a02a1d}
      .adm-hl,.adm-ta{position:absolute;left:38px;right:0;top:0;bottom:0;margin:0;padding:8px 10px;white-space:pre;overflow:auto;font:inherit;tab-size:2;border:0}
      .adm-hl{color:#e8e2d6;pointer-events:none}.adm-ta{background:transparent;color:transparent;caret-color:#c6f24e;resize:none;outline:0}
      .adm-hl i{font-style:normal}.adm-hl .k{color:#c6f24e;font-weight:700}.adm-hl .s{color:#f0b84f}.adm-hl .n{color:#31bed1}.adm-hl .c{color:#7d7266;font-style:italic}.adm-hl .f{color:#c9a7ff}
      .adm-ac{position:absolute;right:10px;bottom:10px;z-index:2;display:flex;flex-direction:column;background:#221e1b;border:1px solid #c6f24e;border-radius:8px;overflow:hidden;min-width:200px}.adm-ac[hidden]{display:none}
      .adm-ac button{all:unset;padding:3px 9px;cursor:pointer;font:12px ui-monospace,Menlo,monospace}.adm-ac button.on{background:#c6f24e;color:#14110f}.adm-ac small{padding:2px 9px;opacity:.6}
      .adm-errors{max-height:96px;overflow:auto;padding:6px 8px;border-top:1px solid #2c2724;display:flex;flex-direction:column;gap:3px}
      .adm-errors button{all:unset;cursor:pointer;color:#ffb4a8}.adm-errors .ok{color:#a6ff65}.adm-errors .run{color:#febc2e}
      .adm-log{flex:1;overflow:auto;padding:6px 10px;font:12px/1.5 ui-monospace,Menlo,monospace}.adm-l.cmd{color:#8f857a}.adm-l.error{color:#ffb4a8}.adm-l.say{color:#c9a7ff}
      .adm-prompt{display:flex;gap:6px;align-items:center;padding:6px 10px;border-top:1px solid #2c2724}.adm-prompt span{color:#c6f24e}.adm-prompt input{flex:1;background:#221e1b;color:#f3f1ea;border:1px solid #3a3a3a;border-radius:6px;padding:5px 7px;font:12px ui-monospace,Menlo,monospace}
      body.ain-play .adm-win{display:none}`;
    document.head.append(st);
  }

  /* -------------------------------------------------- menús y atajos --- */
  function boot() {
    const wl = document.querySelector(".window-menu-list");
    if (wl && !wl.querySelector("[data-adm-open-script]")) {
      const b1 = Object.assign(document.createElement("button"), { type: "button", textContent: L("Script · Admingo (Ctrl+0)", "Script · Admingo (Ctrl+0)") }); b1.setAttribute("data-adm-open-script", ""); b1.onclick = () => openScript();
      const b2 = Object.assign(document.createElement("button"), { type: "button", textContent: L("Mensaje · Admingo (Ctrl+M)", "Message · Admingo (Ctrl+M)") }); b2.setAttribute("data-adm-open-msg", ""); b2.onclick = () => openMessage();
      wl.prepend(b2); wl.prepend(b1);
    }
  }
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.key === "0") { e.preventDefault(); openScript(); }
    if (e.key.toLowerCase() === "m" && !e.shiftKey) { e.preventDefault(); openMessage(); }
  });
  window.addEventListener("ain:project-opened", () => { if (win && !win.el.hidden) load(); });
  adm.openScript = openScript; adm.openMessage = openMessage; adm.check = check;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 50)); else setTimeout(boot, 50);
})();
