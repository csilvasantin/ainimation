import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addObjectFloor } from '../floor-grid.mjs';
import { NOW_URL, REGISTRY_URL, hingePose, physicalView, registryTags, mediaOf } from './controls.mjs';

const $ = id => document.getElementById(id);
const canvas = $('fold'), output = $('face-output'), ctx = output.getContext('2d');
const media = $('media');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10182b');
addObjectFloor(scene, -.07, .5);
const camera = new THREE.PerspectiveCamera(33, 1, .1, 60);
camera.position.set(-4.1, 5.5, 5.2);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const orbit = new OrbitControls(camera, canvas);
orbit.target.set(0, .55, 0);
orbit.enableDamping = true;
orbit.minDistance = 3;
orbit.maxDistance = 14;
orbit.maxPolarAngle = Math.PI * .88;
scene.add(new THREE.HemisphereLight('#e7efff', '#495773', 2.7));
for (const [color, power, position] of [['#dfeaff', 2.5, [2, 7, -4]], ['#ffe8cb', 1.2, [-5, 3, 5]]]) {
  const light = new THREE.DirectionalLight(color, power);
  light.position.set(...position);
  scene.add(light);
}
const texture = new THREE.CanvasTexture(output);
texture.flipY = false;
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
const cover = document.createElement('canvas');
cover.width = 904; cover.height = 2316;
const coverCtx = cover.getContext('2d');
const coverTexture = new THREE.CanvasTexture(cover);
coverTexture.flipY = false;
coverTexture.colorSpace = THREE.SRGBColorSpace;
let model, left, right, hinge, current = null, picture = null, lastState = null, alive = true;

function paintIdle(text = 'SIN OBSERVACIÓN') {
  ctx.fillStyle = '#070d17'; ctx.fillRect(0, 0, output.width, output.height);
  ctx.fillStyle = '#86a4c4'; ctx.font = '44px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(text, output.width / 2, output.height / 2);
  texture.needsUpdate = true;
}
paintIdle();
coverCtx.fillStyle = '#060b12'; coverCtx.fillRect(0, 0, cover.width, cover.height);
coverCtx.fillStyle = '#7891af'; coverCtx.font = '38px system-ui'; coverCtx.textAlign = 'center';
coverCtx.fillText('CUBIERTA', cover.width / 2, cover.height / 2);
coverCtx.font = '23px system-ui'; coverCtx.fillText('Sin señal del player', cover.width / 2, cover.height / 2 + 60);
coverTexture.needsUpdate = true;

function setPose(value, manual = false) {
  const pose = hingePose(value);
  $('hinge').value = String(pose.angle);
  $('angle').textContent = `${pose.angle}°`;
  if (left) left.rotation.z = pose.left;
  if (right) right.rotation.z = pose.right;
  if (hinge) hinge.position.y = pose.hingeY;
  orbit.target.y = .2 + .55 * Math.sin((180 - pose.angle) * Math.PI / 360);
  for (const button of document.querySelectorAll('[data-angle]')) button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === pose.angle));
  if (manual) $('follow').checked = false;
  $('pose-hint').textContent = $('follow').checked ? 'La pose sigue la observación disponible; los ángulos son aproximados.' : 'Exploración local. Estos controles no mueven ni controlan el teléfono.';
}
new GLTFLoader().load('./galaxy-z-fold5.glb', gltf => {
  if (!alive) return;
  model = gltf.scene;
  model.scale.setScalar(3 / 12.99);
  left = model.getObjectByName('FoldLeft'); right = model.getObjectByName('FoldRight'); hinge = model.getObjectByName('HingeShell');
  model.traverse(object => {
    if (!object.isMesh) return;
    if (['ScreenLeft', 'ScreenRight'].includes(object.name)) object.material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    if (object.name === 'CoverScreen') object.material = new THREE.MeshBasicMaterial({ map: coverTexture, toneMapped: false });
  });
  scene.add(model);
  setPose($('hinge').value);
  canvas.dataset.modelLoaded = 'true';
}, undefined, () => {
  $('model-error').hidden = false;
  $('model-error').textContent = 'No se ha podido cargar el modelo. Puedes volver a intentarlo recargando o descargar el archivo GLB.';
});
$('hinge').addEventListener('input', event => setPose(event.target.value, true));
for (const button of document.querySelectorAll('[data-angle]')) button.onclick = () => setPose(button.dataset.angle, true);
$('follow').onchange = () => updatePhysical();
$('front').onclick = () => { camera.position.set(-4.1, 5.5, 5.2); orbit.target.set(0, .55, 0); };
$('back').onclick = () => { camera.position.set(4.1, -3.8, -5.2); orbit.target.set(0, .55, 0); };

