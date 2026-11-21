import * as THREE from 'three';
import { addObjectFloor } from '../floor-grid.mjs?v=1';
import { attachGalleonPlaylist } from './playlist.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const directorParams = new URLSearchParams(location.search);
const directorMode = directorParams.get('director') === '1' && window.parent !== window;
const directorSession = directorParams.get('session') || '';
const canvas = document.querySelector('#keyboard');
const status = document.querySelector('#status');
const horizontalOutput = document.querySelector('#landscape-output')?.getContext('2d', { alpha: false });
const verticalOutput = document.querySelector('#portrait-output')?.getContext('2d', { alpha: false });
const feed = document.querySelector('#feed');
const feedOrigin = new URL(feed.dataset.src).origin;
if (!directorMode) {
  feed.src = feed.dataset.src;
  const importer = document.querySelector('#importer');
  importer.src = importer.dataset.src;
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10182b');
addObjectFloor(scene, -.128, .5);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
camera.position.set(1.55, 4.7, 5.3);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, .53);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 13;
controls.maxPolarAngle = Math.PI / 2;
scene.add(new THREE.HemisphereLight('#e0eaff', '#3e4350', 2.7));
const light = new THREE.DirectionalLight('#dce6ff', 2);
light.position.set(2, 6, -3);
scene.add(light);

const chassis = new THREE.MeshStandardMaterial({ color: '#121519', roughness: .78 });
const keycap = new THREE.MeshStandardMaterial({ color: '#30343c', roughness: .72 });
const deck = new THREE.Group();
scene.add(deck);

function box(width, height, depth, material, x, y, z, radius = .04) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, radius), material);
  mesh.position.set(x, y, z);
  deck.add(mesh);
  return mesh;
}

box(5.68, .25, 1.96, chassis, 0, 0, 0, .09);
const rest = new THREE.MeshStandardMaterial({ color: '#211f24', roughness: .93 });
const trim = new THREE.MeshStandardMaterial({ color: '#34333b', roughness: .65 });
box(5.65, .15, 1.21, rest, 0, -.041, 1.58, .075);
box(.13, .015, .48, trim, 0, .039, 1.93, .006);
box(5.42, .014, .045, trim, -.08, .129, -.894, .006);
box(.92, .035, 1.81, rest, 2.27, .132, .015, .017);

const legend = document.createElement('canvas');
legend.width = 2048;
legend.height = 1152;
const ink = legend.getContext('2d');
const legendWidth = 5.7, legendDepth = 3.22, legendCenter = .62;
function lettering(text, x, z, size, angle = 0, color = '#e7ecf5') {
  ink.save();
  ink.translate((x / legendWidth + .5) * legend.width, ((z - legendCenter) / legendDepth + .5) * legend.height);
  ink.rotate(angle);
  ink.font = '600 ' + size + 'px system-ui';
  ink.fillStyle = color;
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  ink.fillText(text, 0, 0);
  ink.restore();
}
lettering('C O R S A I R', -.04, -.9, 25);
lettering('C O R S A I R', 0, 1.93, 23, -Math.PI / 2);

