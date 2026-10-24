/* i18n.js — toggle ES/EN autocontenido para AInimation Studio.
   Traduce por nodos de texto (no toca el HTML del body). Reversible: guarda el original
   en cada nodo y lo restaura al volver a EN. Preferencia en localStorage. */
(function () {
  "use strict";

  // Clave = texto EN normalizado (espacios colapsados). Valor = ES.
  var EN2ES = {
    // Nav
    "Idea": "Idea",
    "Film": "Vídeo",
    "Blocks": "Bloques",
    "Engine": "Motor",
    "Contact": "Contacto",
    // Hero
    "Admira Director, powered by AI.": "Admira Director, con IA.",
    "Cast, stage, score, script, image, video, music, and voice in one authoring environment. The classic multimedia metaphor, rebuilt for generative production.":
      "Cast, escenario, partitura, guion, imagen, vídeo, música y voz en un único entorno de autoría. La metáfora multimedia clásica, reconstruida para la producción generativa.",
    "Enter Studio": "Entrar al Studio",
    "Watch the idea": "Ver la idea",
    // Statement
    "Not another prompt box. A timeline-based authoring tool where generated media becomes editable objects with behavior.":
      "No es otra caja de prompts. Una herramienta de autoría con línea de tiempo donde el contenido generado se convierte en objetos editables con comportamiento.",
    // Blocks
    "Start in blocks": "Empieza por bloques",
    "Three doors. One production brain.": "Tres puertas. Un solo cerebro de producción.",
    "Author": "Crear",
    "Build with cast, stage, score, script, and AI media objects.":
      "Construye con cast, escenario, partitura, guion y objetos de medios con IA.",
    "Generate": "Generar",
    "Turn intent into image, video, music, voice, timing, and behaviors.":
      "Convierte la intención en imagen, vídeo, música, voz, tempo y comportamientos.",
    "Control": "Controlar",
    "Inspect every prompt, scene, channel, asset, and export.":
      "Inspecciona cada prompt, escena, canal, asset y exportación.",
    // Formats
    "Formats": "Formatos",
    "Built for real AI animation work.": "Hecho para trabajo real de animación con IA.",
    "AInimation treats every generated piece as production material: a cast member, a staged object, a timed score element, or an inspectable behavior.":
      "AInimation trata cada pieza generada como material de producción: un miembro del cast, un objeto en escena, un elemento de partitura con tempo o un comportamiento inspeccionable.",
    "Short films": "Cortometrajes",
    "Scene boards, timing maps, voice passes, continuity notes, and exportable prompts for AI video pipelines.":
      "Guiones gráficos, mapas de tempo, pasadas de voz, notas de continuidad y prompts exportables para pipelines de vídeo con IA.",
    "Music videos": "Videoclips",
    "Score-led generation where beats, lyrics, camera moves, loops, and visual motifs stay connected.":
      "Generación guiada por la partitura donde beats, letra, movimientos de cámara, loops y motivos visuales permanecen conectados.",
    "Brand worlds": "Mundos de marca",
    "Reusable characters, product spaces, style references, and behavior rules for repeatable campaign output.":
      "Personajes reutilizables, espacios de producto, referencias de estilo y reglas de comportamiento para campañas repetibles.",
    // Process
    "Process": "Proceso",
    "From intention to editable production.": "De la intención a una producción editable.",
    "The studio keeps the classic Director metaphor because it gives AI generation a place to land: cast, stage, score, script, then export.":
      "El studio mantiene la metáfora clásica de Director porque le da a la generación con IA un sitio donde aterrizar: cast, escenario, partitura, guion y luego exportar.",
    "Describe the movie": "Describe la película",
    "Start with a seed, world, lead cast member, tone, duration, and intended format.":
      "Empieza con una semilla, un mundo, protagonista, tono, duración y formato deseado.",
    "Generate the board": "Genera el board",
    "The AI proposes cast, scenes, score rows, media prompts, cues, and behavior notes.":
      "La IA propone cast, escenas, filas de partitura, prompts de medios, cues y notas de comportamiento.",
    "Edit like a director": "Edita como un director",
    "Move objects on stage, import media, adjust timing, filter assets, and inspect every output.":
      "Mueve objetos en escena, importa medios, ajusta el tempo, filtra assets e inspecciona cada salida.",
    "Export the production brain": "Exporta el cerebro de producción",
    "Download briefs, JSON, prompts, timing maps, and stage videos for downstream tools.":
      "Descarga briefs, JSON, prompts, mapas de tempo y vídeos de escena para las siguientes herramientas.",
    // Engine
    "Powered by OpenMontage.": "Impulsado por OpenMontage.",
    "The Director surface is the face.": "La superficie Director es la cara.",
    "is the production brain underneath — an open-source, agentic video system that turns the AI Director into real footage, narration, score, subtitles, and a final rendered cut.":
      "es el cerebro de producción por debajo: un sistema de vídeo agéntico y open-source que convierte al Director IA en metraje real, narración, partitura, subtítulos y un corte final renderizado.",
    "First piece — 30 seconds, 1080p, produced by the engine with zero API keys.":
      "Primera pieza — 30 segundos, 1080p, producida por el motor sin ninguna API key.",
    "Produce one yourself ▶": "Produce una tú mismo ▶",
    "Agentic pipelines": "Pipelines agénticos",
    "Twelve production pipelines — from animated explainer to real-footage documentary montage. The Director picks the pipeline, then runs research, script, assets, edit, and render.":
      "Doce pipelines de producción — del explainer animado al montaje documental con metraje real. El Director elige el pipeline y luego ejecuta investigación, guion, assets, edición y render.",
    "Real video, not just stills": "Vídeo real, no solo imágenes",
    "Generated motion clips (Veo, Kling, FLUX) or a CLIP-searchable corpus of real footage from Archive.org, NASA, and Wikimedia — cut into a finished timeline.":
      "Clips de movimiento generados (Veo, Kling, FLUX) o un corpus de metraje real buscable con CLIP de Archive.org, NASA y Wikimedia — montados en una línea de tiempo terminada.",
    "Zero-key path": "Camino sin API keys",
    "Piper offline narration, open archives, and Remotion / HyperFrames composition render a real piece with no paid API. Add keys to unlock more providers.":
      "Narración offline con Piper, archivos abiertos y composición con Remotion / HyperFrames renderizan una pieza real sin ninguna API de pago. Añade keys para desbloquear más proveedores.",
    "Backlot living storyboard": "Backlot: storyboard vivo",
    "Every production shows itself live — stages light up, the script lands as a screenplay page, scene cards shimmer as assets generate, every decision and dollar on the wall.":
      "Cada producción se muestra en vivo — los escenarios se iluminan, el guion aterriza como página de guion, las tarjetas de escena brillan según se generan los assets, cada decisión y cada euro a la vista.",
    "Cost-honest": "Honesto con el coste",
    "Finished pieces from $0.02 to about $1.50. Every provider decision is scored and logged; you approve script and storyboard before the render.":
      "Piezas terminadas desde 0,02 $ hasta cerca de 1,50 $. Cada decisión de proveedor se puntúa y registra; apruebas guion y storyboard antes del render.",
    "Open source": "Open source",
    "OpenMontage is AGPLv3 and agent-native. AInimation Studio is the Director-style face; the engine stays open underneath.":
      "OpenMontage es AGPLv3 y nativo para agentes. AInimation Studio es la cara estilo Director; el motor permanece abierto por debajo.",
    "View OpenMontage on GitHub": "Ver OpenMontage en GitHub",
    // Next
    "Next": "Siguiente",
    "The full interface lives in Studio.": "La interfaz completa vive en el Studio.",
    "The home introduces the promise. The Studio page contains the authoring surface, generated director board, score, cast bin, and export logic.":
      "La home presenta la promesa. La página Studio contiene la superficie de autoría, el director board generado, la partitura, el cast bin y la lógica de exportación.",
    // Contact
    "Open a line to the studio.": "Abre una línea con el studio.",
    "For pilot productions, AI animation workflows, product partnerships, and early access to the authoring environment.":
      "Para producciones piloto, flujos de animación con IA, alianzas de producto y acceso anticipado al entorno de autoría.",
    "Contact Node - Live": "Nodo de contacto · En vivo",
    "Invite Team": "Invitar al equipo",
    "Real-time concept pilots": "Pilotos de concepto en tiempo real",
    "Share Studio Link": "Compartir enlace del Studio",
    "Shared with Team - 4 online": "Compartido con el equipo · 4 en línea",
    "Contact Space (45%)": "Espacio de contacto (45%)",
    "Projects": "Proyectos",
    "Stage": "Escenario",
    "Cast": "Cast",
    "AI Director": "Director IA",
    "Director Commands": "Comandos del Director",
    // Footer
    "Director-style AI authoring environment": "Entorno de autoría con IA estilo Director",
    "Email the studio": "Escribe al studio",
    // Xperiencias (galería)
    "Interactive pieces, ready to air.": "Piezas interactivas, listas para emitir.",
    "Every Xperiencia is the literal output of the Studio: one self-contained page with its plan, its rules, and no remote media. What you see below is the real piece, not a screenshot — and the emit button gives you the exact channel item admira.tv plays.":
      "Cada Xperiencia es la salida literal del Studio: una página autocontenida con su plan, sus reglas y sin media remota. Lo de abajo es la pieza real, no una captura — y el botón de emitir te da el item de canal exacto que reproduce admira.tv.",
    "Three touch doors and the street rule: the screen always comes back on its own.":
      "Tres puertas táctiles y la regla de la calle: la pantalla siempre vuelve sola.",
    "The Admira pitch as a touch walk-through, one step per touch.":
      "El pitch de Admira como recorrido táctil, un paso por toque.",
    "Open live": "Abrir en vivo",
    "Emit on admira.tv": "Emitir en admira.tv",
    "Copies the channel item JSON for the admira.tv loop.":
      "Copia el JSON del item de canal para el bucle de admira.tv.",
    "Editorial view on pixeria.com": "Vista editorial en pixeria.com",
    "On air at admira.tv": "En antena en admira.tv",
    "Publish yours from the Studio": "Publica la tuya desde el Studio",
    // 404
    "Lost in the montage.": "Perdido en el montaje.",
    "This scene doesn't exist — or it hasn't been rendered yet. Head back to the studio.":
      "Esta escena no existe — o aún no se ha renderizado. Vuelve al studio.",
    "Error 404 — scene not found": "Error 404 — escena no encontrada",
    "Back to home": "Volver al inicio",
    // A11y
    "Skip to content": "Saltar al contenido"
  };

  // Director uses the same language preference, but translates chrome only.
  // Project copy, editable text, cast names and scripts are never walked.
  var directorLabels = {
    "File":"Archivo", "New":"Nuevo", "Save as…":"Guardar como…", "Projects…":"Proyectos…", "Open":"Abrir",
    "Import":"Importar", "Export":"Exportar", "Download":"Descargar", "Share":"Compartir", "Publish Xperiencia":"Publicar Xperiencia",
    "Edit":"Editar", "Undo":"Deshacer", "Redo":"Rehacer", "Cut":"Cortar", "Copy":"Copiar", "Paste":"Pegar",
    "Select all":"Seleccionar todo", "Delete":"Eliminar", "Duplicate":"Duplicar", "Find and replace":"Buscar y reemplazar",
    "Stage":"Stage", "Score":"Score", "Cast":"Cast", "Timeline":"Score",
    "Window":"Ventana", "Tools":"Herramientas", "Brief":"Resumen", "AI Director":"Director IA", "Behaviour":"Comportamiento", "Payment":"Pagos",
    "Collaborate":"Colaborar", "Settings":"Ajustes", "Dark":"Oscuro", "Light":"Claro", "Language":"Idioma",
    "Control":"Control", "Templates":"Plantillas", "Menu":"Carta", "Insert":"Insertar",
    "Import images":"Importar imágenes", "Import videos":"Importar vídeos", "Import sounds":"Importar sonidos", "Import texts":"Importar textos", "Import animations":"Importar animaciones",
    "✨ Generate image":"✨ Generar imagen", "▶ Play (projector)":"▶ Reproducir (proyector)", "🎬 Produce video (Produce)":"🎬 Producir vídeo (Produce)",
    "Director mode (docked)":"Modo Director (fijo)", "Floating windows":"Ventanas flotantes", "Inspector on the right":"Inspector a la derecha",
    "Application menu":"Menú de la aplicación", "Open windows":"Abrir paneles", "Import cast members":"Importar miembros del Cast", "Studio settings":"Ajustes del Studio", "Interface mode":"Tema de la interfaz",
    "Prompt + Generate":"Prompt + Generar", "Close":"Cerrar", "Minimize":"Minimizar", "Maximize":"Maximizar",
    "Show interface · H":"Mostrar interfaz · H", "Hide interface · H":"Ocultar interfaz · H"
  };
  Object.assign(directorLabels,{"Insert": "Insertar", "🚩 New screen (marker)…": "🚩 Nueva pantalla (marca)…", "▭ Button": "▭ Botón", "T Label": "T Etiqueta", "Label": "Etiqueta", "Menu": "Carta", "🍽 Sample menu (Starbucks · fictitious)": "🍽 Carta de ejemplo (Starbucks · ficticia)", "Import menu (.json)…": "Importar carta (.json)…", "Remove menu": "Quitar la carta", "Templates": "Plantillas", "🛒 Ordering kiosk (Starbucks, vertical totem)": "🛒 Quiosco de pedidos (Starbucks, tótem vertical)", "⬇ Export project (.json)": "⬇ Exportar proyecto (.json)", "🍽 Kiosk · Linked cafeteria": "🍽 Quiosco · Cafetería vinculada", "🍽 Kiosk · Categories": "🍽 Quiosco · Categorías", "🍽 Kiosk · Products": "🍽 Quiosco · Productos", "🍽 Kiosk · Options": "🍽 Quiosco · Opciones", "🍽 Kiosk · Cart": "🍽 Quiosco · Carrito", "🍽 Kiosk · QR payment": "🍽 Quiosco · Pago QR", "🍽 Kiosk · Order number": "🍽 Quiosco · Número de pedido"});
  var directorReverse = {};
  Object.keys(directorLabels).forEach(function(en){if(en!=="Timeline")directorReverse[directorLabels[en]]=en;});
  function directorText(raw,lang){
    var key=norm(raw),aliases={'▶ Play (proyector)':'▶ Play (projector)','Mostrar interfaz / Show interface · H':'Show interface · H','Ocultar interfaz / Hide interface · H':'Hide interface · H'},en=aliases[key]||directorReverse[key]||key;
    if(!Object.prototype.hasOwnProperty.call(directorLabels,en))return raw;
    return raw.replace(key,lang==='es'?directorLabels[en]:en);
  }
  function applyDirector(lang){
    document.querySelectorAll('.director-menubar,.window-titlebar,.window-taskbar').forEach(function(root){
      var walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),node;
      while((node=walk.nextNode())){if(node.parentElement.closest('input,textarea,[contenteditable]'))continue;var next=directorText(node.nodeValue,lang);if(next!==node.nodeValue)node.nodeValue=next;}
    });
    document.querySelectorAll('.director-window,.director-menubar [aria-label],.director-menubar [title],.window-titlebar [aria-label],.window-titlebar [title]').forEach(function(el){
      ['aria-label','title','data-window-title'].forEach(function(attr){var raw=el.getAttribute(attr);if(!raw)return;var next=directorText(raw,lang);
        var action=raw.match(/^(Close|Minimize|Maximize|Cerrar|Minimizar|Maximizar) (.+)$/);
        if(action)next=directorText(action[1],lang)+' '+directorText(action[2]==='Timeline'?'Score':action[2],lang);
        if(raw!==next)el.setAttribute(attr,next);
      });
    });
    var h=document.querySelector('[data-director-interface-toggle]');
    if(h)h.setAttribute('aria-label',directorText(document.body.classList.contains('director-focus')?'Show interface · H':'Hide interface · H',lang));
  }

  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  var roots = [".site-header", "main", ".site-footer"];

  function apply(lang) {
    if(document.body.classList.contains('studio-page'))applyDirector(lang);
    else roots.forEach(function (sel) {
      var root = document.querySelector(sel);
      if (!root) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = walker.nextNode())) {
        var raw = n.nodeValue;
        var key = norm(raw);
        if (!key) continue;
        if (n.__i18nOrig === undefined) n.__i18nOrig = raw; // guarda original una vez
        if (lang === "es" && Object.prototype.hasOwnProperty.call(EN2ES, key)) {
          var lead = (raw.match(/^\s*/) || [""])[0];
          var trail = (raw.match(/\s*$/) || [""])[0];
          n.nodeValue = lead + EN2ES[key] + trail;
        } else {
          n.nodeValue = n.__i18nOrig; // restaura EN
        }
      }
    });
    document.documentElement.lang = lang;
    var btn = document.getElementById("langToggle");
    if (btn) { btn.textContent = lang === "es" ? "EN" : "ES"; btn.setAttribute("aria-pressed", lang === "es"); btn.setAttribute("aria-label",lang === "es" ? "Cambiar a inglés" : "Switch to Spanish"); }
    try { localStorage.setItem("ain_lang", lang); } catch (e) {}
  }

  // Idioma de arranque: 1) elección guardada del usuario; si no hay, 2) idioma del navegador
  //    (los hispanohablantes ven ES en su primera visita); si no, 3) EN (por defecto/canonical).
  function detectLang() {
    var requested=new URLSearchParams(location.search).get('lang');
    if(requested==='es'||requested==='en')return requested;
    var stored = null;
    try { stored = localStorage.getItem("ain_lang"); } catch (e) {}
    if (stored === "es" || stored === "en") return stored;
    var nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return nav.indexOf("es") === 0 ? "es" : "en";
  }

  function init() {
    apply(detectLang());
    if(document.body.classList.contains('studio-page')){
      var queued=false;
      var observer=new MutationObserver(function(records){if(!records.some(function(record){var el=record.target.nodeType===3?record.target.parentElement:record.target;return el.closest?.('.director-menubar,.window-titlebar,.window-taskbar')||Array.from(record.addedNodes||[]).some(function(n){return n.nodeType===1&&(n.matches('.window-titlebar,.window-taskbar')||n.querySelector('.window-titlebar,.window-taskbar'));});}))return;if(queued)return;queued=true;queueMicrotask(function(){queued=false;applyDirector(document.documentElement.lang);});});
      document.querySelectorAll('.director-menubar,.director-workbench').forEach(function(root){observer.observe(root,{childList:true,subtree:true,characterData:true});});
    }
    var btn = document.getElementById("langToggle");
    if (btn) btn.addEventListener("click", function () {
      apply(document.documentElement.lang === "es" ? "en" : "es");
    });
  }

  if(document.body?.classList.contains('studio-page'))document.documentElement.lang=detectLang();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
