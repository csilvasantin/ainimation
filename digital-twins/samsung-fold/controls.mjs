// Samsung Galaxy Fold · lógica pura del gemelo (DeepAgent Neo, 22-nov-2026): qué pieza del modelo manda qué orden,
// colores de cada fase de una orden y la ficha del iPhone físico. Probado en node (tests/samsung-fold-twin.test.mjs).
export const PHASE_COLORS = Object.freeze({ idle: null, pending: '#ffcd22', confirmed: '#22da65', failed: '#de273c' });
export const SCREEN = Object.freeze({ width: 1080, height: 960 });

/** Orden que dispara un clic sobre un nodo del GLB: pantalla o botón lateral pausan/reanudan; volumen + = anterior,
 *  volumen − = siguiente. */
export function controlFor(name) {
  const node = String(name || '');
  if (/^(Screen|Crystal|SideButton)$/.test(node)) return 'toggle';
  if (node === 'VolumeUp') return 'prev';
  if (node === 'VolumeDown') return 'next';
  return null;
}

/** Deslizar sobre la pantalla del modelo: a la derecha siguiente, a la izquierda anterior (Carlos, 22-nov-2026); en vertical,
 *  arriba siguiente y abajo anterior (también la rueda). Mínimos se ignoran. Igual que en el Fold físico. */
export function swipeAction(deltaX, deltaY) {
  const x = Number(deltaX) || 0, y = Number(deltaY) || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < 4) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'next' : 'prev') : (y < 0 ? 'next' : 'prev');
}

/** Nodo del modelo que se ilumina con cada orden. */
export function nodeForAction(action) {
  return { toggle: 'SideButton', next: 'VolumeDown', prev: 'VolumeUp' }[action] || null;
}

/** Ficha «Fold físico» a partir de la telemetría que reenvía el player (physical del fotograma). */
export function physicalSummary(state, now = Date.now()) {
  if (!state || !Number.isFinite(Number(state.received))) return 'Fold físico: sin latido todavía · abre https://admira.tv/fold.html?device=1 en el Fold e instálala como app';
  const age = Math.max(0, Math.round((now - Number(state.received)) / 1000));
  if (!state.online || age >= 30) return 'Fold físico: sin señal desde hace ' + (age < 3600 ? age + ' s' : Math.round(age / 3600) + ' h');
  const piece = state.title ? ' · ' + String(state.title).slice(0, 60) : '';
  const position = Number.isInteger(state.index) && Number.isInteger(state.total) && state.total > 0 ? ' (' + (state.index + 1) + '/' + state.total + ')' : '';
  const battery = state.battery != null ? ' · batería ' + Math.round(Number(state.battery) * 100) + ' %' : '';
  return 'Fold físico: ' + (state.paused ? 'en pausa' : 'en antena') + battery + piece + position + ' · visto hace ' + age + ' s';
}

/** Línea de estado del player virtual según el fotograma recibido. */
export function statusText(frame) {
  if (!frame) return 'Esperando la señal de Admira TV';
  if (frame.notice) return frame.notice;
  if (frame.pending?.phase === 'pending') return 'Orden enviada al Fold físico · esperando su eco';
  const air = frame.onAir && typeof frame.onAir === 'object' ? frame.onAir : null;
  const piece = air?.title ? ' · ' + String(air.title).slice(0, 80) + (air.total > 1 ? ' (' + (air.index + 1) + '/' + air.total + ')' : '') : '';
  const source = air?.source === 'playout' ? 'Playout de la flota' : air?.source === 'playlist' ? 'Playlist del Fold' : air?.source === 'off' ? 'Pantalla apagada por el playout' : 'Señal real del player';
  if (!frame.playing) return air?.source === 'playlist' && !air.id ? 'Playlist del Fold vacía · importa piezas en el mando o etiquétalas #fold en el Stock' : source + ' · cargando…';
  return source + (frame.paused ? ' · en pausa' : '') + piece;
}
