// Gemelo digital del iPhone Duo FÍSICO (plegable de dos pantallas, abierto como mini portátil) · Carlos, 24-nov-2026.
// Misma lógica que ../iphone-duo/twin.mjs (gemelo ThinkPad X1); sólo cambia el modelo 3D (phone3d.mjs) y la máquina.
// Mismo comportamiento que LaptopDeckView/AdmiraLidPlayerView del Duo real:
// 1–9/0, N/P, i, M, Q, Esc, TV·WIN, flechas, barra ⏯ y Fn, con los mismos pitidos de 8 bits.
// Modelo 3D (three.js, phone3d.mjs): el teléfono de titanio con bisagra; arriba el monitor Lenovo de la app con el player real (CSS3D).
import { crearEscena } from './phone3d.mjs?v=duof-1';
import { crearSync } from '../iphone-duo/sync.mjs?v=tele-1';
const CANAL = 'https://admira.tv';
const SCREEN = 'iphone-duo';
const MACHINE = 'gemelo-iphone-duo-fisico-ainimation';
const LS = { on: 'duof.twin.player', stop: 'duof.twin.detenido', mute: 'duof.twin.silencio' };
const $ = (id) => document.getElementById(id);
const frame = $('canal'), win = $('win'), ficha = $('ficha'), now = $('now');

let escena = null;
const st = {
  on: localStorage.getItem(LS.on) !== '0',
  detenido: localStorage.getItem(LS.stop) === '1',
  mute: localStorage.getItem(LS.mute) === '1',
  fn: false, caps: false, tecla: null, url: '', info: null, gesto: false, winText: '',
};

function canalURL(extra = {}) {
  const u = new URL(CANAL + '/canal');
  const q = { screen: SCREEN, chrome: '0', fit: 'contain', machine: MACHINE, freshbadge: '0', ...extra };
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
}
st.url = canalURL();

// ── Pitidos de 8 bits: onda cuadrada, mismas notas que la clase Pitido de la app ─────────────────────
const NOTAS = {
  siguiente: [[880, .055], [1320, .075]], anterior: [[660, .055], [440, .075]],
  info: [[1047, .04], [1568, .04], [2093, .07]],
  silencio: [[330, .05], [165, .09]], sonido: [[330, .05], [659, .09]],
  quit: [[784, .05], [523, .05], [262, .10]], arranque: [[262, .045], [330, .045], [392, .045], [523, .09]],
  adelante: [[1175, .04], [1397, .04]], atras: [[587, .04], [494, .04]],
  ultima: [[523, .03], [784, .03], [1047, .06]], primera: [[1047, .03], [784, .03], [523, .06]],
  pausa: [[440, .05], [0, .03], [440, .05]], reanuda: [[880, .05], [0, .03], [880, .05]],   // barra ⏯ (hz 0 = silencio)
};
let ac = null;
function pitido(nombre) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime + 0.01;
    for (const [hz, seg] of NOTAS[nombre] || []) {
      if (hz <= 0) { t += seg; continue; }
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = hz;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.003);
      g.gain.setValueAtTime(0.16, t + Math.max(0.004, seg - 0.01)); g.gain.linearRampToValueAtTime(0, t + seg);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + seg + 0.01); t += seg;
    }
  } catch (_) {}
  window.__duoLog?.push('pitido ' + nombre);
}

// ── Puente con el canal (postMessage, el mismo que usa el panel de admira.tv) ───────────────────────
const pend = new Map();
window.addEventListener('message', (e) => {
  if (e.origin !== CANAL || e.source !== frame.contentWindow) return;
  const d = e.data || {};
  if (d.source !== 'admira-tv-canal' || !d.requestId || !pend.has(d.requestId)) return;
  pend.get(d.requestId)(d); pend.delete(d.requestId);
});
function canal(command, timeout = 5000) {
  return new Promise((resolve) => {
    if (!st.on || !frame.contentWindow) return resolve({ ok: false, message: 'player parado' });
    const requestId = 'duo-' + Math.random().toString(36).slice(2);
    pend.set(requestId, resolve);
    setTimeout(() => { if (pend.delete(requestId)) resolve({ ok: false, message: 'sin respuesta' }); }, timeout);
    frame.contentWindow.postMessage({ source: 'admira-tv-panel', command, requestId }, CANAL);
  });
}

