// Gemelo 3D del iPhone Duo plegado (app «Windows 11» · ThinkPad X1) · Carlos, 24-nov-2026.
// Clamshell procedural en three.js (milímetros): base con teclado 3D, TrackPoint, botones y trackpad; bisagra y tapa
// con la pantalla. La pantalla NO es una textura: es el propio player de admira.tv (iframe) colocado en 3D con CSS3D,
// así se ve en directo, con sonido, la ficha «i» y el Windows simulado. Cada tecla se hunde al pulsarla.
// Iconos multimedia clásicos sólo en las teclas (M 🔊/🔇, N ⏭, P ⏮, barra ⏯), nunca sobre el contenido.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addObjectFloor } from '../floor-grid.mjs?v=1';

// Mismas filas que LaptopDeckView del Duo (barra espaciadora larga de ThinkPad: 5,40 con Ctrl/Win/Alt estrechas).
export const FN = [['escape', 'Esc'], ['start', '⊞'], ['search', '⌕'], ['explorer', '▤'], ['edge', '◍'], ['ag', '✦'], ['paint', '✎'], ['task', '▭'], ['mouse', '◫'], ['rclick', '⟲'], ['split', '◧'], ['rotate', '⧉'], ['full', '⤢'], ['del', 'Del']];
export const ROWS = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], ['backspace', '⌫', 1.65]],
  [['tab', 'Tab', 1.48], ['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p'], ['[', '{'], [']', '}'], ['\\', '|', 1.17]],
  [['caps', 'Caps', 1.75], ['a'], ['s'], ['d'], ['f', null, 1, 1], ['g'], ['h'], ['j', null, 1, 1], ['k'], ['l'], [';', ':'], ["'", '"'], ['enter', 'Enter', 1.9]],
  [['lshift', 'Shift', 2.22], ['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m'], [',', '<'], ['.', '>'], ['/', '?'], ['rshift', 'Shift', 2.42]],
  [['fn', 'Fn', 1.0], ['lctrl', 'Ctrl', 1.0], ['win', '⊞', 1.0], ['lalt', 'Alt', 1.0], ['space', '', 5.4], ['ralt', 'Alt', 0.9], ['rctrl', 'Ctrl', 0.9], ['left', '‹', 1.05], ['updown', null, 1.05], ['right', '›', 1.05]],
];
/** Icono multimedia de una tecla según el estado (sólo con el player en la tapa, como en el Duo). */
export function iconoTecla(k, s) {
  if (!s || !s.on) return null;
  if (k === 'm') return s.mute ? 'mudo' : 'altavoz';
  return { n: 'siguiente', p: 'anterior', space: 'playpausa' }[k] || null;
}

const B = { w: 310, d: 217, h: 14 };          // base (mm)
const L = { w: 310, h: 205, t: 5, chin: 13, top: 12 };
const PANTALLA = { w: 288, h: 180, px: 1280 };  // 16:10 · el iframe se pinta a 1280 × 800 px
const KB = { w: 276, z0: -B.d / 2 + 17, gap: 2.3, fnD: 11.5, d: 16.6, alto: 3.2 };

// ── Atlas de rótulos (una textura para todas las teclas) ─────────────────────────────────────────────
const CELDA = 128, LADO = 16;
const atlas = document.createElement('canvas'); atlas.width = atlas.height = CELDA * LADO;
const actx = atlas.getContext('2d');
const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = 8;

