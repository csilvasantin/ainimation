// Telemetría iPhone Duo ↔ gemelos (Carlos, 25-nov-2026 11:09: «son gemelos y actúan iguales, principio de telemetría»).
// Canal https://admira.tv/api/twin-sync (pantalla iphone-duo): el Duo físico publica su estado y manda; cada gemelo
// publica sus órdenes (las aplica el Duo y, si el Duo no está en línea, los demás gemelos) y se alinea con el estado
// del Duo. Long-poll: llega en menos de un segundo. Sin secretos en esta página: sólo órdenes inocuas del player.
const API = 'https://admira.tv/api/twin-sync';
export const DUO_TTL_MS = 30000;

export function crearSync({ screen, alOrden, alEstado, log = () => {} }) {
  const client = 'tw' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let cursor = -1, vivo = true, duo = null, duoRecibido = 0, ultimoEnvio = 0, desfase = 0;
  const enLinea = () => !!duo && Date.now() - duoRecibido < DUO_TTL_MS;

  async function enviar(action, arg = null) {
    ultimoEnvio = Date.now();
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ screen, kind: 'cmd', from: 'twin', client, action, arg }), cache: 'no-store', keepalive: true });
      log('→ ' + action + (arg != null ? ' ' + arg : '') + ' · ' + r.status);
    } catch (e) { log('→ ' + action + ' falló'); }
  }
  function tomarEstado(ev, ahora) {
    if (!ev?.state) return;
    duo = { ...ev.state, seq: ev.seq, at: ev.at };
    duoRecibido = Date.now() - Math.max(0, (ahora ?? ev.at) - ev.at - desfase);   // edad real según el reloj del servidor
    alEstado?.(duo, { enLinea: enLinea(), local: Date.now() - ultimoEnvio < 1500 });
  }
  async function bucle() {
    while (vivo) {
      try {
        const q = cursor < 0 ? '' : `&since=${cursor}&wait=1`;
        const r = await fetch(`${API}?screen=${encodeURIComponent(screen)}${q}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('http ' + r.status);
        const d = await r.json();
        if (Number.isFinite(d.now)) desfase = d.now - Date.now();
        if (cursor < 0 && d.state) tomarEstado(d.state, d.now);
        for (const ev of d.events || []) {
          if (ev.kind === 'state') tomarEstado(ev, d.now);
          else if (ev.kind === 'cmd' && ev.client !== client) alOrden?.(ev, { duoEnLinea: enLinea() });
        }
        cursor = Number.isFinite(d.cursor) ? d.cursor : cursor;
      } catch (e) {
        log('sync: ' + (e.message || e)); await new Promise(r => setTimeout(r, 2500));
      }
    }
  }
  bucle();
  return { enviar, get duo() { return duo; }, enLinea, client, parar() { vivo = false; } };
}
