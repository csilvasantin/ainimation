/* demo-pedido.js — «/demo pedido»: una clienta simulada pide a Admirito de punta a punta (Carlos, 7-oct-2026).
 *
 * Se escribe «/demo pedido» (o «/demo order») en la caja del avatar: la primera vez arranca, la segunda la para.
 * Admirito saluda y pregunta; la clienta (Lucía / Lucy) contesta con voz de chica siguiendo un guion corto; cada
 * frase suya viaja a la cara como da-ask y las respuestas de Admirito son las REALES del cerebro en modo pedido.
 * Si el cerebro pregunta algo que el guion no cubre (missing:['leche']), la clienta lo rellena. Con ready:true
 * dice «Sí, confírmalo», la demo toca «Confirmar pedido» y «Pagar en barra», y Admirito cierra con el número.
 *
 * Piezas PURAS (sin DOM) que comparten el quiosco (index.html) y sus tests de node:
 *  - parseCommand(texto): ¿es el interruptor? → {cmd:'demo', target:'pedido'|'order'} | null
 *  - VOICES / voiceFor(quien, lang): voz de ElevenLabs de cada uno (vía el proxy /voz, con caché de 30 días)
 *  - script(lang) / gapText(menu, missing, lang): guion de la clienta y frases para rellenar huecos
 *  - planNext(state, draft, lang, menu): qué dice la clienta ahora (pura; el estado se devuelve, no se muta)
 *  - chunks(texto, max): trocea una frase larga para el proxy (máx. 240 caracteres por petición)
 *  - createDemo(deps): la máquina de estados (turnos, parada por toque o comando, fallo del cerebro).
 * Contrato: README.md («Demo de pedido»). */