// ── Player / Windows ─────────────────────────────────────────────────────────────────────────────
function cargar(url) { st.url = url; if (st.on) frame.src = url; }
function pintar() {
  frame.hidden = !st.on; win.hidden = st.on;
  if (!st.on && frame.src !== 'about:blank') frame.src = 'about:blank';     // como la app: fuera de la tapa no suena ni descarga
  if (st.on && (!frame.src || frame.src === 'about:blank')) frame.src = st.url;
  localStorage.setItem(LS.on, st.on ? '1' : '0');
  localStorage.setItem(LS.stop, st.detenido ? '1' : '0');
  escena?.refrescar(st);                                                // Fn/Caps encendidas e iconos ⏭ ⏮ ⏯ 🔇 de las teclas
  $('winText').textContent = st.winText + '▌';
  $('winNote').hidden = !st.winText;                                     // el Bloc de notas sólo aparece al teclear en Windows
}
frame.addEventListener('load', () => {
  if (!st.on || frame.src === 'about:blank') return;
  setTimeout(() => { if (st.mute) canal('mute'); else if (st.gesto) canal('unmute'); estadoPronto(); }, 1500);
});

async function pausa() {
  const r = await canal('togglepause');
  if (!r.ok) return;
  pitido(r.paused ? 'pausa' : 'reanuda'); st.pausado = !!r.paused; setTimeout(estado, 200);
}
function salir() { st.info = null; ficha.hidden = true; st.detenido = false; st.on = false; pintar(); }
// Desde el escritorio de Windows (tras Esc): Esc otra vez, TV·WIN, 0 o 1–9 devuelven el player a la tapa, como en el Duo.
function volver() { cerrarFicha(); st.detenido = false; st.on = true; pintar(); estadoPronto(); }
async function volverA(n) {                                             // espera a que el canal conteste (hasta 15 s) y pone la pieza de la tecla
  for (let i = 0; i < 15 && n > 0 && !listaBase.length && st.on; i++) await new Promise(r => setTimeout(r, 1000));
  if (st.on) pulsar(n);
}
function quitar() {
  st.info = null; ficha.hidden = true; st.tecla = null; st.url = canalURL();
  pitido('quit'); st.detenido = true; st.on = false; pintar(); estado('Player parado con Q · otra Q lo arranca');
}
function arrancar() {
  st.tecla = null; st.url = canalURL(); pitido('arranque'); st.detenido = false; st.on = true; pintar(); estadoPronto();
}