const palette = ['#d36aff', '#8b83ff', '#48a6ff', '#46c7ef', '#61e6a8'].map(value => new THREE.Color(value));
const rgb = palette.map(() => new THREE.MeshStandardMaterial({ roughness: .6 }));
const pitch = .233, left = -2.72;
const targets = [];
function key(label, unit, z, units = 1, rowSpan = .224) {
  const width = units * pitch - .018;
  const x = left + (unit + units / 2) * pitch;
  box(width + .015, .035, rowSpan + .009, rgb[Math.min(4, Math.floor(unit / 3.3))], x, .144, z, .01);
  const cap = box(width, .105, rowSpan, keycap, x, .194, z, .026);
  if (unit >= 15.6 && ["←","→","↑","↓"].includes(label)) {
    cap.userData.control = {action:{"←":"prev","→":"next","↑":"first","↓":"last"}[label]};
    targets.push(cap);
  }
  if (label) lettering(label, x, z - .011, label.length > 3 ? 15 : 21);
}
function row(z, keys, start = 0) {
  let unit = start;
  for (const entry of keys) {
    const [label, width] = Array.isArray(entry) ? entry : [entry, 1];
    key(label, unit, z, width);
    unit += width;
  }
}
key('ESC', 0, -.715);
for (let i = 0; i < 12; i++) key('F' + (i + 1), 1.55 + i + Math.floor(i / 4) * .65, -.715);
row(-.428, ['º', '1!', '2”', '3·', '4$', '5%', '6&', '7/', '8(', '9)', '0=', '’?', '¡¿', ['←', 2]]);
row(-.171, [['TAB', 1.5], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '^', '+']);
row(.086, [['CAPS', 1.75], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ', '´', 'Ç']);
key('', 13.5, -.171, 1.5);
key('ENTER', 13.75, .086, 1.25);
box(.27, .093, .086, keycap, left + 14.375 * pitch, .2, -.042, .008);
row(.343, [['SHIFT', 1.25], '<>', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',;', '.:', '-_', ['SHIFT', 2.75]]);
row(.600, [['CTRL', 1.25], ['⊞', 1.25], ['ALT', 1.25], ['', 6.25], ['ALT GR', 1.25], ['FN', 1.25], ['▤', 1.25], ['CTRL', 1.25]]);
row(-.715, ['IMPR', 'BLOQ', 'PAUSA'], 15.6);
row(-.428, ['INS', 'INIC', 'PG↑'], 15.6);
row(-.171, ['SUPR', 'FIN', 'PG↓'], 15.6);
key('↑', 16.6, .343);
row(.6, ['←', '↓', '→'], 15.6);

const dialMaterial = new THREE.MeshStandardMaterial({ color: '#2b2b34', roughness: .7, metalness: .35 });
const dialRings = [];

let panel = null;
let selection = null;
function selecting(id) {
  return id && selection?.id === id && performance.now() < selection.deadline;
}
function sendControl(action, key) {
  if (directorMode || !panel || (action === 'key' && !panel.keys[key])) return;
  if (action === 'key') {
    const id = panel.keys[key];
    if (selecting(id)) return;
    selection = {id, deadline:performance.now()+41000, started:performance.now()};
    status.textContent = 'Selección enviada · esperando al Corsair';
    updatePointer();
  }
  feed.contentWindow?.postMessage({type:'admira:galleon:control', action, key, id:panel.keys[key]}, feedOrigin);
}

for (const x of [2.085, 2.56]) {
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.103, .106, .096, 36), dialMaterial);
  dial.position.set(x, .225, -.744);
  const dialRing = new THREE.MeshBasicMaterial({color:'#51545b', toneMapped:false});
  dialRings.push(dialRing);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.112, .018, 12, 48), dialRing);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, .245, -.744);
  deck.add(dial, ring);
  dial.userData.control = ring.userData.control = {action:dialRings.length === 1 ? 'mute' : 'pause'};
  targets.push(dial, ring);
}

const rgbOn = document.querySelector('#rgb-on');
const rgbBrightness = document.querySelector('#rgb-brightness');
const rgbLevel = document.querySelector('#rgb-level');
const rgbMode = document.querySelector('#rgb-mode');
const rgbColor = document.querySelector('#rgb-color');
const rgbSwatch = document.querySelector('#rgb-swatch');
const rgbKey = 'admira-galleon-rgb-v1';
try {
  const saved = JSON.parse(localStorage.getItem(rgbKey));
  if (saved) {
    rgbOn.checked = saved.on !== false;
    if (Number.isFinite(saved.brightness)) rgbBrightness.value = String(saved.brightness);
    if (saved.mode === 'solid') rgbMode.value = 'solid';
    if (/^#[0-9a-f]{6}$/i.test(saved.color)) rgbColor.value = saved.color;
  }
} catch {}

const unlit = new THREE.Color('#22242a');
function applyLighting() {
  const on = rgbOn.checked, brightness = Number(rgbBrightness.value), mode = rgbMode.value, color = rgbColor.value;
  const power = on ? brightness / 100 : 0;
  const custom = new THREE.Color(color);
  rgb.forEach((material, index) => {
    const hue = mode === 'solid' ? custom : palette[index];
    material.color.copy(unlit).lerp(hue, power * .5);
    material.emissive.copy(hue);
    material.emissiveIntensity = power * .8;
  });
  rgbLevel.value = brightness + ' %';
  rgbSwatch.hidden = mode !== 'solid';
}
for (const field of [rgbOn, rgbBrightness, rgbMode, rgbColor]) {
  field.addEventListener('input', applyLighting);
  field.addEventListener('change', () => {
    try {
      localStorage.setItem(rgbKey, JSON.stringify({
        on: rgbOn.checked, brightness: Number(rgbBrightness.value), mode: rgbMode.value, color: rgbColor.value,
      }));
    } catch {}
  });
}
applyLighting();

const labels = new THREE.CanvasTexture(legend);
labels.colorSpace = THREE.SRGBColorSpace;
const labelMaterial = new THREE.MeshBasicMaterial({ map: labels, transparent: true, depthWrite: false, alphaTest: .03 });
for (const [y, min, max] of [[.249, -.85, .75], [.136, -.98, -.86], [.05, 1.69, 2.17]]) {
  const geometry = new THREE.PlaneGeometry(legendWidth, max - min);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const z = max - uv.getY(i) * (max - min);
    uv.setY(i, .5 - (z - legendCenter) / legendDepth);
  }
  const surface = new THREE.Mesh(geometry, labelMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, y, (min + max) / 2);
  deck.add(surface);
}

