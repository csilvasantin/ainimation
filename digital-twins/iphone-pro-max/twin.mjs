// Gemelo 3D del iPhone Pro Max (misión «Apple Watch Ultra Digital Twin», ampliada al iPhone; DeepAgent Neo, 22-nov-2026).
// Modelo GLB procedural (model/iphone-pro-max.py, Blender 5.2) tumbado con cable USB-C; la pantalla es un lienzo
// 440 × 956 que pinta los fotogramas del player de admira.tv (/iphone.html, mismo patrón que el reloj y el Galleon).
// Órdenes: clic en pantalla, botón de Acción o botón lateral = pausa; volumen + = anterior; volumen − y Control de
// cámara = siguiente; deslizar sobre la pantalla a la derecha = siguiente, a la izquierda = anterior (como en el iPhone físico). Cada orden ilumina su pieza: ámbar enviada,
// verde confirmada por el iPhone físico, rojo fallida. El físico y el virtual emiten la misma playlist anclada al
// reloj del servidor, así que van casi al fotograma; lo que se cruza son órdenes y telemetría, nunca fotogramas.
import * as THREE from 'three';
import { addObjectFloor } from '../floor-grid.mjs?v=1';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { controlFor, nodeForAction, physicalSummary, statusText, swipeAction, PHASE_COLORS, SCREEN } from './controls.mjs';

const params = new URLSearchParams(location.search);
const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
const canvas = document.querySelector('#phone');
const status = document.querySelector('#status');
const physical = document.querySelector('#physical');
const output = document.querySelector('#face-output')?.getContext('2d', { alpha: false });
const feed = document.querySelector('#feed');
const importer = document.querySelector('#importer');
// En local (python3 -m http.server 9134) se puede apuntar a un player servido en otro puerto: ?feed=http://127.0.0.1:9135/iphone.html
const feedSource = local && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/iphone\.html$/.test(params.get('feed') || '') ? params.get('feed') : feed.dataset.src;
const feedOrigin = new URL(feedSource).origin;
feed.src = feedSource;
importer.src = importer.dataset.src;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10182b');
addObjectFloor(scene, -.12, .5);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
camera.position.set(3.2, 6.4, 5.2);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, .1, 0);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2;
scene.add(new THREE.HemisphereLight('#e0eaff', '#3e4350', 2.4));
const key = new THREE.DirectionalLight('#dce6ff', 2.2);
key.position.set(2, 6, -3);
scene.add(key);
const fill = new THREE.DirectionalLight('#ffe9d0', .9);
fill.position.set(-4, 3, 4);
scene.add(fill);

// Pantalla: lienzo 440 × 956 → textura de la malla «Screen» del GLB.
const face = document.createElement('canvas');
face.width = SCREEN.width;
face.height = SCREEN.height;
const faceContext = face.getContext('2d');
faceContext.fillStyle = '#000';
faceContext.fillRect(0, 0, face.width, face.height);
const faceTexture = new THREE.CanvasTexture(face);
faceTexture.colorSpace = THREE.SRGBColorSpace;
faceTexture.flipY = false;
faceTexture.anisotropy = 4;

const targets = [];
const litMaterials = new Map(); // nombre → material propio clonado para iluminar sin tocar las demás piezas
let model = null;
new GLTFLoader().load('./iphone-pro-max.glb', gltf => {
  model = gltf.scene;
  model.scale.setScalar(.25);
  model.traverse(object => {
    if (!object.isMesh) return;
    if (object.name === 'Screen') object.material = new THREE.MeshBasicMaterial({ map: faceTexture, toneMapped: false });
    if (controlFor(object.name)) targets.push(object);
    if (['ActionButton', 'VolumeUp', 'VolumeDown', 'SideButton', 'CameraControl'].includes(object.name)) {
      object.material = object.material.clone();
      litMaterials.set(object.name, { material: object.material, color: object.material.color.clone(), emissive: object.material.emissive?.clone() });
    }
  });
  scene.add(model);
}, undefined, error => { status.textContent = 'No se pudo cargar el modelo 3D del iPhone: ' + (error?.message || error); });

// ── Órdenes al player (y de ahí al iPhone físico) ──
let lit = null; // {action, timer, since}
function light(action, phase) {
  const entry = litMaterials.get(nodeForAction(action));
  if (!entry) return;
  const color = PHASE_COLORS[phase];
  if (!color) { entry.material.color.copy(entry.color); if (entry.emissive) entry.material.emissive.copy(entry.emissive); entry.material.emissiveIntensity = 1; return; }
  entry.material.emissive.set(color);
  entry.material.emissiveIntensity = phase === 'pending' ? .9 : 1.2;
}
function resetLight() {
  if (!lit) return;
  clearTimeout(lit.timer);
  light(lit.action, 'idle');
  lit = null;
}
function sendControl(action) {
  resetLight();
  light(action, 'pending');
  lit = { action, timer: setTimeout(resetLight, 32000), since: Date.now() };
  feed.contentWindow?.postMessage({ type: 'admira:watch:control', action }, feedOrigin);
}
for (const button of document.querySelectorAll('[data-control]')) button.onclick = () => sendControl(button.dataset.control);

