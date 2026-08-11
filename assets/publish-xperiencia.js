/* ============================================================================
 * publish-xperiencia.js — B1 · «Publicar → Xperiencia»
 * ----------------------------------------------------------------------------
 * Hoy las Xperiencias vivas del ecosistema (xpaceos/xperiencias/sheldon,
 * batcueva, soledad) son HTML de 460-490 líneas ESCRITOS A MANO, uno a uno. No
 * hay herramienta de autoría: hay un agente tecleando. Esto lo cambia: el Studio
 * exporta una carpeta con la misma forma, lista para commitear o subir a Pages.
 *
 *   xperiencia-<slug>.zip
 *     ├── index.html   ← autocontenido: runtime XPL + reproductor + la pieza
 *     ├── plan.json    ← la pieza (cast, items del Stage, keyframes, marcas)
 *     └── rules.json   ← las reglas XPL, legibles y editables aparte
 *
 * AUTOCONTENIDO de verdad: el index.html no pide nada a ainimation.studio, así
 * que un kiosko sin internet (más allá de su media remota) lo reproduce igual.
 * Lo que NO viaja se dice al exportar, nunca se recorta en silencio.
 *
 * El reproductor embebido NO es el Studio: es el proyector. Sabe pintar los
 * items del Stage y el cast con src remoto, mover el tiempo y ejecutar las
 * reglas. Lo que el Studio hace y esto no (importar, dibujar, editar) no pinta
 * nada en una sala.
 * ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------------
   * ZIP mínimo (método «store»): sin dependencias y sin build. Una Xperiencia
   * son tres ficheros de texto; comprimirlos no compensa arrastrar una librería.
   * ------------------------------------------------------------------------- */
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    return table;
  })();
  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  function zip(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
    const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

    files.forEach(({ name, text }) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(text);
      const sum = crc32(data);
      // Sin fecha real: el ZIP queda reproducible (mismo contenido, mismo byte).
      const header = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(sum), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)];
      chunks.push(new Uint8Array(header), nameBytes, data);
      central.push({ name: nameBytes, sum, size: data.length, offset });
      offset += header.length + nameBytes.length + data.length;
    });

    const dir = [];
    central.forEach((entry) => {
      dir.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(entry.sum), ...u32(entry.size), ...u32(entry.size), ...u16(entry.name.length),
        ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(entry.offset));
      dir.push(...entry.name);
    });
    const dirBytes = new Uint8Array(dir);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0),
      ...u16(central.length), ...u16(central.length), ...u32(dirBytes.length), ...u32(offset), ...u16(0)]);
    return new Blob([...chunks, dirBytes, end], { type: "application/zip" });
  }

  /* ---------------------------------------------------------------------------
   * DURACIÓN. Una Xperiencia no dura lo que dura su timeline: el timeline es un
   * bucle de atracción de segundos, y lo que hay que decidir es cuánto tiempo le
   * pertenece la PANTALLA — cuánto aguanta el canal antes de seguir con la
   * siguiente pieza. Eso no se puede deducir del plan, así que se pregunta al
   * exportar y viaja DENTRO de la pieza: quien la emita no tiene que adivinarlo
   * ni que alguien lo teclee otra vez al dar de alta el item.
   * Un minuto por defecto: lo que tarda un transeúnte en acercarse, mirar, tocar
   * y leer lo que ha elegido.
   * ------------------------------------------------------------------------- */
  const SEGUNDOS_POR_DEFECTO = 60;
  const SEGUNDOS_MIN = 5;
  const SEGUNDOS_MAX = 600;

  const limitaSegundos = (valor) => {
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n) || n <= 0) return SEGUNDOS_POR_DEFECTO;
    return Math.min(Math.max(n, SEGUNDOS_MIN), SEGUNDOS_MAX);
  };

  /* ---------------------------------------------------------------------------
   * El reproductor embebido. Vive aquí como texto porque tiene que viajar DENTRO
   * del index.html exportado: una Xperiencia no puede depender de este dominio.
   * ------------------------------------------------------------------------- */
  const PLAYER_JS = String.raw`
(function () {
  "use strict";
  var plan  = JSON.parse(document.getElementById("xp-plan").textContent);
  var rules = JSON.parse(document.getElementById("xp-rules").textContent);
  var marks = plan.markers || [];
  var fps   = Number(plan.fps || 24);
  var total = Number(plan.totalFrames || 240);
  var stage = document.getElementById("stage");

  /* --- tiempo --- */
  var frame = 1, playing = true, until = null, last = 0;
  function goToFrame(f) { frame = Math.min(Math.max(Number(f) || 1, 1), total); paint(); }
  function markFrame(label) {
    for (var i = 0; i < marks.length; i += 1) if (marks[i].label === label) return marks[i].frame;
    return null;
  }

  /* --- keyframes: mismo modelo que el Studio (porcentajes + estilo de texto) --- */
  function at(item, f) {
    var ks = (item.keyframes || []).slice().sort(function (a, b) { return a.frame - b.frame; });
    if (!ks.length) return item;
    var prev = ks[0], next = ks[ks.length - 1];
    for (var i = 0; i < ks.length; i += 1) {
      if (ks[i].frame <= f) prev = ks[i];
      if (ks[i].frame >= f) { next = ks[i]; break; }
    }
    if (prev.frame === next.frame) return prev;
    var t = (f - prev.frame) / (next.frame - prev.frame);
    var mix = function (a, b) { return a + (b - a) * t; };
    return { x: mix(prev.x, next.x), y: mix(prev.y, next.y), w: mix(prev.w, next.w), h: mix(prev.h, next.h),
             color: prev.color || next.color, text: prev.text || next.text,
             fontWeight: prev.fontWeight, fontStyle: prev.fontStyle,
             textDecoration: prev.textDecoration, textAlign: prev.textAlign, fontSize: prev.fontSize };
  }

  /* --- pintado --- */
  var nodes = {};
  var hidden = {};
  var texts  = {};
  function ensure(id, make) { if (!nodes[id]) { nodes[id] = make(); stage.appendChild(nodes[id]); } return nodes[id]; }

  function paintOne(obj, id, kind) {
    var start = Number(obj.startFrame || 1);
    var end   = start + Number(obj.durationFrames || total);
    var live  = frame >= start && frame <= end && !hidden[obj.spriteName];
    var k = at(obj, frame);
    var node = ensure(id, function () {
      var n = document.createElement(kind === "cast" ? (obj.mediaType === "video" ? "video" : "img") : "div");
      if (kind === "cast") { n.src = obj.src; if (obj.mediaType === "video") { n.muted = true; n.loop = true; n.playsInline = true; } }
      n.className = "xp-item";
      if (obj.interactive) { n.dataset.sprite = obj.spriteName; n.classList.add("xp-hot"); }
      return n;
    });
    node.style.display = live ? "block" : "none";
    if (!live) return;
    node.style.left = k.x + "%"; node.style.top = k.y + "%";
    node.style.width = k.w + "%"; node.style.height = k.h + "%";
    if (kind === "item") {
      var type = obj.type || "rect-fill";
      var filled = /-fill$/.test(type);
      var oval = /^oval/.test(type);
      node.style.background = filled ? (k.color || "#c6f24e") : "transparent";
      node.style.border = filled ? "0" : "2px solid " + (k.color || "#c6f24e");
      node.style.borderRadius = oval ? "50%" : "0";
      if (type === "text") {
        node.style.background = "transparent"; node.style.border = "0";
        node.textContent = texts[obj.spriteName] != null ? texts[obj.spriteName] : (k.text || obj.text || "");
        node.style.color = k.color || "#f8f7f2";
        node.style.font = (k.fontStyle || "normal") + " " + (k.fontWeight || "850") + " " + (k.fontSize || "3vw") + "/1.15 system-ui, sans-serif";
        node.style.textAlign = k.textAlign || "left";
        node.style.textDecoration = k.textDecoration || "none";
      }
    }
  }

  function paint() {
    (plan.stageItems || []).forEach(function (item) { paintOne(item, "item:" + item.id, "item"); });
    (plan.cast || []).forEach(function (member, i) {
      if (member && member.src) paintOne(member, "cast:" + i, "cast");
    });
  }

  /* --- XPL: los mismos hechos y acciones del catálogo Director --- */
  var bus = { click: "", hover: "", marker: "" };
  var lastInput = Date.now(), seen = 0;
  var world = {
    npcs: function () { return []; },
    fact: function (id) {
      var h = new Date().getHours();
      switch (id) {
        case "click": return bus.click;
        case "hover": return bus.hover;
        case "markerReached": return bus.marker;
        case "frame": return frame;
        case "idleSeconds": return (Date.now() - lastInput) / 1000;
        case "hour": return h;
        case "night": return h >= 21 || h < 7;
        case "weekend": var d = new Date().getDay(); return d === 0 || d === 6;
        case "dayPart": return h < 12 ? "morning" : h < 15 ? "noon" : h < 21 ? "afternoon" : "night";
        default: return undefined;
      }
    },
    act: function (id, value) {
      var f;
      switch (id) {
        case "goToMarker":  f = markFrame(value); if (f) { goToFrame(f); playing = true; } break;
        case "playSegment": f = markFrame(value); if (f) { until = f; playing = true; } break;
        case "showCast":    delete hidden[value]; break;
        case "hideCast":    hidden[value] = true; break;
        case "setText":     texts[value] = arguments[3] && arguments[3].value2 || ""; break;
        case "playSound":   var a = document.querySelector('[data-sound="' + value + '"]'); if (a) { a.currentTime = 0; a.play(); } break;
        case "openUrl":     if (value) window.open(value, "_blank", "noopener"); break;
      }
    }
  };

  var engine = window.XPL && window.XPL.createEngine ? window.XPL.createEngine(world) : null;
  if (engine) engine.setRules(rules);

  stage.addEventListener("pointerdown", function (event) {
    lastInput = Date.now();
    var hot = event.target.closest("[data-sprite]");
    if (hot) bus.click = hot.dataset.sprite;
  }, true);
  stage.addEventListener("pointermove", function (event) {
    var hot = event.target.closest("[data-sprite]");
    bus.hover = hot ? hot.dataset.sprite : "";
  }, true);

  /* --- bucle --- */
  function loop(ts) {
    if (playing && ts - last >= 1000 / fps) {
      last = ts;
      frame = frame >= total ? 1 : frame + 1;
      if (until && frame >= until) { until = null; playing = false; }
    }
    bus.marker = "";
    for (var i = 0; i < marks.length; i += 1) {
      if (marks[i].frame > seen && marks[i].frame <= frame) bus.marker = marks[i].label;
    }
    seen = frame;
    if (engine) engine.tick();
    paint();
    bus.click = "";
    requestAnimationFrame(loop);
  }
  paint();
  requestAnimationFrame(loop);

  /* --- la pieza anuncia cuánto dura ---------------------------------------
   * Quien la emite (el canal de admira.tv) no puede leer nada de dentro de un
   * iframe de otro dominio, así que la pieza lo DICE. Se repite un par de veces
   * por si el que escucha llega tarde; es un mensaje idempotente. */
  var segundos = Number(plan.durationSeconds) || 60;
  function anunciaDuracion() {
    if (window.parent === window) return;
    try {
      window.parent.postMessage({ source: "ainimation-xperiencia", event: "duration",
        seconds: segundos, title: plan.title || "" }, "*");
    } catch (e) {}
  }
  anunciaDuracion();
  setTimeout(anunciaDuracion, 400);
  setTimeout(anunciaDuracion, 1500);

  window.XPERIENCIA = { goToFrame: goToFrame, frame: function () { return frame; },
    world: world, plan: plan, rules: rules, seconds: segundos };
})();
`;

  const esc = (text) => String(text).replace(/</g, "\\u003c");

  function indexHtml({ title, runtime, planJson, rulesJson }) {
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title}</title>
    <meta name="theme-color" content="#05070c" />
    <!-- Xperiencia generada por AInimation Studio (Publicar → Xperiencia).
         Autocontenida: no pide nada a ainimation.studio. Se despliega dejando
         esta carpeta en xpaceos/xperiencias/<slug>/ o en cualquier Pages. -->
    <style>
      *{box-sizing:border-box} html,body{height:100%}
      body{margin:0;background:#05070c;color:#f8f7f2;font:16px/1.4 system-ui,-apple-system,sans-serif;
        display:grid;place-items:center;overflow:hidden;cursor:default}
      #stage{position:relative;width:min(100vw,177.78vh);aspect-ratio:16/9;background:#0f1115;overflow:hidden}
      .xp-item{position:absolute}
      .xp-hot{cursor:pointer}
      @media (prefers-reduced-motion:reduce){.xp-item{transition:none}}
    </style>
  </head>
  <body>
    <main id="stage" aria-label="${title}"></main>
    <script type="application/json" id="xp-plan">${esc(planJson)}<\/script>
    <script type="application/json" id="xp-rules">${esc(rulesJson)}<\/script>
    <script>${runtime}<\/script>
    <script>${PLAYER_JS}<\/script>
  </body>