function screen(width, depth, x, z, pixelWidth, pixelHeight) {
  const base = box(width + .07, .10, depth + .07, keycap, x, .17, z);
  const pixels = document.createElement('canvas');
  pixels.width = pixelWidth;
  pixels.height = pixelHeight;
  const texture = new THREE.CanvasTexture(pixels);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, .225, z);
  deck.add(mesh);
  return { mesh, base, pixels, texture, context: pixels.getContext('2d') };
}

const lcd = screen(.8, .418, 2.27, -.392, 720, 384);
const keys = Array.from({ length: 12 }, (_, index) =>
  screen(.208, .208, 2.02 + (index % 3) * .25, -.047 + Math.floor(index / 3) * .245, 160, 160));

keys.forEach(({mesh, base}, key) => {
  mesh.userData.control = base.userData.control = {action:'key', key};
  targets.push(mesh, base);
});
const ray = new THREE.Raycaster();
const pad = document.querySelector('#portrait-output');
function controlAt(surface, x, y) {
  if (directorMode || !panel || performance.now() - frameReceived > 3000) return null;
  const r = surface.getBoundingClientRect();
  let control;
  if (surface === pad) {
    const scale = Math.min(r.width/pad.width, r.height/pad.height);
    const px = (x-r.left-(r.width-pad.width*scale)/2)/scale;
    const py = (y-r.top-(r.height-pad.height*scale)/2)/scale;
    if (!(px>=0 && px<pad.width && py>=0 && py<pad.height && px%168<160 && py%168<160)) return null;
    control = {action:'key', key:Math.floor(py/168)*3 + Math.floor(px/168)};
  } else {
    ray.setFromCamera({x:2*(x-r.left)/r.width-1,y:1-2*(y-r.top)/r.height},camera);
    control = ray.intersectObjects(targets,false)[0]?.object.userData.control;
  }
  if (!control || (control.action === 'key' && !panel.keys?.[control.key])) return null;
  return control;
}
let frameReceived = -Infinity;
let pointer = null;
function updatePointer() {
  if (!pointer) return;
  const {surface,x,y} = pointer;
  const hit = controlAt(surface,x,y);
  surface.style.cursor = hit ? (selecting(panel.keys[hit.key]) ? 'progress' : 'pointer') : '';
}
let press = null;
for (const surface of [canvas,pad].filter(Boolean)) {
  surface.addEventListener('pointermove', event => {
    pointer = {surface,x:event.clientX,y:event.clientY};
    updatePointer();
  });
  surface.addEventListener('pointerleave', () => {pointer = null;surface.style.cursor = '';});
  surface.addEventListener('pointercancel', () => {press = null;});
  surface.addEventListener('pointerdown', event => {
    press = null;
    if (!event.isPrimary || event.button !== 0) return;
    const hit = controlAt(surface,event.clientX,event.clientY);
    if (hit) press = {surface, hit, id:panel.keys[hit.key], pointerId:event.pointerId, x:event.clientX, y:event.clientY};
  });
  surface.addEventListener('pointerup', event => {
    const down = press;
    press = null;
    if (!down || surface !== down.surface || event.pointerId !== down.pointerId ||
        Math.hypot(event.clientX-down.x,event.clientY-down.y) > (event.pointerType === 'touch' ? 12 : 8)) return;
    const hit = controlAt(surface,event.clientX,event.clientY);
    if (hit && hit.action === down.hit.action && hit.key === down.hit.key && panel.keys[hit.key] === down.id)
      sendControl(hit.action,hit.key);
  });
}
for (const button of document.querySelectorAll('[data-control]')) {
  button.onclick = () => sendControl(button.dataset.control);
}
for (const display of [lcd, ...keys]) {
  display.context.fillStyle = '#000';
  display.context.fillRect(0, 0, display.pixels.width, display.pixels.height);
  display.texture.needsUpdate = true;
}

