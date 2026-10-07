/*
 * segmento.js — Quiosco SEGMENTADO por la audiencia (Carlos, 8-oct-2026).
 * «Contenidos condicionados por sexo, edad y número a través de la cámara» (admira.tv, primeras versiones: canal.html
 * ?cam=1 + reglas de condicional.html), ahora en el tótem del quiosco. Mientras los tótems sean virtuales, la cámara
 * es la del equipo que emula el quiosco (gemelo XpaceOS/admira.store o el navegador que abre /starbucks).
 *
 * Activar: ?seg=1 (o el interruptor «Segmentado» del gemelo: /totem segmentado on).
 * QA sin cámara: ?simaud=joven_f · ?simaud=adulto_m+joven_f (grupo) · ?simaud=joven_f;adulto_m+adulto_f;0 (secuencia, 8 s cada una)
 *   → siempre en la tienda de pruebas starbucks-qa con origen «qa» (nunca ensucia starbucks-paseo-de-gracia).
 *
 * PRIVACIDAD (RGPD por diseño):
 *   · face-api (MIT) corre en ESTE navegador con dos modelos: detector de caras + edad/género. No se carga el modelo
 *     de reconocimiento (descriptores): no puede identificar a nadie.
 *   · El fotograma se analiza y se descarta. Nunca se guarda, se pinta ni se envía imagen ni vídeo.
 *   · Al relé (mcp-ainimation.admira.store/audiencia) solo va el agregado de una visita: personas, por cara {género,
 *     confianza, franja de edad, confianza de detección}, permanencia, variante enseñada y pedido si lo hubo.
 *   · Aviso visible permanente «📷 Cámara en uso» mientras está encendida; retención 90 días.
 *
 * Contrato con index.html: window.KioskoSegmento.init({tienda, marca, lang, host, ocupado(), onCambio(variante)}),
 *   .pedido(id, numero), .lang(l), .estado. Varias copias del quiosco en el mismo navegador (tótem en escena + vista en
 *   grande del gemelo) eligen UNA líder con Web Locks: solo ella abre la cámara y escribe; las demás reciben sus lecturas
 *   por BroadcastChannel («kiosko-audiencia») y cambian de carta a la vez.
 */
