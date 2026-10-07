/* ============================================================================
 * admingo.js — Admingo, el Lingo de AdmiraNeXT (ainimation.studio · 7-oct-2026)
 * ----------------------------------------------------------------------------
 * Lenguaje de autor bilingüe (ES/EN) para el Director de ainimation:
 *   lexer → parser descendente → AST → (1) reglas XPL cuando se puede
 *                                      (2) intérprete con caja de arena para el resto.
 * NADA de eval/Function/DOM: el intérprete solo habla con el mundo a través del
 * `host` (fact/act/goFrame/say/log), el mismo contrato que las reglas XPL.
 * Lo usan el Studio (xpl-studio.js) y la pieza publicada (PLAYER_JS), igual.
 * ========================================================================== */
(function (root) {
  "use strict";
  var MAX_STEPS = 10000, MAX_LOOP = 1000;

  /* ------------------------------------------------------------- lexer --- */
  function fold(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function lex(src) {
    var toks = [], line = 1, col = 1, i = 0, s = String(src || "").replace(/\r\n?/g, "\n");
    function push(t, v, extra) { var o = { t: t, v: v, line: line, col: col }; if (extra) for (var k in extra) o[k] = extra[k]; toks.push(o); }
    while (i < s.length) {
      var c = s[i];
      if (c === "-" && s[i + 1] === "-") { while (i < s.length && s[i] !== "\n") i++; continue; }
      if ((c === "¬" || c === "\\") && /^[ \t]*(--[^\n]*)?\n/.test(s.slice(i + 1))) { while (s[i] !== "\n") i++; i++; line++; col = 1; continue; }
      if (c === "\n") { push("NL", "\n"); i++; line++; col = 1; continue; }
      if (c === " " || c === "\t") { i++; col++; continue; }
      var start = i, scol = col;
      if (c === '"' || c === "“" || c === "«") {
        var close = c === '"' ? '"' : c === "“" ? "”" : "»"; i++; var str = "";
        while (i < s.length && s[i] !== close && s[i] !== "\n") str += s[i++];
        if (s[i] !== close) throw err("Texto sin cerrar: falta la comilla", "Unterminated string: missing quote", line, scol);
        i++; col += i - start; toks.push({ t: "STR", v: str, line: line, col: scol }); continue;
      }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1]))) {
        while (i < s.length && /[0-9.]/.test(s[i])) i++;
        toks.push({ t: "NUM", v: Number(s.slice(start, i)), line: line, col: scol }); col += i - start; continue;
      }
      if (/[A-Za-z_\u00c0-\u024f]/.test(c)) {
        while (i < s.length && /[A-Za-z0-9_\u00c0-\u024f]/.test(s[i])) i++;
        var w = s.slice(start, i); toks.push({ t: "ID", v: w, f: fold(w), line: line, col: scol }); col += i - start; continue;
      }
      var two = s.slice(i, i + 2);
      if (["<>", "<=", ">=", "&&", "=="].indexOf(two) >= 0) { toks.push({ t: "OP", v: two === "==" ? "=" : two, line: line, col: scol }); i += 2; col += 2; continue; }
      if ("+-*/=<>&()[],.:#".indexOf(c) >= 0) { toks.push({ t: "OP", v: c, line: line, col: scol }); i++; col++; continue; }
      throw err("Carácter inesperado «" + c + "»", "Unexpected character '" + c + "'", line, scol);
    }
    toks.push({ t: "NL", v: "\n", line: line, col: col }); toks.push({ t: "EOF", v: "", line: line, col: col });
    return toks;
  }
  function err(es, en, line, col) { var e = new Error(es); e.admingo = true; e.es = es; e.en = en; e.line = line; e.col = col; return e; }

  /* ----------------------------------------------- vocabulario bilingüe --- */
  // Cada frase en minúsculas sin tildes. Las más largas se prueban antes.
  var HEADERS = [
    ["on mouseup", "mouseUp"], ["al soltar", "mouseUp"], ["al tocar", "mouseUp"], ["on mousedown", "mouseDown"], ["al pulsar", "mouseDown"],
    ["on enterframe", "enterFrame"], ["al entrar en el fotograma", "enterFrame"], ["al entrar en fotograma", "enterFrame"],
    ["on exitframe", "exitFrame"], ["al salir del fotograma", "exitFrame"], ["on idle", "idle"], ["en reposo", "idle"],
    ["on startmovie", "startMovie"], ["al empezar la pelicula", "startMovie"], ["al iniciar la pelicula", "startMovie"],
    ["on orderpaid", "orderPaid"], ["al pagar", "orderPaid"]
  ];
  var FACT_NAMES = { ordernumber: "orderNumber", selecteditem: "selectedItem", selectedsize: "selectedSize", marker: "marker", idleseconds: "idleSeconds", cartcount: "cartCount", carttotal: "cartTotal", frame: "frame", orderpaid: "orderPaid", clickon: "click", lang: "lang",
    marca: "marker", fotograma: "frame", total: "cartTotal", idioma: "lang" };
  var FACT_PHRASES = [
    ["el numero del pedido", "orderNumber"], ["el numero de pedido", "orderNumber"], ["el producto elegido", "selectedItem"], ["la talla elegida", "selectedSize"],
    ["los segundos sin tocar", "idleSeconds"], ["los productos del carrito", "cartCount"], ["el total del carrito", "cartTotal"], ["el pedido pagado", "orderPaid"]
  ];
  var PROPS = { text: "text", texto: "text", visible: "visible", loc: "loc", posicion: "loc", blend: "blend", opacidad: "blend" };
  var THE = ["the", "el", "la", "los", "las"];
  var CANON = {
    endif: ["end if", "fin si"], endrepeat: ["end repeat", "fin repetir"], end: ["end", "fin"],
    elseif: ["else if", "si no si", "sino si"], else: ["else", "si no", "sino"], if: ["if", "si"], then: ["then", "entonces"],
    repwith: ["repeat with", "repetir con"], repwhile: ["repeat while", "repetir mientras"], downto: ["down to", "bajando hasta"], to: ["to", "hasta"],
    resetidle: ["start timer", "starttimer", "reiniciar reposo", "reiniciar el reposo"], exitrepeat: ["exit repeat", "salir de repetir"], nextrepeat: ["next repeat", "siguiente vuelta"], exit: ["exit", "salir"], pass: ["pass", "pasar"],
    global: ["global", "globales"], local: ["local"], put: ["put", "poner", "mensaje", "message"], into: ["into", "en"], set: ["set", "fijar"], setto: ["to", "a", "en", "="],
    stay: ["go to the frame", "go the frame", "quedarse", "ir al fotograma actual"], gomarker: ["go to marker", "go marker", "ir a la marca", "ir a marca"],
    goframe: ["go to frame", "go frame", "ir al fotograma"], goto: ["go to", "go", "ir a", "ir al"], stop: ["stop", "parar", "detener"],
    addcart: ["add to cart", "anadir al carrito", "agregar al carrito"], size: ["size", "talla", "tamano"], clearcart: ["clear cart", "clear the cart", "vaciar el carrito", "vaciar carrito"],
    checkout: ["open checkout", "abrir el pago", "abrir pago"], counter: ["pay at counter", "cobrar en barra", "pagar en barra"],
    sound: ["play sound", "reproducir sonido", "sonar"], url: ["open url", "abrir url", "abrir la direccion"], say: ["say", "decir"],
    and: ["and", "y"], or: ["or", "o"], not: ["not", "no"], mod: ["mod"], true: ["true", "verdadero", "cierto"], false: ["false", "falso"],
    ofsprite: ["of sprite", "del sprite", "de sprite"], sprite: ["sprite"], me: ["me", "yo"]
  };
  function phraseWords(p) { return p.split(" "); }

  /* ------------------------------------------------------------ parser --- */
  function parse(src, scope) {
    var toks, p = 0, errors = [];
    try { toks = lex(src); } catch (e) { return { handlers: {}, globals: [], errors: [toErr(e)] }; }
    function peek(o) { return toks[p + (o || 0)]; }
    function matchAt(words, at) {
      for (var k = 0; k < words.length; k++) { var t = toks[at + k]; if (!t || (t.t !== "ID" && !(t.t === "OP" && t.v === words[k]))) return false; if (t.t === "ID" && t.f !== words[k]) return false; }
      return true;
    }
    function accept(name) { var list = CANON[name]; for (var k = 0; k < list.length; k++) { var w = phraseWords(list[k]); if (matchAt(w, p)) { p += w.length; return true; } } return false; }
    function is(name) { var list = CANON[name]; for (var k = 0; k < list.length; k++) if (matchAt(phraseWords(list[k]), p)) return true; return false; }
    function fail(es, en) { var t = peek(); throw err(es, en, t.line, t.col); }
    function expect(name, es, en) { if (!accept(name)) fail(es, en); }
    function eol() { if (peek().t !== "NL" && peek().t !== "EOF") fail("Sobra algo al final de la línea: «" + peek().v + "»", "Unexpected '" + peek().v + "' at end of line"); while (peek().t === "NL") p++; }
    function skipNL() { while (peek().t === "NL") p++; }
    var handlers = {}, globals = [];
    skipNL();
    while (peek().t !== "EOF") {
      try {
        if (accept("global")) { idList().forEach(function (n) { globals.push(n); }); eol(); continue; }
        var h = header(); if (!h) fail("Se esperaba un manejador («al soltar», «on mouseUp», «en reposo»…)", "Expected a handler ('on mouseUp', 'on idle'…)");
        var body = block(["end"]);
        if (!accept("end")) fail("Falta «fin» del manejador «" + h.name + "»", "Missing 'end' for handler '" + h.name + "'");
        if (peek().t === "ID") p++; // «end mouseUp»
        eol();
        h.body = body; h.scope = scope || "movie"; handlers[h.name.toLowerCase()] = h;
      } catch (e) {
        if (!e.admingo) throw e;
        errors.push(toErr(e));
        while (peek().t !== "EOF" && !(peek().t === "NL" && (header(true) || false))) p++;
        skipNL();
      }
    }
    return { handlers: handlers, globals: globals, errors: errors };

    function header(probe) {
      var save = p;
      if (probe) p++;
      for (var k = 0; k < HEADERS.length; k++) { var w = phraseWords(HEADERS[k][0]); if (matchAt(w, p)) { if (probe) { p = save; return true; } p += w.length; var hh = { name: HEADERS[k][1], line: toks[p - 1].line, params: [] }; eol(); return hh; } }
      if (peek().t === "ID" && (peek().f === "on" || peek().f === "al") && peek(1).t === "ID") {
        if (probe) { p = save; return true; }
        p++; var nm = peek().v; var ln = peek().line; p++; var params = peek().t === "ID" ? idList() : []; eol(); return { name: nm, line: ln, params: params };
      }
      if (probe) p = save;
      return null;
    }
    function idList() { var out = []; do { if (peek().t !== "ID") fail("Se esperaba un nombre", "Expected a name"); out.push(peek().v); p++; } while (peek().v === "," && ++p); return out; }
    function block(stops, open) {
      var out = [];
      skipNL();
      while (peek().t !== "EOF") {
        if (open && is("end") && !stops.some(function (s) { return is(s); })) fail("Falta «" + open.es + "» para el «" + open.kw + "» de la línea " + open.line, "Missing '" + open.en + "' for the '" + open.kw + "' on line " + open.line);
        if (stops.some(function (s) { return is(s); })) {
          // «fin» del manejador no debe cortar un «fin si» / «fin repetir»
          if (stops.indexOf("end") >= 0 && (is("endif") || is("endrepeat")) && stops.length === 1) { fail("«" + peek().v + "» sin abrir", "Unmatched '" + peek().v + "'"); }
          break;
        }
        out.push(statement()); skipNL();
      }
      return out;
    }
    function statement() {
      var t = peek(), line = t.line, n;
      if (accept("if")) return ifStmt(line);
      if (accept("repwith")) {
        var v = peek().v; if (peek().t !== "ID") fail("Se esperaba la variable del bucle", "Expected loop variable"); p++;
        if (!(peek().v === "=")) fail("Se esperaba «=»", "Expected '='"); p++;
        var from = expr(), down = false; if (accept("downto")) down = true; else expect("to", "Se esperaba «hasta»", "Expected 'to'");
        var to = expr(); eol(); var body = block(["endrepeat"], { es: "fin repetir", en: "end repeat", kw: t.v, line: line }); expect("endrepeat", "Falta «fin repetir»", "Missing 'end repeat'"); eol();
        return { k: "repwith", v: v, from: from, to: to, down: down, body: body, line: line };
      }
      if (accept("repwhile")) { var c = expr(); eol(); var b = block(["endrepeat"], { es: "fin repetir", en: "end repeat", kw: t.v, line: line }); expect("endrepeat", "Falta «fin repetir»", "Missing 'end repeat'"); eol(); return { k: "repwhile", c: c, body: b, line: line }; }
      if (accept("exitrepeat")) { eol(); return { k: "exitrepeat", line: line }; }
      if (accept("nextrepeat")) { eol(); return { k: "nextrepeat", line: line }; }
      if (accept("exit")) { eol(); return { k: "exit", line: line }; }
      if (accept("pass")) { eol(); return { k: "pass", line: line }; }
      if (accept("global")) { n = { k: "global", names: idList(), line: line }; eol(); return n; }
      if (accept("local")) { n = { k: "local", names: idList(), line: line }; eol(); return n; }
      n = simple(line); eol(); return n;
    }
    function simple(line) {
      if (accept("stay")) return { k: "stay", line: line };
      if (accept("gomarker")) return { k: "gomarker", e: expr(), line: line };
      if (accept("goframe")) return { k: "goframe", e: expr(), line: line };
      if (accept("goto")) return { k: "goto", e: expr(), line: line };
      if (accept("stop")) return { k: "act", id: "stop", line: line };
      if (accept("addcart")) { var it = null, sz = null; if (!endOfStmt()) { it = expr(); if (accept("size")) sz = expr(); } return { k: "addcart", item: it, size: sz, line: line }; }
      if (accept("clearcart")) return { k: "act", id: "clearCart", line: line };
      if (accept("checkout")) return { k: "act", id: "openCheckout", line: line };
      if (accept("counter")) return { k: "act", id: "payAtCounter", line: line };
      if (accept("sound")) return { k: "act", id: "playSound", e: expr(), line: line };
      if (accept("url")) return { k: "act", id: "openUrl", e: expr(), line: line };
      if (accept("say")) return { k: "say", e: expr(), line: line };
      if (accept("resetidle")) return { k: "act", id: "resetIdle", line: line };
      // «poner X en v» (put) / «poner v a X» (set) — se decide por la forma
      if (accept("set")) {
        var target = lvalue(); if (accept("setto")) return { k: "set", target: target, e: expr(), line: line };
        fail("Se esperaba «fijar X a valor»", "Expected 'set X to value'");
      }
      if (accept("put")) { var e2 = expr(); if (accept("into")) return { k: "set", target: lvalue(), e: e2, line: line }; return { k: "put", e: e2, line: line }; }
      // asignación corta «x = 3» o llamada a manejador «miManejador 1, 2»
      if (peek().t === "ID" && peek(1).v === "=") { var name = peek().v; p += 2; return { k: "set", target: { k: "var", name: name }, e: expr(), line: line }; }
      if (peek().t === "ID" && !isKeyword(peek().f)) {
        var callee = peek().v; p++; var args = [];
        if (!endOfStmt()) { do { args.push(expr()); } while (peek().v === "," && ++p); }
        return { k: "call", name: callee, args: args, line: line };
      }
      fail("No entiendo «" + peek().v + "»", "I don't understand '" + peek().v + "'");
    }
    function endOfStmt() { return peek().t === "NL" || peek().t === "EOF" || is("else") || is("elseif"); }
    function isKeyword(f) { for (var k in CANON) if (CANON[k].some(function (ph) { return ph.split(" ")[0] === f && ph.indexOf(" ") < 0; })) return true; return false; }
    function ifStmt(line) {
      var c = expr(); expect("then", "Falta «entonces»", "Missing 'then'");
      if (peek().t !== "NL") { // una línea: «si c entonces sentencia [si no sentencia]»
        var th = [simpleOrCtl(line)], el = []; if (accept("else")) el = [simpleOrCtl(line)];
        return { k: "if", c: c, then: th, else: el, line: line };
      }
      eol(); var open = { es: "fin si", en: "end if", kw: "si/if", line: line }; var thenB = block(["endif", "else", "elseif"], open), elseB = [];
      if (accept("elseif")) { elseB = [ifStmt(peek().line)]; return { k: "if", c: c, then: thenB, else: elseB, line: line }; }
      if (accept("else")) { if (peek().t !== "NL") { elseB = [statementInline()]; } else { eol(); elseB = block(["endif"], open); } }
      expect("endif", "Falta «fin si»", "Missing 'end if'"); eol();
      return { k: "if", c: c, then: thenB, else: elseB, line: line };
    }
    function statementInline() { var l = peek().line; if (accept("if")) return ifStmt(l); return simpleOrCtl(l); }
    function simpleOrCtl(line) {
      if (accept("exitrepeat")) return { k: "exitrepeat", line: line };
      if (accept("exit")) return { k: "exit", line: line };
      if (accept("pass")) return { k: "pass", line: line };
      return simple(line);
    }
    function lvalue() {
      if (THE.indexOf(peek().f) >= 0 && peek(1).t === "ID" && PROPS[peek(1).f]) {
        var save = p; p++; var prop = PROPS[peek().f]; p++;
        if (accept("ofsprite")) return { k: "prop", prop: prop, sprite: primary() };
        p = save;
      }
      if (is("sprite") && peek(1).v === "(") { var s = primary(); if (s.k === "prop") return s; fail("Falta «.propiedad»", "Missing '.property'"); }
      if (is("me")) { p++; if (peek().v === ".") { p++; var pr = PROPS[peek().f]; p++; return { k: "prop", prop: pr, sprite: { k: "me" } }; } }
      if (peek().t !== "ID") fail("Se esperaba una variable o propiedad", "Expected a variable or property");
      var name = peek().v; p++; return { k: "var", name: name };
    }
    /* expresiones */
    function expr() { return orE(); }
    function orE() { var l = andE(); while (accept("or")) l = { k: "bin", op: "or", l: l, r: andE() }; return l; }
    function andE() { var l = notE(); while (accept("and")) l = { k: "bin", op: "and", l: l, r: notE() }; return l; }
    function notE() { if (accept("not")) return { k: "not", e: notE() }; return cmpE(); }
    function cmpE() { var l = catE(); var o = peek(); if (o.t === "OP" && ["=", "<>", "<", ">", "<=", ">="].indexOf(o.v) >= 0) { p++; return { k: "bin", op: o.v, l: l, r: catE() }; } return l; }
    function catE() { var l = addE(); while (peek().v === "&" || peek().v === "&&") { var op = peek().v; p++; l = { k: "bin", op: op, l: l, r: addE() }; } return l; }
    function addE() { var l = mulE(); while (peek().t === "OP" && (peek().v === "+" || peek().v === "-")) { var op = peek().v; p++; l = { k: "bin", op: op, l: l, r: mulE() }; } return l; }
    function mulE() { var l = unE(); while ((peek().t === "OP" && (peek().v === "*" || peek().v === "/")) || is("mod")) { var op = peek().t === "OP" ? peek().v : "mod"; p++; l = { k: "bin", op: op, l: l, r: unE() }; } return l; }
    function unE() { if (peek().v === "-" && peek().t === "OP") { p++; return { k: "neg", e: unE() }; } return primary(); }
    function primary() {
      var t = peek();
      if (t.t === "NUM") { p++; return { k: "lit", v: t.v }; }
      if (t.t === "STR") { p++; return { k: "lit", v: t.v }; }
      if (t.v === "(" && t.t === "OP") { p++; var e = expr(); if (peek().v !== ")") fail("Falta «)»", "Missing ')'"); p++; return e; }
      if (t.v === "[" && t.t === "OP") { p++; var items = []; if (peek().v !== "]") { do { if (peek().v === "#") { p++; var key = peek().v; p++; if (peek().v !== ":") fail("Falta «:»", "Missing ':'"); p++; items.push({ key: key, e: expr() }); } else items.push({ e: expr() }); } while (peek().v === "," && ++p); } if (peek().v !== "]") fail("Falta «]»", "Missing ']'"); p++; return { k: "list", items: items }; }
      if (accept("true")) return { k: "lit", v: true };
      if (accept("false")) return { k: "lit", v: false };
      for (var k = 0; k < FACT_PHRASES.length; k++) { var w = phraseWords(FACT_PHRASES[k][0]); if (matchAt(w, p)) { p += w.length; return { k: "fact", id: FACT_PHRASES[k][1] }; } }
      if (t.t === "ID" && THE.indexOf(t.f) >= 0 && peek(1).t === "ID") {
        var nf = peek(1).f;
        if (PROPS[nf] && matchAnyAt(CANON.ofsprite, p + 2)) { p += 2; accept("ofsprite"); return { k: "prop", prop: PROPS[nf], sprite: primary() }; }
        if (FACT_NAMES[nf]) { p += 2; return { k: "fact", id: FACT_NAMES[nf] }; }
        fail("No conozco «the " + peek(1).v + "»", "Unknown 'the " + peek(1).v + "'");
      }
      if (is("sprite") && peek(1).v === "(") { p += 2; var se = expr(); if (peek().v !== ")") fail("Falta «)»", "Missing ')'"); p++; var node = { k: "spriteRef", e: se }; if (peek().v === ".") { p++; var pf = peek().f; if (!PROPS[pf]) fail("Propiedad desconocida «" + peek().v + "»", "Unknown property '" + peek().v + "'"); p++; return { k: "prop", prop: PROPS[pf], sprite: node }; } return node; }
      if (is("me")) { p++; if (peek().v === ".") { p++; var pm = PROPS[peek().f]; p++; return { k: "prop", prop: pm, sprite: { k: "me" } }; } return { k: "me" }; }
      if (t.t === "ID") { p++; if (peek().v === "(" && peek().t === "OP") { p++; var args = []; if (peek().v !== ")") { do { args.push(expr()); } while (peek().v === "," && ++p); } if (peek().v !== ")") fail("Falta «)»", "Missing ')'"); p++; return { k: "fn", name: t.f, args: args }; } return { k: "var", name: t.v }; }
      fail("Se esperaba un valor y hay «" + (t.v === "\n" ? "fin de línea" : t.v) + "»", "Expected a value, found '" + (t.v === "\n" ? "end of line" : t.v) + "'");
    }
    function matchAnyAt(list, at) { return list.some(function (ph) { return matchAt(phraseWords(ph), at); }); }
  }
  function toErr(e) { return { line: e.line || 1, col: e.col || 1, es: e.es || String(e.message), en: e.en || String(e.message) }; }

  /* -------------------------------------- scripts del plan → programa --- */
  // plan.scripts = { movie: "...", frames: { MARCA: "..." }, sprites: { nombreSprite: "..." } }
  function compileScripts(scripts) {
    scripts = scripts || {};
    var prog = { movie: null, frames: {}, sprites: {}, globals: [], errors: [], rules: [] };
    function one(src, scope, key) {
      if (!src || !String(src).trim()) return null;
      var r = parse(src, scope);
      r.errors.forEach(function (e) { prog.errors.push({ scope: scope, key: key || "", line: e.line, col: e.col, es: e.es, en: e.en }); });
      prog.globals = prog.globals.concat(r.globals);
      return r;
    }
    prog.movie = one(scripts.movie, "movie");
    Object.keys(scripts.frames || {}).forEach(function (k) { var r = one(scripts.frames[k], "frame", k); if (r) prog.frames[k] = r; });
    Object.keys(scripts.sprites || {}).forEach(function (k) { var r = one(scripts.sprites[k], "sprite", k); if (r) prog.sprites[k] = r; });
    // Bajada a XPL: «al soltar» de un sprite con solo acciones conocidas y literales
    Object.keys(prog.sprites).forEach(function (name) {
      var h = prog.sprites[name].handlers.mouseup; if (!h) return;
      var acts = toXpl(h.body); if (!acts) return;
      h.compiled = true;
      prog.rules.push({ id: "adm-" + name + "-mouseUp", name: "Admingo · " + name + " · mouseUp", enabled: true, origin: "admingo", when: { join: "and", conds: [{ fact: "click", value: name }] }, do: acts });
    });
    return prog;
  }
  function toXpl(body) {
    var out = [];
    for (var i = 0; i < body.length; i++) {
      var s = body[i], lit = s.e && s.e.k === "lit" ? s.e.v : undefined;
      if (s.k === "gomarker" && typeof lit === "string") out.push({ id: "goToMarker", value: lit });
      else if (s.k === "goto" && typeof lit === "string") out.push({ id: "goToMarker", value: lit });
      else if (s.k === "act" && !s.e && ["stop", "clearCart", "payAtCounter"].indexOf(s.id) >= 0) out.push({ id: s.id });
      else if (s.k === "act" && s.id === "playSound" && typeof lit === "string") out.push({ id: "playSound", value: lit });
      else if (s.k === "set" && s.target.k === "prop" && s.target.prop === "visible" && s.target.sprite.k === "spriteRef" && s.target.sprite.e.k === "lit" && s.e.k === "lit") out.push({ id: s.e.v ? "showCast" : "hideCast", value: s.target.sprite.e.v });
      else return null;
    }
    return out.length ? out : null;
  }
  // El script gana: las reglas del autor que escuchan el MISMO clic que un manejador se apagan
  function mergeRules(prog, rules) {
    var handled = {};
    Object.keys(prog.sprites).forEach(function (n) { if (prog.sprites[n].handlers.mouseup) handled[n] = true; });
    var mouseMovie = prog.movie && prog.movie.handlers.mouseup;
    var kept = (rules || []).filter(function (r) {
      var conds = (r.when && r.when.conds) || [];
      return !conds.some(function (c) { return c.fact === "click" && (handled[c.value] || mouseMovie); });
    });
    return kept.concat(prog.rules);
  }

  /* ------------------------------------------------------ intérprete --- */
  function Ctl(kind) { this.kind = kind; }
  function createVM(scripts, host) {
    var prog = compileScripts(scripts);
    var globals = {}, isGlobal = {}, visible = {}, texts = {}, started = false, lastFrame = null, wasPaid = false, inFirst = true, lastIdleTick = 0;
    prog.globals.forEach(function (g) { isGlobal[g.toLowerCase()] = true; });
    function lg(s) { return String(s).toLowerCase(); }
    function markers() { return (host.markers && host.markers() || []).slice().sort(function (a, b) { return a.frame - b.frame; }); }
    function markerAt(f) { var m = markers(), cur = ""; for (var i = 0; i < m.length; i++) if (m[i].frame <= f) cur = m[i].label; return cur; }
    function fact(id) {
      if (id === "marker") return markerAt(Number(host.frame()));
      if (id === "frame") return Number(host.frame());
      var v = host.fact(id);
      if (v === undefined || v === null) return id === "cartCount" || id === "idleSeconds" || id === "cartTotal" ? 0 : id === "orderPaid" ? false : "";
      return v;
    }
    function resetGlobals() { globals = {}; }
    function num(v) { if (typeof v === "number") return v; if (typeof v === "boolean") return v ? 1 : 0; var n = Number(v); return isNaN(n) ? 0 : n; }
    function str(v) { if (v === null || v === undefined) return ""; if (typeof v === "number") return String(Math.round(v * 1000) / 1000).replace(".", host.lang && host.lang() === "en" ? "." : ","); if (typeof v === "boolean") return v ? "TRUE" : "FALSE"; if (Array.isArray(v)) return "[" + v.map(str).join(", ") + "]"; return String(v); }
    function truthy(v) { return !(v === false || v === 0 || v === "" || v === null || v === undefined || (typeof v === "string" && /^(false|falso)$/i.test(v))); }
    function eq(a, b) { if (typeof a === "number" || typeof b === "number") { if (!isNaN(Number(a)) && !isNaN(Number(b)) && a !== "" && b !== "") return Number(a) === Number(b); } if (typeof a === "boolean" || typeof b === "boolean") return truthy(a) === truthy(b); return lg(str(a)) === lg(str(b)); }
    var FN = {
      length: function (a) { return Array.isArray(a[0]) ? a[0].length : str(a[0]).length; }, random: function (a) { return 1 + Math.floor(Math.random() * Math.max(1, num(a[0]))); },
      integer: function (a) { return Math.round(num(a[0])); }, string: function (a) { return str(a[0]); }, abs: function (a) { return Math.abs(num(a[0])); },
      min: function (a) { return Math.min.apply(null, a.map(num)); }, max: function (a) { return Math.max.apply(null, a.map(num)); },
      format: function (a) { var n = num(a[0]), cur = a[1] == null ? "€" : str(a[1]); return n.toFixed(2).replace(".", host.lang && host.lang() === "en" ? "." : ",") + (cur ? " " + cur : ""); },
      upper: function (a) { return str(a[0]).toUpperCase(); }, mayusculas: function (a) { return str(a[0]).toUpperCase(); }, longitud: function (a) { return FN.length(a); }, azar: function (a) { return FN.random(a); }
    };
    function run(handler, ctx) {
      ctx.steps = 0;
      try { execBlock(handler.body, ctx); return ctx.passed ? "pass" : "done"; }
      catch (e) {
        if (e instanceof Ctl) return e.kind === "pass" ? "pass" : "done";
        var line = e.line || ctx.line || handler.line;
        host.log && host.log({ level: "error", es: (e.es || e.message) + " (línea " + line + ")", en: (e.en || e.message) + " (line " + line + ")", scope: handler.scope, line: line });
        return "error";
      }
    }
    function execBlock(list, ctx) { for (var i = 0; i < list.length; i++) exec(list[i], ctx); }
    function step(ctx, s) { ctx.line = s.line; if (++ctx.steps > MAX_STEPS) throw err("Demasiados pasos: ¿un bucle sin fin?", "Too many steps: an endless loop?", s.line); }
    function spriteName(node, ctx) { if (node.k === "me") return ctx.me || ""; if (node.k === "spriteRef") return str(ev(node.e, ctx)); return str(ev(node, ctx)); }
    function setVar(name, v, ctx) { var k = lg(name); if (isGlobal[k] || ctx.globalsHere[k]) globals[k] = v; else ctx.locals[k] = v; }
    function getVar(name, ctx) { var k = lg(name); if (k in ctx.locals && !ctx.globalsHere[k] && !isGlobal[k]) return ctx.locals[k]; if (k in globals) return globals[k]; if (k in ctx.locals) return ctx.locals[k]; return null; }
    function exec(s, ctx) {
      step(ctx, s);
      switch (s.k) {
        case "if": execBlock(truthy(ev(s.c, ctx)) ? s.then : s.else, ctx); return;
        case "repwith": {
          var a = num(ev(s.from, ctx)), b = num(ev(s.to, ctx)), n = 0;
          for (var i = a; s.down ? i >= b : i <= b; i += s.down ? -1 : 1) {
            if (++n > MAX_LOOP) throw err("Bucle de más de " + MAX_LOOP + " vueltas", "Loop over " + MAX_LOOP + " turns", s.line);
            setVar(s.v, i, ctx);
            try { execBlock(s.body, ctx); } catch (e) { if (e instanceof Ctl && e.kind === "exitrepeat") break; if (e instanceof Ctl && e.kind === "nextrepeat") continue; throw e; }
          }
          return;
        }
        case "repwhile": { var m = 0; while (truthy(ev(s.c, ctx))) { if (++m > MAX_LOOP) throw err("Bucle de más de " + MAX_LOOP + " vueltas", "Loop over " + MAX_LOOP + " turns", s.line); try { execBlock(s.body, ctx); } catch (e) { if (e instanceof Ctl && e.kind === "exitrepeat") break; if (e instanceof Ctl && e.kind === "nextrepeat") continue; throw e; } } return; }
        case "exitrepeat": throw new Ctl("exitrepeat");
        case "nextrepeat": throw new Ctl("nextrepeat");
        case "exit": throw new Ctl("exit");
        case "pass": ctx.passed = true; throw new Ctl("pass");
        case "global": s.names.forEach(function (n) { ctx.globalsHere[lg(n)] = true; }); return;
        case "local": s.names.forEach(function (n) { ctx.locals[lg(n)] = null; }); return;
        case "put": host.log && host.log({ level: "out", text: str(ev(s.e, ctx)) }); return;
        case "set": {
          var v = ev(s.e, ctx);
          if (s.target.k === "var") return setVar(s.target.name, v, ctx);
          var sp = spriteName(s.target.sprite, ctx);
          if (s.target.prop === "text") { texts[sp] = str(v); host.act("setText", sp, str(v)); return; }
          if (s.target.prop === "visible") { visible[sp] = truthy(v); host.act(truthy(v) ? "showCast" : "hideCast", sp); return; }
          if (s.target.prop === "loc" || s.target.prop === "blend") { host.setProp ? host.setProp(sp, s.target.prop, v) : null; return; }
          return;
        }
        case "stay": host.stay(); return;
        case "gomarker": host.act("goToMarker", str(ev(s.e, ctx))); return;
        case "goframe": host.goFrame(num(ev(s.e, ctx))); return;
        case "goto": { var g = ev(s.e, ctx); if (typeof g === "number") host.goFrame(g); else host.act("goToMarker", str(g)); return; }
        case "addcart": host.act("addToCart", s.item ? { item: str(ev(s.item, ctx)), size: s.size ? str(ev(s.size, ctx)) : "" } : ""); return;
        case "act": host.act(s.id, s.e ? str(ev(s.e, ctx)) : ""); return;
        case "say": host.say(str(ev(s.e, ctx))); return;
        case "call": {
          var h = findHandler(s.name, ctx);
          if (!h) throw err("No existe el manejador «" + s.name + "»", "No handler named '" + s.name + "'", s.line);
          var sub = { locals: {}, globalsHere: {}, me: ctx.me, steps: ctx.steps };
          (h.params || []).forEach(function (pn, k) { sub.locals[lg(pn)] = s.args[k] ? ev(s.args[k], ctx) : null; });
          try { execBlock(h.body, sub); } catch (e) { if (!(e instanceof Ctl)) throw e; }
          ctx.steps = sub.steps; return;
        }
      }
    }
    function findHandler(name, ctx) {
      var k = lg(name), m = ctx.me && prog.sprites[ctx.me];
      if (m && m.handlers[k]) return m.handlers[k];
      var fr = prog.frames[markerAt(Number(host.frame()))]; if (fr && fr.handlers[k]) return fr.handlers[k];
      return prog.movie && prog.movie.handlers[k] || null;
    }
    function ev(e, ctx) {
      switch (e.k) {
        case "lit": return e.v;
        case "list": return e.items.map(function (it) { return ev(it.e, ctx); });
        case "var": return getVar(e.name, ctx);
        case "fact": return fact(e.id);
        case "me": return ctx.me || "";
        case "spriteRef": return str(ev(e.e, ctx));
        case "prop": {
          var sp = spriteName(e.sprite, ctx);
          if (e.prop === "text") return sp in texts ? texts[sp] : (host.spriteText ? host.spriteText(sp) : "");
          if (e.prop === "visible") return sp in visible ? visible[sp] : true;
          return host.getProp ? host.getProp(sp, e.prop) : 0;
        }
        case "not": return !truthy(ev(e.e, ctx));
        case "neg": return -num(ev(e.e, ctx));
        case "fn": { var f = FN[e.name]; if (!f) throw err("Función desconocida «" + e.name + "»", "Unknown function '" + e.name + "'", ctx.line); return f(e.args.map(function (a) { return ev(a, ctx); })); }
        case "bin": {
          if (e.op === "and") return truthy(ev(e.l, ctx)) && truthy(ev(e.r, ctx));
          if (e.op === "or") return truthy(ev(e.l, ctx)) || truthy(ev(e.r, ctx));
          var l = ev(e.l, ctx), r = ev(e.r, ctx);
          switch (e.op) {
            case "&": return str(l) + str(r); case "&&": return str(l) + " " + str(r);
            case "+": return num(l) + num(r); case "-": return num(l) - num(r); case "*": return num(l) * num(r);
            case "/": if (num(r) === 0) throw err("División por cero", "Division by zero", ctx.line); return num(l) / num(r);
            case "mod": return num(l) % num(r);
            case "=": return eq(l, r); case "<>": return !eq(l, r);
            case "<": return num(l) < num(r); case ">": return num(l) > num(r); case "<=": return num(l) <= num(r); case ">=": return num(l) >= num(r);
          }
        }
      }
      return null;
    }
    // Despacho como Lingo: sprite → fotograma (marca actual) → película; «pasar» sigue subiendo
    function dispatch(event, sprite) {
      var k = lg(event), chain = [];
      if (sprite && prog.sprites[sprite] && prog.sprites[sprite].handlers[k]) chain.push({ h: prog.sprites[sprite].handlers[k], me: sprite });
      var fr = prog.frames[markerAt(Number(host.frame()))]; if (fr && fr.handlers[k]) chain.push({ h: fr.handlers[k], me: sprite });
      if (prog.movie && prog.movie.handlers[k]) chain.push({ h: prog.movie.handlers[k], me: sprite });
      for (var i = 0; i < chain.length; i++) {
        if (chain[i].h.compiled) return true; // lo ejecuta la regla XPL equivalente
        var r = run(chain[i].h, { locals: {}, globalsHere: {}, me: chain[i].me });
        if (r !== "pass") return true;
      }
      return chain.length > 0;
    }
    function firstSegmentEnd() { var m = markers(); return m.length > 1 ? m[1].frame : Infinity; }
    var api = {
      program: prog, errors: prog.errors, globals: function () { return globals; },
      mergeRules: function (rules) { return mergeRules(prog, rules); },
      // ¿el toque «añadir» de este sprite lo hace el script (y no el quiosco solo)?
      defersAdd: function (name) { var h = prog.sprites[name] && prog.sprites[name].handlers.mouseup; return !!(h && !h.compiled && JSON.stringify(h.body).indexOf('"addcart"') >= 0); },
      handles: function (event, sprite) { var k = lg(event); return !!((sprite && prog.sprites[sprite] && prog.sprites[sprite].handlers[k]) || (prog.movie && prog.movie.handlers[k])); },
      dispatch: dispatch,
      tick: function (bus) {
        bus = bus || {};
        var f = Number(host.frame());
        if (!started) { started = true; resetGlobals(); lastFrame = f; dispatch("startMovie"); wasPaid = !!truthy(fact("orderPaid")); }
        f = Number(host.frame());
        if (f !== lastFrame) {
          var prev = lastFrame; lastFrame = f;
          if (f > prev && f - prev <= 6) { // la reproducción avanza (no es un salto): sale del fotograma anterior
            var hold = { f: prev, held: false }; api._hold = hold;
            dispatch("exitFrame");
            api._hold = null;
          }
          if (Number(host.frame()) === f) dispatch("enterFrame");
        }
        // sesión nueva del quiosco: volver al primer tramo reinicia las globales
        var nowFirst = Number(host.frame()) < firstSegmentEnd();
        if (nowFirst && !inFirst) resetGlobals();
        inFirst = nowFirst;
        if (bus.click) dispatch("mouseUp", bus.click);
        var paid = !!truthy(fact("orderPaid")); if (paid && !wasPaid) dispatch("orderPaid"); wasPaid = paid;
        var t = Date.now(); if (t - lastIdleTick >= 90) { lastIdleTick = t; dispatch("idle"); }
      },
      // Ventana Mensaje: sentencias sueltas, como en Director
      message: function (line) {
        var r = parse("on __mensaje__\n" + line + "\nend\n", "message");
        if (r.errors.length) { var e = r.errors[0]; host.log && host.log({ level: "error", es: e.es, en: e.en }); return false; }
        var h = r.handlers.__mensaje__;
        if (h.body.length === 1 && h.body[0].k === "call" && !findHandler(h.body[0].name, {}) && h.body[0].args.length === 0) { host.log && host.log({ level: "out", text: str(getVar(h.body[0].name, { locals: {}, globalsHere: {} })) }); return true; }
        return run(h, { locals: {}, globalsHere: {} }) !== "error";
      }
    };
    api.stayFrame = function () { return api._hold ? api._hold.f : Number(host.frame()); };
    return api;
  }

  /* ------------------------------------------------------ ES ⇄ EN --- */
  var PAIRS = [
    ["al soltar", "on mouseUp"], ["al pulsar", "on mouseDown"], ["al entrar en el fotograma", "on enterFrame"], ["al salir del fotograma", "on exitFrame"], ["en reposo", "on idle"],
    ["al empezar la película", "on startMovie"], ["al pagar", "on orderPaid"], ["fin si", "end if"], ["fin repetir", "end repeat"], ["si no", "else"], ["entonces", "then"],
    ["repetir con", "repeat with"], ["repetir mientras", "repeat while"], ["salir de repetir", "exit repeat"], ["hasta", "to"], ["quedarse", "go to the frame"],
    ["ir a marca", "go to marker"], ["ir al fotograma", "go to frame"], ["parar", "stop"], ["añadir al carrito", "add to cart"], ["talla", "size"], ["vaciar carrito", "clear cart"],
    ["abrir pago", "open checkout"], ["cobrar en barra", "pay at counter"], ["sonar", "play sound"], ["decir", "say"], ["poner", "put"], ["fijar", "set"], ["del sprite", "of sprite"],
    ["el texto", "the text"], ["visible", "visible"], ["verdadero", "TRUE"], ["falso", "FALSE"], ["salir", "exit"], ["pasar", "pass"], ["si", "if"], ["fin", "end"], ["y", "and"], ["o", "or"], ["no", "not"]
  ];
  function translate(src, to) {
    var from = to === "en" ? 0 : 1, dest = to === "en" ? 1 : 0;
    var pairs = PAIRS.slice().sort(function (a, b) { return b[from].length - a[from].length; });
    return String(src).split("\n").map(function (line) {
      var parts = line.split(/("[^"]*"|--.*$)/);
      return parts.map(function (seg, k) {
        if (k % 2 === 1) return seg;
        pairs.forEach(function (pr) {
          var re = new RegExp("(^|[^\\wÀ-ɏ])(" + pr[from].replace(/ /g, "\\s+") + ")(?=$|[^\\wÀ-ɏ])", "gi");
          seg = seg.replace(re, function (m0, pre) { return pre + "\u0001" + pairs.indexOf(pr) + "\u0002"; });
        });
        return seg.replace(/\u0001(\d+)\u0002/g, function (m0, n) { return pairs[Number(n)][dest]; });
      }).join("");
    }).join("\n");
  }
  // «a» y «en» (en «fijar x a 1», «poner 1 en x») se quedan en inglés como «to» / «into»
  var translateRaw = translate;
  translate = function (src, to) {
    var out = translateRaw(src, to);
    if (to === "en") out = out.replace(/^(\s*set\s+.+?)\s+a\s+/gim, "$1 to ").replace(/^(\s*put\s+.+?)\s+en\s+(\w+)\s*$/gim, "$1 into $2");
    else out = out.replace(/^(\s*fijar\s+.+?)\s+to\s+/gim, "$1 a ").replace(/^(\s*poner\s+.+?)\s+into\s+/gim, "$1 en ");
    return out;
  };

  /* -------------------------------------------- archivo .admingo --- */
  function toFile(scripts) {
    scripts = scripts || {}; var out = ["-- Admingo · ainimation.studio", ""];
    if (scripts.movie) out.push("--@ película", scripts.movie.trim(), "");
    Object.keys(scripts.frames || {}).forEach(function (k) { if (scripts.frames[k].trim()) out.push('--@ fotograma "' + k + '"', scripts.frames[k].trim(), ""); });
    Object.keys(scripts.sprites || {}).forEach(function (k) { if (scripts.sprites[k].trim()) out.push('--@ sprite "' + k + '"', scripts.sprites[k].trim(), ""); });
    return out.join("\n");
  }
  function fromFile(text) {
    var s = { movie: "", frames: {}, sprites: {} }, cur = null, buf = [];
    function flush() { if (!cur) return; var t = buf.join("\n").trim(); if (cur.k === "movie") s.movie = t; else s[cur.k][cur.n] = t; buf = []; }
    String(text).split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^--@\s*(pel[ií]cula|movie|fotograma|frame|sprite)\s*(?:"([^"]+)")?/i);
      if (m) { flush(); var k = /pel|movie/i.test(m[1]) ? "movie" : /foto|frame/i.test(m[1]) ? "frames" : "sprites"; cur = { k: k, n: m[2] || "" }; return; }
      if (cur) buf.push(line);
    });
    flush(); return s;
  }

  var KEYWORDS = { es: ["al soltar", "al entrar en el fotograma", "al salir del fotograma", "en reposo", "al empezar la película", "al pagar", "fin", "si", "entonces", "si no", "fin si", "repetir con", "hasta", "fin repetir", "salir de repetir", "salir", "pasar", "global", "poner", "fijar", "ir a marca", "ir al fotograma", "quedarse", "parar", "añadir al carrito", "talla", "vaciar carrito", "abrir pago", "cobrar en barra", "sonar", "decir", "del sprite", "el texto del sprite", "visible", "verdadero", "falso"],
    en: ["on mouseUp", "on enterFrame", "on exitFrame", "on idle", "on startMovie", "on orderPaid", "end", "if", "then", "else", "end if", "repeat with", "to", "end repeat", "exit repeat", "exit", "pass", "global", "put", "into", "set", "go to marker", "go to frame", "go to the frame", "stop", "add to cart", "size", "clear cart", "open checkout", "pay at counter", "play sound", "say", "of sprite", "the text of sprite", "sprite(", "TRUE", "FALSE"],
    facts: ["the orderNumber", "the selectedItem", "the selectedSize", "the marker", "the idleSeconds", "the cartCount", "the cartTotal", "the frame", "the orderPaid"] };

  /* --------------------------------------------- decir / say (avatar) --- */
  // En el gemelo (iframe): se pide al tótem que hable (postMessage) y, si nadie responde en
  // medio segundo, habla el propio navegador con voz es-ES / en-GB.
  function speak(text, lang) {
    var l = lang === "en" ? "en-GB" : "es-ES";
    (root.__admingoSaid = root.__admingoSaid || []).push({ text: text, lang: l });
    function local() {
      try {
        var ss = root.speechSynthesis; if (!ss || !root.SpeechSynthesisUtterance) return;
        var u = new root.SpeechSynthesisUtterance(text); u.lang = l;
        var vs = ss.getVoices() || [], v = vs.filter(function (x) { return x.lang === l; })[0] || vs.filter(function (x) { return x.lang && x.lang.slice(0, 2) === l.slice(0, 2); })[0];
        if (v) u.voice = v; ss.cancel(); ss.speak(u);
      } catch (e) { /* sin voz */ }
    }
    var framed = false; try { framed = root.parent && root.parent !== root; } catch (e) { framed = true; }
    if (!framed) return local();
    var id = "say-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), done = false;
    function ack(e) { var d = e.data; if (d && d.type === "say-ack" && d.id === id) { done = true; root.removeEventListener("message", ack); } }
    root.addEventListener("message", ack);
    try { root.parent.postMessage({ source: "admingo", type: "say", id: id, text: text, lang: l }, "*"); } catch (e) { /* */ }
    setTimeout(function () { if (!done) { root.removeEventListener("message", ack); local(); } }, 500);
  }
  var WORDS = {}; Object.keys(CANON).forEach(function (k) { CANON[k].forEach(function (ph) { ph.split(" ").forEach(function (w) { if (w.length > 1) WORDS[w] = 1; }); }); });
  HEADERS.forEach(function (h) { h[0].split(" ").forEach(function (w) { WORDS[w] = 1; }); });
  ["global", "the", "el", "la", "los", "las"].forEach(function (w) { WORDS[w] = 1; });

  root.Admingo = { version: "1.0", speak: speak, WORDS: WORDS, FACTS: FACT_NAMES, fold: fold, lex: lex, parse: parse, compileScripts: compileScripts, createVM: createVM, translate: translate, toFile: toFile, fromFile: fromFile, KEYWORDS: KEYWORDS };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Admingo;
})(typeof window !== "undefined" ? window : globalThis);
