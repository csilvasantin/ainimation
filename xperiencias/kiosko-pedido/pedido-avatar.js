/* pedido-avatar.js — la conversación con el avatar rellena el pedido del quiosco (Carlos, 7-oct-2026).
 *
 * Piezas PURAS (sin DOM) que comparten el quiosco (index.html) y sus tests de node:
 *  - validateDraft(menu, draft, opts): valida un borrador {type:'order-draft', version:1, store, lines,
 *    customerName, ready, missing, summary} contra la carta. Nunca confía en precios ni textos del avatar.
 *  - cartLine(menu, item, sel, qty): línea del carrito con el precio que calcula el quiosco.
 *  - queueLines(cart): líneas que viajan a la cola (barra) con sus opciones legibles.
 *  - cleanName / validName: misma regla que #custName (solo letras, espacio, ' y -; máx. 24; ≥ 2 letras).
 *  - isAvatarOrigin / isHostOrigin: listas blancas de orígenes para postMessage.
 *  - avatarUrl(level, ctx): cara de digitalavatar.ai (good/better/best) en modo pedido.
 * Contrato completo: README.md («Pedir hablando con el avatar»). */
(function (root) {
  'use strict';

  var MAX_LINES = 10, MAX_QTY = 10; // mismos topes que la cola (relé: MAX_LINEAS = 10, qty 1–10)
  // Caras de digitalavatar.ai: las mismas URLs que el cargador común admiranext.com/assets/avatar.js.
  var LEVELS = {
    good: 'https://digitalavatar.ai/nube.html?dock=1',
    better: 'https://digitalavatar.ai/best.html?dock=1&kiosk=0',
    best: 'https://digitalavatar.ai/metahuman.html?dock=1'
  };
  var TIER_AVATAR = { good: 'admirito', better: 'luna', best: 'neo' };
  var LEVEL_ALIAS = { avatar: 'good', admirito: 'good', nube: 'good', human: 'better', luna: 'better', metahuman: 'best', neo: 'best' };
  // Quien puede mandar da-answer: la cara (digitalavatar.ai) y su proxy de Pixel Streaming; localhost para pruebas.
  var AVATAR_ORIGIN = /^https:\/\/(www\.)?digitalavatar\.ai$|^https:\/\/neo-digitalavatar\.csilvasantin\.workers\.dev$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  // Anfitriones del quiosco: el gemelo (admira.store / xpaceos.com), ainimation.studio, admira.tv; localhost para pruebas.
  var HOST_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(ainimation\.studio|admira\.store|xpaceos\.com|admira\.tv)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  function isAvatarOrigin(o) { return AVATAR_ORIGIN.test(String(o || '')); }
  function isHostOrigin(o) { return HOST_ORIGIN.test(String(o || '')); }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function words(o) { // {es,en} | [..] | {es:[..],en:[..]} → lista plana de textos
    if (!o) return [];
    if (typeof o === 'string') return [o];
    if (Array.isArray(o)) return o.reduce(function (a, x) { return a.concat(words(x)); }, []);
    if (typeof o === 'object') return Object.keys(o).reduce(function (a, k) { return a.concat(words(o[k])); }, []);
    return [];
  }
  function matches(entry, value) {
    var v = norm(value); if (!v) return false;
    if (norm(entry.id) === v) return true;
    return words(entry.label).concat(words(entry.name), words(entry.aliases)).some(function (w) { return norm(w) === v; });
  }
  function findItem(menu, id) {
    var items = (menu && menu.items) || [];
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    for (var j = 0; j < items.length; j++) if (matches(items[j], id)) return items[j];
    return null;
  }
  function findChoice(group, value) {
    var ch = group.choices || [];
    for (var i = 0; i < ch.length; i++) if (ch[i].id === value) return ch[i];
    for (var j = 0; j < ch.length; j++) if (matches(ch[j], value)) return ch[j];
    return null;
  }

  function cleanName(s) {
    return String(s == null ? '' : s).replace(/[^\p{L} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  }
  function validName(s) { return cleanName(s).replace(/[^\p{L}]/gu, '').length >= 2; }

  // sel = {grupo: idElegido | [ids]} → precio unitario (redondeo a céntimos), igual que unit() del quiosco
  function unitPrice(item, sel) {
    var p = +item.basePrice || 0;
    (item.optionGroups || []).forEach(function (g) {
      var s = sel[g.id];
      (g.choices || []).forEach(function (c) { if (s === c.id || (Array.isArray(s) && s.indexOf(c.id) >= 0)) p += c.priceDelta || 0; });
    });
    return Math.round(p * 100) / 100;
  }
  // Línea del carrito con la misma forma que addLine() del quiosco
  function cartLine(menu, item, sel, qty) {
    var opts = [];
    (item.optionGroups || []).forEach(function (g) {
      var s = sel[g.id];
      (g.choices || []).forEach(function (c) {
        if (s === c.id || (Array.isArray(s) && s.indexOf(c.id) >= 0)) opts.push({ group: g.id, id: c.id, label: c.label, priceDelta: c.priceDelta || 0, multi: g.type === 'multi' });
      });
    });
    return { id: item.id, name: item.name, image: item.image, options: opts, qty: qty, unitPrice: unitPrice(item, sel) };
  }
  function lineKey(l) { return l.id + '|' + (l.options || []).map(function (o) { return o.group + ':' + o.id; }).sort().join(',') + '|' + l.qty + '|' + (l.pending || []).join(','); }

  // Valida una línea {id, qty, options:{grupo: id | [ids]}} → {line, sel, issues, missing} | {error}
  function validateLine(menu, raw) {
    if (!raw || typeof raw !== 'object') return { error: 'línea no válida' };
    var item = findItem(menu, String(raw.id || '').slice(0, 80));
    if (!item) return { error: 'producto desconocido: ' + String(raw.id || '').slice(0, 40) };
    if (item.available === false) return { error: 'no disponible: ' + item.id };
    var qty = raw.qty == null ? 1 : Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: item.id + ': cantidad fuera de 1–' + MAX_QTY };
    var o = raw.options && typeof raw.options === 'object' && !Array.isArray(raw.options) ? raw.options : {};
    var groups = item.optionGroups || [], sel = {}, issues = [], missing = [], unset = [];
    Object.keys(o).forEach(function (k) { if (!groups.some(function (g) { return g.id === k; })) issues.push(item.id + ': opción ignorada «' + String(k).slice(0, 30) + '»'); });
    groups.forEach(function (g) {
      var v = o[g.id];
      if (g.type === 'multi') {
        var list = v == null ? [] : Array.isArray(v) ? v : [v], ids = [];
        list.slice(0, 12).forEach(function (x) {
          var c = findChoice(g, String(x)); if (!c) { issues.push(item.id + ': ' + g.id + ' «' + String(x).slice(0, 30) + '» no está en la carta'); return; }
          if (ids.indexOf(c.id) < 0 && (!g.max || ids.length < g.max)) ids.push(c.id);
        });
        sel[g.id] = ids;
      } else {
        var c = v == null || v === '' ? null : findChoice(g, String(Array.isArray(v) ? v[0] : v));
        if (v != null && v !== '' && !c) issues.push(item.id + ': ' + g.id + ' «' + String(v).slice(0, 30) + '» no está en la carta');
        if (!c && g.required && !g.default) missing.push(g.id);
        if (!c) unset.push(g.id); // con «default» la carta decide (el cerebro avisa en missing si quiere preguntar)
        sel[g.id] = c ? c.id : (g.default || (g.required ? g.choices[0].id : null));
      }
    });
    return { line: cartLine(menu, item, sel, qty), sel: sel, issues: issues, missing: missing, unset: unset };
  }

  // Borrador completo (pedido ACUMULADO) → {ok, lines, customerName, ready, missing, issues, total, rejected}
  function validateDraft(menu, draft, opts) {
    opts = opts || {};
    var out = { ok: false, lines: [], customerName: '', ready: false, missing: [], issues: [], total: 0, rejected: [] };
    if (!menu || !menu.items) { out.issues.push('sin carta'); return out; }
    if (!draft || typeof draft !== 'object' || draft.type !== 'order-draft') { out.issues.push('no es un order-draft'); return out; }
    if (draft.version != null && draft.version !== 1) { out.issues.push('versión no soportada'); return out; }
    var stores = (opts.stores || []).filter(Boolean);
    if (draft.store && stores.length && stores.indexOf(String(draft.store)) < 0) { out.issues.push('tienda distinta: ' + String(draft.store).slice(0, 60)); return out; }
    var lines = Array.isArray(draft.lines) ? draft.lines : [];
    if (lines.length > MAX_LINES) { out.issues.push('demasiadas líneas (máx. ' + MAX_LINES + ')'); lines = lines.slice(0, MAX_LINES); }
    lines.forEach(function (raw) {
      var r = validateLine(menu, raw);
      if (r.error) { out.rejected.push(r.error); return; }
      r.line.unset = r.unset; out.lines.push(r.line); out.issues = out.issues.concat(r.issues);
      r.missing.forEach(function (m) { if (out.missing.indexOf(m) < 0) out.missing.push(m); });
    });
    (Array.isArray(draft.missing) ? draft.missing : []).slice(0, 10).forEach(function (m) {
      m = String(m).replace(/[^a-z0-9_-]/gi, '').slice(0, 30); if (m && out.missing.indexOf(m) < 0) out.missing.push(m);
    });
    // grupos que el avatar aún va a preguntar (missing) y que la línea no trae: se pintan «Leche ?», no «Entera»
    out.lines.forEach(function (l) { l.pending = (l.unset || []).filter(function (g) { return out.missing.indexOf(g) >= 0; }); delete l.unset; });
    var name = cleanName(draft.customerName);
    out.customerName = validName(name) ? name : '';
    out.total = Math.round(out.lines.reduce(function (a, l) { return a + l.qty * l.unitPrice; }, 0) * 100) / 100;
    // ok = se puede sustituir el carrito: alguna línea válida, o el avatar vacía el pedido a propósito (lines:[])
    out.ok = out.lines.length > 0 || (lines.length === 0 && Array.isArray(draft.lines));
    // listo para confirmar = el avatar lo dice, el quiosco no ve huecos y no se ha descartado nada
    out.ready = draft.ready === true && out.lines.length > 0 && !out.rejected.length && !out.missing.length && !!out.customerName;
    return out;
  }

  // Líneas para la cola (contrato del relé, 7-oct-2026): options con los IDS de la carta (los multi en array)
  // y optionsText legible en castellano (el idioma de la barra). Como mucho 10 líneas, qty 1–10.
  function isMulti(o) { return o.multi === true || (o.multi === undefined && o.group === 'extras'); }
  function tx(o) { return o ? String(o.es || o.en || '') : ''; }
  function queueLines(cart) {
    return (cart || []).slice(0, MAX_LINES).map(function (l) {
      var options = {}, parts = [];
      (l.options || []).forEach(function (o) {
        if (isMulti(o)) options[o.group] = [].concat(options[o.group] || [], o.id); else options[o.group] = o.id;
        parts.push((isMulti(o) ? '+' : '') + tx(o.label).slice(0, 40));
      });
      return { id: String(l.id).slice(0, 40), name: tx(l.name).slice(0, 60), qty: Math.max(1, Math.min(MAX_QTY, l.qty | 0)), options: options, optionsText: parts.join(' · ').slice(0, 160) };
    });
  }
  // Mismo formato que el `action` del avatar: el quiosco se lo manda a la cara (da-context {order}) cuando el
  // cliente cambia el carrito o el nombre con el dedo, para que el avatar siga desde ahí.
  function cartDraft(cart, store, name) {
    var lines = (cart || []).map(function (l) {
      var o = {}; (l.options || []).forEach(function (x) { if (o[x.group] !== undefined) o[x.group] = [].concat(o[x.group], x.id); else o[x.group] = isMulti(x) ? [x.id] : x.id; });
      return { id: l.id, qty: l.qty, options: o };
    });
    var n = validName(name) ? cleanName(name) : '', missing = [];
    if (!lines.length) missing.push('lines'); if (!n) missing.push('customerName');
    var summary = (cart || []).map(function (l) { return l.qty + ' ' + tx(l.name) + ((l.options || []).length ? ' (' + l.options.map(function (o) { return tx(o.label); }).join(', ') + ')' : ''); }).join(' + ').slice(0, 300);
    return { type: 'order-draft', version: 1, store: store || '', lines: lines, customerName: n, ready: false, missing: missing, summary: summary };
  }
  // Índices de líneas nuevas o cambiadas (para el destello)
  function changedLines(prev, next) {
    var before = (prev || []).map(lineKey);
    return (next || []).reduce(function (a, l, i) { var k = before.indexOf(lineKey(l)); if (k < 0) a.push(i); else before.splice(k, 1); return a; }, []);
  }

  function level(v) { v = String(v || '').toLowerCase(); v = LEVEL_ALIAS[v] || v; return LEVELS[v] ? v : (/^(off|0|no|none)$/.test(v) ? 'off' : 'good'); }
  // Cara en modo pedido (contrato del cerebro, 7-oct-2026): ?mode=order&store=…&brand=…; good = la nube con
  // embed=1 (sin consola: el quiosco pone su propia caja de texto y su micro y le pregunta con da-ask).
  function avatarUrl(lv, ctx) {
    lv = LEVELS[lv] ? lv : 'good'; ctx = ctx || {};
    // embed=1&kiosk=1 (como cola/ipad.html): sin consola ni selector de evolución; el toque en la nube llega como da-tap
    var base = lv === 'good' ? 'https://digitalavatar.ai/nube.html?embed=1&kiosk=1' : LEVELS[lv], q = [];
    ['brand', 'store', 'lang', 'loc', 'sector', 'site'].forEach(function (k) { var v = String(ctx[k] || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (v) q.push(k + '=' + encodeURIComponent(v)); });
    q.push('mode=order', 'tier=' + lv, 'avatar=' + TIER_AVATAR[lv]);
    return base + '&' + q.join('&');
  }

  var api = { MAX_LINES: MAX_LINES, MAX_QTY: MAX_QTY, LEVELS: LEVELS, norm: norm, findItem: findItem, findChoice: findChoice,
    cleanName: cleanName, validName: validName, unitPrice: unitPrice, cartLine: cartLine, validateLine: validateLine,
    validateDraft: validateDraft, queueLines: queueLines, cartDraft: cartDraft, changedLines: changedLines,
    isAvatarOrigin: isAvatarOrigin, isHostOrigin: isHostOrigin, level: level, avatarUrl: avatarUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KioskoAvatar = api;
})(typeof window !== 'undefined' ? window : this);
