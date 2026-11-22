// Apple Watch Ultra · lógica pura del gemelo (DeepAgent Neo, 22-nov-2026): qué pieza del modelo manda qué orden,
// colores de cada fase de una orden y la ficha del reloj físico. Probado en node (tests/apple-watch-twin.test.mjs).
export const PHASE_COLORS = Object.freeze({ idle: null, pending: '#ffcd22', confirmed: '#22da65', failed: '#de273c' });

/** Orden que dispara un clic sobre un nodo del GLB: corona y pantalla pausan/reanudan, Acción = siguiente, lateral = anterior. */
export function controlFor(name) {
  const node = String(name || '');
  if (/^(DigitalCrown|CrownRing|CrownRidge\d+|Screen|Crystal)$/.test(node)) return 'toggle';
  if (node === 'ActionButton') return 'next';
  if (node === 'SideButton') return 'prev';
  return null;
}

/** Girar la rueda del ratón sobre la corona: hacia abajo siguiente, hacia arriba anterior; giros minúsculos se ignoran. */
export function wheelAction(deltaY) {
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 4) return null;
  return deltaY > 0 ? 'next' : 'prev';
}

/** Nodo del modelo que se ilumina con cada orden. */
export function nodeForAction(action) {
  return { toggle: 'DigitalCrown', next: 'ActionButton', prev: 'SideButton' }[action] || null;
}

/** Ficha «Reloj físico» a partir de la telemetría que reenvía el player (physical del fotograma). */
export function physicalSummary(state, now = Date.now()) {
  if (!state || !Number.isFinite(Number(state.received))) return 'Reloj físico: sin latido todavía · instala la app watchOS (admira-tv/tools/apple-watch-player)';
  const age = Math.max(0, Math.round((now - Number(state.received)) / 1000));
  if (!state.online || age >= 30) return 'Reloj físico: sin señal desde hace ' + (age < 3600 ? age + ' s' : Math.round(age / 3600) + ' h');
  const piece = state.title ? ' · ' + String(state.title).slice(0, 60) : '';
  const position = Number.isInteger(state.index) && Number.isInteger(state.total) && state.total > 0 ? ' (' + (state.index + 1) + '/' + state.total + ')' : '';
  const battery = state.battery != null ? ' · batería ' + Math.round(Number(state.battery) * 100) + ' %' : '';
  return 'Reloj físico: ' + (state.paused ? 'en pausa' : 'en antena') + battery + piece + position + ' · visto hace ' + age + ' s';
}

/** Línea de estado del player virtual según el fotograma recibido. */
export function statusText(frame) {
  if (!frame) return 'Esperando la señal de Admira TV';
  if (frame.notice) return frame.notice;
  if (frame.pending?.phase === 'pending') return 'Orden enviada al reloj físico · esperando su eco';
  const air = frame.onAir && typeof frame.onAir === 'object' ? frame.onAir : null;
  const piece = air?.title ? ' · ' + String(air.title).slice(0, 80) + (air.total > 1 ? ' (' + (air.index + 1) + '/' + air.total + ')' : '') : '';
  const source = air?.source === 'playout' ? 'Playout de la flota' : air?.source === 'playlist' ? 'Playlist del reloj' : air?.source === 'off' ? 'Pantalla apagada por el playout' : 'Señal real del player';
  if (!frame.playing) return air?.source === 'playlist' && !air.id ? 'Playlist del reloj vacía · importa piezas en el mando o etiquétalas #applewatch en el Stock' : source + ' · cargando…';
  return source + (frame.paused ? ' · en pausa' : '') + piece;
}
