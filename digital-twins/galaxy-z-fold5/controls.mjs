export const SCREEN_ID = 'fold-carlos-pruebas';
export const NOW_URL = `https://api.admira.store/signage/now?screen=${SCREEN_ID}`;
export const REGISTRY_URL = `https://api.admira.store/locations/devices/${SCREEN_ID}`;
export const DIMENSIONS = Object.freeze({ inner: [1812, 2176], cover: [904, 2316] });

export function hingePose(value) {
  const n = Number(value);
  const angle = Number.isFinite(n) ? Math.min(180, Math.max(0, n)) : 180;
  const beta = (180 - angle) * Math.PI / 360;
  return { angle, left: -beta, right: beta, hingeY: .305 + .365 * Math.sin(beta) };
}

export function physicalView(state, now = Date.now()) {
  const seen = Number(state?.lastSeen);
  if (!Number.isFinite(seen) || seen <= 0) return { fresh: false, title: 'Sin observación reciente', detail: 'Conecta el observador externo del Fold5 para consultar su estado.', age: null, angle: null, playing: false };
  const age = Math.max(0, Math.round((now - seen) / 1000));
  const fresh = age <= 60;
  const status = String(state?.health?.status || '');
  const angle = status.startsWith('closed') ? 0 : status === 'half-opened' ? 90 : status === 'opened' ? 180 : null;
  const playing = fresh && !!state?.item && state?.device?.display?.playbackPaused !== true;
  const title = !fresh ? 'Observación desactualizada' : status.startsWith('closed') ? 'Plegado · pantalla exterior' : status === 'half-opened' ? 'Flex · parcialmente abierto' : status === 'opened' ? 'Abierto · pantalla interior' : 'Player en segundo plano';
  const detail = !fresh ? 'El último estado se conserva como referencia.' : status === 'closed-audio' ? 'El audio continúa; la app no se ha trasladado a la cubierta.' : status === 'closed' ? 'La reproducción se ha detenido al plegar. Al abrirlo se recupera.' : playing ? `En reproducción · ${state.item.title || 'contenido identificado'}` : String(state?.health?.error || 'Dispositivo observado; sin reproducción confirmada.');
  return { fresh, title, detail, age, angle, playing };
}

export function registryTags(payload) {
  const entry = payload?.device || payload?.element || payload;
  const tags = Array.isArray(entry?.routingTags) ? entry.routingTags : [];
  return [...new Set(tags.filter(t => typeof t === 'string').map(t => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 30);
}

export function mediaOf(item) {
  const raw = item?.url || item?.asset;
  if (typeof raw !== 'string') return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const type = String(item?.type || item?.assetType || '').toLowerCase();
  return { id: String(item?.id || item?.stockId || url.href), url: url.href, title: String(item?.title || 'Contenido del Fold5'), kind: ['image', 'digital-twin'].includes(type) ? 'image' : type === 'audio' || type === 'music' ? 'audio' : 'video' };
}
