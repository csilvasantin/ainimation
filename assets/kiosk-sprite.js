/* ============================================================================
 * kiosk-sprite.js — el miembro «Carta / Quiosco» de AInimation Studio
 * ----------------------------------------------------------------------------
 * Una pieza de Director con datos: la carta (menu.json, mismo esquema que
 * xperiencias/kiosko-pedido/menu.schema.json) vive en plan.menu y un sprite de
 * tipo «kiosk» la pinta en una de sus vistas:
 *
 *   categories · items · options · cart · qr · number
 *
 * Los toques DENTRO del sprite cambian el estado (categoría, producto, opción,
 * carrito) y, cuando el toque es «de avance» (elegir categoría, elegir producto,
 * Añadir, Pagar, Pagar en barra), el sprite emite su nombre como un clic XPL:
 * la regla del autor decide a qué marca se salta. Lingo puro: el sprite sabe
 * de datos, el Score sabe de navegación.
 *
 * Vive igual en el Studio (vista previa y Play) y DENTRO de cada Xperiencia
 * publicada (se incrusta como texto). Sin dependencias. DEMO: el pago es
 * SIMULADO — nunca hay campos de tarjeta.
 * ========================================================================== */
(function (root) {
  "use strict";
  var T = {
    es: { add: "Añadir", pay: "Pagar", counter: "Pagar en barra", total: "Total", empty: "Aún no has elegido nada.", scan: "Escanea para pagar", tap: "Demo: toca el QR para simular el pago", thanks: "¡Gracias!", paid: "Pago simulado completado", atCounter: "Paga en barra al recoger", demo: "DEMO · pago simulado, no se cobra nada" },
    en: { add: "Add", pay: "Pay", counter: "Pay at the counter", total: "Total", empty: "Nothing selected yet.", scan: "Scan to pay", tap: "Demo: tap the QR to simulate payment", thanks: "Thank you!", paid: "Simulated payment completed", atCounter: "Pay at the counter on pickup", demo: "DEMO · simulated payment, nothing is charged" }
  };
  var VIEWS = ["categories", "items", "options", "cart", "qr", "number"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function create(opts) {
    opts = opts || {};
    var menu = opts.menu || null;
    var st = { lang: opts.lang || "es", category: null, item: null, sel: {}, qty: 1, cart: [], order: null, paid: false, vars: {}, n: 0 };
    var emit = opts.emit || function () {};
    var notify = opts.notify || function () {};
    var base = opts.base || "";
    function tr(o) { return o ? (o[st.lang] || o.es || "") : ""; }
    function t(k) { return (T[st.lang] || T.es)[k]; }
    function money(n) { try { return new Intl.NumberFormat(st.lang === "en" ? "en-IE" : "es-ES", { style: "currency", currency: (menu && menu.establishment && menu.establishment.currency) || "EUR" }).format(n); } catch (e) { return n.toFixed(2); } }
    function img(src) { return !src ? "" : /^(https?:|data:|\/)/.test(src) ? src : base + src; }
    function items() { return menu ? menu.items.filter(function (i) { return (!st.category || i.category === st.category) && i.available !== false; }) : []; }
    function cur() { return menu && st.item ? menu.items.filter(function (i) { return i.id === st.item; })[0] : null; }
    function unit(it, sel) { var p = it.basePrice; (it.optionGroups || []).forEach(function (g) { var s = sel[g.id]; g.choices.forEach(function (c) { if (s === c.id || (Array.isArray(s) && s.indexOf(c.id) >= 0)) p += c.priceDelta || 0; }); }); return Math.round(p * 100) / 100; }
    function total() { return Math.round(st.cart.reduce(function (a, l) { return a + l.qty * l.unitPrice; }, 0) * 100) / 100; }
    function pickItem(id) {
      st.item = id; st.qty = 1; st.sel = {};
      var it = cur(); (it && it.optionGroups || []).forEach(function (g) { st.sel[g.id] = g.type === "single" ? (g.default || (g.required ? g.choices[0].id : null)) : []; });
    }
    function addToCart() {
      var it = cur(); if (!it) return false;
      var o = []; (it.optionGroups || []).forEach(function (g) { var s = st.sel[g.id]; g.choices.forEach(function (c) { if (s === c.id || (Array.isArray(s) && s.indexOf(c.id) >= 0)) o.push(tr(c.label)); }); });
      st.cart.push({ id: it.id, name: tr(it.name), qty: st.qty, unitPrice: unit(it, st.sel), options: o }); notify("cart"); return true;
    }
    function makeOrder() {
      st.order = { id: "ped-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6), number: null, simulated: true,
        store: menu && menu.establishment && menu.establishment.id, currency: (menu && menu.establishment && menu.establishment.currency) || "EUR",
        lines: st.cart.slice(), total: total(), status: "pending-payment", createdAt: new Date().toISOString() };
      st.paid = false; return st.order;
    }
    function checkoutUrl() {
      var o = st.order || makeOrder();
      var u = (menu && menu.orderFlow && menu.orderFlow.payment && menu.orderFlow.payment.checkoutUrl) || opts.checkoutUrl || "https://www.ainimation.studio/xperiencias/kiosko-pedido/pago-simulado.html";
      if (!/^https?:/.test(u)) u = "https://www.ainimation.studio/xperiencias/kiosko-pedido/" + u.replace(/^\.?\//, "");
      return u + (u.indexOf("?") < 0 ? "?" : "&") + "pedido=" + encodeURIComponent(o.id) + "&total=" + o.total.toFixed(2) + "&moneda=" + o.currency + "&lang=" + st.lang;
    }
    function finish(how) {
      if (!st.order) makeOrder(); if (st.order.number) return;
      st.n += 1; st.order.number = ((menu && menu.orderFlow && menu.orderFlow.prefix) || "A") + String(st.n).padStart(3, "0");
      st.order.status = how === "paid" ? "paid-simulated" : "pay-at-counter"; st.paid = true; notify(how === "paid" ? "paid" : "counter", st.order);
    }
    function reset() { st.category = null; st.item = null; st.sel = {}; st.cart = []; st.order = null; st.paid = false; notify("reset"); }
    function onPaid(d) { if (d && st.order && d.pedido === st.order.id && d.estado === "pagado") finish("paid"); }
    try { new BroadcastChannel("kiosko-pedido").onmessage = function (e) { onPaid(e.data); }; } catch (e) {}
    try { root.addEventListener("storage", function (e) { if (e.key === "kiosko:pago" && e.newValue) try { onPaid(JSON.parse(e.newValue)); } catch (_) {} }); } catch (e) {}
    try { root.addEventListener("message", function (e) { if (e.data && e.data.source === "kiosko-pago-simulado") onPaid(e.data); }); } catch (e) {}

    function html(view, sprite) {
      if (!menu) return '<div class="aink-empty">🍽 Sin carta · Cast ▸ Carta</div>';
      var hot = sprite ? ' data-aink-sprite="' + esc(sprite) + '"' : "";
      if (view === "categories") return '<div class="aink-grid">' + menu.categories.map(function (c) {
        return '<button type="button" class="aink-card" data-aink="cat" data-v="' + esc(c.id) + '"' + hot + '><img alt="" src="' + esc(img(c.image)) + '"><b>' + esc(tr(c.name)) + '</b></button>'; }).join("") + "</div>";
      if (view === "items") return '<div class="aink-grid">' + items().map(function (i) {
        return '<button type="button" class="aink-card" data-aink="item" data-v="' + esc(i.id) + '"' + hot + '><img alt="" src="' + esc(img(i.image)) + '"><b>' + esc(tr(i.name)) + '</b><span>' + money(i.basePrice) + "</span></button>"; }).join("") + "</div>";
      if (view === "options") {
        var it = cur() || (items()[0]); if (!it) return '<div class="aink-empty">—</div>'; if (!st.item) pickItem(it.id);
        return '<div class="aink-opts"><h3>' + esc(tr(it.name)) + "</h3>" + (it.optionGroups || []).map(function (g) {
          return '<fieldset><legend>' + esc(tr(g.label)) + '</legend><div>' + g.choices.map(function (c) { var s = st.sel[g.id], on = s === c.id || (Array.isArray(s) && s.indexOf(c.id) >= 0);
            return '<button type="button" class="aink-opt' + (on ? " on" : "") + '" data-aink="opt" data-g="' + esc(g.id) + '" data-v="' + esc(c.id) + '">' + esc(tr(c.label)) + (c.priceDelta ? " +" + money(c.priceDelta) : "") + "</button>"; }).join("") + "</div></fieldset>"; }).join("") +
          '<button type="button" class="aink-cta" data-aink="add"' + hot + '>' + t("add") + " · " + money(unit(it, st.sel) * st.qty) + "</button></div>";
      }
      if (view === "cart") return '<div class="aink-cart">' + (st.cart.length ? st.cart.map(function (l, k) { return '<div class="aink-line"><b>' + l.qty + "× " + esc(l.name) + "</b><small>" + esc(l.options.join(" · ")) + "</small><span>" + money(l.qty * l.unitPrice) + '</span><button type="button" data-aink="del" data-v="' + k + '">✕</button></div>'; }).join("") : "<p>" + t("empty") + "</p>") +
        '<div class="aink-total"><span>' + t("total") + "</span><b>" + money(total()) + '</b></div><button type="button" class="aink-cta" data-aink="pay"' + (st.cart.length ? hot : " disabled") + ">" + t("pay") + "</button></div>";
      if (view === "qr") { var u = checkoutUrl(); return '<div class="aink-qr"><h3>' + t("scan") + " · " + money(st.order ? st.order.total : 0) + '</h3><div class="aink-qrbox" data-aink="qr" data-url="' + esc(u) + '"></div><small>' + t("tap") + '</small><button type="button" class="aink-cta alt" data-aink="counter"' + hot + ">" + t("counter") + "</button><small>" + t("demo") + "</small></div>"; }
      if (view === "number") return '<div class="aink-num"><h3>' + t("thanks") + "</h3><b>" + esc(st.order && st.order.number || "A000") + "</b><p>" + esc(st.order && st.order.status === "pay-at-counter" ? t("atCounter") : t("paid")) + "</p></div>";
      return "";
    }
    // Pinta UNA vez por cambio de estado (no en cada fotograma): el QR es caro.
    function render(node, item, live) {
      var view = item.view || "categories", key = view + "|" + JSON.stringify([st.category, st.item, st.sel, st.cart.length, st.order && st.order.id, st.order && st.order.number, st.lang, !!menu]);
      if (node.__ainkKey === key) return; node.__ainkKey = key;
      node.classList.add("aink"); node.dataset.ainkView = view;
      node.innerHTML = html(view, live ? (item.spriteName || "") : "");
      var q = node.querySelector(".aink-qrbox");
      if (q && root.QRCode) { try { new root.QRCode(q, { text: q.dataset.url, width: 256, height: 256, correctLevel: root.QRCode.CorrectLevel.M }); } catch (e) { q.textContent = q.dataset.url; } }
      else if (q) q.textContent = "QR";
    }
    // Toque dentro del sprite. Devuelve el nombre de sprite si el toque «avanza».
    function tap(target, item) {
      var b = target && target.closest && target.closest("[data-aink]"); if (!b) return "";
      var k = b.dataset.aink, v = b.dataset.v, adv = false;
      if (k === "cat") { st.category = v; adv = true; }
      else if (k === "item") { pickItem(v); adv = true; }
      else if (k === "opt") { var it = cur(), g = it && (it.optionGroups || []).filter(function (x) { return x.id === b.dataset.g; })[0]; if (g) { if (g.type === "single") st.sel[g.id] = (st.sel[g.id] === v && !g.required) ? null : v; else { var a = st.sel[g.id] || (st.sel[g.id] = []), i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else if (!g.max || a.length < g.max) a.push(v); } } }
      else if (k === "add") { adv = addToCart(); }
      else if (k === "del") { st.cart.splice(Number(v), 1); }
      else if (k === "pay") { if (st.cart.length) { makeOrder(); emit("payment", { status: "started", checkoutUrl: checkoutUrl() }); adv = true; } }
      else if (k === "counter") { finish("counter"); adv = true; }
      else if (k === "qr") { if (opts.openCheckout) opts.openCheckout(b.dataset.url); }
      return adv ? (item.spriteName || "") : "";
    }
    return {
      state: st, render: render, tap: tap, reset: reset, addToCart: addToCart, finish: finish, checkoutUrl: checkoutUrl, makeOrder: makeOrder, onPaid: onPaid,
      setMenu: function (m) { menu = m; }, setLang: function (l) { st.lang = l === "en" ? "en" : "es"; },
      fact: function (id) { if (id === "orderPaid") return !!st.paid; if (id === "cartCount") return st.cart.reduce(function (a, l) { return a + l.qty; }, 0); if (id === "cartTotal") return total(); return undefined; },
      act: function (id, value, action) {
        if (id === "addToCart") return addToCart();
        if (id === "clearCart") return reset();
        if (id === "setVar") { var kv = String(value || "").split("="); st.vars[kv[0].trim()] = (kv[1] || "").trim(); if (kv[0].trim() === "lang") st.lang = (kv[1] || "").trim() === "en" ? "en" : "es"; return; }
        if (id === "openCheckout") { makeOrder(); var u = checkoutUrl(); emit("payment", { status: "started", checkoutUrl: u }); if (opts.openCheckout) opts.openCheckout(u); return; }
        if (id === "payAtCounter") return finish("counter");
      }
    };
  }
  var CSS = ".aink{overflow:auto;font-family:Inter,system-ui,sans-serif;color:var(--aink-ink,#1e2a25)}.aink button{font:inherit;cursor:pointer;touch-action:manipulation}" +
    ".aink-empty{display:grid;place-items:center;height:100%;border:2px dashed #8a928e;color:#8a928e;font-weight:700}" +
    ".aink-grid{display:grid;grid-template-columns:1fr 1fr;gap:4%;padding:2%}.aink-card{display:flex;flex-direction:column;gap:.3em;align-items:flex-start;background:#fff;border:2px solid #d9d6cf;border-radius:14px;padding:6%;text-align:left;color:inherit;font-size:clamp(9px,1.6cqw + 6px,32px)}.aink-card img{width:100%;aspect-ratio:1;border-radius:10px}.aink-card span{color:var(--aink-accent,#00704a);font-weight:800}" +
    ".aink-opts{padding:2%;font-size:clamp(9px,1.4cqw + 6px,30px)}.aink-opts h3{margin:.2em 0 .5em;font-size:1.6em}.aink-opts fieldset{border:0;padding:0;margin:0 0 .8em}.aink-opts legend{font-weight:800;margin-bottom:.3em}.aink-opts fieldset div{display:flex;flex-wrap:wrap;gap:.4em}.aink-opt{padding:.6em .9em;border-radius:10px;border:2px solid #d9d6cf;background:#fff;color:inherit}.aink-opt.on{background:var(--aink-accent,#00704a);border-color:var(--aink-accent,#00704a);color:#fff}" +
    ".aink-cta{display:block;width:100%;margin-top:.6em;padding:.8em;border:0;border-radius:12px;background:var(--aink-accent,#00704a);color:#fff;font-weight:800;font-size:1.2em}.aink-cta.alt{background:#edebe6;color:#1e2a25}.aink-cta[disabled]{opacity:.4}" +
    ".aink-cart{padding:2%;font-size:clamp(9px,1.4cqw + 6px,30px)}.aink-line{display:grid;grid-template-columns:1fr auto auto;gap:.2em .6em;align-items:center;padding:.5em 0;border-bottom:1px solid #d9d6cf}.aink-line small{grid-column:1;color:#55605b}.aink-line button{grid-row:1/3;grid-column:3;border:0;border-radius:50%;width:2em;height:2em;background:#edebe6}.aink-total{display:flex;justify-content:space-between;font-size:1.4em;margin-top:.6em}" +
    ".aink-qr{display:flex;flex-direction:column;align-items:center;gap:.6em;padding:2%;text-align:center;font-size:clamp(9px,1.4cqw + 6px,30px)}.aink-qrbox{background:#fff;padding:10px;border-radius:12px;cursor:pointer}.aink-qrbox img,.aink-qrbox canvas{width:min(60cqw,256px)!important;height:auto!important}" +
    ".aink-num{display:grid;place-items:center;text-align:center;height:100%;font-size:clamp(10px,2cqw + 6px,40px)}.aink-num b{font-size:4em;line-height:1}";
  root.AINKiosk = { create: create, VIEWS: VIEWS, CSS: CSS };
})(typeof window !== "undefined" ? window : this);
