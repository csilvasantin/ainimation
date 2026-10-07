/* ============================================================================
 * director-kiosk.js — AInimation Studio · Director operativo (7-oct-2026, Carlos)
 * ----------------------------------------------------------------------------
 * La capa que faltaba para montar un interactivo de kiosko SIN CÓDIGO:
 *   · Stage con resolución elegible (16:9, tótem vertical 1080×1920, 1:1, 720p)
 *   · Insertar ▸ Botón · Etiqueta · Quiosco (vistas de la Carta)
 *   · Cast ▸ Carta (miembro de datos Menu/Kiosk: menu.json)
 *   · Inspector de propiedades del sprite (posición, tamaño, tramo, color, texto…)
 *   · Acciones XPL nuevas: parar, variable, carrito, checkout simulado, pagar en barra
 *   · Archivo ▸ Plantilla «Quiosco de pedidos» · Exportar proyecto (.json)
 * Todo vive en el plan (plan.stage, plan.menu, plan.stageItems, plan.rules,
 * plan.markers): Guardar/Abrir/Publicar lo llevan entero.
 * ========================================================================== */
(function () {
  "use strict";
  const KIOSK_BASE = "https://www.ainimation.studio/xperiencias/kiosko-pedido/";
  const lang = () => (document.documentElement.lang || "es").startsWith("en") ? "en" : "es";
  const L = (es, en) => (lang() === "en" ? en : es);
  const $ = (s, r = document) => r.querySelector(s);
  const uid = () => `dk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const PRESETS = [
    { w: 1920, h: 1080, es: "16:9 · 1920 × 1080", en: "16:9 · 1920 × 1080" },
    { w: 1080, h: 1920, es: "Tótem vertical · 1080 × 1920", en: "Vertical totem · 1080 × 1920" },
    { w: 1280, h: 720, es: "16:9 · 1280 × 720", en: "16:9 · 1280 × 720" },
    { w: 1080, h: 1080, es: "Cuadrado · 1080 × 1080", en: "Square · 1080 × 1080" },
  ];
  const VIEWS = { categories: ["Categorías", "Categories"], items: ["Productos", "Products"], options: ["Opciones", "Options"], cart: ["Carrito", "Cart"], qr: ["Pago QR", "QR payment"], number: ["Número de pedido", "Order number"] };

  /* --------------------------------------------------------------- plan --- */
  let rawCache = null, planCache = null;
  function plan() {
    let raw = null;
    try { raw = localStorage.getItem("ainimation-film-plan"); } catch { /* */ }
    if (raw && raw === rawCache && planCache) return planCache;
    rawCache = raw; planCache = window.currentPlan?.() || null; return planCache;
  }
  function commit(p, rerender = true) {
    window.saveFilmPlan?.(p); rawCache = null;
    if (rerender) window.renderFilmPlan?.(p);
    sync(true);
  }
  const frameNow = () => Number(window.currentTimelineFrame?.() || 1);
  const isMine = (item) => item && (item.type === "button" || item.type === "kiosk");

  /* --------------------------------------------------------- Quiosco (K) --- */
  let K = null, kMenuSig = "";
  function kiosk() {
    const p = plan(); const m = p?.menu || null; const sig = m ? (m.establishment?.id || "") + m.items?.length : "";
    if (!K) {
      K = window.AINKiosk.create({ menu: m, base: m?.imageBase || "", lang: lang(),
        notify: () => sync(true), emit: (event, extra) => post(event, extra), openCheckout: openCheckout });
      kMenuSig = sig;
    } else if (sig !== kMenuSig) { K.setMenu(m); kMenuSig = sig; }
    return K;
  }
  function post(event, extra) {
    const msg = { source: "ainimation-xperiencia", piece: plan()?.title || "", event, order: K?.state.order || null, ...(extra || {}) };
    (window.__ainKioskEvents = window.__ainKioskEvents || []).push(msg);
    try { if (window.parent !== window) window.parent.postMessage(msg, "*"); } catch { /* */ }
  }
  let overlay = null;
  function openCheckout(url) {
    if (!overlay) {
      overlay = document.createElement("div"); overlay.className = "dk-checkout";
      overlay.innerHTML = '<div><iframe title="Checkout simulado"></iframe><button type="button" aria-label="Cerrar">✕</button></div>';
      overlay.querySelector("button").onclick = () => closeCheckout();
      document.body.append(overlay);
    }
    overlay.querySelector("iframe").src = url + "&embed=1"; overlay.classList.add("on");
  }
  function closeCheckout() { if (overlay) { overlay.classList.remove("on"); overlay.querySelector("iframe").src = "about:blank"; } }
  window.ainXplExt = {
    fact: (id) => kiosk().fact(id),
    act(id, value, action) {
      if (id === "stop") { window.ainTransport?.stop(); return; }
      const k = kiosk(); const was = k.state.order && k.state.order.number;
      k.act(id, value, action); sync(true);
      if (id === "clearCart") closeCheckout();
      if (!was && k.state.order && k.state.order.number) post("order", { status: k.state.order.status });
    },
  };
  // el pedido se cierra solo al pagar (QR): avisa al anfitrión y cierra el checkout
  setInterval(() => { if (!K) return; const o = K.state.order; if (o && o.number && !o.__posted) { o.__posted = true; closeCheckout(); if (o.status === "paid-simulated") post("payment", { status: "paid" }); post("order", { status: o.status }); } }, 200);

  /* ------------------------------------------------------- Stage: tamaño --- */
  function applyStageSize(w, h) {
    window.ainStageSize?.set(w, h);
    const c = $(".stage-canvas"); if (c) { c.style.setProperty("--dk-aspect", `${w} / ${h}`); c.classList.add("dk-sized"); c.dataset.dkOrientation = h > w ? "v" : "h"; fitStage(); }
  }
  // Encaja el Stage (cualquier proporción) dentro de su ventana, sin recortes.
  function fitStage() {
    const c = $(".stage-canvas"); const s = window.ainStageSize?.get(); if (!c || !s || !c.classList.contains("dk-sized")) return;
    const par = c.parentElement; const top = c.offsetTop, left = c.offsetLeft;
    const aw = par.clientWidth - left - 6, ah = par.clientHeight - top - 6; if (aw <= 0 || ah <= 0) return;
    const k = Math.min(aw / s.w, ah / s.h);
    c.style.setProperty("width", `${Math.floor(s.w * k)}px`, "important"); c.style.setProperty("height", `${Math.floor(s.h * k)}px`, "important");
    c.style.setProperty("margin-left", `${Math.max(0, Math.floor((aw - s.w * k) / 2))}px`, "important");
  }
  window.addEventListener("resize", fitStage); setInterval(fitStage, 1000);
  function setStageSize(w, h) { const p = plan(); if (!p) return; p.stage = { w, h }; commit(p, false); applyStageSize(w, h); }

  /* --------------------------------------------- Stage: pintar sprites --- */
  let selected = null;
  function sync(force) {
    const stage = $(".stage-canvas"); const p = plan(); if (!stage || !p) return;
    const f = frameNow(); const live = Boolean(window.ainXPL?.engineRunning?.());
    const mine = (p.stageItems || []).filter(isMine); const ids = new Set(mine.map((i) => i.id));
    stage.querySelectorAll(".dk-item").forEach((n) => { if (!ids.has(n.dataset.stageItemId)) n.remove(); });
    mine.forEach((item) => {
      let node = stage.querySelector(`.dk-item[data-stage-item-id="${CSS.escape(item.id)}"]`);
      if (!node) { node = document.createElement("div"); node.className = "stage-item dk-item"; node.dataset.stageItemId = item.id; node.innerHTML = '<div class="dk-body"></div><span class="dk-resize" aria-hidden="true"></span>'; stage.append(node); }
      const start = Number(item.startFrame || 1), end = start + Number(item.durationFrames || 24) - 1;
      const on = f >= start && f <= end; node.hidden = !on;
      node.style.left = `${item.x}%`; node.style.top = `${item.y}%`; node.style.width = `${item.w}%`; node.style.height = `${item.h}%`;
      node.classList.toggle("is-selected", selected === item.id && !live);
      node.dataset.dkType = item.type;
      const body = node.firstChild;
      if (item.type === "button") {
        body.className = "dk-body dk-button";
        body.style.background = item.color || "transparent"; body.style.color = item.textColor || "#ffffff";
        body.style.fontSize = `${Number(item.fontSize || 4)}cqw`; body.style.borderRadius = `${Number(item.radius ?? 2)}cqw`;
        body.style.fontWeight = item.bold === false ? "500" : "800"; body.style.justifyContent = item.align === "left" ? "flex-start" : "center";
        const txt = (window.ainXplTexts && window.ainXplTexts[item.spriteName]) || item.text || "";
        if (body.textContent !== txt) body.textContent = txt;
      } else if (on || force) {
        body.className = "dk-body"; body.style.cssText = "";
        if (on) kiosk().render(body, item, live);
      }
    });
  }
  setInterval(() => sync(false), 120);
  window.addEventListener("ain:project-opened", () => { K = null; rawCache = null; setTimeout(() => { const p = plan(); if (p?.stage) applyStageSize(p.stage.w, p.stage.h); sync(true); }, 50); });

  /* ------------------------------------- Stage: seleccionar, mover, tocar --- */
  document.addEventListener("pointerdown", (event) => {
    const node = event.target.closest?.(".dk-item"); if (!node) return;
    const p = plan(); const item = (p?.stageItems || []).find((i) => i.id === node.dataset.stageItemId); if (!item) return;
    if (window.ainXPL?.engineRunning?.()) {
      if (item.type === "kiosk") { const name = kiosk().tap(event.target, item); sync(true); if (name && window.ainXPL?._bus) window.ainXPL._bus.click = name; }
      return;
    }
    event.preventDefault(); event.stopPropagation();
    selected = item.id; inspector(item);
    const stage = $(".stage-canvas").getBoundingClientRect();
    const resize = event.target.classList.contains("dk-resize");
    const sx = event.clientX, sy = event.clientY, ox = item.x, oy = item.y, ow = item.w, oh = item.h;
    const move = (e) => {
      const dx = ((e.clientX - sx) / stage.width) * 100, dy = ((e.clientY - sy) / stage.height) * 100;
      if (resize) { item.w = Math.max(2, Math.min(100, ow + dx)); item.h = Math.max(2, Math.min(100, oh + dy)); }
      else { item.x = Math.max(-50, Math.min(100, ox + dx)); item.y = Math.max(-50, Math.min(100, oy + dy)); }
      node.style.left = `${item.x}%`; node.style.top = `${item.y}%`; node.style.width = `${item.w}%`; node.style.height = `${item.h}%`;
    };
    const up = () => {
      document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up);
      const q = plan(); q.stageItems = q.stageItems.map((i) => (i.id === item.id ? { ...i, x: round(item.x), y: round(item.y), w: round(item.w), h: round(item.h) } : i));
      commit(q); inspector(q.stageItems.find((i) => i.id === item.id));
    };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  }, true);
  const round = (n) => Math.round(Number(n) * 10) / 10;
  document.addEventListener("keydown", (e) => {
    if (!selected || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === "Delete" || e.key === "Backspace") { removeItem(selected); e.preventDefault(); }
  });
  function removeItem(id) { const p = plan(); p.stageItems = (p.stageItems || []).filter((i) => i.id !== id); selected = null; commit(p); inspector(null); }

  /* -------------------------------------------------------- Inspector --- */
  let panel = null;
  function inspector(item) {
    if (!panel) {
      panel = document.createElement("aside"); panel.className = "dk-inspector"; panel.setAttribute("aria-label", "Propiedades del sprite");
      document.body.append(panel);
    }
    if (!item) { panel.hidden = true; return; }
    panel.hidden = false;
    const f = (k, label, type = "text", extra = "") => `<label><span>${label}</span><input data-k="${k}" type="${type}" value="${String(item[k] ?? "").replace(/"/g, "&quot;")}" ${extra}></label>`;
    panel.innerHTML = `<header><b>${L("Propiedades", "Properties")}</b><small>${item.type === "kiosk" ? "🍽 " + L("Quiosco", "Kiosk") : "▭ " + L("Botón", "Button")}</small><button type="button" data-close aria-label="Cerrar">✕</button></header>
      ${f("spriteName", L("Nombre de sprite", "Sprite name"))}
      ${item.type === "button" ? f("text", L("Texto", "Text")) : `<label><span>${L("Vista", "View")}</span><select data-k="view">${Object.entries(VIEWS).map(([v, n]) => `<option value="${v}" ${item.view === v ? "selected" : ""}>${L(n[0], n[1])}</option>`).join("")}</select></label>`}
      <div class="dk-row">${f("x", "X %", "number", 'step="0.5"')}${f("y", "Y %", "number", 'step="0.5"')}</div>
      <div class="dk-row">${f("w", L("Ancho %", "Width %"), "number", 'step="0.5"')}${f("h", L("Alto %", "Height %"), "number", 'step="0.5"')}</div>
      <div class="dk-row">${f("startFrame", L("Fotograma", "Frame"), "number", 'min="1"')}${f("durationFrames", L("Duración", "Duration"), "number", 'min="1"')}</div>
      ${item.type === "button" ? `<div class="dk-row">${f("color", L("Fondo", "Fill"), "text")}${f("textColor", L("Tinta", "Ink"), "text")}</div><div class="dk-row">${f("fontSize", L("Letra (cqw)", "Font (cqw)"), "number", 'step="0.5"')}${f("radius", L("Radio", "Radius"), "number", 'step="0.5"')}</div>` : ""}
      ${item.type === "button" ? `<label class="dk-check"><input data-k="interactive" type="checkbox" ${item.interactive ? "checked" : ""}> ${L("Interactivo (recibe toques)", "Interactive (gets touches)")}</label>` : `<p class="dk-hint">${L("Los toques de avance emiten «clic» con el nombre del sprite: úsalo en Behaviour.", "Advancing touches emit a ‘click’ with the sprite name: use it in Behaviour.")}</p>`}
      <button type="button" class="dk-del" data-del>${L("Eliminar sprite", "Delete sprite")}</button>`;
    panel.querySelector("[data-close]").onclick = () => { selected = null; inspector(null); sync(true); };
    panel.querySelector("[data-del]").onclick = () => removeItem(item.id);
    panel.querySelectorAll("[data-k]").forEach((input) => input.addEventListener("change", () => {
      const k = input.dataset.k; let v = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number") v = Number(v);
      const p = plan(); p.stageItems = p.stageItems.map((i) => (i.id === item.id ? { ...i, [k]: v } : i));
      commit(p); item = p.stageItems.find((i) => i.id === item.id);
    }));
  }

  /* ---------------------------------------------------------- Insertar --- */
  function insert(type, extra = {}) {
    const p = plan(); if (!p) return null;
    const vertical = (p.stage?.h || 1080) > (p.stage?.w || 1920);
    const base = type === "kiosk" ? { x: 5, y: vertical ? 12 : 10, w: 90, h: vertical ? 70 : 80 } : { x: 30, y: 40, w: 40, h: vertical ? 6 : 12 };
    const n = (p.stageItems || []).filter((i) => i.type === type).length + 1;
    const item = { id: uid(), type, ...base, startFrame: frameNow(), durationFrames: 24,
      spriteName: type === "kiosk" ? `${extra.view || "carta"}${n}` : `boton${n}`,
      ...(type === "button" ? { text: L("Botón", "Button"), color: "#00704A", textColor: "#ffffff", fontSize: vertical ? 4 : 2.5, radius: 1.5, interactive: true } : { view: "categories" }),
      ...extra };
    p.stageItems = [...(p.stageItems || []), item]; selected = item.id; commit(p); inspector(item);
    return item;
  }

  /* ------------------------------------------- Nueva pantalla (marca) --- */
  // Director: una «pantalla» es un tramo del Score que empieza en una marca. Esto crea la
  // marca 24 fotogramas después de la última, alarga el Score y deja el cabezal allí.
  function newScreen(name) {
    const label = String(name || window.prompt(L("Nombre de la pantalla (marca):", "Screen (marker) name:"), "") || "").trim().toUpperCase().replace(/\s+/g, "-").slice(0, 14);
    if (!label) return null;
    let stored = []; try { stored = JSON.parse(localStorage.getItem("ainimation-timeline-markers")) || []; } catch { /* */ }
    if (stored.some((m) => m.label === label)) { window.ainTransport?.setFrame(stored.find((m) => m.label === label).frame); return null; }
    const frame = stored.length ? Math.max(...stored.map((m) => Number(m.frame) || 1)) + 24 : 1;
    const markers = [...stored, { id: `m-${label.toLowerCase()}-${frame}`, label, frame }];
    localStorage.setItem("ainimation-timeline-markers", JSON.stringify(markers));
    const p = plan(); p.totalFrames = Math.max(Number(p.totalFrames || 0), frame + 23); commit(p);
    setTimeout(() => window.ainTransport?.setFrame(frame), 30);
    return { label, frame };
  }

  /* ------------------------------------------------------------- Carta --- */
  async function loadSampleMenu() {
    const m = await (await fetch("/xperiencias/kiosko-pedido/menu.starbucks.json", { cache: "no-cache" })).json();
    m.imageBase = KIOSK_BASE; return m;
  }
  function setMenu(m) { const p = plan(); p.menu = m; K = null; commit(p); badge(); }
  function badge() {
    const head = $(".cast-window .window-title, [data-window='cast'] .window-title") || $(".cast-window header") || null;
    let b = $(".dk-menu-badge"); const m = plan()?.menu;
    if (!m) { b?.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "dk-menu-badge"; (head || $(".director-menubar")).append(b); b.onclick = () => window.alert(`${m.establishment?.name || "Carta"} · ${m.categories.length} ${L("categorías", "categories")} · ${m.items.length} ${L("productos", "products")}`); }
    b.textContent = `🍽 ${m.establishment?.name || L("Carta", "Menu")}`;
  }

  /* ------------------------------------------------ Plantilla Quiosco --- */
  async function templateKiosk() {
    const menu = await loadSampleMenu();
    const S = (start) => ({ startFrame: start, durationFrames: 24 });
    const btn = (id, start, text, x, y, w, h, extra = {}) => ({ id: uid(), type: "button", spriteName: id, text, x, y, w, h, ...S(start), color: "#00704A", textColor: "#ffffff", fontSize: 4.5, radius: 2, interactive: true, ...extra });
    const lbl = (id, start, text, y, size = 6, extra = {}) => btn(id, start, text, 5, y, 90, size * 2, { color: "transparent", textColor: "#1E3932", fontSize: size, interactive: false, ...extra });
    const k = (id, start, view, y = 12, h = 74) => ({ id: uid(), type: "kiosk", spriteName: id, view, x: 4, y, w: 92, h, ...S(start) });
    const bg = (start, color) => btn(`fondo${start}`, start, "", 0, 0, 100, 100, { color, interactive: false, radius: 0 });
    const items = [
      bg(1, "#1E3932"), { ...bg(25, "#FFFFFF"), spriteName: "fondoCarta", durationFrames: 120 }, lbl("titulo", 1, L("Pide aquí, sin colas", "Order here, skip the queue"), 30, 9, { textColor: "#ffffff" }), lbl("subtitulo", 1, L("Toca la pantalla para empezar", "Touch the screen to start"), 50, 4.5, { textColor: "#cba258" }),
      btn("btnEmpezar", 1, L("Toca para empezar", "Touch to start"), 20, 66, 60, 8, { fontSize: 5, radius: 6 }),
      lbl("hCategorias", 25, L("¿Qué te apetece?", "What would you like?"), 3, 6), k("carta", 25, "categories"),
      lbl("hProductos", 49, L("Elige tu bebida", "Choose your drink"), 3, 6), k("productos", 49, "items"), btn("btnAtras", 49, L("Atrás", "Back"), 4, 89, 40, 7, { color: "#EDEBE6", textColor: "#1E2A25" }),
      k("opciones", 73, "options", 4, 84),
      lbl("hCarrito", 97, L("Tu pedido", "Your order"), 3, 6), k("carrito", 97, "cart", 12, 70), btn("btnMas", 97, L("Añadir más", "Add more"), 4, 88, 92, 7, { color: "#EDEBE6", textColor: "#1E2A25" }),
      k("pago", 121, "qr", 6, 86),
      { ...bg(145, "#00704A") }, k("numero", 145, "number", 15, 60),
      lbl("aviso", 1, L("DEMO · datos de ejemplo · pago simulado", "DEMO · example data · simulated payment"), 95, 2.4, { durationFrames: 168, textColor: "#3A2E00", color: "#FFE58A", radius: 0, y: 96.5, h: 3.5 }),
    ];
    const go = (m) => [{ id: "goToMarker", value: m }, { id: "stop" }];
    const r = (name, conds, actions) => ({ id: `xr-${name}`, name, enabled: true, when: { join: "and", conds }, do: actions });
    const click = (s) => [{ fact: "click", value: s }];
    const rules = [
      r(L("Atracción en bucle", "Attract loop"), [{ fact: "markerReached", value: "CATEGORIAS" }], [{ id: "goToMarker", value: "INICIO" }]),
      r(L("Empezar → categorías", "Start → categories"), click("btnEmpezar"), go("CATEGORIAS")),
      r(L("Categoría → productos", "Category → products"), click("carta"), go("PRODUCTOS")),
      r(L("Producto → opciones", "Product → options"), click("productos"), go("OPCIONES")),
      r(L("Atrás → categorías", "Back → categories"), click("btnAtras"), go("CATEGORIAS")),
      r(L("Añadir → carrito", "Add → cart"), click("opciones"), go("CARRITO")),
      r(L("Añadir más → categorías", "Add more → categories"), click("btnMas"), go("CATEGORIAS")),
      r(L("Pagar → QR", "Pay → QR"), click("carrito"), go("PAGO")),
      r(L("Pedido cerrado → número", "Order closed → number"), [{ fact: "orderPaid", value: true }], go("NUMERO")),
      r(L("12 s sin tocar → inicio", "12 s idle → start"), [{ fact: "idleSeconds", op: ">", value: 12 }, { fact: "frame", op: ">=", value: 25 }, { fact: "frame", op: "<", value: 121 }], [{ id: "clearCart" }, { id: "goToMarker", value: "INICIO" }]),
      r(L("60 s en el pago → inicio", "60 s on payment → start"), [{ fact: "idleSeconds", op: ">", value: 60 }, { fact: "frame", op: ">=", value: 121 }, { fact: "frame", op: "<", value: 145 }], [{ id: "clearCart" }, { id: "goToMarker", value: "INICIO" }]),
      r(L("Número → inicio a los 12 s", "Number → start after 12 s"), [{ fact: "idleSeconds", op: ">", value: 12 }, { fact: "frame", op: ">=", value: 145 }], [{ id: "clearCart" }, { id: "goToMarker", value: "INICIO" }]),
    ];
    const markers = [["INICIO", 1], ["CATEGORIAS", 25], ["PRODUCTOS", 49], ["OPCIONES", 73], ["CARRITO", 97], ["PAGO", 121], ["NUMERO", 145], ["FIN", 168]].map(([label, frame]) => ({ id: `m-${label.toLowerCase()}`, label, frame }));
    const p = window.normalizeFilmPlan({ ...(plan() || {}), title: L("Quiosco de pedidos", "Ordering kiosk"), cast: [], stageItems: items, rules, menu, stage: { w: 1080, h: 1920 }, totalFrames: 168, markers, durationSeconds: 90, template: "quiosco-de-pedidos" });
    window.saveTimelineMarkers?.(markers);
    applyStageSize(1080, 1920); K = null; commit(p); badge();
    return p;
  }

  /* ------------------------------------------------ Exportar proyecto --- */
  function exportProject() {
    const p = plan(); const total = Number(window.ainTransport?.totalFrames) || 240;
    const out = { format: "ainimation-project", version: 1, savedAt: new Date().toISOString(), plan: { ...p, markers: window.loadTimelineMarkers?.(total) || [] } };
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" })), download: `${(window.ainXperiencia?.slugify?.(p.title) || "proyecto")}.ainimation.json` });
    document.body.append(a); a.click(); a.remove();
    return out;
  }
  function newKioskProject() { return templateKiosk(); }

  /* --------------------------------------------------------------- UI --- */
  function menuButton(label, items, cls) {
    const wrap = document.createElement("span"); wrap.className = `dk-menu ${cls || ""}`;
    wrap.innerHTML = `<button class="menu-button" type="button" aria-expanded="false">${label}</button><span class="dk-menu-list"></span>`;
    const list = wrap.lastChild;
    items.forEach(([text, fn, attr]) => { if (!text) { list.append(document.createElement("i")); return; } const b = document.createElement("button"); b.type = "button"; b.textContent = text; if (attr) b.setAttribute(attr, ""); b.onclick = (e) => { wrap.classList.remove("open"); fn(e); }; list.append(b); });
    wrap.firstChild.onclick = () => { const o = !wrap.classList.contains("open"); document.querySelectorAll(".dk-menu.open").forEach((m) => m.classList.remove("open")); wrap.classList.toggle("open", o); wrap.firstChild.setAttribute("aria-expanded", String(o)); };
    document.addEventListener("pointerdown", (e) => { if (!wrap.contains(e.target)) wrap.classList.remove("open"); });
    return wrap;
  }
  function boot() {
    const css = document.createElement("style"); css.textContent = (window.AINKiosk?.CSS || "") + `
      .stage-canvas{container-type:inline-size}.aink,.aink *{color:#1e2a25}.aink-cta,.aink-opt.on{color:#fff!important}.aink-cta.alt{color:#1e2a25!important}
      .dk-item{position:absolute;z-index:3;overflow:hidden}.dk-item[hidden]{display:none}.dk-item .dk-body{width:100%;height:100%}
      .dk-button{display:flex;align-items:center;padding:0 .4em;line-height:1.1;text-align:center;font-family:Inter,system-ui,sans-serif;white-space:pre-wrap}
      .dk-item.is-selected{outline:2px dashed #c6f24e;outline-offset:1px}.dk-resize{position:absolute;right:0;bottom:0;width:12px;height:12px;background:#c6f24e;cursor:nwse-resize;display:none}.dk-item.is-selected .dk-resize{display:block}
      body.xpl-live .dk-item .dk-resize{display:none!important}
      .dk-menu{position:relative;display:inline-block}.dk-menu-list{display:none;position:absolute;top:100%;left:0;z-index:200;min-width:250px;flex-direction:column;background:#14110f;border:1px solid #3a3a3a;border-radius:8px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
      .dk-menu.open .dk-menu-list{display:flex}.dk-menu-list button{all:unset;cursor:pointer;padding:7px 10px;border-radius:6px;color:#f3f1ea;font:13px Inter,system-ui,sans-serif}.dk-menu-list button:hover{background:#2a2622}.dk-menu-list i{height:1px;background:#3a3a3a;margin:4px 0}
      .dk-inspector{position:fixed;right:14px;top:84px;z-index:300;width:270px;background:#14110f;color:#f3f1ea;border:1px solid #3a3a3a;border-radius:10px;padding:10px;font:12px Inter,system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.45)}
      .dk-inspector header{display:flex;gap:8px;align-items:center;margin-bottom:8px}.dk-inspector header small{opacity:.7;flex:1}.dk-inspector header button{all:unset;cursor:pointer}
      .dk-inspector label{display:flex;flex-direction:column;gap:3px;margin-bottom:6px}.dk-inspector label span{opacity:.75}.dk-inspector input,.dk-inspector select{background:#221e1b;color:inherit;border:1px solid #3a3a3a;border-radius:6px;padding:5px 6px;font:inherit;min-width:0}
      .dk-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}.dk-check{flex-direction:row!important;align-items:center}.dk-hint{opacity:.7;margin:4px 0 8px}.dk-del{width:100%;background:#4a1f1a;color:#fff;border:0;border-radius:6px;padding:7px;cursor:pointer}
      .dk-menu-badge{margin-left:6px;background:#00704A;color:#fff;border:0;border-radius:99px;padding:2px 9px;font:700 11px Inter,system-ui,sans-serif;cursor:pointer}
      .dk-size{cursor:pointer}.dk-size-menu{position:fixed;z-index:400;background:#14110f;border:1px solid #3a3a3a;border-radius:8px;padding:6px;display:flex;flex-direction:column}.dk-size-menu button{all:unset;cursor:pointer;padding:7px 10px;color:#f3f1ea;font:13px Inter,system-ui,sans-serif;border-radius:6px}.dk-size-menu button:hover{background:#2a2622}
      .dk-checkout{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:none;align-items:center;justify-content:center}.dk-checkout.on{display:flex}.dk-checkout div{position:relative;width:min(92vw,460px);height:min(86vh,720px)}.dk-checkout iframe{width:100%;height:100%;border:0;border-radius:16px;background:#fff}.dk-checkout button{position:absolute;top:-12px;right:-12px;width:34px;height:34px;border-radius:50%;border:0;background:#fff;cursor:pointer}`;
    document.head.append(css);
    const bar = $(".director-menubar"); if (!bar) return;
    const views = Object.entries(VIEWS).map(([v, n]) => [`🍽 ${L("Quiosco", "Kiosk")} · ${L(n[0], n[1])}`, () => insert("kiosk", { view: v, spriteName: `${v}${(plan().stageItems || []).filter((i) => i.view === v).length + 1}` }), `data-dk-insert-${v}`]);
    const ins = menuButton(L("Insertar", "Insert"), [
      [L("🚩 Nueva pantalla (marca)…", "🚩 New screen (marker)…"), () => newScreen(), "data-dk-new-screen"],
      [],
      [L("▭ Botón", "▭ Button"), () => insert("button"), "data-dk-insert-button"],
      [L("T Etiqueta", "T Label"), () => insert("button", { text: L("Etiqueta", "Label"), color: "transparent", textColor: "#1E3932", interactive: false, spriteName: `etiqueta${Date.now() % 1000}` }), "data-dk-insert-label"],
      [], ...views,
    ], "dk-insert");
    const castMenu = menuButton(L("Carta", "Menu"), [
      [L("🍽 Carta de ejemplo (Starbucks · ficticia)", "🍽 Sample menu (Starbucks · fictitious)"), async () => setMenu(await loadSampleMenu()), "data-dk-menu-sample"],
      [L("Importar carta (.json)…", "Import menu (.json)…"), () => pick("application/json,.json", async (file) => { const m = JSON.parse(await file.text()); if (!m.items || !m.categories) throw new Error("menu"); setMenu(m); }), "data-dk-menu-import"],
      [L("Quitar la carta", "Remove menu"), () => { const p = plan(); delete p.menu; K = null; commit(p); badge(); }],
    ], "dk-carta");
    const tpl = menuButton(L("Plantillas", "Templates"), [
      [L("🛒 Quiosco de pedidos (Starbucks, tótem vertical)", "🛒 Ordering kiosk (Starbucks, vertical totem)"), () => { if (!window.confirm(L("Se abrirá la plantilla «Quiosco de pedidos» como proyecto editable. Lo no guardado se perderá. ¿Seguir?", "The ‘Ordering kiosk’ template opens as an editable project. Unsaved work will be lost. Continue?"))) return; templateKiosk(); }, "data-dk-template-kiosk"],
      [],
      [L("⬇ Exportar proyecto (.json)", "⬇ Export project (.json)"), () => exportProject(), "data-dk-export-project"],
    ], "dk-plantillas");
    const anchor = bar.querySelector(".cast-menu") || bar.firstChild;
    bar.insertBefore(tpl, bar.querySelector(".edit-menu"));
    anchor.after(castMenu); castMenu.after(ins);
    // chip de tamaño del Stage → presets
    const chip = document.getElementById("sceneCount");
    const host = chip?.closest("span, button, div") || chip;
    if (host) { host.classList.add("dk-size"); host.title = L("Resolución del Stage", "Stage resolution"); host.setAttribute("data-dk-stage-size", "");
      host.addEventListener("pointerdown", (e) => e.stopPropagation()); // la barra de la ventana captura el puntero (arrastre)
      host.addEventListener("click", (e) => { e.stopPropagation(); document.querySelector(".dk-size-menu")?.remove(); const m = document.createElement("div"); m.className = "dk-size-menu";
        PRESETS.forEach((pr) => { const b = document.createElement("button"); b.type = "button"; b.textContent = L(pr.es, pr.en); b.dataset.dkSize = `${pr.w}x${pr.h}`; b.onclick = () => { setStageSize(pr.w, pr.h); m.remove(); }; m.append(b); });
        const r = host.getBoundingClientRect(); m.style.left = `${Math.max(8, r.right - 260)}px`; m.style.top = `${r.bottom + 6}px`; document.body.append(m);
        setTimeout(() => document.addEventListener("pointerdown", function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("pointerdown", off); } }), 0); }); }
    const p = plan(); if (p?.stage) applyStageSize(p.stage.w, p.stage.h);
    badge();
    // ?plantilla=quiosco abre la plantilla directamente (enlace desde la galería)
    if (new URLSearchParams(location.search).get("plantilla") === "quiosco" && p?.template !== "quiosco-de-pedidos") templateKiosk();
  }
  function pick(accept, fn) { const i = Object.assign(document.createElement("input"), { type: "file", accept }); i.onchange = async () => { try { await fn(i.files[0]); } catch { window.alert(L("No se ha podido leer el archivo.", "Could not read the file.")); } }; i.click(); }
  window.ainDirector = { newScreen, insert, templateKiosk, newKioskProject, exportProject, setStageSize, setMenu, loadSampleMenu, kiosk: () => kiosk(), inspector, sync };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0)); else setTimeout(boot, 0);
})();