(function () {
  'use strict';
  const P = new URLSearchParams(location.search);
  const SIM = P.get('simaud');
  const ACTIVO = P.get('seg') === '1' || P.get('seg') === 'on' || SIM != null;
  const RELAY = (P.get('audRelay') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? P.get('audRelay') : 'https://mcp-ainimation.admira.store').replace(/\/+$/, '');
  const FA_BASE = new URL('/assets/face-api/', /ainimation\.studio$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? location.origin : 'https://www.ainimation.studio').href;
  const QA = 'starbucks-qa';
  const BANDAS = ['nino', 'joven', 'adulto', 'senior'];
  const banda = (a) => { a = +a; return !(a > 0) ? null : a < 13 ? 'nino' : a < 30 ? 'joven' : a < 60 ? 'adulto' : 'senior'; };
  const r2 = (x) => Math.round((+x || 0) * 100) / 100;
  const slug = (s, n) => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+/, '').slice(0, n || 60);
  const horaMadrid = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const franja = () => { const h = horaMadrid(); return h >= 6 && h < 12 ? 'manana' : h >= 12 && h < 16 ? 'mediodia' : h >= 16 && h < 20 ? 'tarde' : 'noche'; };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const T = {
    es: { aviso: 'Cámara en uso', avisoLargo: 'Estimamos de forma anónima cuántas personas hay, su franja de edad y su género para adaptar la carta. No se graban ni se envían imágenes; nadie es identificado.', sim: 'Audiencia simulada (QA)', cargando: 'Preparando cámara…', sinPermiso: 'Sin permiso de cámara · carta general', sinCamara: 'Sin cámara · carta general', error: 'Cámara no disponible · carta general', nadie: 'nadie delante', ind: 'individuo', grp: 'grupo', carta: 'Carta', m: 'hombre', f: 'mujer', mixto: 'mixto', nino: 'niño', joven: 'joven', adulto: 'adulto', senior: 'senior', general: 'general', seg: 'Segmentado' },
    en: { aviso: 'Camera in use', avisoLargo: 'We anonymously estimate how many people are here, their age band and gender to adapt the menu. No images are recorded or sent; nobody is identified.', sim: 'Simulated audience (QA)', cargando: 'Starting camera…', sinPermiso: 'No camera permission · general menu', sinCamara: 'No camera · general menu', error: 'Camera unavailable · general menu', nadie: 'nobody in front', ind: 'individual', grp: 'group', carta: 'Menu', m: 'man', f: 'woman', mixto: 'mixed', nino: 'child', joven: 'young', adulto: 'adult', senior: 'senior', general: 'general', seg: 'Segmented' },
  };
  // Reglas de respaldo (= semilla del servidor) por si el relé no responde: la demo nunca se queda sin segmentar.
  const RESPALDO = { v: 1, por_defecto: 'general', histeresis: { lecturas: 3, min_ms: 8000, vacio_ms: 6000 }, variantes: { general: { nombre: { es: 'General', en: 'General' }, destacados: [] } }, reglas: [] };

  const S = {
    activo: ACTIVO, simulada: SIM != null, lider: false, camara: ACTIVO ? 'cargando' : 'off', tienda: '', origen: 'real', canal: 'quiosco', dispositivo: '',
    reglas: RESPALDO, variante: 'general', regla: null, segmento: { personas: 0 }, personas: 0, caras: [],
    visita: null, ultima: null, enviadas: [], errores: [], lecturas: 0, cand: null, ultimoCambio: 0, ultimaVista: 0,
  };
  window.__kioskSegmento = S;
  let cfg = { ocupado: () => false, onCambio: () => {}, lang: 'es' };
  let video = null, stream = null, fa = null, bc = null, pill = null, primeraVez = true;
  const t = (k) => (T[cfg.lang] || T.es)[k] || k;

  function segmentoDe(caras) {
    const n = caras.length;
    if (!n) return { personas: 0, grupo: null, genero: null, edad: null, franja: franja() };
    const m = caras.filter((c) => c.g === 'm').length, f = caras.filter((c) => c.g === 'f').length;
    const genero = m > f ? 'm' : f > m ? 'f' : (n === 1 ? null : 'mixto');
    const cu = {}; caras.forEach((c) => { if (BANDAS.includes(c.e)) cu[c.e] = (cu[c.e] || 0) + 1; });
    const edad = Object.entries(cu).sort((a, b) => b[1] - a[1] || BANDAS.indexOf(b[0]) - BANDAS.indexOf(a[0]))[0];
    return { personas: n, grupo: n >= 2 ? 'grupo' : 'individuo', genero, edad: edad ? edad[0] : null, franja: franja() };
  }
  function casa(r, s) { return r && r.activa !== false && s.personas > 0 && (r.grupo === 'any' || r.grupo === s.grupo) && (r.genero === 'any' || r.genero === s.genero) && (r.edad === 'any' || r.edad === s.edad) && (r.franja === 'any' || r.franja === s.franja); }
  function elegir(s) {
    const rs = (S.reglas.reglas || []).map((r, i) => [r, i]).sort((a, b) => (b[0].prioridad - a[0].prioridad) || (a[1] - b[1]));
    for (const [r] of rs) if (casa(r, s)) return { regla: r.id, variante: r.variante };
    return { regla: null, variante: S.reglas.por_defecto || 'general' };
  }
  const varObj = (id) => { const v = (S.reglas.variantes || {})[id]; return v ? Object.assign({ id }, v) : { id: 'general', nombre: { es: 'General', en: 'General' }, destacados: [] }; };

  /* ── red ── */
  function enviar(ev, beacon) {
    if (!S.lider) return;
    const cuerpo = JSON.stringify(ev);
    S.enviadas.push({ tipo: ev.tipo, at: Date.now(), id: ev.id || ev.visita || null, variante: ev.variante || null, personas: ev.personas });
    if (S.enviadas.length > 60) S.enviadas.shift();
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon(RELAY + '/audiencia/evento', new Blob([cuerpo], { type: 'text/plain' })); return; }
      fetch(RELAY + '/audiencia/evento', { method: 'POST', headers: { 'content-type': 'application/json' }, body: cuerpo, keepalive: true })
        .then((r) => r.ok ? r.json() : r.json().then((j) => { throw new Error(j.error || r.status); }))
        .then((j) => { S.enviadas[S.enviadas.length - 1].ok = true; return j; })
        .catch((e) => { S.errores.push(String(e.message || e)); if (S.errores.length > 20) S.errores.shift(); });
    } catch (e) { S.errores.push(String(e)); }
  }
  async function cargarReglas() {
    try {
      const r = await fetch(RELAY + '/audiencia/reglas?tienda=' + encodeURIComponent(S.tienda), { cache: 'no-store' });
      const j = await r.json(); if (j && j.variantes && Array.isArray(j.reglas)) { S.reglas = j; S.reglasDe = j.semilla ? 'semilla' : 'backoffice'; }
    } catch (e) { S.reglasDe = 'respaldo'; }
  }
  let ultimoEstado = '', ultimoEstadoAt = 0;
  function publicarEstado(forzar) {
    const s = S.segmento, now = Date.now();
    const firma = [S.camara, s.personas, s.grupo, s.genero, s.edad, S.variante].join('|');
    if (!forzar && firma === ultimoEstado && now - ultimoEstadoAt < 20000) return;
    if (!forzar && firma !== ultimoEstado && now - ultimoEstadoAt < 2500) return;
    ultimoEstado = firma; ultimoEstadoAt = now;
    enviar({ tipo: 'estado', tienda: S.tienda, dispositivo: S.dispositivo, origen: S.origen, camara: S.camara, personas: s.personas || 0, grupo: s.grupo || undefined, genero: s.genero || undefined, edad: s.edad || undefined, regla: S.regla || undefined, variante: S.variante, visita: S.visita ? S.visita.id : undefined });
  }

  /* ── visitas: se abre con 2 lecturas con gente; se cierra tras vacio_ms sin nadie ── */
  function cerrarVisita(beacon) {
    const v = S.visita; if (!v) return; S.visita = null;
    const fin = Math.max(v.inicio, v.ultimaVista || Date.now());
    S.ultima = { id: v.id, fin, pedido: v.pedido };
    if (fin - v.inicio < 1500 && !v.pedido) return; // un parpadeo no es una visita
    const rep = v.rep || { caras: [] };
    enviar({ tipo: 'visita', id: v.id, tienda: S.tienda, dispositivo: S.dispositivo, origen: S.origen, canal: S.canal, inicio: v.inicio, fin, personas: Math.max(v.max, rep.caras.length), caras: rep.caras.slice(0, 10),
      regla: v.regla || undefined, variante: v.variante || S.variante, pedido: v.pedido || undefined, pedido_num: v.pedidoNum || undefined }, beacon);
  }
  function procesar(caras) {
    const now = Date.now(), n = caras.length; S.lecturas++;
    S.caras = caras; S.personas = n;
    const vacio = (S.reglas.histeresis && S.reglas.histeresis.vacio_ms) || 6000;
    if (n) {
      S.ultimaVista = now;
      if (!S.visita) { S.pre = (S.pre || 0) + 1; if (S.pre >= 2) S.visita = { id: uuid(), inicio: S.preAt || now, max: 0, rep: null, ultimaVista: now }; else if (S.pre === 1) S.preAt = now; }
      if (S.visita) { const v = S.visita; v.ultimaVista = now; if (n >= v.max) { v.max = n; v.rep = { caras: caras.slice(0, 10) }; } }
    } else { S.pre = 0; if (S.visita && now - S.ultimaVista >= vacio) cerrarVisita(false); }
    histeresis(segmentoDe(caras), now, vacio);
    difundir();
    publicarEstado(false);
    pintar();
  }
  function histeresis(seg, now, vacio) {
    const h = S.reglas.histeresis || {}, lecturas = h.lecturas || 3, minMs = h.min_ms == null ? 8000 : h.min_ms;
    const key = seg.personas ? [seg.grupo, seg.genero, seg.edad].join('|') : 'vacio';
    if (S.cand && S.cand.key === key) S.cand.n++; else S.cand = { key, n: 1, seg };
    S.cand.seg = seg;
    const estable = key === 'vacio' ? (now - (S.ultimaVista || 0) >= vacio || !S.ultimaVista) : S.cand.n >= lecturas;
    if (!estable || cfg.ocupado()) return;   // el cliente está pidiendo: la carta no cambia bajo su dedo
    const e = elegir(seg);
    if (e.variante === S.variante && e.regla === S.regla) { S.segmento = seg; return; }
    // el mínimo entre cambios solo frena saltos entre segmentos: de la carta general a la de quien llega es inmediato
    if (!primeraVez && S.variante !== (S.reglas.por_defecto || 'general') && now - S.ultimoCambio < minMs && e.variante !== S.variante) return;
    aplicar(seg, e, now);
  }
  function aplicar(seg, e, now) {
    const cambia = e.variante !== S.variante || primeraVez;
    primeraVez = false; S.segmento = seg; S.regla = e.regla;
    if (S.visita) { S.visita.regla = e.regla; S.visita.variante = e.variante; }
    if (!cambia) return;
    S.variante = e.variante; S.ultimoCambio = now || 0;
    document.documentElement.dataset.segVariante = S.variante;
    try { cfg.onCambio(varObj(S.variante), { regla: S.regla, segmento: seg }); } catch (_) {}
    publicarEstado(true);
  }

  /* ── varias copias del quiosco: una líder (cámara + escritura), las demás siguen sus lecturas ── */
  function difundir() { if (bc && S.lider) try { bc.postMessage({ t: 'lectura', tienda: S.tienda, caras: S.caras, camara: S.camara, visita: S.visita ? S.visita.id : null }); } catch (_) {} }
  function escuchar() {
    try { bc = new BroadcastChannel('kiosko-audiencia'); } catch (_) { bc = null; return; }
    bc.onmessage = (e) => {
      const d = e.data || {}; if (d.tienda && d.tienda !== S.tienda) return;
      if (d.t === 'lectura' && !S.lider) { S.camara = d.camara; S.seguida = d.visita; S.caras = d.caras || []; S.personas = S.caras.length; if (S.caras.length) S.ultimaVista = Date.now(); histeresis(segmentoDe(S.caras), Date.now(), (S.reglas.histeresis && S.reglas.histeresis.vacio_ms) || 6000); pintar(); }
      if (d.t === 'pedido' && S.lider) pedido(d.id, d.numero);
    };
  }

  /* ── cámara + face-api ── */
  function cargarScript(src) { return new Promise((res, rej) => { if (window.faceapi) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('no se pudo cargar face-api')); document.head.appendChild(s); }); }
  async function arrancarCamara() {
    S.camara = 'cargando'; pintar();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { S.camara = 'sin-camara'; return false; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }); }
    catch (e) { const n = e && e.name; S.camara = n === 'NotAllowedError' || n === 'SecurityError' ? 'sin-permiso' : 'sin-camara'; S.errores.push(n || String(e)); return false; }
    try {
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.srcObject = stream; await video.play();
      await cargarScript(FA_BASE + 'face-api.js?v=1.7.13');
      fa = window.faceapi;
      try { await fa.tf.setBackend('webgl'); await fa.tf.ready(); } catch (_) { try { await fa.tf.setBackend('cpu'); await fa.tf.ready(); } catch (__) {} }
      await fa.nets.tinyFaceDetector.loadFromUri(FA_BASE + 'model');
      await fa.nets.ageGenderNet.loadFromUri(FA_BASE + 'model');
      S.backend = fa.tf.getBackend ? fa.tf.getBackend() : null;
      S.camara = 'on'; return true;
    } catch (e) { S.camara = 'error'; S.errores.push(String(e.message || e)); parar(); return false; }
  }
  function parar() { try { stream && stream.getTracks().forEach((x) => x.stop()); } catch (_) {} stream = null; video = null; }
  async function detectar() {
    if (!fa || !video || video.readyState < 2) return [];
    const res = await fa.detectAllFaces(video, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withAgeAndGender();
    // solo el agregado: el resultado (con cajas y tensores) se reduce aquí y se descarta
    return res.slice(0, 10).map((r) => ({ g: r.gender === 'male' ? 'm' : 'f', gc: r2(r.genderProbability), e: banda(r.age), dc: r2(r.detection && r.detection.score) }));
  }
  // ?simaud=joven_f · adulto_m+joven_f · joven_f;adulto_m+adulto_f;0  (secuencia, 8 s por paso)
  const pasosSim = String(SIM || '').split(';').map((p) => p.trim() === '0' || p.trim() === '' ? [] : p.split('+').map((x) => { const [e, g] = x.trim().split('_'); return { g: g === 'm' ? 'm' : 'f', gc: 0.9, e: BANDAS.includes(e) ? e : 'adulto', dc: 0.95 }; }));
  const t0Sim = Date.now();
  const simCaras = () => pasosSim.length ? pasosSim[Math.floor((Date.now() - t0Sim) / 8000) % pasosSim.length] : [];
  async function bucle() {
    const t0 = performance.now();
    let caras = [];
    try { caras = S.simulada ? simCaras() : await detectar(); } catch (e) { S.errores.push(String(e.message || e)); }
    procesar(caras);
    setTimeout(bucle, Math.max(250, 700 - (performance.now() - t0)));
  }
  async function serLider() {
    S.lider = true;
    if (S.simulada) S.camara = 'simulada'; else if (!(await arrancarCamara())) { pintar(); publicarEstado(true); aplicar({ personas: 0 }, { regla: null, variante: S.reglas.por_defecto || 'general' }); return; }
    pintar(); publicarEstado(true); bucle();
  }

  /* ── aviso visible + estado (sin vídeo: nunca se pinta la imagen de la cámara) ── */
  function pintar() {
    if (!S.activo) return;
    if (!pill) {
      const css = document.createElement('style');
      css.textContent = '#segPill{position:absolute;left:24px;bottom:76px;z-index:48;max-width:calc(100% - 48px);background:rgba(15,25,22,.88);color:#fff;border-radius:22px;padding:12px 20px;font:600 22px/1.3 var(--mb-font,system-ui);box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;display:flex;flex-direction:column;gap:4px}#segPill b{font-weight:800}#segPill .l2{font-weight:500;font-size:20px;opacity:.9}#segPill .l3{display:none;font-weight:500;font-size:19px;opacity:.85;max-width:780px}#segPill.abierto .l3{display:block}#segPill.aviso{background:#5a3a00}#segPill .dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#e53935;margin-right:8px;vertical-align:middle;animation:segrec 1.6s infinite}@keyframes segrec{50%{opacity:.35}}html[data-formato="horizontal"] #segPill,html[data-formato="cuadrado"] #segPill{font-size:19px}body[data-screen]:not([data-screen="attract"]) #segPill{bottom:210px;left:auto;right:24px;font-size:19px;padding:9px 16px;opacity:.92}body[data-screen]:not([data-screen="attract"]) #segPill .l2{font-size:17px}body[data-screen="pay"] #segPill,body[data-screen="done"] #segPill{bottom:auto;top:calc(var(--av-h,0px) + 170px)}' +
        '.segOffer{display:none;margin-top:18px;background:var(--mb-acento,#CBA258);color:var(--mb-acento-texto,#1E1A12);font-weight:800;font-size:34px;padding:16px 34px;border-radius:999px}.segOffer.on{display:inline-block}.segBanner{background:var(--mb-acento,#CBA258);color:var(--mb-acento-texto,#1E1A12);font-weight:800;font-size:30px;padding:18px 26px;border-radius:20px;margin:0 0 24px}.tab.segTab{background:var(--mb-acento,#CBA258);color:var(--mb-acento-texto,#1E1A12)}.tab.segTab.on{background:var(--mb-primario);color:var(--mb-primario-texto)}';
      document.head.appendChild(css);
      pill = document.createElement('div'); pill.id = 'segPill'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
      pill.innerHTML = '<div class="l1"></div><div class="l2"></div><div class="l3"></div>';
      pill.addEventListener('click', (e) => { e.stopPropagation(); pill.classList.toggle('abierto'); });
      (document.getElementById('stage') || document.body).appendChild(pill);
    }
    const c = S.camara, s = S.segmento;
    const l1 = c === 'on' ? '<span class="dot"></span><b>📷 ' + t('aviso') + '</b> · ' + t('seg')
      : c === 'simulada' ? '🧪 <b>' + t('sim') + '</b> · ' + S.tienda
      : c === 'cargando' ? '📷 ' + t('cargando')
      : c === 'sin-permiso' ? '📷 ' + t('sinPermiso') : c === 'sin-camara' ? '📷 ' + t('sinCamara') : c === 'error' ? '📷 ' + t('error') : '📷 ' + t('seg');
    const n = S.personas;
    const quien = n ? ('👥 ' + n + ' · ' + t(n > 1 ? 'grp' : 'ind') + (s.genero ? ' · ' + t(s.genero) : '') + (s.edad ? ' · ' + t(s.edad) : '')) : '👥 0 · ' + t('nadie');
    const v = varObj(S.variante), nom = (v.nombre && (v.nombre[cfg.lang] || v.nombre.es)) || S.variante;
    pill.querySelector('.l1').innerHTML = l1;
    pill.querySelector('.l2').textContent = (c === 'on' || c === 'simulada' || !S.lider) ? quien + '  →  ' + t('carta') + ': ' + nom : t('carta') + ': ' + nom;
    pill.querySelector('.l3').textContent = t('avisoLargo');
    pill.classList.toggle('aviso', c === 'sin-permiso' || c === 'sin-camara' || c === 'error');
  }

  /* ── API ── */
  function pedido(id, numero) {
    if (!S.activo || !id) return;
    if (!S.lider) { try { bc && bc.postMessage({ t: 'pedido', tienda: S.tienda, id, numero }); } catch (_) {} return; }
    if (S.visita) { S.visita.pedido = String(id).slice(0, 64); if (numero) S.visita.pedidoNum = String(numero).slice(0, 8); return; }
    const u = S.ultima; if (u && Date.now() - u.fin < 120000) { u.pedido = id; enviar({ tipo: 'pedido', visita: u.id, tienda: S.tienda, pedido: String(id).slice(0, 64), pedido_num: numero ? String(numero).slice(0, 8) : undefined }); }
  }
  function init(o) {
    cfg = Object.assign(cfg, o || {});
    if (!S.activo) return false;
    let tienda = slug(o.tienda || 'tienda', 80);
    if (S.simulada && !/-qa$/.test(tienda)) tienda = QA;   // la simulación NUNCA escribe en la tienda real
    S.tienda = tienda;
    S.origen = /-qa$/.test(tienda) ? 'qa' : 'real';
    S.canal = o.host === 'gemelo' ? 'gemelo' : 'quiosco';
    let dev = slug(P.get('device') || '', 60);
    if (!dev) { if (S.canal === 'gemelo') dev = 'gemelo-totem'; else { try { dev = localStorage.getItem('aud:dispositivo') || ''; if (!dev) { dev = 'totem-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('aud:dispositivo', dev); } } catch (_) { dev = 'totem-web'; } } }
    S.dispositivo = dev;
    pintar();
    escuchar();
    cargarReglas().then(() => {
      aplicar({ personas: 0 }, { regla: null, variante: S.reglas.por_defecto || 'general' });
      setInterval(cargarReglas, 60000);
      const lock = 'kiosko-audiencia:' + S.tienda;
      if (navigator.locks && navigator.locks.request) navigator.locks.request(lock, () => new Promise(() => { serLider(); })).catch(() => serLider());
      else serLider();
      pintar();
    });
    addEventListener('pagehide', () => { if (S.lider) cerrarVisita(true); parar(); });
    return true;
  }
  window.KioskoSegmento = {
    activo: ACTIVO, init, pedido,
    lang(l) { cfg.lang = l === 'en' ? 'en' : 'es'; pintar(); },
    variante: () => varObj(S.variante),
    destacados: () => (varObj(S.variante).destacados || []),
    get estado() { return { activo: S.activo, lider: S.lider, camara: S.camara, tienda: S.tienda, origen: S.origen, dispositivo: S.dispositivo, personas: S.personas, segmento: S.segmento, variante: S.variante, regla: S.regla, visita: S.visita && S.visita.id, reglas: S.reglasDe || null, backend: S.backend || null, enviadas: S.enviadas.slice(-10), errores: S.errores.slice(-5) }; },
  };
})();