</html>
`;
  }

  /* ---------------------------------------------------------------------------
   * Recogida de la pieza + exportación.
   * ------------------------------------------------------------------------- */
  const slugify = (text) => String(text || "xperiencia").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "xperiencia";

  function collect() {
    const plan = window.currentPlan?.();
    if (!plan) return null;
    const totalFrames = Number(window.ainTransport?.totalFrames) || 240;
    const dropped = [];
    const cast = (plan.cast || []).filter((member) => {
      if (!member?.src) return false;
      if (/^(https?:)?\/\//i.test(member.src)) return true;
      dropped.push(member.name || "cast");   // data:/blob: no sale de este navegador
      return false;
    });
    return {
      dropped,
      piece: {
        title: plan.title || "Xperiencia",
        fps: 24,
        totalFrames,
        // Cuánto le pertenece la pantalla, no cuánto dura el timeline.
        durationSeconds: limitaSegundos(plan.durationSeconds),
        markers: window.loadTimelineMarkers?.(totalFrames) || [],
        cast,
        stageItems: plan.stageItems || [],
      },
      rules: (plan.rules || []).filter((rule) => rule.enabled !== false),
    };
  }

  // Se pregunta al exportar, no al dar de alta el item: la duración es una
  // decisión de la pieza y quien la monta es quien sabe cuánto hay que mirarla.
  // La respuesta se guarda en el plan, así que la siguiente exportación ya la
  // propone y nadie la teclea dos veces.
  function preguntaDuracion() {
    const plan = window.currentPlan?.();
    if (!plan) return SEGUNDOS_POR_DEFECTO;
    const actual = limitaSegundos(plan.durationSeconds);
    const dicho = window.prompt(
      `¿Cuántos segundos ocupa esta Xperiencia en pantalla?\n` +
      `(entre ${SEGUNDOS_MIN} y ${SEGUNDOS_MAX}; el canal la retira al acabar)`,
      String(actual),
    );
    if (dicho === null) return null;                  // cancelar = no publicar
    const segundos = limitaSegundos(dicho);
    plan.durationSeconds = segundos;
    window.saveFilmPlan?.(plan);
    return segundos;
  }

  async function publish(button) {
    if (preguntaDuracion() === null) return null;     // cancelar el diálogo cancela la publicación
    const gathered = collect();
    if (!gathered) return null;
    const { piece, rules, dropped } = gathered;
    const slug = slugify(piece.title);

    let runtime = "";
    try { runtime = await (await fetch("assets/xpl-runtime.js")).text(); }
    catch { console.warn("[xperiencia] no se pudo incrustar el runtime XPL: la pieza saldrá sin reglas."); }

    const planJson = JSON.stringify(piece, null, 2);
    const rulesJson = JSON.stringify(rules, null, 2);
    const blob = zip([
      { name: "index.html", text: indexHtml({ title: piece.title, runtime, planJson, rulesJson }) },
      { name: "plan.json", text: planJson },
      { name: "rules.json", text: rulesJson },
    ]);

    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: `xperiencia-${slug}.zip` });
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);

    // Lo que no ha viajado se dice.
    if (dropped.length) console.warn("[xperiencia] media local que no viaja (impórtala desde el Stock):", dropped);
    if (!rules.length) console.warn("[xperiencia] la pieza no lleva reglas activas: será lineal, no interactiva.");
    if (button) {
      const original = button.textContent;
      button.textContent = dropped.length ? `✓ ${slug} (sin ${dropped.length} media)` : `✓ ${slug} · ${piece.durationSeconds}s`;
      window.setTimeout(() => { button.textContent = original; }, 2600);
    }
    return { slug, dropped, rules: rules.length, bytes: blob.size, seconds: piece.durationSeconds };
  }

  window.ainXperiencia = { publish, collect, zip, indexHtml, PLAYER_JS, preguntaDuracion, limitaSegundos };

  function bind() {
    document.querySelector("[data-publish-xperiencia]")
      ?.addEventListener("click", (event) => publish(event.currentTarget));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
