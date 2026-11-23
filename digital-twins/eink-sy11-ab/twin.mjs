// Gemelo 3D de la SY11-ab (Woz, 23-nov-2026, t1378u).
// Modelo GLB procedural (model/sy11-ab.py, Blender 5.2). En Blender el cuerpo se construyó con la altura en Y
// y la pantalla en +Z, o sea tumbado boca arriba en el Z-up de Blender; el export glTF lo dejaba igual en el
// visor (pantalla al cielo, mucho vacío arriba). Aquí se pone de pie, USB-C a la izquierda, LED abajo, y se
// inclina ~12° hacia atrás como en el soporte de la foto de Carlos (23-nov-2026).
// La malla «Screen» (480 × 800) pinta el mismo previo que late la pantalla física en
// https://api.admira.store/signage/now?screen=eink-sy11-ab (CORS abierto a ainimation.studio).
import * as THREE from 'three';
import { addObjectFloor } from '../floor-grid.mjs?v=1';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { SCREEN, NOW_URL, IPHONE_NOW_URL, WALL_URL, posterOf, physicalSummary, statusText } from './preview.mjs';

const status = document.querySelector('#status');
const physical = document.querySelector('#physical');
const canvas = document.querySelector('#eink');
const output = document.querySelector('#face-output')?.getContext('2d', { alpha: false });

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10182b');
addObjectFloor(scene, -.02, .45);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
camera.position.set(4.8, 6.4, 16);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5.0, 0.2);
controls.enableDamping = true;
controls.minDistance = 6;
controls.maxDistance = 32;
controls.maxPolarAngle = Math.PI / 2;
scene.add(new THREE.HemisphereLight('#e0eaff', '#3e4350', 2.2));
const key = new THREE.DirectionalLight('#dce6ff', 2.1);
key.position.set(4, 8, 8);
scene.add(key);
const fill = new THREE.DirectionalLight('#ffe9d0', 0.9);
fill.position.set(-5, 3, 4);
scene.add(fill);

const face = document.createElement('canvas');
face.width = SCREEN.width;
face.height = SCREEN.height;
const faceContext = face.getContext('2d');
faceContext.fillStyle = '#111';
faceContext.fillRect(0, 0, face.width, face.height);
const faceTexture = new THREE.CanvasTexture(face);
faceTexture.colorSpace = THREE.SRGBColorSpace;
faceTexture.flipY = false;
faceTexture.anisotropy = 4;

new GLTFLoader().load('./sy11-ab.glb', gltf => {
  const model = gltf.scene;
  model.traverse(object => {
    if (!object.isMesh) return;
    if (object.name === 'Screen') object.material = new THREE.MeshBasicMaterial({ map: faceTexture, toneMapped: false });
  });
  // +90° en X: altura otra vez en +Y y pantalla hacia +Z (hacia la cámara). −12°: se recuesta en su soporte.
  model.rotation.x = Math.PI / 2 - 12 * Math.PI / 180;
  scene.add(model);
}, undefined, error => { if (status) status.textContent = 'No se pudo cargar el modelo 3D de la SY11-ab: ' + (error?.message || error); });

function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * renderer.getPixelRatio()));
  const h = Math.max(1, Math.round(rect.height * renderer.getPixelRatio()));
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }
}
function tick() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

function paint(image) {
  const dw = face.width, dh = face.height;
  faceContext.fillStyle = '#f4efe6';
  faceContext.fillRect(0, 0, dw, dh);
  if (image) {
    const scale = Math.min(dw / image.width, dh / image.height);
    const w = image.width * scale, h = image.height * scale;
    faceContext.drawImage(image, (dw - w) / 2, (dh - h) / 2, w, h);
  }
  faceTexture.needsUpdate = true;
  if (output) {
    output.fillStyle = '#f4efe6';
    output.fillRect(0, 0, output.canvas.width, output.canvas.height);
    output.drawImage(face, 0, 0, output.canvas.width, output.canvas.height);
  }
}

async function loadImage(url) {
  const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const blob = await response.blob();
  return await createImageBitmap(blob);
}

let lastSrc = '';
async function refresh() {
  try {
    const [eink, iphone, wall] = await Promise.all([
      fetch(NOW_URL, { cache: 'no-store' }).then(r => r.json()),
      fetch(IPHONE_NOW_URL, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch(WALL_URL, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
    ]);
    const state = { eink, iphone, wall };
    if (status) status.textContent = statusText(state);
    if (physical) {
      let line = physicalSummary(eink);
      const iId = iphone?.item?.id, eId = eink?.item?.id;
      if (iId && eId && iId !== eId) line += ' · el iPhone va por otra pieza (el puente la enviará al cambiar / al acabar el envío)';
      physical.textContent = line;
    }
    const src = posterOf(eink?.item);
    if (src && src !== lastSrc) {
      const image = await loadImage(src);
      paint(image);
      lastSrc = src;
    }
  } catch (error) {
    if (status) status.textContent = statusText({ error: error.message || String(error) });
  }
}

paint(null);
refresh();
setInterval(refresh, 8000);
