// Escenario Trío: Apple Watch Ultra + iPhone Pro Max + Samsung Galaxy Fold sobre la misma mesa, a escala real (los tres
// GLB están en unidades de 10 mm) y colocados como la pared de admira-tv/assets/wall.mjs. Cada pantalla pinta los
// fotogramas de su player (apple-watch.html, iphone.html, fold.html). Los botones de modo escriben /api/wall a través de
// un player (postMessage admira:watch:wall): «sincronizados» = misma playlist al fotograma; «extendidos» = una sola
// composición repartida entre las tres pantallas. Último hito de la misión «Apple Watch Ultra Digital Twin» (22-nov-2026).
import * as THREE from 'three';
import { addObjectFloor } from '../floor-grid.mjs?v=1';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEVICES, MODES, deviceStatus, frameAccepted, placement, wallSummary } from './controls.mjs';

const SCALE = 0.2;
const canvas = document.querySelector('#trio');
const status = document.querySelector('#status');
const wallLine = document.querySelector('#wall');
const modeText = document.querySelector('#mode-text');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10182b');
addObjectFloor(scene, -.1, .5);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
camera.position.set(2.4, 6.2, 7.4);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, .1, 0);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2;
scene.add(new THREE.HemisphereLight('#e0eaff', '#3e4350', 2.4));
const key = new THREE.DirectionalLight('#dce6ff', 2.2);
key.position.set(2, 6, -3);
scene.add(key);
const fill = new THREE.DirectionalLight('#ffe9d0', .9);
fill.position.set(-4, 3, 4);
scene.add(fill);

// Un player por aparato: iframe oculto → fotogramas → textura de su malla «Screen».
const players = DEVICES.map(device => {
  const face = document.createElement('canvas');
  face.width = device.screen.width;
  face.height = device.screen.height;
  const context = face.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, face.width, face.height);
  const texture = new THREE.CanvasTexture(face);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  const feed = document.createElement('iframe');
  feed.className = 'feed';
  feed.allow = 'autoplay';
  feed.tabIndex = -1;
  feed.title = 'Señal del player · ' + device.name;
  feed.src = device.feed;
  document.body.appendChild(feed);
  const origin = new URL(device.feed).origin;
  const line = document.querySelector('[data-device="' + device.id + '"]');
  const player = { device, face, context, texture, feed, origin, line, lastFrame: 0, frame: null };
  feed.addEventListener('load', () => subscribe(player));
  new GLTFLoader().load(device.model, gltf => {
    const model = gltf.scene;
    model.scale.setScalar(SCALE);
    const at = placement(device, SCALE);
    model.position.set(at.x, 0, at.z);
    model.traverse(object => {
      if (object.isMesh && object.name === 'Screen') object.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    });
    scene.add(model);
  }, undefined, error => { if (line) line.textContent = device.label + ': no se pudo cargar el modelo (' + (error?.message || error) + ')'; });
  return player;
});
const subscribe = player => player.feed.contentWindow?.postMessage({ type: 'admira:watch:subscribe' }, player.origin);

window.addEventListener('message', event => {
  const player = players.find(p => event.origin === p.origin && event.source === p.feed.contentWindow);
  if (!player || event.data?.type !== 'admira:watch:frame') return;
  const { frame } = event.data;
  if (!(frame instanceof ImageBitmap)) return;
  try {
    if (!frameAccepted(frame, player.device)) return;
    player.context.drawImage(frame, 0, 0);
    player.texture.needsUpdate = true;
    player.lastFrame = Date.now();
    player.frame = event.data;
    if (player.line) player.line.textContent = deviceStatus(player.device, event.data);
    paintSummary();
  } finally { frame.close(); }
});

function paintSummary() {
  const frames = players.map(p => Date.now() - p.lastFrame < 3000 ? p.frame : null);
  wallLine.textContent = wallSummary(frames);
  const mode = frames.find(f => f?.wall?.mode)?.wall?.mode;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  if (mode && MODES[mode]) modeText.textContent = MODES[mode].text;
  status.textContent = frames.every(Boolean) ? 'Tres señales en vivo' : frames.some(Boolean) ? 'Esperando alguna señal de Admira TV' : 'Esperando la señal de Admira TV';
}
const statusTimer = setInterval(() => { players.forEach(p => { if (Date.now() - p.lastFrame > 3000) subscribe(p); }); paintSummary(); }, 1500);
window.addEventListener('pagehide', () => clearInterval(statusTimer), { once: true });

// Modo de la pared: lo escribe el primer player (mismo origen que /api/wall, con la sesión del navegador).
for (const button of document.querySelectorAll('[data-mode]')) button.onclick = () => {
  players[0].feed.contentWindow?.postMessage({ type: 'admira:watch:wall', mode: button.dataset.mode }, players[0].origin);
  modeText.textContent = 'Cambiando a «' + MODES[button.dataset.mode].label + '»… los tres aparatos lo leen en 5 s.';
};
// Transporte a los tres a la vez.
for (const button of document.querySelectorAll('[data-control]')) button.onclick = () => {
  for (const player of players) player.feed.contentWindow?.postMessage({ type: 'admira:watch:control', action: button.dataset.control }, player.origin);
};

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(canvas);
resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
