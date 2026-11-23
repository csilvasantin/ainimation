export const SCREEN = Object.freeze({ width: 480, height: 800 });
export const NOW_URL = 'https://api.admira.store/signage/now?screen=eink-sy11-ab';
export const IPHONE_NOW_URL = 'https://api.admira.store/signage/now?screen=iphone-pro-max';
export const WALL_URL = 'https://admira.tv/api/wall?group=iphone-galleon';

export function posterOf(item) {
  if (!item) return '';
  const direct = item.thumbnail || item.poster || item.url || '';
  if (direct) return String(direct);
  const id = item.id;
  return id ? 'https://stock.admira.store/stock/' + id + '/poster.jpg' : '';
}

export function physicalSummary(now, at = Date.now()) {
  if (!now?.item) return 'SY11-ab física: sin latido todavía';
  const age = Math.max(0, Math.round((at - (now.lastSeen || 0)) / 1000));
  const title = String(now.item.title || now.item.id || 'sin título');
  const online = now.standby ? 'en espera' : 'en antena';
  const fw = now.device?.eink?.firmware ? ' · firmware ' + now.device.eink.firmware : '';
  return 'SY11-ab física: ' + online + ' · ' + title + ' · visto hace ' + age + ' s' + fw;
}

export function statusText(state) {
  if (state?.error) return 'No pude leer el previo: ' + state.error;
  const item = state?.eink?.item;
  if (!item?.id) return 'Esperando el previo de la pantalla física';
  const wall = state?.wall?.mode ? ' · espejo ' + state.wall.mode : '';
  return 'Previo en la tinta · ' + String(item.title || item.id) + wall;
}
