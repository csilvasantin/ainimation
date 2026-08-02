/* ============================================================================
 * xpl-studio.js — el Lingo ejecutable de AInimation Studio
 * ----------------------------------------------------------------------------
 * Convierte studio.html de "editor de vídeo lineal" en "Director interactivo":
 *
 *   A1  la ventana Behaviour es un EDITOR DE REGLAS XPL reales (no texto Lingo
 *       de atrezzo): CUANDO <hecho> ENTONCES <acción>, guardadas en el plan y
 *       evaluadas por engine.tick().
 *   A3  cualquier miembro del Cast o item del Stage puede marcarse INTERACTIVO
 *       y recibir un nombre de sprite — el canal de sprite de Director.
 *   A4  goToMarker(<marca>) cablea las marcas del Score al transporte:
 *       el timeline deja de ser una línea y pasa a ser un grafo navegable.
 *   A5  modo Play (?play=1 · Control ▸ Play): el "proyector" sin cromo de
 *       autoría, motor en marcha, pantalla completa. Es lo que va al kiosko.
 *
 * Reutiliza assets/xpl-runtime.js TAL CUAL (vanilla, sin build, código propio →
 * no arrastra la AGPL de OpenMontage). Este fichero es la capa de mundo: conecta
 * los hechos y las acciones del catálogo Director con el Stage y el Score.
 * ========================================================================== */
