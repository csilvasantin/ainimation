// Escenario Trío (reloj + iPhone + Fold) · lógica pura (DeepAgent Neo, 22-nov-2026). Probado en node (tests/trio-twin.test.mjs).
// La pared se mide en mm como en admira-tv/assets/wall.mjs; aquí sirve para colocar los tres modelos a escala real.
export const MODES = Object.freeze({
  own: { label: 'Cada uno lo suyo', text: 'Cada aparato emite su propia playlist.' },
  sync: { label: 'Sincronizados', text: 'Los tres emiten la misma playlist (pantalla «trio») anclada al reloj del servidor: al fotograma.' },
  extended: { label: 'Extendidos', text: 'Una sola composición cubre las tres pantallas: cada aparato pinta su trozo, como si fueran una.' },
});

export const DEVICES = Object.freeze([
  { id: 'apple-watch-ultra', name: 'Apple Watch Ultra', feed: 'https://admira.tv/apple-watch.html', model: '../apple-watch-ultra/apple-watch-ultra.glb', screen: { width: 410, height: 502 }, mm: { x: 0, y: 109, w: 35, h: 43 }, label: 'Reloj' },
  { id: 'iphone-pro-max', name: 'iPhone Pro Max', feed: 'https://admira.tv/iphone.html', model: '../iphone-pro-max/iphone-pro-max.glb', screen: { width: 440, height: 956 }, mm: { x: 55, y: 0, w: 70, h: 152 }, label: 'iPhone' },
  { id: 'samsung-fold', name: 'Samsung Galaxy Fold', feed: 'https://admira.tv/fold.html', model: '../samsung-fold/samsung-fold.glb', screen: { width: 1080, height: 960 }, mm: { x: 145, y: 0, w: 143, h: 152 }, label: 'Fold' },
]);

/** Los modelos están en unidades de 10 mm: posición X (en unidades de escena) del centro de cada pantalla sobre la mesa. */
export function placement(device, scale = 0.2) {
  const centre = (device.mm.x + device.mm.w / 2) / 10; // en unidades de modelo
  const total = 28.8; // caja de la pared en unidades de modelo (288 mm)
  return { x: (centre - total / 2) * scale, z: 0 };
}

/** Cada fotograma trae de qué pantalla es; se acepta sólo si mide lo que esa pantalla pinta. */
export function frameAccepted(frame, device) {
  return Boolean(frame && frame.width === device.screen.width && frame.height === device.screen.height);
}

/** Línea de estado por aparato. */
export function deviceStatus(device, frame) {
  if (!frame) return device.label + ': esperando la señal';
  const air = frame.onAir && typeof frame.onAir === 'object' ? frame.onAir : null;
  const piece = air?.title ? String(air.title).slice(0, 48) + (air.total > 1 ? ' (' + (air.index + 1) + '/' + air.total + ')' : '') : '—';
  const physical = frame.physical?.online ? ' · físico en antena' : ' · físico sin señal';
  return device.label + ': ' + (frame.playing ? piece : 'cargando…') + (frame.paused ? ' · en pausa' : '') + physical;
}

/** Resumen de la pared según lo que cuentan los fotogramas. */
export function wallSummary(frames) {
  const modes = new Set(frames.map(f => f?.wall?.mode).filter(Boolean));
  if (!modes.size) return 'Pared: sin señal';
  if (modes.size > 1) return 'Pared: cambiando de modo (' + [...modes].join(', ') + ')';
  const mode = [...modes][0];
  const ids = new Set(frames.map(f => f?.onAir?.id).filter(Boolean));
  if (mode === 'own') return 'Pared: cada aparato con su playlist';
  return (mode === 'sync' ? 'Pared sincronizada' : 'Pared extendida') + (ids.size === 1 ? ' · los tres en la misma pieza' : ' · esperando a que coincidan (' + ids.size + ' piezas distintas)');
}