const subscribe = directorMode ? () => {} : attachGalleonPlaylist(feed, document.querySelector('#importer'), status);
// Teclado físico: lo que late el adaptador USB del Mac Studio en /signage/now (nunca lo que diga el gemelo).
const physical = document.querySelector('#physical');
async function pollPhysical() {
  // La presencia viva está en /signage/screens (reloj de presencia del worker); /signage/now sólo aporta
  // la pieza y el standby cuando el KV los ha guardado, que no siempre es al instante.
  try {
    const [screens, now] = await Promise.all([
      fetch('https://api.admira.store/signage/screens', { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null),
      fetch('https://api.admira.store/signage/now?screen=corsair-galleon-100', { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null),
    ]);
    const presence = (screens?.screens || []).find(entry => entry?.screen === 'corsair-galleon-100') || null;
    const age = presence ? Number(presence.age_seconds) : (Number(now?.lastSeen) ? Math.round((Date.now() - Number(now.lastSeen)) / 1000) : null);
    const output = now?.health?.output;
    if (!panel && (output === 'usb' || now?.producer === 'galleon-usb-corsair-galleon-100') && !now.standby && age !== null && age <= 45) {
      dialRings[0].color.set((now.item?.playback?.muted ?? now.device?.audio?.muted) ? '#e21e22' : '#28ad53');
      dialRings[1].color.set((now.item?.playback?.paused ?? now.health?.paused) ? '#d88e21' : '#2584f5');
    }
    if (!physical) return;
    physical.textContent = age === null || !Number.isFinite(age) ? 'Teclado físico: sin latido todavía'
      : age > 45 ? 'Teclado físico: sin señal desde hace ' + (age < 3600 ? age + ' s' : Math.round(age / 3600) + ' h')
      : output === 'yielded' || now?.standby ? 'Teclado físico: conectado, cediendo el USB (Elgato o controlador Starbucks)'
      : 'Teclado físico: en antena' + (presence?.version ? ' · ' + presence.version : '') + (now?.item?.title ? ' · ' + String(now.item.title).slice(0, 60) : '');
  } catch { if (physical) physical.textContent = 'Teclado físico: estado no disponible'; }
}
if (!directorMode) void pollPhysical();
const physicalTimer = setInterval(() => { if (!directorMode) void pollPhysical(); }, 15000);
window.addEventListener('pagehide', () => clearInterval(physicalTimer), { once: true });
feed.addEventListener('load', subscribe);
let lastFrame = 0;
const statusTimer = setInterval(() => {
  if (!directorMode && Date.now() - lastFrame > 3000) {
    status.textContent = 'Esperando la señal de Admira TV';
    subscribe();
  }
}, 1500);
window.addEventListener('pagehide', () => clearInterval(statusTimer), { once: true });

window.addEventListener('message', event => {
  const fromDirector = directorMode && event.origin === location.origin && event.source === window.parent && event.data?.session === directorSession && event.data?.type === 'ain:director:frame';
  if (!fromDirector && (directorMode || event.origin !== feedOrigin || event.source !== feed.contentWindow || event.data?.type !== 'admira:galleon:frame')) return;
  const { landscape, portrait, playing, ready } = event.data;
  if (!(landscape instanceof ImageBitmap) || !(portrait instanceof ImageBitmap)) return;
  try {
    if (landscape.width !== 720 || landscape.height !== 384 || portrait.width !== 480 || portrait.height !== 640) return;
    lcd.context.drawImage(landscape, 0, 0);
    horizontalOutput?.drawImage(landscape, 0, 0);
    lcd.texture.needsUpdate = true;
    keys.forEach(({ pixels, context, texture }, index) => {
      const column = index % 3, row = Math.floor(index / 3);
      context.drawImage(portrait, column * 160, row * 160, 160, 160, 0, 0, 160, 160);
      verticalOutput?.drawImage(pixels, column * 168, row * 168);
      texture.needsUpdate = true;
    });
    lastFrame = Date.now();
    if (fromDirector) { status.textContent = 'Vista previa local de Admira Director'; return; }
    panel = event.data.panel;
    frameReceived = performance.now();
    if (selection && (!selecting(selection.id) || (performance.now()-selection.started > 500 &&
        (panel?.pendingId === null || /^(Reproduciendo en el Corsair físico|Inicia sesión|El mando rechazó|Sin respuesta|El teclado no ha confirmado)/.test(panel?.notice || ''))))) selection = null;
    updatePointer();
    const pendingKey = selection ? panel?.keys?.indexOf(selection.id) : -1;
    if (pendingKey >= 0) {
      const tile = keys[pendingKey];
      tile.context.strokeStyle = '#ffca58';
      tile.context.lineWidth = 8;
      tile.context.strokeRect(4,4,152,152);
      verticalOutput?.drawImage(tile.pixels, (pendingKey%3)*168, Math.floor(pendingKey/3)*168);
    }
    if (panel) {
      dialRings[0].color.set(panel.muted ? '#e21e22' : '#28ad53');
      dialRings[1].color.set(panel.paused ? '#d88e21' : '#2584f5');
      for (const [action, active, color] of [['mute',panel.muted,panel.muted ? '#ff4149' : '#40dd7a'], ['pause',panel.paused,panel.paused ? '#ffbc44' : '#589aff']]) {
        const button = document.querySelector('[data-control="'+action+'"]');
        if (button) {
          button.setAttribute('aria-pressed', String(active));
          button.style.borderColor = color;
          button.style.color = color;
        }
      }
    }
    const air = event.data.onAir && typeof event.data.onAir === 'object' ? event.data.onAir : null;
    if (selection && !panel?.notice) { status.textContent = 'Esperando confirmación del Corsair'; return; }
    if (panel?.notice) { status.textContent = panel.notice; return; }
    if (air?.source === 'offline') { status.textContent = 'Esperando al teclado físico'; return; }
    const piece = air?.title ? ' · ' + String(air.title).slice(0, 80) + (air.total > 1 ? ' (' + (air.index + 1) + '/' + air.total + ')' : '') : '';
    const source = panel?.local ? (panel.paused ? 'Gemelo virtual en pausa' : 'Control del gemelo virtual') : air?.source === 'twin' ? 'Playlist de prueba' : air?.source === 'playout' ? 'Playout de la flota' : 'Reproducción según el teclado físico';
    const message = ready?.landscape && ready?.portrait ? source + ' · en la pantalla superior y en las 12 teclas' + piece
      : playing ? source + ' · cargando la otra orientación…' + piece : air?.source === 'twin' ? 'Cargando la playlist de prueba…' : 'Señal real del player · sin contenido en antena todavía';
    if (status.textContent !== message) status.textContent = message;
  } finally {
    landscape.close();
    portrait.close();
    if (fromDirector) requestDirectorFrame();
  }
});

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(canvas);
resize();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// Pull one frame at a time: no accumulating ImageBitmaps while the parent is busy.
let directorTimer;
function requestDirectorFrame() {
  clearTimeout(directorTimer);
  directorTimer = setTimeout(() => {
    window.parent.postMessage({type:'ain:director:request',session:directorSession},location.origin);
    directorTimer = setTimeout(requestDirectorFrame,1000);
  },80);
}
if (directorMode && directorSession) requestDirectorFrame();
window.addEventListener('pagehide',()=>clearTimeout(directorTimer),{once:true});