// 1–9: la pieza con campaign:teclaN (o teclaN); si ninguna, la N-ésima. 0: programación normal.
const metaCache = new Map();
async function meta(id) {
  if (!/^[0-9]{10,}-[a-z0-9]{3,12}$/.test(id)) return null;
  if (!metaCache.has(id)) metaCache.set(id, fetch(`https://stock.admira.store/stock/${id}/meta.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  return metaCache.get(id);
}
const idLimpio = (v) => String(v || '').replace(/^default:/, '').replace(/^stock-/, '');
let listaBase = [];
async function pulsar(n) {
  if (n === 0) { st.tecla = null; cargar(canalURL()); return; }
  if (!listaBase.length) { const s = await canal('state'); if (s.ok && s.state) listaBase = s.state.items.map(x => idLimpio(x.id)); }
  if (!listaBase.length) return;
  const metas = await Promise.all(listaBase.map(meta));
  const clave = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
  let i = metas.findIndex(m => (m?.tags || []).some(t => ['tecla' + n, 'campaigntecla' + n].includes(clave(t))));
  if (i < 0) i = n - 1;
  const id = listaBase[i]; if (!id) return;                          // sin pieza para esa tecla: no pasa nada
  st.tecla = n; cargar(canalURL({ ids: id }));
}
function mover(paso) {
  if (st.tecla) { const n = st.tecla + paso; if (n >= 1 && n <= 9) pulsar(n); return; }
  canal(paso > 0 ? 'next' : 'prev').then(() => setTimeout(estado, 900));
}

// ── Ficha i ──────────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (s) => s > 0 && isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}` : '—';
async function abrirFicha() {
  pitido('info');
  st.info = { cargando: true }; ficha.hidden = false;
  ficha.innerHTML = '<div><span class="g">▶ EN EMISIÓN</span><h3>Leyendo el player…</h3></div>';
  let s = await canal('state');
  for (let k = 0; k < 2 && !s.ok && st.info; k++) s = await canal('state');   // el canal puede tardar si está cargando un vídeo
  if (!st.info) return;
  const S = s.ok ? s.state : null;
  const it = S && S.items[S.cur] || null;
  const id = idLimpio(it?.id);
  let org = ''; try { const u = new URL(it.url); org = u.host + ' · ' + decodeURIComponent(u.pathname.split('/').pop()); } catch (_) {}
  const info = {
    pos: S ? `${S.cur + 1}/${S.n}` : '—', titulo: it?.title || (S ? 'Nada en emisión' : 'Sin datos del canal'), pieza: id, num: '',
    formato: it ? it.type + (S.w && S.h ? ` · ${S.w}×${S.h} · ${S.w >= S.h ? 'horizontal' : 'vertical'}` : '') : '',
    dur: mmss(S?.duration), origen: org.split(' · ')[0] || '', archivo: org, tags: [], S,
  };
  st.info = info; dibujarFicha();
  const m = await meta(id);
  if (m && st.info === info) {
    if (m.num) info.num = '#' + m.num;
    if (Array.isArray(m.tags)) info.tags = m.tags;
    let host = ''; try { host = new URL(m.prompt).host.replace(/^www\./, ''); } catch (_) {}
    info.origen = ['Stock admira.studio', m.motor, host].filter(Boolean).join(' · ');
    dibujarFicha();
  }
}
function dibujarFicha() {
  const f = st.info; if (!f || f.cargando) return;
  const S = f.S, items = S?.items || [], c = S ? S.cur : -1, ventana = 9;
  const ini = Math.max(0, Math.min(c - 4, items.length - ventana)), fin = Math.min(items.length, ini + ventana);
  const filas = items.slice(ini, fin).map((x, k) => `<li class="${ini + k === c ? 'on' : ''}">${ini + k === c ? '▶' : '&nbsp;'} ${ini + k + 1}. ${esc(x.title || idLimpio(x.id))}</li>`).join('');
  const row = (k, v) => `<div class="row"><span>${k}</span><span>${esc(v || '—')}</span></div>`;
  ficha.innerHTML = `<div><span class="g">▶ EN EMISIÓN&nbsp; ${esc(f.pos)}</span><h3>${esc(f.titulo)}</h3>`
    + row('PIEZA', [f.num, f.pieza].filter(Boolean).join(' · ')) + row('FORMATO', f.formato) + row('DURACIÓN', f.dur)
    + row('ORIGEN', f.origen) + row('ARCHIVO', f.archivo) + row('PANTALLA', SCREEN) + row('AUDIO', st.mute ? 'silenciado (M)' : 'con sonido')
    + (f.tags.length ? `<div class="tags">${esc(f.tags.map(t => '#' + t).join(' '))}</div>` : '') + '</div>'
    + `<div><span class="g">PLAYLIST · ${S ? S.n : 0} ${S && S.n === 1 ? 'pieza' : 'piezas'}</span><ol>${filas}</ol>${S && S.n > fin - ini ? `<div class="more">… +${S.n - (fin - ini)} más</div>` : ''}</div>`
    + '<span class="hint">i · cualquier tecla cierra</span>';
}
function cerrarFicha() { st.info = null; ficha.hidden = true; ficha.innerHTML = ''; }

async function estado(texto) {
  if (texto) { now.textContent = texto; return; }
  if (!st.on) { now.textContent = st.detenido ? 'Player parado con Q · otra Q lo arranca' : 'Escritorio de Windows 11 · Esc, TV·WIN o 1–9 vuelven al player'; return; }
  const s = await canal('state');
  if (!s.ok || !s.state) return false;
  const S = s.state, it = S.items[S.cur];
  listaBase = st.tecla ? listaBase : S.items.map(x => idLimpio(x.id));
  now.textContent = `▶ ${S.cur + 1}/${S.n} · ${it ? it.title : '—'}${st.tecla ? ` · tecla ${st.tecla}` : ''}${S.muted || st.mute ? ' · 🔇' : ''}${S.paused ? ' · ⏸ en pausa' : ''}`;
  return true;
}
// Tras cargar o arrancar, el canal tarda unos segundos en contestar: reintenta cada segundo hasta 15 veces.
let pronto = 0;
async function estadoPronto() {
  const yo = ++pronto;
  if (st.on) now.textContent = 'Cargando el player de admira.tv…';
  for (let i = 0; i < 15 && yo === pronto; i++) { if (!st.on) { estado(); return; } if (await estado()) return; await new Promise(r => setTimeout(r, 1000)); }
}
setInterval(() => { if (!document.hidden) estado(); }, 5000);

// ── Teclado: mismas reglas que handleKeyDown de la app ───────────────────────────────────────────────
function tecla(k, ch) {
  if (!st.gesto) { st.gesto = true; if (st.on && !st.mute) canal('unmute'); }
  window.__duoLog?.push('tecla ' + k);
  if (st.info) { cerrarFicha(); tx('infoclose'); return; }             // con la ficha abierta, cualquier tecla sólo la cierra
  if (k === 'fn') { st.fn = !st.fn; pintar(); return; }
  if (k === 'caps') { st.caps = !st.caps; pintar(); return; }
  const player = st.on && !st.fn;
  if (!st.on && !st.fn && st.detenido && k === 'q') { tx('start'); arrancar(); return; }
  if (!st.on && !st.fn && !st.detenido) {
    if (k === 'escape') { tx('tv'); volver(); return; }
    if (/^[0-9]$/.test(k)) { const n = Number(k); tx('key', n); volver(); volverA(n); return; }
  }
  if (player) {
    if (/^[0-9]$/.test(k)) { tx('key', Number(k)); pulsar(Number(k)); return; }
    switch (k) {
      case 'n': tx('next'); pitido('siguiente'); mover(1); return;
      case 'p': tx('prev'); pitido('anterior'); mover(-1); return;
      case 'i': tx('info'); abrirFicha(); return;
      case 'm': tx(st.mute ? 'unmute' : 'mute'); st.mute = !st.mute; localStorage.setItem(LS.mute, st.mute ? '1' : '0'); pitido(st.mute ? 'silencio' : 'sonido'); canal(st.mute ? 'mute' : 'unmute'); pintar(); setTimeout(estado, 300); return;
      case 'q': tx('stop'); quitar(); return;
      case 'space': tx('togglepause'); pausa(); return;                                     // ⏯ pausa / reanuda la pieza (Fn+Espacio va a Windows)
      case 'escape': tx('win'); salir(); estado(); return;
      case 'right': tx('seek', 10); pitido('adelante'); canal('seek 10'); return;
      case 'left': tx('seek', -10); pitido('atras'); canal('seek -10'); return;
      case 'up': tx('last'); pitido('ultima'); canal('last').then(() => setTimeout(estado, 900)); return;
      case 'down': tx('first'); pitido('primera'); canal('first').then(() => setTimeout(estado, 900)); return;
    }
    return;                                                              // el resto, con el player en la tapa, no hace nada
  }
  // Windows (simulado): lo que se teclee va al Bloc de notas.
  if (!st.on) {
    if (k === 'backspace') st.winText = st.winText.slice(0, -1);
    else if (k === 'enter') st.winText += '\n';
    else if (k === 'space') st.winText += ' ';
    else if (k === 'tab') st.winText += '    ';
    else if (ch && ch.length === 1) st.winText += st.caps ? ch.toUpperCase() : ch;
    st.winText = st.winText.slice(-600); pintar();
  }
}


// ── Modelo 3D: teclas pulsables, TV·WIN en la barbilla y bisagra ────────────────────────────────────
// Si el navegador no puede con WebGL (o pierde el contexto), vista plana: el mismo player y las mismas teclas.
function vistaPlana(motivo) {
  const host = $('escena'), panel = $('panel');
  host.classList.add('sin-3d');
  if (panel.parentElement !== host) { panel.style.transform = ''; host.append(panel); }
  const aviso = $('aviso3d'); if (aviso) { aviso.hidden = false; aviso.textContent = 'Vista plana · tu navegador no ha podido pintar el 3D (' + motivo + '). Las teclas funcionan igual con tu teclado.'; }
  window.__duoLog?.push('vista plana: ' + motivo);
}
try {
  escena = crearEscena({
    host: $('escena'), panel: $('panel'),
    alPulsar: (k, ch) => tecla(k, ch),
    alTvWin: () => tvwin(),
    alPerderContexto: () => vistaPlana('contexto WebGL perdido'),
  });
} catch (err) {
  escena = null; vistaPlana(String(err && err.message || err).slice(0, 80));
}
function tvwin() {
  if (!st.gesto) st.gesto = true;
  cerrarFicha(); st.detenido = false; st.on = !st.on; tx(st.on ? 'tv' : 'win'); pintar(); estadoPronto();
}
$('tvwinBtn')?.addEventListener('click', tvwin);
const bisagra = $('bisagra');
bisagra?.addEventListener('input', () => { escena?.bisagra(Number(bisagra.value)); $('bisagraVal').textContent = bisagra.value + '°'; });
$('vista')?.addEventListener('click', () => escena?.encuadrar());

// Teclado físico: mismo mapa (Fn no existe en un teclado normal: se usa la tecla Fn del modelo).
const CODES = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Escape: 'escape', Backspace: 'backspace', Enter: 'enter', Tab: 'tab', Space: 'space', CapsLock: 'caps' };
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;                        // atajos del navegador intactos
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  let k = CODES[e.code] || CODES[e.key];
  if (!k && /^Key[A-Z]$/.test(e.code)) k = e.code.slice(3).toLowerCase();
  if (!k && /^Digit[0-9]$/.test(e.code)) k = e.code.slice(5);
  if (!k && e.key.length === 1) k = e.key.toLowerCase();
  if (!k) return;
  e.preventDefault();
  escena?.hundir(k);
  tecla(k, e.key.length === 1 ? e.key : null);
});