(function (root) {
  'use strict';

  var MAX_TURNS = 6;            // frases de la clienta que llegan al cerebro (guion + huecos)
  var ASK_TIMEOUT = 30000;      // el cerebro con reintento puede tardar ~10 s; a los 30 s, aviso y fuera
  var MAX_TEXT = 240;           // tope del proxy /voz (mcp/server/src/voz.js: MAX_TEXTO)
  var VOZ_URL = 'https://mcp-ainimation.admira.store/voz';

  // Voces (ElevenLabs, eleven_multilingual_v2). La de Admirito es la de SIEMPRE en el quiosco: la que el cerebro
  // usa para su identidad (omnipublicity-api/src/avatar-voice.js: David Martin ES · Liam EN). La clienta es una
  // chica con voz nativa en cada idioma y distinta de la suya: Daniela (ES, ya en la lista del proxy, probada por
  // Carlos: joven, cálida y expresiva) y Sarah (EN, voz por defecto de la flota en el cerebro: joven y natural).
  var VOICES = {
    admirito: { es: { id: 'Nh2zY9kknu6z4pZy6FhD', name: 'David Martin' }, en: { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' } },
    customer: { es: { id: 'ajOR9IDAaubDK5qtLUqQ', name: 'Daniela' }, en: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' } }
  };
  function L(lang) { return lang === 'en' ? 'en' : 'es'; }
  function voiceFor(who, lang) { return (VOICES[who] || VOICES.admirito)[L(lang)]; }
  function vozUrl(who, lang, text) { return VOZ_URL + '?voz=' + voiceFor(who, lang).id + '&texto=' + encodeURIComponent(text); }

  // «/demo pedido» · «/demo order» (mayúsculas, espacios y «/ demo» dan igual). Nada más: «/demo» a secas sigue
  // siendo el pitch de 30 s del cerebro y no se intercepta.
  function parseCommand(text) {
    var m = String(text == null ? '' : text).trim().toLowerCase().match(/^\/\s*demo\s+(pedido|order)\s*$/);
    return m ? { cmd: 'demo', target: m[1] } : null;
  }

  var SCRIPTS = {
    es: {
      name: 'Lucía', who: 'Clienta', admirito: 'Admirito',
      open: '¡Hola! Soy Admirito. ¿Qué te apetece tomar hoy?',
      steps: [
        { kind: 'drink', text: 'Hola. Quería un caffè latte grande con leche de avena, por favor.', line: { id: 'caffe-latte', qty: 1, options: { tamano: 'grande', leche: 'avena' } } },
        { kind: 'extra', text: 'Y un croissant de mantequilla, por favor.', line: { id: 'croissant', qty: 1 } },
        { kind: 'name', text: 'A nombre de Lucía.' }
      ],
      confirm: 'Sí, confírmalo.',
      pay: 'Pago en barra.',
      enough: 'Nada más, gracias.',
      sayName: 'Me llamo Lucía.',
      generic: 'Lo que me recomiendes.',
      close: function (name, num) { return '¡Gracias, ' + name + '! Tu pedido es el ' + num + '. Te avisamos en la barra.'; },
      fail: { brain: 'Demo detenida: el cerebro no responde.', stuck: 'Demo detenida: el pedido no se completó.', confirm: 'Demo detenida: no apareció «¿Lo confirmo?».', pay: 'Demo detenida: no salió el número.', face: 'Demo detenida: el avatar no está disponible.' },
      badge: 'DEMO', hint: '/demo pedido para parar', thinking: 'Pensando…'
    },
    en: {
      name: 'Lucy', who: 'Customer', admirito: 'Admirito',
      open: "Hi! I'm Admirito. What would you like today?",
      steps: [
        { kind: 'drink', text: 'Hi. Could I get a grande caffè latte with oat milk, please?', line: { id: 'caffe-latte', qty: 1, options: { tamano: 'grande', leche: 'avena' } } },
        { kind: 'extra', text: 'And a butter croissant, please.', line: { id: 'croissant', qty: 1 } },
        { kind: 'name', text: "It's for Lucy." }
      ],
      confirm: 'Yes, please confirm it.',
      pay: "I'll pay at the counter.",
      enough: "That's all, thanks.",
      sayName: "My name's Lucy.",
      generic: 'Whatever you recommend.',
      close: function (name, num) { return 'Thank you, ' + name + '! Your order number is ' + num + ". We'll call you at the counter."; },
      fail: { brain: 'Demo stopped: the brain is not answering.', stuck: 'Demo stopped: the order was not completed.', confirm: 'Demo stopped: “Shall I confirm it?” did not show up.', pay: 'Demo stopped: no order number.', face: 'Demo stopped: the avatar is not available.' },
      badge: 'DEMO', hint: '/demo order to stop', thinking: 'Thinking…'
    }
  };
  function script(lang) { return SCRIPTS[L(lang)]; }
  // «A001» en voz se diría «A cero cero uno»: se dice «A 1» (como lo llama la barra); el bocadillo enseña «A001».
  function spell(num) {
    var m = String(num || '').match(/^([A-Z]{0,2})0*(\d+)$/);
    return m ? (m[1] ? m[1] + ' ' : '') + m[2] : String(num || '').slice(0, 12);
  }

  function tx(o, lang) { return o ? String(o[L(lang)] || o.es || o.en || '') : ''; }
  function findGroup(menu, gid) {
    var items = (menu && menu.items) || [];
    for (var i = 0; i < items.length; i++) {
      var gs = items[i].optionGroups || [];
      for (var j = 0; j < gs.length; j++) if (gs[j].id === gid) return gs[j];
    }
    return null;
  }
  var PLANT = { avena: 1, soja: 1, almendra: 1, coco: 1 };
  // Lo que la clienta QUERÍA (guion) para un grupo; si el guion no lo dice, el valor por defecto de la carta.
  function wanted(menu, gid, lang) {
    var steps = script(lang).steps;
    for (var i = 0; i < steps.length; i++) { var o = steps[i].line && steps[i].line.options; if (o && o[gid] != null) return o[gid]; }
    var g = findGroup(menu, gid);
    return g ? (g.default || (g.choices && g.choices[0] && g.choices[0].id) || null) : null;
  }
  // Frase que cubre lo que falta (missing de la cara, ya validado por el quiosco). Una por grupo, en orden.
  function gapText(menu, missing, lang) {
    lang = L(lang); var s = script(lang), out = [];
    (missing || []).forEach(function (gid) {
      if (gid === 'customerName') { out.push(s.sayName); return; }
      if (gid === 'lines') { out.push(s.steps[0].text); return; }
      var g = findGroup(menu, gid), cid = wanted(menu, gid, lang), ch = null;
      if (g && cid) for (var i = 0; i < (g.choices || []).length; i++) if (g.choices[i].id === cid) ch = g.choices[i];
      if (!ch) { out.push(s.generic); return; }
      var lab = tx(ch.label, lang).replace(/\s*\(.*?\)\s*/g, ' ').trim();
      if (gid === 'leche') out.push(lang === 'en' ? lab + ' milk, please.' : 'Con leche ' + (PLANT[cid] ? 'de ' : '') + lab.toLowerCase() + ', por favor.');
      else if (gid === 'tamano') out.push(lang === 'en' ? 'A ' + lab.toLowerCase() + ', please.' : lab + ', por favor.');
      else out.push(lang === 'en' ? lab + ', please.' : lab + ', por favor.');
    });
    var seen = {}; return out.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }).join(' ');
  }

  // Qué dice la clienta ahora. draft = el borrador del cerebro YA validado por el quiosco ({ready, missing,
  // customerName, lines}) o null si la respuesta no trajo pedido. state = {step, turns, gaps:{grupo:n}, enough}.
  // Devuelve {say:{kind,text,missing?}|null, state} sin mutar el estado de entrada.
  //  1) ready → confirmar (no va al cerebro: la demo toca «Confirmar pedido»).
  //  2) huecos de opciones (leche, tamaño…) → los rellena (cada grupo, como mucho 2 veces).
  //  3) siguiente paso del guion (el del nombre se salta si el cerebro ya lo tiene).
  //  4) solo falta el nombre / las líneas → lo dice; si no falta nada → «Nada más, gracias» una vez.
  //  5) nada más que decir → null (la demo se para con aviso).
  function planNext(state, draft, lang, menu) {
    var s = script(lang), st = { step: state.step | 0, turns: state.turns | 0, gaps: Object.assign({}, state.gaps || {}), enough: !!state.enough };
    var miss = (draft && draft.missing) || [];
    if (draft && draft.ready) return { say: { kind: 'confirm', text: s.confirm }, state: st };
    var opt = miss.filter(function (m) { return m !== 'customerName' && m !== 'lines' && (st.gaps[m] | 0) < 2; });
    if (opt.length && st.step > 0) {
      opt.forEach(function (m) { st.gaps[m] = (st.gaps[m] | 0) + 1; });
      return { say: { kind: 'gap', text: gapText(menu, opt, lang), missing: opt }, state: st };
    }
    while (st.step < s.steps.length) {
      var p = s.steps[st.step++];
      if (p.kind === 'name' && draft && draft.customerName) continue;
      return { say: { kind: p.kind, text: p.text }, state: st };
    }
    var rest = miss.filter(function (m) { return (m === 'customerName' || m === 'lines') && (st.gaps[m] | 0) < 2; });
    if (rest.length) { rest.forEach(function (m) { st.gaps[m] = (st.gaps[m] | 0) + 1; }); return { say: { kind: 'gap', text: gapText(menu, rest, lang), missing: rest }, state: st }; }
    if (!miss.length && !st.enough) { st.enough = true; return { say: { kind: 'enough', text: s.enough }, state: st }; }
    return { say: null, state: st };
  }

  // Trozos ≤ max por frases (y, si una frase sola no cabe, por palabras), para el proxy /voz.
  function chunks(text, max) {
    max = max || MAX_TEXT; text = String(text || '').replace(/\s+/g, ' ').trim(); if (!text) return [];
    if (text.length <= max) return [text];
    var parts = text.match(/[^.!?¡¿…]*[.!?…]+["»”')]*\s*|[^.!?…]+$/g) || [text], out = [], cur = '';
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > max) { var cut = p.lastIndexOf(' ', max); if (cut < max / 2) cut = max; if (cur) { out.push(cur); cur = ''; } out.push(p.slice(0, cut).trim()); p = p.slice(cut).trim(); }
      if ((cur ? cur.length + 1 : 0) + p.length > max) { out.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) out.push(cur);
    return out.filter(Boolean);
  }

  // ── Máquina de estados ──
  // deps (las pone el quiosco; los tests ponen falsas):
  //   lang() · menu() · prepare() → Promise (cara lista, sin voz propia, conversación nueva)
  //   speak(who, text) → Promise (termina cuando ACABA de sonar; nunca solapa: una sola voz a la vez)
  //   prefetch(who, text) · bubble(who, text|null, opts) · thinking(on)
  //   ask(text) → Promise<{answer, action, error}> (da-ask → da-answer) · validate(action) → draft | null
  //   tapConfirm() → Promise<bool> · tapCounter() → Promise<numero|null> · customerName() → nombre en el quiosco
  //   notice(msg) · cleanup(reason) (corta audio, limpia carrito, vuelve a la atracción) · finish() (cara con voz)
  //   wait(ms) · pause() → ms entre turnos (300–600)
  var STOPPED = { stopped: true };
  function createDemo(deps) {
    var st = { state: 'idle', token: 0, turns: 0, log: [], reason: null };
    var waiter = null;
    function set(s) { st.state = s; st.log.push({ state: s, at: Date.now() }); if (deps.onState) try { deps.onState(s); } catch (_) {} }
    function alive(tok) { if (tok !== st.token) throw STOPPED; }
    function active() { return st.state !== 'idle' && st.state !== 'done' && st.state !== 'stopped' && st.state !== 'failed'; }
    function wait(ms) { return deps.wait ? deps.wait(ms) : new Promise(function (r) { setTimeout(r, ms); }); }
    function pause() { return wait(deps.pause ? deps.pause() : 300 + Math.round(Math.random() * 300)); }
    function fail(kind, detail) { var e = new Error(kind); e.kind = kind; e.detail = detail; return e; }

    async function say(tok, who, text, spoken) {
      alive(tok); deps.bubble(who, text, { speaking: true }); st.log.push({ say: who, text: text, at: Date.now() });
      await deps.speak(who, spoken || text); alive(tok); deps.bubble(who, text, { speaking: false });
    }
    function ask(tok, text) {
      return new Promise(function (resolve, reject) {
        var done = false, t = setTimeout(function () { if (done) return; done = true; waiter = null; reject(fail('brain', 'timeout')); }, deps.askTimeout || ASK_TIMEOUT);
        waiter = function (d) { if (done) return; done = true; clearTimeout(t); waiter = null; resolve(d || {}); };
        st.cancelAsk = function () { if (done) return; done = true; clearTimeout(t); waiter = null; reject(STOPPED); };
        try { deps.ask(text); } catch (e) { done = true; clearTimeout(t); waiter = null; reject(fail('brain', String(e && e.message || e))); }
      }).then(function (d) { alive(tok); return d; });
    }

    async function run(tok) {
      var lang = deps.lang(), s = script(lang), menu = deps.menu ? deps.menu() : null;
      [s.open].concat(s.steps.map(function (x) { return x.text; }), [s.confirm, s.pay]).forEach(function (t, i) { deps.prefetch && deps.prefetch(i ? 'customer' : 'admirito', t); });
      set('starting'); await deps.prepare(); alive(tok);
      set('opening'); await say(tok, 'admirito', s.open);
      var plan = { step: 0, turns: 0, gaps: {} }, draft = null;
      for (;;) {
        var n = planNext(plan, draft, lang, menu); plan = n.state;
        if (!n.say) throw fail('stuck');
        if (n.say.kind === 'confirm') break;
        if (st.turns >= MAX_TURNS) throw fail('stuck', 'max-turns');
        set('customer'); await pause(); alive(tok); await say(tok, 'customer', n.say.text);
        st.turns++; set('thinking'); deps.thinking(true);
        var d = await ask(tok, n.say.text); deps.thinking(false);
        if (d.error || !String(d.answer || '').trim()) throw fail('brain', d.error || 'sin respuesta');
        var said = String(d.answer).replace(/\s+/g, ' ').trim();
        if (deps.prefetch) deps.prefetch('admirito', said); // su voz empieza a cargarse ya, durante la pausa
        var v = d.action && d.action.type === 'order-draft' ? deps.validate(d.action) : null;
        if (v) draft = v;
        var peek = planNext(plan, draft, lang, menu).say; // precarga la siguiente frase de la clienta mientras habla Admirito
        if (peek && deps.prefetch) deps.prefetch('customer', peek.text);
        set('admirito'); await pause(); alive(tok); await say(tok, 'admirito', said);
      }
      set('confirm'); await pause(); alive(tok); await say(tok, 'customer', s.confirm);
      if (!(await deps.tapConfirm())) throw fail('confirm'); alive(tok);
      set('pay'); await pause(); alive(tok); await say(tok, 'customer', s.pay);
      var num = await deps.tapCounter(); alive(tok); if (!num) throw fail('pay');
      set('closing'); await pause(); alive(tok);
      var name = (deps.customerName && deps.customerName()) || (draft && draft.customerName) || s.name;
      await say(tok, 'admirito', s.close(name, num), s.close(name, spell(num)));
      st.number = num; set('done'); if (deps.finish) deps.finish();
    }

    function start() {
      if (active()) return false;
      var tok = ++st.token; st.turns = 0; st.reason = null; st.number = null; st.log = [];
      st.run = run(tok).catch(function (e) {
        if (e === STOPPED || tok !== st.token) return;
        st.token++; waiter = null; deps.thinking(false);
        var s = script(deps.lang()); st.reason = e.kind || 'error'; set('failed');
        try { deps.cleanup('fallo'); } catch (_) {}
        try { deps.notice((s.fail[e.kind] || s.fail.brain), e); } catch (_) {}
      });
      return true;
    }
    function stop(reason) {
      if (!active()) return false;
      st.token++; st.reason = reason || 'comando'; if (st.cancelAsk) st.cancelAsk(); waiter = null;
      try { deps.thinking(false); } catch (_) {}
      set('stopped'); try { deps.cleanup(st.reason); } catch (_) {}
      return true;
    }
    function toggle(reason) { return active() ? (stop(reason || 'comando'), 'stopped') : (start() ? 'started' : 'busy'); }
    function onAnswer(d) { if (waiter) waiter(d); }
    return { start: start, stop: stop, toggle: toggle, onAnswer: onAnswer, active: active,
      get state() { return st.state; }, get turns() { return st.turns; }, get reason() { return st.reason; }, get log() { return st.log; }, get number() { return st.number; }, get run() { return st.run; } };
  }

  var api = { MAX_TURNS: MAX_TURNS, ASK_TIMEOUT: ASK_TIMEOUT, MAX_TEXT: MAX_TEXT, VOZ_URL: VOZ_URL, VOICES: VOICES,
    parseCommand: parseCommand, voiceFor: voiceFor, vozUrl: vozUrl, script: script, spell: spell, gapText: gapText,
    planNext: planNext, chunks: chunks, createDemo: createDemo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KioskoDemo = api;
})(typeof window !== 'undefined' ? window : this);