function dibujarIcono(c, nombre, cx, cy, s) {
  c.save(); c.translate(cx, cy); c.fillStyle = c.strokeStyle = '#f1f1f1'; c.lineWidth = s * .11; c.lineCap = c.lineJoin = 'round';
  const tri = (x, dir) => { c.beginPath(); c.moveTo(x, -s * .32); c.lineTo(x + dir * s * .38, 0); c.lineTo(x, s * .32); c.closePath(); c.fill(); };
  if (nombre === 'siguiente') { tri(-s * .48, 1); tri(-s * .1, 1); c.fillRect(s * .3, -s * .32, s * .12, s * .64); }
  else if (nombre === 'anterior') { c.fillRect(-s * .42, -s * .32, s * .12, s * .64); tri(s * .1, -1); tri(s * .48, -1); }
  else if (nombre === 'playpausa') { tri(-s * .5, 1); c.fillRect(s * .05, -s * .32, s * .13, s * .64); c.fillRect(s * .3, -s * .32, s * .13, s * .64); }
  else if (nombre === 'altavoz' || nombre === 'mudo') {
    c.beginPath(); c.moveTo(-s * .5, -s * .14); c.lineTo(-s * .3, -s * .14); c.lineTo(-s * .05, -s * .36); c.lineTo(-s * .05, s * .36); c.lineTo(-s * .3, s * .14); c.lineTo(-s * .5, s * .14); c.closePath(); c.fill();
    if (nombre === 'altavoz') { for (const r of [.2, .36]) { c.beginPath(); c.arc(-s * .02, 0, s * r, -Math.PI / 4, Math.PI / 4); c.stroke(); } }
    else { c.beginPath(); c.moveTo(s * .1, -s * .16); c.lineTo(s * .42, s * .16); c.moveTo(s * .42, -s * .16); c.lineTo(s * .1, s * .16); c.stroke(); }
  }
  c.restore();
}
function pintarCelda(i, k, top, sub, home, s) {
  const x = (i % LADO) * CELDA, y = Math.floor(i / LADO) * CELDA, c = actx;
  c.clearRect(x, y, CELDA, CELDA); c.save(); c.translate(x, y);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f1f1f1';
  const icono = iconoTecla(k, s);
  if (icono && k === 'space') { c.globalAlpha = .72; dibujarIcono(c, icono, 64, 64, 54); }
  else if (icono) { c.globalAlpha = .82; dibujarIcono(c, icono, 64, 38, 40); c.globalAlpha = 1; c.font = '500 50px "Helvetica Neue", Arial, sans-serif'; c.fillText(top, 64, 86); }
  else if (sub) { c.globalAlpha = .55; c.font = '500 34px "Helvetica Neue", Arial, sans-serif'; c.fillText(sub, 64, 38); c.globalAlpha = 1; c.font = '500 46px "Helvetica Neue", Arial, sans-serif'; c.fillText(top, 64, 82); }
  else if (top) { c.font = `500 ${top.length > 2 ? 36 : top.length === 2 ? 44 : 56}px "Helvetica Neue", Arial, "Segoe UI Symbol", sans-serif`; c.fillText(top, 64, 66); }
  if (home) { c.globalAlpha = .55; c.fillRect(48, 108, 32, 5); }
  if ((k === 'fn' && s?.fn) || (k === 'caps' && s?.caps)) { c.globalAlpha = 1; c.fillStyle = '#5cff73'; c.shadowColor = '#5cff73'; c.shadowBlur = 14; c.beginPath(); c.arc(20, 20, 8, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

function textura(ancho, alto, dibujar) {
  const cv = document.createElement('canvas'); cv.width = ancho; cv.height = alto; dibujar(cv.getContext('2d'), ancho, alto);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const rotulo = (texto, px, color = '#ffffffb8') => textura(512, 128, (c, w, h) => {
  c.font = `700 ${px}px "Helvetica Neue", Arial, sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(texto, w / 2, h / 2);
});

export function crearEscena({ host, panel, alPulsar, alTvWin }) {
  const canvas = host.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const movil = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const css = new CSS3DRenderer(); css.domElement.className = 'css3d'; host.append(css.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1020');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  addObjectFloor(scene, -1, 50);
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#30343e', .9));
  const sol = new THREE.DirectionalLight('#ffffff', 1.4); sol.position.set(150, 420, 260); scene.add(sol);
  const relleno = new THREE.DirectionalLight('#ffe7cc', .5); relleno.position.set(-300, 160, -120); scene.add(relleno);

  const camera = new THREE.PerspectiveCamera(34, 1, 5, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 180; controls.maxDistance = 1500;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
  controls.target.set(0, 70, -30);

  const negro = new THREE.MeshStandardMaterial({ color: '#141417', roughness: .58, metalness: .12 });
  const tapaMat = new THREE.MeshStandardMaterial({ color: '#111114', roughness: .5, metalness: .15 });
  const teclaMat = new THREE.MeshStandardMaterial({ color: '#1e1e21', roughness: .66, metalness: .05 });
  const rojo = new THREE.MeshStandardMaterial({ color: '#d0140d', roughness: .45, emissive: '#3a0402' });
  const plano = (w, h, map, opts = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false, ...opts }));

  // Base
  const base = new THREE.Mesh(new RoundedBoxGeometry(B.w, B.h, B.d, 3, 5), negro); base.position.y = B.h / 2; scene.add(base);
  const deckMark = plano(34, 8.5, rotulo('ThinkPad', 92)); deckMark.rotation.x = -Math.PI / 2; deckMark.position.set(118, B.h + .05, B.d / 2 - 12); scene.add(deckMark);

  // Teclado 3D
  const teclas = new Map(), objetivos = [], celdas = new Map();
  const geoCache = new Map();
  const geo = (w, d) => { const id = w.toFixed(2) + 'x' + d.toFixed(2); if (!geoCache.has(id)) geoCache.set(id, new RoundedBoxGeometry(w, KB.alto, d, 2, 1.3)); return geoCache.get(id); };
  const labelMat = new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, toneMapped: false, depthWrite: false });
  let nCelda = 0;
  const estado = { on: true, mute: false, fn: false, caps: false };
  function crearTecla(k, top, sub, home, x, z, w, d) {
    const m = new THREE.Mesh(geo(w, d), teclaMat);
    m.position.set(x, B.h + KB.alto / 2 - .4, z); m.userData = { k, y0: m.position.y };
    const i = nCelda++, lado = Math.min(w, d) * .86;
    const g = new THREE.PlaneGeometry(lado, lado), uv = g.attributes.uv;
    const u0 = (i % LADO) / LADO, v0 = 1 - (Math.floor(i / LADO) + 1) / LADO, du = 1 / LADO;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) * du, v0 + uv.getY(j) * du);
    const lab = new THREE.Mesh(g, labelMat); lab.rotation.x = -Math.PI / 2; lab.position.y = KB.alto / 2 + .06; lab.userData = { k };
    m.add(lab); scene.add(m);
    celdas.set(k, { i, top, sub, home }); pintarCelda(i, k, top, sub, home, estado);
    teclas.set(k, m); objetivos.push(m);
    return m;
  }
  const filas = [FN.map(([k, l]) => [k, l, 1]), ...ROWS];
  let z = KB.z0;
  filas.forEach((fila, f) => {
    const d = f === 0 ? KB.fnD : KB.d;
    const suma = fila.reduce((a, r) => a + (r[2] || 1), 0);
    const util = KB.w - KB.gap * (fila.length - 1);
    let x = -KB.w / 2;
    for (const [k, l, w0, home] of fila) {
      const w = util * (w0 || 1) / suma, cx = x + w / 2, cz = z + d / 2;
      if (k === 'updown') {
        const h = (d - 1.2) / 2;
        crearTecla('up', '⌃', null, 0, cx, z + h / 2, w, h); crearTecla('down', '⌄', null, 0, cx, z + d - h / 2, w, h);
      } else {
        const single = k.length === 1;
        const top = f === 0 ? l : single && /[a-z]/.test(k) ? k.toUpperCase() : (l == null || single ? k : l);
        const sub = f > 0 && single && l && !/[a-z]/.test(k) ? l : null;
        crearTecla(k, top, sub, home, cx, cz, w, d);
      }
      x += w + KB.gap;
    }
    z += d + KB.gap;
  });
  atlasTex.needsUpdate = true;
  const kbFin = z;
  // TrackPoint entre G, H y B
  const g = teclas.get('g'), h = teclas.get('h'), b = teclas.get('b');
  const tp = new THREE.Mesh(new THREE.SphereGeometry(2.7, 20, 14), rojo);
  tp.position.set((g.position.x + h.position.x) / 2, B.h + KB.alto + .2, (g.position.z + b.position.z) / 2); tp.scale.y = .7; scene.add(tp);
  // Botones del TrackPoint y trackpad
  const zb = kbFin + 5;
  for (const [x, w] of [[-27, 36], [0, 16], [27, 36]]) {
    const bt = new THREE.Mesh(new RoundedBoxGeometry(w, 1.6, 8, 2, .8), teclaMat); bt.position.set(x, B.h + .5, zb); scene.add(bt);
    if (w > 20) { const r = new THREE.Mesh(new THREE.BoxGeometry(w - 3, .4, 1), rojo); r.position.set(x, B.h + 1.4, zb - 3.2); scene.add(r); }
  }
  const tpad = new THREE.Mesh(new RoundedBoxGeometry(104, 1, 60, 2, .5), new THREE.MeshStandardMaterial({ color: '#19191c', roughness: .35, metalness: .1 }));
  tpad.position.set(0, B.h + .1, zb + 8 + 30); scene.add(tpad);

  // Bisagra y tapa
  const piv = new THREE.Group(); piv.position.set(0, B.h, -B.d / 2 + 2); scene.add(piv);
  const bis = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 250, 24), negro); bis.rotation.z = Math.PI / 2; bis.position.set(0, -1, -2); piv.add(bis);
  const tapa = new THREE.Group(); piv.add(tapa);
  const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(L.w, L.h, L.t, 3, 2.4), tapaMat); cuerpo.position.set(0, L.h / 2, -L.t / 2); tapa.add(cuerpo);
  const cy = L.chin + PANTALLA.h / 2;
  const cristal = new THREE.Mesh(new THREE.PlaneGeometry(PANTALLA.w, PANTALLA.h), new THREE.MeshStandardMaterial({ color: '#000', roughness: .12, metalness: .3 }));
  cristal.position.set(0, cy, .05); tapa.add(cristal);
  const logo = plano(70, 17.5, rotulo('ThinkPad', 92, '#ffffffd9')); logo.position.set(-96, L.h - 26, -L.t - .1); logo.rotation.y = Math.PI; tapa.add(logo);
  const puntoI = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshBasicMaterial({ color: '#e2231a' })); puntoI.position.set(-132, L.h - 22, -L.t - .12); puntoI.rotation.y = Math.PI; tapa.add(puntoI);
  const marca = plano(36, 9, rotulo('ThinkPad', 92, '#ffffff99')); marca.position.set(-118, L.chin / 2, .1); tapa.add(marca);
  const tvwin = plano(30, 7.5, rotulo('TV · WIN', 84, '#ffffffa6')); tvwin.position.set(0, L.chin / 2, .1); tvwin.userData = { tvwin: true }; tapa.add(tvwin); objetivos.push(tvwin);
  const camara = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshStandardMaterial({ color: '#1b2230', roughness: .2 })); camara.position.set(0, L.h - L.top / 2, .08); tapa.add(camara);
  const led = new THREE.Mesh(new THREE.CircleGeometry(.6, 12), new THREE.MeshBasicMaterial({ color: '#c47a1f' })); led.position.set(6, L.h - L.top / 2, .08); tapa.add(led);

  // Pantalla real: el panel (iframe del canal + Windows + ficha i) en CSS3D, pegado al cristal.
  panel.style.width = PANTALLA.px + 'px'; panel.style.height = Math.round(PANTALLA.px * PANTALLA.h / PANTALLA.w) + 'px';
  const pantalla = new CSS3DObject(panel);
  pantalla.position.set(0, cy, .3); pantalla.scale.setScalar(PANTALLA.w / PANTALLA.px); tapa.add(pantalla);

  let angulo = 112;
  function bisagra(grados) { angulo = THREE.MathUtils.clamp(Number(grados) || 112, 70, 150); tapa.rotation.x = -THREE.MathUtils.degToRad(angulo - 90); }
  bisagra(angulo);

  // Encuadre según el formato de la ventana (Fold, iPhone en vertical, tablet, portátil)
  function encuadrar() {
    const asp = camera.aspect, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(175 / t, 190 / (t * asp)) * 1.04;
    const dir = new THREE.Vector3(0, .5, .87).normalize();
    controls.target.set(0, 72, -25); camera.position.copy(controls.target).addScaledVector(dir, dist); controls.update();
  }
  function tam() {
    const r = host.getBoundingClientRect(), w = Math.max(1, r.width), hh = Math.max(1, r.height);
    renderer.setSize(w, hh, false); css.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { const a = camera.aspect; tam(); if (Math.abs(a - camera.aspect) > .15) encuadrar(); }).observe(host);
  tam(); encuadrar();

  // Pulsar teclas con el ratón o el dedo: se hunden; arrastrar fuera de una tecla gira el modelo.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function hundir(k) {
    const m = teclas.get(k === 'delete' ? 'del' : k); if (!m) return;
    m.position.y = m.userData.y0 - 1.5; clearTimeout(m.userData.t); m.userData.t = setTimeout(() => { m.position.y = m.userData.y0; }, 130);
  }
  host.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(objetivos, true)[0]; if (!hit) return;
    let o = hit.object; while (o && !o.userData.k && !o.userData.tvwin) o = o.parent;
    if (!o) return;
    controls.enabled = false; e.preventDefault();
    if (o.userData.tvwin) { alTvWin(); return; }
    const k = o.userData.k; hundir(k);
    alPulsar(k === 'del' ? 'delete' : k, k.length === 1 ? k : null);
  }, { capture: true });
  const soltar = () => { controls.enabled = true; };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);

  // Con la pantalla de espaldas a la cámara se oculta el player (CSS3D no sabe de oclusión).
  const n = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    controls.update();
    tapa.getWorldQuaternion(q); n.set(0, 0, 1).applyQuaternion(q); pantalla.getWorldPosition(p);
    pantalla.visible = n.dot(p.sub(camera.position).negate()) > 0;
    renderer.render(scene, camera); css.render(scene, camera);
  });

  return {
    hundir, bisagra, encuadrar,
    refrescar(st) {
      Object.assign(estado, { on: !!st.on, mute: !!st.mute, fn: !!st.fn, caps: !!st.caps });
      for (const k of ['m', 'n', 'p', 'space', 'fn', 'caps']) { const c = celdas.get(k); if (c) pintarCelda(c.i, k, c.top, c.sub, c.home, estado); }
      atlasTex.needsUpdate = true;
    },
    get angulo() { return angulo; },
  };
}