function updatePhysical() {
  const view = physicalView(lastState);
  $('physical-state').textContent = view.title;
  $('physical-detail').textContent = view.detail;
  $('last-seen').textContent = view.age === null ? 'Sin observación' : `Hace ${view.age < 120 ? view.age + ' s' : Math.floor(view.age / 60) + ' min'}`;
  $('connection').textContent = view.fresh ? 'Observación USB reciente' : view.title;
  $('connection-dot').className = 'dot ' + (view.fresh ? 'online' : 'warning');
  $('observation-source').textContent = lastState?.role === 'native-usb-observer' || String(lastState?.producer || '').startsWith('android-usb-') ? 'Observador USB externo' : 'Sin fuente USB confirmada';
  $('continuity').hidden = !String(lastState?.health?.status || '').startsWith('closed');
  if ($('follow').checked && view.angle !== null) setPose(view.angle);
  else setPose($('hinge').value);
  if (!view.fresh || !view.playing) void setMedia(null);
  else void setMedia(mediaOf(lastState.item));
}
function buttons(enabled) {
  $('preview-play').disabled = !enabled || current?.kind === 'image';
  $('preview-sound').disabled = !enabled || current?.kind === 'image';
}
async function setMedia(next) {
  if (next?.id === current?.id && next?.url === current?.url) return;
  media.pause(); media.removeAttribute('src'); media.load(); picture = null;
  current = next;
  buttons(false);
  $('preview-play').textContent = 'Reproducir previo';
  $('preview-badge').textContent = next ? 'CARGANDO PREVIO' : 'SIN SEÑAL';
  $('piece-title').textContent = next?.title || 'Sin contenido reciente confirmado';
  paintIdle(next ? 'CARGANDO PREVIO' : 'SIN SEÑAL');
  if (!next) return;
  if (next.kind === 'image') {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { if (current === next) { picture = img; $('preview-badge').textContent = 'PREVIO · IMAGEN'; } };
    img.onerror = previewError; img.src = next.url;
  } else {
    media.src = next.url;
    try { await media.play(); } catch { /* user gesture can resume the preview */ }
    if (current !== next) return;
    buttons(true);
    $('preview-play').textContent = media.paused ? 'Reproducir previo' : 'Pausar previo';
    $('preview-badge').textContent = 'PREVIO · ' + next.kind.toUpperCase();
  }
}
function previewError() {
  $('preview-badge').textContent = 'PREVIO NO DISPONIBLE';
  paintIdle('PREVIO NO DISPONIBLE');
}
media.addEventListener('error', () => { if (current) previewError(); });
$('preview-play').onclick = async () => {
  if (media.paused) { try { await media.play(); } catch { previewError(); } } else media.pause();
  $('preview-play').textContent = media.paused ? 'Reproducir previo' : 'Pausar previo';
};
$('preview-sound').onclick = () => {
  media.muted = !media.muted;
  $('preview-sound').setAttribute('aria-pressed', String(!media.muted));
  $('preview-sound').textContent = media.muted ? 'Activar sonido del previo' : 'Silenciar previo';
};
function drawPreview() {
  const source = picture || (media.readyState >= 2 && media.videoWidth ? media : null);
  if (!source) {
    if (current?.kind === 'audio') paintIdle('♪ PREVIO DE AUDIO');
    return;
  }
  const width = source.videoWidth || source.naturalWidth, height = source.videoHeight || source.naturalHeight;
  const scale = Math.min(output.width / width, output.height / height);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, output.width, output.height);
  try {
    ctx.drawImage(source, (output.width - width * scale) / 2, (output.height - height * scale) / 2, width * scale, height * scale);
    texture.needsUpdate = true;
  } catch { previewError(); }
}
async function pollState() {
  try {
    const response = await fetch(NOW_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw Error();
    lastState = await response.json();
  } catch { /* keep the timestamp so an unavailable observer always ages out */ }
  updatePhysical();
}
async function pollRegistry() {
  try {
    const response = await fetch(REGISTRY_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw Error();
    const tags = registryTags(await response.json());
    $('routing-tags').replaceChildren(...(tags.length ? tags : ['Sin grupos asignados']).map(tag => { const span = document.createElement('span'); span.textContent = tags.length ? '#' + tag : tag; return span; }));
  } catch { $('routing-tags').textContent = 'Registro no disponible'; }
}
$('device-manager').href = 'https://www.admiranext.com/pruebas/dispositivos/?screen=fold-carlos-pruebas';
void pollState(); void pollRegistry();
const stateTimer = setInterval(pollState, 15000), ageTimer = setInterval(updatePhysical, 1000), registryTimer = setInterval(pollRegistry, 60000);
const resize = new ResizeObserver(() => {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
});
resize.observe(canvas);
let lastPaint = 0;
renderer.setAnimationLoop(time => {
  orbit.update();
  if (time - lastPaint > 100) { drawPreview(); lastPaint = time; }
  renderer.render(scene, camera);
});
window.addEventListener('pagehide', () => {
  alive = false; clearInterval(stateTimer); clearInterval(ageTimer); clearInterval(registryTimer);
  media.pause(); resize.disconnect(); orbit.dispose(); renderer.setAnimationLoop(null); renderer.dispose();
}, { once: true });
