// iPhone Pro Max · lógica pura del gemelo (DeepAgent Neo, 22-nov-2026): qué pieza del modelo manda qué orden,
// colores de cada fase de una orden y la ficha del iPhone físico. Probado en node (tests/iphone-twin.test.mjs).
export const PHASE_COLORS = Object.freeze({ idle: null, pending: '#ffcd22', confirmed: '#22da65', failed: '#de273c' });
export const SCREEN = Object.freeze({ width: 440, height: 956 });

/** Orden que dispara un clic sobre un nodo del GLB: pantalla, Acción o lateral pausan/reanudan; volumen + = anterior,
 *  volumen − = siguiente; Control de cámara = siguiente. */
export function controlFor(name) {
  const node = String(name || '');
  if (/^(Screen|Crystal|ActionButton|SideButton)$/.test(node)) return 'toggle';
  if (node === 'VolumeUp') return 'prev';
  if (node === 'VolumeDown' || node === 'CameraControl') return 'next';
  return null;
}

/** Deslizar sobre la pantalla del modelo (o rueda): hacia abajo/izquierda siguiente, hacia arriba/derecha anterior; mínimos se ignoran. */
export function swipeAction(deltaX, deltaY) {
  const x = Number(deltaX) || 0, y = Number(deltaY) || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < 4) return null;
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'next' : 'prev') : (y > 0 ? 'next' : 'prev');
}

/** Nodo del modelo que se ilumina con cada orden. */
export function nodeForAction(action) {
  return { toggle: 'ActionButton', next: 'VolumeDown', prev: 'VolumeUp' }[action] || null;
}

/** Ficha «iPhone físico» a partir de la telemetría que reenvía el player (physical del fotograma). */
export function physicalSummary(state, now = Date.now()) {
  if (!state || !Number.isFinite(Number(state.received))) return 'iPhone físico: sin latido todavía · instala la app iOS (admira-tv/tools/apple-watch-player, target AdmiraPhonePlayer)';
  const age = Math.max(0, Math.round((now - Number(state.received)) / 1000));
  if (!state.online || age >= 30) return 'iPhone físico: sin señal desde hace ' + (age < 3600 ? age + ' s' : Math.round(age / 3600) + ' h');
  const piece = state.title ? ' · ' + String(state.title).slice(0, 60) : '';
  const position = Number.isInteger(state.index) && Number.isInteger(state.total) && state.total > 0 ? ' (' + (state.index + 1) + '/' + state.total + ')' : '';
  const battery = state.battery != null ? ' · batería ' + Math.round(Number(state.battery) * 100) + ' %' : '';
  return 'iPhone físico: ' + (state.paused ? 'en pausa' : 'en antena') + battery + piece + position + ' · visto hace ' + age + ' s';
}

/** Línea de estado del player virtual según el fotograma recibido. */
export function statusText(frame) {
  if (!frame) return 'Esperando la señal de Admira TV';
  if (frame.notice) return frame.notice;
  if (frame.pending?.phase === 'pending') return 'Orden enviada al iPhone físico · esperando su eco';
  const air = frame.onAir && typeof frame.onAir === 'object' ? frame.onAir : null;
  const piece = air?.title ? ' · ' + String(air.title).slice(0, 80) + (air.total > 1 ? ' (' + (air.index + 1) + '/' + air.total + ')' : '') : '';
  const source = air?.source === 'playout' ? 'Playout de la flota' : air?.source === 'playlist' ? 'Playlist del iPhone' : air?.source === 'off' ? 'Pantalla apagada por el playout' : 'Señal real del player';
  if (!frame.playing) return air?.source === 'playlist' && !air.id ? 'Playlist del iPhone vacía · importa piezas en el mando o etiquétalas #iphone en el Stock' : source + ' · cargando…';
  return source + (frame.paused ? ' · en pausa' : '') + piece;
}