(function () {
  "use strict";

  const XPL = window.XPL;
  if (!XPL) return; // sin runtime no hay Lingo; el Studio sigue funcionando

  /* ------------------------------------------------------------------------
   * Vocabulario que ofrece ESTE editor.
   * Del catálogo de tienda solo se ofrecen los hechos que el Studio sabe
   * responder de verdad (el reloj). Ofrecer "hay cola" o "la caja del día" en
   * una pieza de kiosko sería vender humo: nunca se cumplirían.
   * ---------------------------------------------------------------------- */
  const TIME_FACT_IDS = ["hour", "night", "weekend", "dayPart"];
  const studioFacts = () => [
    ...XPL.facts("director"),
    ...XPL.facts("twin").filter((fact) => TIME_FACT_IDS.includes(fact.id)),
  ];
  const studioActions = () => XPL.actions("director");

  /* ------------------------------------------------------------------------
   * Plan y persistencia — las reglas y los nombres de sprite viajan EN el plan.
   * ---------------------------------------------------------------------- */
  const getPlan = () => window.currentPlan?.() || null;
  const commitPlan = (plan) => {
    window.saveFilmPlan?.(plan);
    renderBehaviourWindow(plan);
  };
  const rulesOf = (plan) => (Array.isArray(plan?.rules) ? plan.rules : []);

  const slug = (value) => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ").trim()
    .split(" ").filter(Boolean)
    .map((word, index) => (index ? word[0].toUpperCase() : word[0].toLowerCase()) + word.slice(1))
    .join("") || "sprite";

  let spriteCounter = 0;
  const newRuleId = () => `xr-${Date.now().toString(36)}-${(spriteCounter += 1)}`;

  /* ------------------------------------------------------------------------
   * A3 · SPRITES — Cast y Stage nombrables e interactivos.
   * Un sprite es {ref, name, interactive}: `ref` apunta al objeto real del plan
   * ("cast:3" / "item:stage-17"), `name` es como lo llaman las reglas.
   * ---------------------------------------------------------------------- */
  function listSprites(plan) {
    const out = [];
    (plan?.cast || []).forEach((member, index) => {
      if (!member?.src || member.onStage === false) return; // solo lo que pisa el Stage
      out.push({
        ref: `cast:${index}`,
        kind: "cast",
        label: member.name || `Cast ${index + 1}`,
        type: member.mediaType || "asset",
        name: member.spriteName || slug(member.name || `cast${index + 1}`),
        interactive: member.interactive === true,
      });
    });
    (plan?.stageItems || []).forEach((item) => {
      if (!item?.id) return;
      out.push({
        ref: `item:${item.id}`,
        kind: "item",
        label: item.type === "text" ? (item.text || "Text") : (item.type || "shape"),
        type: item.type || "shape",
        name: item.spriteName || slug(item.type === "text" ? (item.text || "text") : (item.type || "shape")),
        interactive: item.interactive === true,
      });
    });
    return out;
  }

  function updateSprite(ref, patch) {
    const plan = getPlan();
    if (!plan) return;
    const [kind, key] = String(ref).split(/:(.+)/);
    if (kind === "cast") {
      const index = Number(key);
      if (!plan.cast?.[index]) return;
      plan.cast[index] = { ...plan.cast[index], ...patch };
    } else {
      plan.stageItems = (plan.stageItems || []).map((item) => (
        item.id === key ? { ...item, ...patch } : item
      ));
    }
    commitPlan(plan);
  }

  // nombre de sprite -> elemento del Stage (y al revés)
  function elementForSprite(name, plan = getPlan()) {
    const sprite = listSprites(plan).find((item) => item.name === name);
    if (!sprite) return null;
    const [kind, key] = sprite.ref.split(/:(.+)/);
    const stage = document.querySelector(".stage-canvas") || document.querySelector(".stage-window");
    if (!stage) return null;
    return kind === "cast"
      ? stage.querySelector(`.stage-imported-member[data-cast-index="${CSS.escape(key)}"]`)
      : stage.querySelector(`.stage-item[data-stage-item-id="${CSS.escape(key)}"]`);
  }

  function spriteForElement(element, plan = getPlan()) {
    if (!element) return null;
    const castEl = element.closest?.("[data-cast-index]");
    const itemEl = element.closest?.("[data-stage-item-id]");
    const ref = itemEl ? `item:${itemEl.dataset.stageItemId}`
      : castEl ? `cast:${castEl.dataset.castIndex}` : null;
    if (!ref) return null;
    return listSprites(plan).find((sprite) => sprite.ref === ref) || null;
  }

  /* ------------------------------------------------------------------------
   * Marcas del Score y sonidos — pueblan los desplegables de tipo 'ref'.
   * ---------------------------------------------------------------------- */
  function listMarkers(plan = getPlan()) {
    // OJO: totalTimelineFrames() mide la EXTENSIÓN DEL CONTENIDO (dónde acaba el
    // último clip), no el largo del Score — con el Stage vacío devuelve 1. Si se usa
    // como tope, loadTimelineMarkers() clampa TODAS las marcas al fotograma 1 y
    // goToMarker deja de saltar (era el caso en cualquier sesión recién abierta).
    // La autoridad del largo del Score es el transporte; el contenido, solo respaldo.
    const total = Number(window.ainTransport?.totalFrames)
      || Math.max(Number(window.totalTimelineFrames?.(plan)) || 0, 240);
    return window.loadTimelineMarkers?.(total) || [];
  }
  const markerByLabel = (label) => listMarkers().find((marker) => marker.label === label) || null;

  function listSounds(plan = getPlan()) {
    return (plan?.cast || [])
      .map((member, index) => ({ member, index }))
      .filter(({ member }) => member?.src && member.mediaType === "audio")
      .map(({ member, index }) => member.spriteName || slug(member.name || `sound${index + 1}`));
  }

  function refOptions(source, plan = getPlan()) {
    if (source === "marker") return listMarkers(plan).map((marker) => marker.label);
    if (source === "sound") return listSounds(plan);
    if (source === "qr") return [];
    return listSprites(plan).map((sprite) => sprite.name);
  }

  /* ------------------------------------------------------------------------
   * EL MUNDO — lo que el motor pregunta (hechos) y lo que ejecuta (acciones).
   * ---------------------------------------------------------------------- */
  const bus = { click: "", hover: "", marker: "", qr: "" }; // eventos de este tick
  let lastInteractionAt = Date.now();
  let lastSeenFrame = 0;

  const dayPartNow = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 15) return "noon";
    if (hour < 21) return "afternoon";
    return "night";
  };

  const world = {
    npcs: () => [],
    fact(id) {
      switch (id) {
        case "click": return bus.click;
        case "hover": return bus.hover;
        case "markerReached": return bus.marker;
        case "qrScanned": return bus.qr;
        case "frame": return Number(window.currentTimelineFrame?.() || 1);
        case "idleSeconds": return (Date.now() - lastInteractionAt) / 1000;
        case "hour": return new Date().getHours();
        case "night": { const hour = new Date().getHours(); return hour >= 21 || hour < 7; }
        case "weekend": { const day = new Date().getDay(); return day === 0 || day === 6; }
        case "dayPart": return dayPartNow();
        default: return undefined;
      }
    },
    act(id, value, _npc, action) {
      ACTIONS_IMPL[id]?.(value, action);
    },
  };

  // A4 · el salto: mover el playhead Y que la reproducción siga desde ahí.
  function jumpToFrame(frame, keepPlaying) {
    const transport = window.ainTransport;
    if (transport) {
      transport.setFrame(frame);
      if (keepPlaying || transport.isPlaying()) transport.play();
      return;
    }
    window.setTimelineFrame?.(frame, true);
  }

  const ACTIONS_IMPL = {
    // ⭐ A4 — la marca del Score deja de ser un post-it y pasa a ser un destino.
    goToMarker(label) {
      const marker = markerByLabel(label);
      if (!marker) return;
      jumpToFrame(marker.frame, isPlayMode());
      lastSeenFrame = marker.frame; // el salto no cuenta como "marca alcanzada"
    },
    playSegment(label) {
      const marker = markerByLabel(label);
      if (!marker) return;
      if (window.ainTransport) window.ainTransport.playUntil(marker.frame);
      else window.setTimelineFrame?.(marker.frame, true);
    },
    showCast(name) {
      elementForSprite(name)?.classList.remove("xpl-hidden");
    },
    hideCast(name) {
      elementForSprite(name)?.classList.add("xpl-hidden");
    },
    setText(name, action) {
      const element = elementForSprite(name);
      if (!element) return;
      const target = element.querySelector(".stage-text-content") || element;
      if (document.activeElement === target) return; // no pisar al autor escribiendo
      const next = String(action?.value2 ?? "");
      if (target.textContent !== next) target.textContent = next;
    },
    playSound(name) {
      const element = elementForSprite(name);
      const media = element?.querySelector("audio, video") || element;
      if (media?.play) { try { media.currentTime = 0; } catch { /* aún sin metadatos */ } media.play?.().catch(() => {}); }
    },
    openUrl(url) {
      const value = String(url || "");
      if (!/^https?:\/\//i.test(value)) return;   // solo http(s): nada de javascript:
      if (!isPlayMode()) return;                  // en autoría no secuestramos la pestaña
      window.open(value, "_blank", "noopener");
    },
  };

  /* ------------------------------------------------------------------------
   * MOTOR — un tick cada 100 ms mientras el modo Play o "Probar" estén activos.
   * ---------------------------------------------------------------------- */
  const engine = XPL.createEngine(world);
  let tickTimer = null;
  let previewOn = false;

  function syncRulesIntoEngine() {
    engine.setRules(rulesOf(getPlan()));
  }

  function detectMarkerReached() {
    const frame = Number(window.currentTimelineFrame?.() || 1);
    if (frame === lastSeenFrame) return;
    const from = Math.min(lastSeenFrame, frame);
    const to = Math.max(lastSeenFrame, frame);
    const hit = listMarkers().find((marker) => marker.frame > from && marker.frame <= to);
    bus.marker = hit ? hit.label : "";
    lastSeenFrame = frame;
  }

  // Marca en el DOM qué sprites responden: es lo que da el cursor de hotspot
  // (y lo que hace visible, en autoría, qué es decorado y qué es botón).
  function markHotspots(plan = getPlan()) {
    const stage = document.querySelector(".stage-canvas") || document.querySelector(".stage-window");
    if (!stage) return;
    stage.querySelectorAll("[data-xpl-hot]").forEach((node) => { delete node.dataset.xplHot; });
    listSprites(plan).filter((sprite) => sprite.interactive).forEach((sprite) => {
      const element = elementForSprite(sprite.name, plan);
      if (element) element.dataset.xplHot = sprite.name;
    });
  }

  function tick() {
    detectMarkerReached();
    syncRulesIntoEngine();
    markHotspots();
    engine.tick();
    bus.click = "";   // los eventos duran UN tick: así 'on' vuelve a armarse
    bus.marker = "";
    bus.qr = "";
  }

  function engineRunning() { return Boolean(tickTimer); }
  function startEngine() {
    if (tickTimer) return;
    lastSeenFrame = Number(window.currentTimelineFrame?.() || 1);
    lastInteractionAt = Date.now();
    syncRulesIntoEngine();
    tickTimer = window.setInterval(tick, 100);
    document.body.classList.add("xpl-live");
  }
  function stopEngine() {
    if (tickTimer) window.clearInterval(tickTimer);
    tickTimer = null;
    document.body.classList.remove("xpl-live");
    document.querySelectorAll(".xpl-hidden").forEach((el) => el.classList.remove("xpl-hidden"));
  }

  /* ------------------------------------------------------------------------
   * HOTSPOTS — el Stage escucha; solo hablan los sprites marcados interactivos.
   * ---------------------------------------------------------------------- */
  function bindStageHotspots() {
    document.addEventListener("pointerdown", (event) => {
      if (!engineRunning()) return;
      const stage = event.target.closest?.(".stage-canvas, .stage-window");
      if (!stage) return;
      lastInteractionAt = Date.now();
      const sprite = spriteForElement(event.target);
      if (!sprite?.interactive) return;
      bus.click = sprite.name;
      if (isPlayMode()) {           // en el proyector nadie arrastra ni selecciona
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    document.addEventListener("pointermove", (event) => {
      if (!engineRunning()) return;
      if (!event.target.closest?.(".stage-canvas, .stage-window")) { bus.hover = ""; return; }
      const sprite = spriteForElement(event.target);
      bus.hover = sprite?.interactive ? sprite.name : "";
    }, true);

    ["keydown", "wheel"].forEach((type) => {
      document.addEventListener(type, () => { lastInteractionAt = Date.now(); }, true);
    });
  }

  /* ------------------------------------------------------------------------
   * A5 · MODO PLAY — el proyector. Misma página, otra clase en el body
   * (patrón portería body.pf-*-off de studio-live.html): sin recarga.
   * ---------------------------------------------------------------------- */
  const isPlayMode = () => document.body.classList.contains("ain-play");

  function setPlayMode(on, options = {}) {
    document.body.classList.toggle("ain-play", Boolean(on));
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("play", "1"); else url.searchParams.delete("play");
    if (options.pushUrl !== false) window.history.replaceState({}, "", url);
    if (on) {
      startEngine();
      window.ainTransport?.play();
      if (options.fullscreen !== false) document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (!previewOn) stopEngine();
      window.ainTransport?.stop();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    document.querySelectorAll("[data-play-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function bindPlayMode() {
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest?.("[data-play-toggle]");
      if (!toggle) return;
      event.preventDefault();
      setPlayMode(!isPlayMode());
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isPlayMode()) setPlayMode(false);
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("qr")) bus.qr = params.get("qr");
    if (params.get("play") === "1") {
      // Sin gesto de usuario el navegador rechaza el fullscreen: se pide al
      // primer toque, que en un tótem llega solo.
      setPlayMode(true, { pushUrl: false, fullscreen: false });
      document.addEventListener("pointerdown", function once() {
        document.documentElement.requestFullscreen?.().catch(() => {});
        document.removeEventListener("pointerdown", once);
      }, { once: true });
    }
  }

  /* ------------------------------------------------------------------------
   * A1 · EL EDITOR — bloques-regla, construidos con DOM (nada de innerHTML con
   * datos del usuario: el mismo criterio que arregla la galería de studio-live).
   * ---------------------------------------------------------------------- */
  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    });
    (Array.isArray(children) ? children : [children]).filter(Boolean).forEach((child) => node.append(child));
    return node;
  };

  function select(options, value, onChange, placeholder) {
    const node = el("select", { class: "xpl-select", onchange: (event) => onChange(event.target.value) });
    if (placeholder !== undefined) node.append(el("option", { value: "", text: placeholder }));
    options.forEach((option) => {
      const item = el("option", { value: option.id, text: option.label });
      node.append(item);
    });
    node.value = value ?? "";
    return node;
  }

  const lang = () => (document.documentElement.lang || "es").startsWith("en") ? "en" : "es";
  const L = (obj) => XPL.label(obj, lang());
  // Los textos sueltos del editor también siguen el idioma de la página. studio.html
  // es lang="en", así que sin esto salían rótulos y tooltips en castellano ("▶ Probar",
  // "Quitar condición"…) mezclados con el resto de la interfaz en inglés.
  const T = (es, en) => (lang() === "en" ? en : es);

  function conditionRow(rule, cond, index, plan) {
    const fact = XPL.factById(cond.fact) || studioFacts()[0];
    const row = el("div", { class: "xpl-row" });

    row.append(select(
      studioFacts().map((item) => ({ id: item.id, label: `${item.icon || ""} ${L(item)}`.trim() })),
      cond.fact,
      (next) => {
        const nextFact = XPL.factById(next);
        rule.when.conds[index] = {
          fact: next,
          op: nextFact?.type === "num" ? ">=" : undefined,
          value: nextFact?.type === "bool" ? true
            : nextFact?.type === "enum" ? nextFact.values?.[0]?.id
              : nextFact?.type === "num" ? Number(nextFact.min || 0) : "",
        };
        commitPlan(plan);
      },
    ));

    if (fact?.type === "num") {
      row.append(select(XPL.OPS.map((op) => ({ id: op.id, label: L(op) })), cond.op || ">=",
        (next) => { cond.op = next; commitPlan(plan); }));
      row.append(el("input", {
        class: "xpl-input", type: "number", value: String(cond.value ?? 0),
        min: String(fact.min ?? 0), max: String(fact.max ?? 9999),
        onchange: (event) => { cond.value = Number(event.target.value); commitPlan(plan); },
      }));
    } else if (fact?.type === "bool") {
      row.append(select(
        [{ id: "yes", label: lang() === "en" ? "yes" : "sí" }, { id: "no", label: "no" }],
        cond.value === false ? "no" : "yes",
        (next) => { cond.value = next === "yes"; commitPlan(plan); },
      ));
    } else if (fact?.type === "enum") {
      row.append(select((fact.values || []).map((value) => ({ id: value.id, label: L(value) })), cond.value,
        (next) => { cond.value = next; commitPlan(plan); }));
    } else if (fact?.type === "ref") {
      const options = refOptions(fact.source, plan).map((name) => ({ id: name, label: name }));
      row.append(select(options, cond.value || "",
        (next) => { cond.value = next; commitPlan(plan); },
        lang() === "en" ? "(anything)" : "(lo que sea)"));
      if (fact.source === "qr") {
        row.append(el("input", {
          class: "xpl-input", type: "text", value: String(cond.value || ""), placeholder: T("código", "code"),
          onchange: (event) => { cond.value = event.target.value; commitPlan(plan); },
        }));
      }
    }

    row.append(el("button", {
      class: "xpl-mini", type: "button", title: T("Quitar condición", "Remove condition"), text: "×",
      onclick: () => {
        rule.when.conds.splice(index, 1);
        if (!rule.when.conds.length) rule.when.conds.push({ fact: "click", value: "" });
        commitPlan(plan);
      },
    }));
    return row;
  }

  function actionRow(rule, action, index, plan) {
    const spec = XPL.actionById(action.id) || studioActions()[0];
    const row = el("div", { class: "xpl-row" });

    row.append(select(studioActions().map((item) => ({ id: item.id, label: L(item) })), action.id,
      (next) => {
        rule.do[index] = { id: next, value: "" };
        commitPlan(plan);
      }));

    if (spec?.param?.kind === "ref") {
      const options = refOptions(spec.param.source, plan).map((name) => ({ id: name, label: name }));
      row.append(select(options, action.value || "",
        (next) => { action.value = next; commitPlan(plan); }, "—"));
    } else if (spec?.param?.kind === "enum") {
      row.append(select((spec.param.values || []).map((value) => ({ id: value.id, label: L(value) })), action.value,
        (next) => { action.value = next; commitPlan(plan); }));
    } else if (spec?.param) {
      row.append(el("input", {
        class: "xpl-input wide", type: "text", value: String(action.value || ""),
        placeholder: spec.param.placeholder || "",
        onchange: (event) => { action.value = event.target.value; commitPlan(plan); },
      }));
    }
    if (spec?.param2) {
      row.append(el("input", {
        class: "xpl-input wide", type: "text", value: String(action.value2 || ""),
        placeholder: spec.param2.placeholder || L(spec.param2),
        onchange: (event) => { action.value2 = event.target.value; commitPlan(plan); },
      }));
    }

    row.append(el("button", {
      class: "xpl-mini", type: "button", title: T("Quitar acción", "Remove action"), text: "×",
      onclick: () => {
        rule.do.splice(index, 1);
        if (!rule.do.length) rule.do.push({ id: "goToMarker", value: "" });
        commitPlan(plan);
      },
    }));
    return row;
  }

  function ruleCard(rule, plan) {
    const card = el("article", { class: `xpl-rule ${rule.enabled === false ? "is-off" : ""}` });

    const head = el("div", { class: "xpl-rule-head" });
    head.append(el("input", {
      class: "xpl-check", type: "checkbox", title: T("Activa", "Active"),
      ...(rule.enabled === false ? {} : { checked: "checked" }),
      onchange: (event) => { rule.enabled = event.target.checked; commitPlan(plan); },
    }));
    head.append(el("input", {
      class: "xpl-name", type: "text", value: rule.name || "", placeholder: T("Nombre de la regla", "Rule name"),
      onchange: (event) => { rule.name = event.target.value; commitPlan(plan); },
    }));
    head.append(el("button", {
      class: "xpl-mini danger", type: "button", title: T("Borrar regla", "Delete rule"), text: "🗑",
      onclick: () => {
        plan.rules = rulesOf(plan).filter((item) => item.id !== rule.id);
        commitPlan(plan);
      },
    }));
    card.append(head);

    const when = el("div", { class: "xpl-block" });
    const whenHead = el("div", { class: "xpl-block-head" }, [el("b", { text: lang() === "en" ? "WHEN" : "CUANDO" })]);
    if (rule.when.conds.length > 1) {
      whenHead.append(select(
        [{ id: "and", label: lang() === "en" ? "all" : "todas" }, { id: "or", label: lang() === "en" ? "any" : "alguna" }],
        rule.when.join || "and", (next) => { rule.when.join = next; commitPlan(plan); },
      ));
    }
    when.append(whenHead);
    rule.when.conds.forEach((cond, index) => when.append(conditionRow(rule, cond, index, plan)));
    when.append(el("button", {
      class: "xpl-add", type: "button", text: lang() === "en" ? "+ condition" : "+ condición",
      onclick: () => { rule.when.conds.push({ fact: "frame", op: ">=", value: 1 }); commitPlan(plan); },
    }));
    card.append(when);

    const then = el("div", { class: "xpl-block" }, [
      el("div", { class: "xpl-block-head" }, [el("b", { text: lang() === "en" ? "THEN" : "ENTONCES" })]),
    ]);
    rule.do.forEach((action, index) => then.append(actionRow(rule, action, index, plan)));
    then.append(el("button", {
      class: "xpl-add", type: "button", text: lang() === "en" ? "+ action" : "+ acción",
      onclick: () => { rule.do.push({ id: "goToMarker", value: "" }); commitPlan(plan); },
    }));
    card.append(then);

    card.append(el("p", { class: "xpl-sentence", text: XPL.ruleSentence(rule, lang()) }));
    return card;
  }

  function blankRule() {
    return {
      id: newRuleId(),
      name: lang() === "en" ? "New rule" : "Regla nueva",
      enabled: true,
      priority: 0,
      when: { join: "and", conds: [{ fact: "click", value: "" }] },
      do: [{ id: "goToMarker", value: "" }],
    };
  }

  function spritesPanel(plan) {
    const panel = el("div", { class: "xpl-sprites" });
    const sprites = listSprites(plan);
    if (!sprites.length) {
      panel.append(el("p", { class: "xpl-empty", text: lang() === "en"
        ? "Nothing on the Stage yet. Import cast or draw an item to name it."
        : "Aún no hay nada en el Stage. Importa cast o dibuja un item para poder nombrarlo." }));
      return panel;
    }
    panel.append(el("p", { class: "xpl-hint", text: lang() === "en"
      ? "Mark a sprite as interactive and name it — that name is what rules point at."
      : "Marca un sprite como interactivo y ponle nombre — las reglas apuntan a ese nombre." }));
    sprites.forEach((sprite) => {
      const row = el("div", { class: "xpl-row xpl-sprite-row" });
      row.append(el("input", {
        class: "xpl-check", type: "checkbox", title: T("Interactivo", "Interactive"),
        ...(sprite.interactive ? { checked: "checked" } : {}),
        onchange: (event) => updateSprite(sprite.ref, { interactive: event.target.checked }),
      }));
      row.append(el("span", { class: "xpl-sprite-label", title: sprite.label, text: sprite.label }));
      row.append(el("small", { class: "xpl-sprite-type", text: sprite.type }));
      row.append(el("input", {
        class: "xpl-input wide", type: "text", value: sprite.name, placeholder: T("nombre de sprite", "sprite name"),
        onchange: (event) => updateSprite(sprite.ref, { spriteName: slug(event.target.value) }),
      }));
      panel.append(row);
    });
    return panel;
  }

  let activeTab = "rules";

  function renderBehaviourWindow(plan = getPlan()) {
    const host = document.querySelector("#stageScript");
    if (!host || !plan) return;
    if (!Array.isArray(plan.rules)) plan.rules = [];

    host.replaceChildren();
    host.classList.add("xpl-editor");

    const tabs = el("div", { class: "xpl-tabs" });
    [["rules", lang() === "en" ? "Rules" : "Reglas"], ["sprites", "Sprites"]].forEach(([id, label]) => {
      tabs.append(el("button", {
        class: `xpl-tab ${activeTab === id ? "is-active" : ""}`, type: "button", text: label,
        onclick: () => { activeTab = id; renderBehaviourWindow(); },
      }));
    });
    tabs.append(el("span", { class: "xpl-spacer" }));
    tabs.append(el("button", {
      class: `xpl-tab ${previewOn ? "is-live" : ""}`, type: "button",
      title: T("Evaluar las reglas aquí mismo", "Evaluate the rules right here"), text: previewOn ? T("■ Probar", "■ Test") : T("▶ Probar", "▶ Test"),
      onclick: () => {
        previewOn = !previewOn;
        if (previewOn) startEngine(); else if (!isPlayMode()) stopEngine();
        renderBehaviourWindow();
      },
    }));
    tabs.append(el("button", {
      class: "xpl-tab", type: "button", "data-play-toggle": "", title: T("Modo Play (?play=1)", "Play mode (?play=1)"), text: "⛶ Play",
    }));
    host.append(tabs);

    if (activeTab === "sprites") {
      host.append(spritesPanel(plan));
      return;
    }

    const list = el("div", { class: "xpl-rules" });
    if (!rulesOf(plan).length) {
      list.append(el("p", { class: "xpl-empty", text: lang() === "en"
        ? "No behaviours yet. A piece without rules is just linear video."
        : "Sin comportamientos. Una pieza sin reglas es solo vídeo lineal." }));
    }
    rulesOf(plan).forEach((rule) => list.append(ruleCard(rule, plan)));
    host.append(list);
    markHotspots(plan);

    host.append(el("button", {
      class: "xpl-add primary", type: "button", text: lang() === "en" ? "+ Rule" : "+ Regla",
      onclick: () => {
        const next = getPlan();
        next.rules = [...rulesOf(next), blankRule()];
        commitPlan(next);
      },
    }));
  }

  /* ------------------------------------------------------------------------
   * Arranque
   * ---------------------------------------------------------------------- */
  window.ainXPL = {
    renderBehaviourWindow,
    listSprites,
    listMarkers,
    setPlayMode,
    isPlayMode,
    startEngine,
    stopEngine,
    engineRunning,
    tick,               // un tick manual (tests / demos)
    world,              // el adaptador, para inspeccionarlo desde consola
    engine,
    _bus: bus,          // inyectar eventos en pruebas: _bus.click = 'botonJorEl'
  };

  // Una sola vez pase lo que pase: si los listeners se registraran dos veces
  // (script incluido dos veces, un DOMContentLoaded tardío…) cada clic en Play
  // se llamaría dos veces y el modo se encendería y apagaría en el mismo gesto.
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    bindStageHotspots();
    bindPlayMode();
    renderBehaviourWindow();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
