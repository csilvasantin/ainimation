// Señal de REPOSO del Stream Deck XL de AdmiraNeXT01 (antes METAHUMAN) · 10-nov-2026.
// Cuando el deck está en salvapantallas (Elgato, GIF 8×4 de la playlist admira-tv-streamdeck que
// prepara Trinity), el puente manda en su POST un objeto `reposo` y la nube lo devuelve en /estado.
// Este módulo decide, sin tocar el DOM, si el gemelo debe mostrar «REPOSO · playlist» y qué pieza.
// Retrocompatible: sin `reposo` (puente antiguo o sin señal) devuelve null y el gemelo sigue igual.
// Especificación completa: admira-xp/docs/objeto-stream-deck.md § «Señal de reposo».

export const REPOSO_CADUCA_MS = 15000; // igual que «en línea»: sin latido reciente la señal no vale
export const PLAYLIST_STREAMDECK = 'admira-tv-streamdeck';

const texto = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const entero = (v, min = 0) => (Number.isFinite(Number(v)) && Number(v) >= min ? Math.floor(Number(v)) : null);
const posterSeguro = (u) => {
  try {
    const url = new URL(String(u || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
};

// Normaliza la pieza en emisión (misma forma que manda el puente y guarda la nube).
export function normalizarPieza(p) {
  if (!p || typeof p !== 'object') return null;
  const pieza = {
    id: texto(p.id, 60), title: texto(p.title, 120), sub: texto(p.sub, 80),
    seconds: entero(p.seconds), index: entero(p.index), total: entero(p.total, 1),
    poster: posterSeguro(p.poster), desde: entero(p.desde)
  };
  return pieza.id || pieza.title ? pieza : null;
}

// st = respuesta de /objeto/stream-deck/api/estado. Devuelve null (gemelo como siempre) o
// {desde, ts, fuente, playlist:{screen,name,rev,total}, pieza|null}.
export function leerReposo(st, ahora = Date.now()) {
  if (!st || !st.ok || !st.enLinea) return null;
  const r = st.reposo;
  if (!r || typeof r !== 'object' || r.estado !== 'reposo') return null;
  const reloj = Number(st.ahora) || ahora;
  const ts = entero(r.ts) ?? entero(st.visto);
  if (ts == null || reloj - ts > REPOSO_CADUCA_MS) return null;
  const pl = r.playlist && typeof r.playlist === 'object' ? r.playlist : {};
  return {
    desde: entero(r.desde), ts, fuente: texto(r.fuente, 40),
    playlist: { screen: texto(pl.screen, 60) || PLAYLIST_STREAMDECK, name: texto(pl.name, 80) || 'admira.tv StreamDeck',
      rev: entero(pl.rev), total: entero(pl.total, 1) },
    pieza: normalizarPieza(r.pieza)
  };
}

// «hace 4 min» a partir de un instante en ms del reloj de la nube.
export function haceCuanto(desde, ahora) {
  if (!desde) return '';
  const s = Math.max(0, Math.round((ahora - desde) / 1000));
  return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`;
}
