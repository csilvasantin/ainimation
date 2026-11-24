// Gemelo digital del iPhone Duo plegado · app WindowsiOS (ThinkPad X1) · Carlos, 24-nov-2026.
// Mismo comportamiento que LaptopDeckView/AdmiraLidPlayerView del Duo real:
// 1–9/0, N/P, i, M, Q, Esc, TV·WIN, flechas y Fn, con los mismos pitidos de 8 bits.
const CANAL = 'https://admira.tv';
const SCREEN = 'iphone-duo';
const MACHINE = 'gemelo-iphone-duo-ainimation';
const LS = { on: 'duo.twin.player', stop: 'duo.twin.detenido', mute: 'duo.twin.silencio' };
const $ = (id) => document.getElementById(id);
const frame = $('canal'), win = $('win'), ficha = $('ficha'), now = $('now');

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
};
let ac = null;
function pitido(nombre) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime + 0.01;
    for (const [hz, seg] of NOTAS[nombre] || []) {
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
  document.querySelector('[data-k="fn"]')?.classList.toggle('lit', st.fn);
  document.querySelector('[data-k="caps"]')?.classList.toggle('lit', st.caps);
  $('winText').textContent = st.winText + '▌';
}
frame.addEventListener('load', () => {
  if (!st.on || frame.src === 'about:blank') return;
  setTimeout(() => { if (st.mute) canal('mute'); else if (st.gesto) canal('unmute'); estadoPronto(); }, 1500);
});

