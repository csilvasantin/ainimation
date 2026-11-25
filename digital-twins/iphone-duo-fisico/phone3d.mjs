// Gemelo 3D del iPhone Duo FÍSICO · Carlos, 24-nov-2026 («esta genial pero no es un iphone duo» → «haz otro» → «los dos»).
// El plegable de dos pantallas de Carlos, abierto como un mini portátil: cuerpo fino de titanio con esquinas redondeadas,
// bisagra y módulo de cámaras de iPhone Pro. Mitad de arriba = la app «Windows 11» dibujando el monitor Lenovo con el player
// real de admira.tv (CSS3D, pantalla iphone-duo); mitad de abajo = el teclado táctil (LaptopDeckView) pintado en el cristal,
// con la barra ⏯ ancha y los iconos ⏭ ⏮ 🔊/🔇. Mismo teclado, mismo atlas y mismas reglas que el gemelo ThinkPad.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addObjectFloor } from '../floor-grid.mjs?v=1';
import { FN, ROWS, pintarCelda, atlasTex, LADO, rotulo } from '../iphone-duo/deck3d.mjs?v=duo3d-3';

const P = { w: 128, d: 76, t: 5.6, r: 9 };                 // cada mitad abierta (mm)
const MON = { w: 101.6, h: 63.5, px: 1280, chin: 5.6 };   // monitor Lenovo que dibuja la app (16:10)
const KB = { w: 118, z0: -P.d / 2 + 3.6, gap: 1.05, fnD: 5.2, d: 7.55, alto: .22 };