const ray = new THREE.Raycaster();
function hitAt(x, y) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera({ x: 2 * (x - r.left) / r.width - 1, y: 1 - 2 * (y - r.top) / r.height }, camera);
  const hit = ray.intersectObjects(targets, false)[0];
  return hit ? { name: hit.object.name, action: controlFor(hit.object.name) } : null;
}
let press = null;
canvas.addEventListener('pointermove', event => { canvas.style.cursor = hitAt(event.clientX, event.clientY) ? 'pointer' : ''; });
canvas.addEventListener('pointerleave', () => { canvas.style.cursor = ''; });
canvas.addEventListener('pointerdown', event => {
  press = null;
  if (!event.isPrimary || event.button !== 0) return;
  const hit = hitAt(event.clientX, event.clientY);
  if (hit) press = { hit, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  if (hit && /^(Screen|Crystal)$/.test(hit.name)) controls.enabled = false; // un deslizamiento sobre la pantalla navega, no gira el modelo
});
canvas.addEventListener('pointercancel', () => { press = null; controls.enabled = true; });
canvas.addEventListener('pointerup', event => {
  const down = press;
  press = null;
  controls.enabled = true;
  if (!down || event.pointerId !== down.pointerId) return;
  const dx = event.clientX - down.x, dy = event.clientY - down.y;
  const slack = event.pointerType === 'touch' ? 12 : 8;
  if (Math.hypot(dx, dy) > slack) {
    // Deslizar sobre la pantalla del modelo navega la playlist, como en el iPhone físico.
    if (/^(Screen|Crystal)$/.test(down.hit.name) && Math.hypot(dx, dy) > 40) { const action = swipeAction(dx, dy); if (action) sendControl(action); }
    return;
  }
  const hit = hitAt(event.clientX, event.clientY);
  if (hit && hit.action === down.hit.action) sendControl(hit.action);
});
canvas.addEventListener('wheel', event => {
  const hit = hitAt(event.clientX, event.clientY);
  if (!hit || !/^(Screen|Crystal)$/.test(hit.name)) return;
  event.preventDefault();
  const action = swipeAction(0, -event.deltaY); // rueda hacia abajo = siguiente
  if (action && !(lit && Date.now() - lit.since < 400)) sendControl(action);
}, { passive: false });

// ── Fotogramas y estado del player ──
let lastFrame = 0;
let lastState = null;
const subscribe = () => feed.contentWindow?.postMessage({ type: 'admira:watch:subscribe' }, feedOrigin);
feed.addEventListener('load', subscribe);
const statusTimer = setInterval(() => { if (Date.now() - lastFrame > 3000) { status.textContent = 'Esperando la señal de Admira TV'; subscribe(); } }, 1500);
window.addEventListener('pagehide', () => clearInterval(statusTimer), { once: true });

window.addEventListener('message', event => {
  if (event.origin !== feedOrigin || event.source !== feed.contentWindow || event.data?.type !== 'admira:watch:frame') return;
  const { frame } = event.data;
  if (!(frame instanceof ImageBitmap)) return;
  try {
    if (frame.width !== SCREEN.width || frame.height !== SCREEN.height) return;
    faceContext.drawImage(frame, 0, 0);
    faceTexture.needsUpdate = true;
    output?.drawImage(frame, 0, 0);
    lastFrame = Date.now();
    lastState = event.data;
    status.textContent = statusText(event.data);
    document.querySelector('[data-control="toggle"]')?.setAttribute('aria-pressed', String(Boolean(event.data.paused)));
    if (lit && event.data.pending?.action === lit.action) {
      light(lit.action, event.data.pending.phase);
      if (event.data.pending.phase === 'confirmed') { clearTimeout(lit.timer); lit.timer = setTimeout(resetLight, 1500); }
    } else if (lit && !event.data.pending && !event.data.physical?.online) {
      // Sin iPhone físico en línea la orden sólo cambia el virtual: se apaga al instante.
      clearTimeout(lit.timer); lit.timer = setTimeout(resetLight, 600);
    }
    physical.textContent = physicalSummary(event.data.physical);
  } finally { frame.close(); }
});

// Presencia en la flota (lo que late el iPhone en /signage/screens), por si el player aún no manda telemetría.
async function pollPresence() {
  if (lastState?.physical) return;
  try {
    const screens = await fetch('https://api.admira.store/signage/screens', { cache: 'no-store', signal: AbortSignal.timeout(6000) }).then(r => r.json());
    const presence = (screens?.screens || []).find(entry => entry?.screen === 'iphone-pro-max');
    const age = presence ? Number(presence.age_seconds) : null;
    if (age === null || !Number.isFinite(age)) physical.textContent = physicalSummary(null);
    else physical.textContent = age > 45 ? 'iPhone físico: sin señal desde hace ' + (age < 3600 ? age + ' s' : Math.round(age / 3600) + ' h') : 'iPhone físico: en antena' + (presence.version ? ' · ' + presence.version : '');
  } catch { physical.textContent = 'iPhone físico: estado no disponible'; }
}
void pollPresence();
const presenceTimer = setInterval(() => void pollPresence(), 15000);
window.addEventListener('pagehide', () => clearInterval(presenceTimer), { once: true });

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