function salir() { st.info = null; ficha.hidden = true; st.detenido = false; st.on = false; pintar(); }
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
  if (!st.on) { now.textContent = st.detenido ? 'Player parado con Q · otra Q lo arranca' : 'Windows · TV·WIN vuelve al player'; return; }
  const s = await canal('state');
  if (!s.ok || !s.state) return false;
  const S = s.state, it = S.items[S.cur];
  listaBase = st.tecla ? listaBase : S.items.map(x => idLimpio(x.id));
  now.textContent = `▶ ${S.cur + 1}/${S.n} · ${it ? it.title : '—'}${st.tecla ? ` · tecla ${st.tecla}` : ''}${S.muted || st.mute ? ' · 🔇' : ''}`;
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
  if (st.info) { cerrarFicha(); return; }                              // con la ficha abierta, cualquier tecla sólo la cierra
  if (k === 'fn') { st.fn = !st.fn; pintar(); return; }
  if (k === 'caps') { st.caps = !st.caps; pintar(); return; }
  const player = st.on && !st.fn;
  if (!st.on && !st.fn && st.detenido && k === 'q') { arrancar(); return; }
  if (player) {
    if (/^[0-9]$/.test(k)) { pulsar(Number(k)); return; }
    switch (k) {
      case 'n': pitido('siguiente'); mover(1); return;
      case 'p': pitido('anterior'); mover(-1); return;
      case 'i': abrirFicha(); return;
      case 'm': st.mute = !st.mute; localStorage.setItem(LS.mute, st.mute ? '1' : '0'); pitido(st.mute ? 'silencio' : 'sonido'); canal(st.mute ? 'mute' : 'unmute'); setTimeout(estado, 300); return;
      case 'q': quitar(); return;
      case 'escape': salir(); estado(); return;
      case 'right': pitido('adelante'); canal('seek 10'); return;
      case 'left': pitido('atras'); canal('seek -10'); return;
      case 'up': pitido('ultima'); canal('last').then(() => setTimeout(estado, 900)); return;
      case 'down': pitido('primera'); canal('first').then(() => setTimeout(estado, 900)); return;
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

// ── Dibujo del teclado ThinkPad (mismas filas que LaptopDeckView) ───────────────────────────────────
const FN = [['escape', 'Esc'], ['start', '⊞'], ['search', '⌕'], ['explorer', '🗀'], ['edge', '◍'], ['ag', '✦'], ['paint', '✎'], ['task', '▭'], ['mouse', '◫'], ['rclick', '⟲'], ['split', '◧'], ['rotate', '⧉'], ['full', '⤢'], ['del', 'Del']];
const ROWS = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], ['backspace', '⌫', 1.65]],
  [['tab', 'Tab', 1.48], ['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p'], ['[', '{'], [']', '}'], ['\\', '|', 1.17]],
  [['caps', 'Caps', 1.75], ['a'], ['s'], ['d'], ['f', null, 1, 1], ['g'], ['h'], ['j', null, 1, 1], ['k'], ['l'], [';', ':'], ["'", '"'], ['enter', 'Enter', 1.9]],
  [['lshift', 'Shift', 2.22], ['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m'], [',', '<'], ['.', '>'], ['/', '?'], ['rshift', 'Shift', 2.42]],
  [['fn', 'Fn', 1.1], ['lctrl', 'Ctrl', 1.25], ['win', '⊞', 1.2], ['lalt', 'Alt', 1.2], ['space', '', 4.45], ['ralt', 'Alt', 1.05], ['rctrl', 'Ctrl', 1.05], ['left', '‹', 1.05], ['updown', null, 1.05], ['right', '›', 1.05]],
];
const keysEl = $('keys');
function boton(k, top, sub, w = 1, home = 0) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'k' + (top && top.length > 2 ? ' wide' : '') + (home ? ' home' : ''); b.dataset.k = k;
  b.style.setProperty('--w', w);
  b.setAttribute('aria-label', k);
  b.innerHTML = (sub ? `<small>${esc(sub)}</small>` : '') + esc(top ?? '');
  return b;
}
{
  const fr = document.createElement('div'); fr.className = 'krow fnrow';
  for (const [k, l] of FN) fr.append(boton(k, l));
  keysEl.append(fr);
  for (const row of ROWS) {
    const r = document.createElement('div'); r.className = 'krow';
    for (const [k, l, w, home] of row) {
      if (k === 'updown') {
        const s = document.createElement('div'); s.className = 'updown';
        s.append(boton('up', '⌃', null), boton('down', '⌄', null)); r.append(s); continue;
      }
      const single = k.length === 1;
      const label = single && /[a-z]/.test(k) ? k.toUpperCase() : (l === undefined || l === null || single ? k : l);
      const sub = single && l && !/[a-z]/.test(k) ? l : null;
      r.append(boton(k, label, sub, w || 1, home));
    }
    keysEl.append(r);
  }
  const tp = document.createElement('i'); tp.className = 'trackpoint'; keysEl.parentElement.append(tp);
  const colocar = () => {                                               // TrackPoint entre G, H y B
    const g = keysEl.querySelector('[data-k="g"]'), h = keysEl.querySelector('[data-k="h"]'), deck = keysEl.parentElement.getBoundingClientRect();
    if (!g || !h) return; const a = g.getBoundingClientRect(), c = h.getBoundingClientRect();
    tp.style.left = ((a.right + c.left) / 2 - deck.left) + 'px'; tp.style.top = (a.bottom - deck.top + 1) + 'px';
  };
  new ResizeObserver(colocar).observe(keysEl); colocar();
}
keysEl.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.k'); if (!b) return;
  e.preventDefault(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120);
  const k = b.dataset.k;
  const ch = k.length === 1 ? k : null;
  tecla(k === 'del' ? 'delete' : k, ch);
});
$('tvwin').addEventListener('click', () => {
  if (!st.gesto) st.gesto = true;
  cerrarFicha(); st.detenido = false; st.on = !st.on; pintar(); estadoPronto();
});

// Teclado físico: mismo mapa (Fn no existe en un teclado normal: se usa la tecla Fn del dibujo).
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
  const b = keysEl.querySelector(`[data-k="${CSS.escape(k)}"]`);
  if (b) { b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); }
  tecla(k, e.key.length === 1 ? e.key : null);
});

// Reloj de la barra de tareas simulada
const reloj = () => { $('winClock').textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };
reloj(); setInterval(reloj, 30000);

window.__duo = { st, tecla, canal };
pintar(); estadoPronto();