// Reloj de la barra de tareas simulada
const reloj = () => { const d = new Date(); $('winClock').textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); $('winDate').textContent = d.toLocaleDateString('es-ES'); };
reloj(); setInterval(reloj, 30000);

// ── Telemetría con el iPhone Duo físico (Carlos, 25-nov-2026 11:09: «son gemelos y actúan iguales») ─────────────────
// Cada orden de este gemelo sale al canal /api/twin-sync; el Duo la aplica y publica su estado, y este gemelo se alinea
// con él (el físico manda). Si el Duo no está en línea, los gemelos abiertos se siguen entre sí con las mismas órdenes.
let ultimaLocal = 0;
function tx(action, arg = null) { ultimaLocal = Date.now(); sync?.enviar(action, arg); }
function aplicarOrden(ev) {                                            // orden de OTRO gemelo (sin Duo en línea)
  window.__duoLog?.push('← ' + ev.action + (ev.arg != null ? ' ' + ev.arg : ''));
  if (st.info && ev.action !== 'info') cerrarFicha();
  switch (ev.action) {
    case 'key': if (!st.on) { volver(); if (ev.arg > 0) volverA(ev.arg); else pulsar(0); } else pulsar(ev.arg); return;
    case 'next': pitido('siguiente'); mover(1); return;
    case 'prev': pitido('anterior'); mover(-1); return;
    case 'togglepause': pausa(); return;
    case 'pause': case 'resume': canal(ev.action); return;
    case 'seek': canal('seek ' + ev.arg); return;
    case 'first': case 'last': canal(ev.action).then(() => setTimeout(estado, 900)); return;
    case 'mute': case 'unmute': st.mute = ev.action === 'mute'; localStorage.setItem(LS.mute, st.mute ? '1' : '0'); canal(ev.action); pintar(); return;
    case 'stop': quitar(); return;
    case 'start': arrancar(); return;
    case 'win': if (st.on) { salir(); estado(); } return;
    case 'tv': if (!st.on) volver(); return;
    case 'info': if (st.on && !st.info) abrirFicha(); return;
    case 'infoclose': cerrarFicha(); return;
  }
}
let alineando = false;
async function alinear(d) {                                            // el gemelo copia el estado del Duo físico
  if (!d || !sync?.enLinea() || alineando || Date.now() - ultimaLocal < 1500) return;
  alineando = true;
  try {
    if (d.stopped) { if (!st.detenido) quitar(); return; }
    if (!d.on) { if (st.on) { salir(); estado(); } return; }
    if (!st.on) { if (st.detenido) arrancar(); else volver(); return; }
    if (d.muted !== st.mute) { st.mute = d.muted; localStorage.setItem(LS.mute, st.mute ? '1' : '0'); canal(st.mute ? 'mute' : 'unmute'); pintar(); }
    if (d.info && !st.info) abrirFicha(); else if (!d.info && st.info) cerrarFicha();
    if ((d.key || null) !== (st.tecla || null)) { pulsar(d.key || 0); return; }
    const s = await canal('state'); if (!s.ok || !s.state) return;
    const S = s.state;
    if (!d.key && d.id) { const i = S.items.findIndex(x => idLimpio(x.id) === idLimpio(d.id)); if (i >= 0 && i !== S.cur) { await canal('goto ' + i); setTimeout(estado, 600); } }
    if (d.paused !== !!S.paused) canal(d.paused ? 'pause' : 'resume');
  } finally { alineando = false; }
}
function pintarDuo(d, enLinea) {
  const el = $('duoFisico'); if (!el) return;
  if (!d || !enLinea) { el.textContent = 'iPhone Duo físico: sin señal · los gemelos abiertos se siguen entre sí'; el.classList.remove('on'); return; }
  const que = d.stopped ? 'parado con Q' : !d.on ? 'en Windows' : `${d.paused ? '⏸' : '▶'} ${d.index >= 0 && d.total ? (d.index + 1) + '/' + d.total + ' · ' : ''}${d.title || '—'}${d.key ? ' · tecla ' + d.key : ''}${d.muted ? ' · 🔇' : ''}${d.info ? ' · ficha i' : ''}`;
  el.textContent = 'iPhone Duo físico · en línea: ' + que; el.classList.add('on');
}
const sync = crearSync({
  screen: SCREEN,
  alOrden: (ev, { duoEnLinea }) => { if (!duoEnLinea) aplicarOrden(ev); },
  alEstado: (d, { enLinea }) => { pintarDuo(d, enLinea); alinear(d); },
  log: (m) => window.__duoLog?.push(m),
});
setInterval(() => { pintarDuo(sync.duo, sync.enLinea()); alinear(sync.duo); }, 3000);

window.__duo = { st, tecla, canal, escena, sync };
pintar(); estadoPronto();