function rectRed(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/** Mitad del teléfono: losa de titanio redondeada, extruida en +z desde z = −t (cara del cristal en z = 0). */
function losa(mat) {
  const b = 1.1;
  const g = new THREE.ExtrudeGeometry(rectRed(P.w - 2 * b, P.d - 2 * b, P.r - b), { depth: P.t - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -P.t + b);
  return new THREE.Mesh(g, mat);
}
const cristal = (w, h, r, color = '#030304', extra = {}) => new THREE.Mesh(new THREE.ShapeGeometry(rectRed(w, h, r), 12), new THREE.MeshStandardMaterial({ color, roughness: .08, metalness: .2, ...extra }));

export function crearEscena({ host, panel, alPulsar, alTvWin, alPerderContexto }) {
  const canvas = host.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const css = new CSS3DRenderer(); css.domElement.className = 'css3d'; host.append(css.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1020');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  addObjectFloor(scene, -.3, 12);
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#30343e', .8));
  const sol = new THREE.DirectionalLight('#ffffff', 1.5); sol.position.set(60, 160, 110); scene.add(sol);
  const relleno = new THREE.DirectionalLight('#ffe7cc', .6); relleno.position.set(-120, 60, -60); scene.add(relleno);

  const camera = new THREE.PerspectiveCamera(34, 1, 2, 2000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 70; controls.maxDistance = 650;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(84);

  const titanio = new THREE.MeshStandardMaterial({ color: '#8d8f93', roughness: .32, metalness: .9 });
  const titanioOsc = new THREE.MeshStandardMaterial({ color: '#4a4c50', roughness: .4, metalness: .85 });
  const teclaMat = new THREE.MeshStandardMaterial({ color: '#202024', roughness: .35, metalness: .05 });
  const teclaOn = new THREE.MeshStandardMaterial({ color: '#4a4a52', roughness: .35, emissive: '#1c2a40' });
  const plano = (w, h, map) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false }));

  // ── Mitad de abajo: teclado táctil en el cristal ──
  const base = new THREE.Group(); scene.add(base);
  const cuerpoB = losa(titanio); cuerpoB.rotation.x = -Math.PI / 2; cuerpoB.position.y = P.t; base.add(cuerpoB);   // cristal hacia arriba
  const glassB = cristal(P.w - 2.6, P.d - 1.6, P.r - 1.6); glassB.rotation.x = -Math.PI / 2; glassB.position.y = P.t + .02; base.add(glassB);
  const fondoKb = cristal(P.w - 6, P.d - 4.4, 5, '#121216', { roughness: .5 }); fondoKb.rotation.x = -Math.PI / 2; fondoKb.position.set(0, P.t + .04, .6); base.add(fondoKb);

  const teclas = new Map(), objetivos = [], celdas = new Map(), estado = { on: true, mute: false, fn: false, caps: false };
  const geoCache = new Map();
  const geo = (w, d) => { const id = w.toFixed(2) + 'x' + d.toFixed(2); if (!geoCache.has(id)) geoCache.set(id, new RoundedBoxGeometry(w, KB.alto, d, 1, .7)); return geoCache.get(id); };
  const labelMat = new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, toneMapped: false, depthWrite: false });
  let nCelda = 0;
  function crearTecla(k, top, sub, home, x, z, w, d) {
    const m = new THREE.Mesh(geo(w, d), teclaMat);
    m.position.set(x, P.t + .06 + KB.alto / 2, z); m.userData = { k, y0: m.position.y };
    const i = nCelda++, lado = Math.min(w, d) * .9;
    const g = new THREE.PlaneGeometry(lado, lado), uv = g.attributes.uv;
    const u0 = (i % LADO) / LADO, v0 = 1 - (Math.floor(i / LADO) + 1) / LADO, du = 1 / LADO;
    for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) * du, v0 + uv.getY(j) * du);
    const lab = new THREE.Mesh(g, labelMat); lab.rotation.x = -Math.PI / 2; lab.position.y = KB.alto / 2 + .03; lab.userData = { k };
    m.add(lab); scene.add(m);
    celdas.set(k, { i, top, sub, home }); pintarCelda(i, k, top, sub, home, estado);
    teclas.set(k, m); objetivos.push(m);
  }
  const filas = [FN.map(([k, l]) => [k, l, 1]), ...ROWS];
  let z = KB.z0;
  filas.forEach((fila, f) => {
    const d = f === 0 ? KB.fnD : KB.d, suma = fila.reduce((a, r) => a + (r[2] || 1), 0), util = KB.w - KB.gap * (fila.length - 1);
    let x = -KB.w / 2;
    for (const [k, l, w0, home] of fila) {
      const w = util * (w0 || 1) / suma, cx = x + w / 2;
      if (k === 'updown') { const h = (d - .6) / 2; crearTecla('up', '⌃', null, 0, cx, z + h / 2, w, h); crearTecla('down', '⌄', null, 0, cx, z + d - h / 2, w, h); }
      else {
        const single = k.length === 1;
        const top = f === 0 ? l : single && /[a-z]/.test(k) ? k.toUpperCase() : (l == null || single ? k : l);
        const sub = f > 0 && single && l && !/[a-z]/.test(k) ? l : null;
        crearTecla(k, top, sub, home, cx, z + d / 2, w, d);
      }
      x += w + KB.gap;
    }
    z += d + KB.gap;
  });
  atlasTex.needsUpdate = true;
  const g = teclas.get('g'), h = teclas.get('h'), bk = teclas.get('b');
  const tp = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), new THREE.MeshBasicMaterial({ color: '#d0140d' }));
  tp.rotation.x = -Math.PI / 2; tp.position.set((g.position.x + h.position.x) / 2, P.t + .35, (g.position.z + bk.position.z) / 2); scene.add(tp);
  const zb = z + 1.2;
  for (const [x, w] of [[-13, 17], [0, 7], [13, 17]]) {
    const bt = cristal(w, 2.6, .8, '#1a1a1e', { roughness: .5 }); bt.rotation.x = -Math.PI / 2; bt.position.set(x, P.t + .05, zb + 1.3); scene.add(bt);
    if (w > 10) { const r = cristal(w - 2, .4, .2, '#c4110b'); r.rotation.x = -Math.PI / 2; r.position.set(x, P.t + .06, zb + .3); scene.add(r); }
  }
  const tpad = cristal(44, P.d / 2 - zb - 5.5, 2, '#17171a', { roughness: .45 }); tpad.rotation.x = -Math.PI / 2;
  tpad.position.set(0, P.t + .05, (zb + 3.4 + P.d / 2 - 2.2) / 2); scene.add(tpad);
  // Botones laterales (volumen y Acción) en el canto derecho de la mitad de abajo
  for (const [zz, len] of [[-14, 9], [-2, 9], [-26, 5]]) { const bt = new THREE.Mesh(new RoundedBoxGeometry(1, 2.2, len, 2, .45), titanioOsc); bt.position.set(P.w / 2 + .25, P.t / 2, zz); scene.add(bt); }

  // ── Bisagra y mitad de arriba ──
  const piv = new THREE.Group(); piv.position.set(0, P.t, -P.d / 2); scene.add(piv);
  const bis = new THREE.Mesh(new THREE.CylinderGeometry(P.t * .52, P.t * .52, P.w - 18, 32), titanioOsc); bis.rotation.z = Math.PI / 2; bis.position.set(0, -P.t * .48, -P.t * .45); piv.add(bis);
  const tapa = new THREE.Group(); piv.add(tapa);
  const cuerpoT = losa(titanio); cuerpoT.position.y = P.d / 2; tapa.add(cuerpoT);
  const glassT = cristal(P.w - 2.6, P.d - 1.6, P.r - 1.6); glassT.position.set(0, P.d / 2, .02); tapa.add(glassT);
  // La app «Windows 11»: monitor Lenovo (marco, barbilla con ThinkPad y TV·WIN) dentro del cristal
  const altoMarco = MON.h + MON.chin + 2.5;
  const marco = cristal(MON.w + 7, altoMarco, 2.4, '#0a0a0c', { roughness: .6 }); marco.position.set(0, P.d / 2, .04); tapa.add(marco);
  const cy = P.d / 2 - altoMarco / 2 + MON.chin + MON.h / 2;
  const negro = cristal(MON.w, MON.h, .6, '#000'); negro.position.set(0, cy, .06); tapa.add(negro);
  const yChin = cy - MON.h / 2 - MON.chin / 2;
  const marca = plano(17, 4.25, rotulo('ThinkPad', 92, '#ffffff99')); marca.position.set(-MON.w / 2 + 9, yChin, .08); tapa.add(marca);
  const tvwin = plano(15, 3.75, rotulo('TV · WIN', 84, '#ffffffb0')); tvwin.position.set(0, yChin, .08); tvwin.userData = { tvwin: true }; tapa.add(tvwin); objetivos.push(tvwin);
  // Parte de atrás: módulo de cámaras de iPhone Pro y pantalla exterior apagada en la otra mitad
  const modulo = new THREE.Mesh(new RoundedBoxGeometry(36, 36, 1.6, 4, 3.2), new THREE.MeshStandardMaterial({ color: '#7d7f83', roughness: .22, metalness: .7 }));
  modulo.position.set(P.w / 2 - 24, P.d - 24, -P.t - .5); tapa.add(modulo);
  const lenteMat = new THREE.MeshStandardMaterial({ color: '#050608', roughness: .05, metalness: .6 }), aroMat = new THREE.MeshStandardMaterial({ color: '#9a9ca0', roughness: .2, metalness: .95 });
  for (const [x, y] of [[-8, 8], [8, 0], [-8, -8]]) {
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.6, 2.2, 40), aroMat); aro.rotation.x = Math.PI / 2; aro.position.set(modulo.position.x + x, modulo.position.y + y, -P.t - 1.9); tapa.add(aro);
    const lente = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40), lenteMat); lente.position.set(aro.position.x, aro.position.y, -P.t - 3.02); lente.rotation.y = Math.PI; tapa.add(lente);
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshStandardMaterial({ color: '#f3e6c8', emissive: '#2a2416' })); flash.position.set(modulo.position.x + 8, modulo.position.y + 13 - 3, -P.t - 1.32); flash.rotation.y = Math.PI; tapa.add(flash);

  // Pantalla real del player sobre el monitor de la app
  panel.style.width = MON.px + 'px'; panel.style.height = Math.round(MON.px * MON.h / MON.w) + 'px';
  const pantalla = new CSS3DObject(panel);
  pantalla.position.set(0, cy, .2); pantalla.scale.setScalar(MON.w / MON.px); tapa.add(pantalla);

  let angulo = 112;
  function bisagra(grados) { angulo = THREE.MathUtils.clamp(Number(grados) || 112, 70, 150); tapa.rotation.x = -THREE.MathUtils.degToRad(angulo - 90); }
  bisagra(angulo);

  function encuadrar() {
    const asp = camera.aspect, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(70 / t, 82 / (t * asp)) * 1.06;
    const dir = new THREE.Vector3(0, .5, .87).normalize();
    controls.target.set(0, 26, -6); camera.position.copy(controls.target).addScaledVector(dir, dist); controls.update();
  }
  function tam() {
    const r = host.getBoundingClientRect(), w = Math.max(1, r.width), hh = Math.max(1, r.height);
    renderer.setSize(w, hh, false); css.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { const a = camera.aspect; tam(); if (Math.abs(a - camera.aspect) > .15) encuadrar(); }).observe(host);
  tam(); encuadrar();

  // Teclado táctil: la tecla se ilumina y baja un pelo al tocarla
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function hundir(k) {
    const m = teclas.get(k === 'delete' ? 'del' : k); if (!m) return;
    m.material = teclaOn; m.position.y = m.userData.y0 - .12; clearTimeout(m.userData.t);
    m.userData.t = setTimeout(() => { m.material = teclaMat; m.position.y = m.userData.y0; }, 140);
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

  const n = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
  let perdido = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdido = true; alPerderContexto?.(); });
  canvas.addEventListener('webglcontextrestored', () => { perdido = false; host.classList.remove('sin-3d'); });
  renderer.setAnimationLoop(() => {
    if (perdido) return;
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
