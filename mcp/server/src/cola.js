/*
 * Gestor de colas de pedidos (Carlos, 7-oct-2026): el QR de pago del quiosco lleva al móvil a un
 * pago SIMULADO y de ahí a la pantalla de la cola, donde la persona ve su número pasar de
 * «En preparación» a «¡Listo para recoger!». Antes no existía ninguno en el ecosistema (solo el
 * dibujo «PEDIDO LISTO» del juego del gemelo). Un Durable Object por tienda (idFromName(store)).
 * Nunca hay dinero real: «pagar» solo marca el pedido como pagado-simulado.
 * Estados: pendiente → recibido (al pagar, RECIBIDO_S) → preparando (PREP_S) → listo «preparado» (o el barista) → recogido
 * (auto a los RECOGER s de estar listo, o el barista). El tiempo se evalúa al leer: sin alarmas.
 */
// Tres fases (Carlos, 7-oct-2026): recibido (1 min) → en preparación (1 min) → preparado/listo; recogido a los 2 min.
export const RECIBIDO_S = 60, PREP_S = 60, RECOGER_S = 120, MAX = 300, VIDA_MS = 3 * 3600_000;
export const STORE = /^[a-z0-9-]{2,80}$/, ID = /^[A-Za-z0-9._-]{4,64}$/;
/** Nombre de pila para llamar al cliente: solo letras, espacios, guion y apóstrofo; máx. 24. */
export const limpiaNombre = (n) => String(n || '').normalize('NFC').replace(/[^\p{L} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24) || null;
const ORDEN = ['pendiente', 'recibido', 'preparando', 'listo', 'recogido'];
export const FASES = { pendiente: ['Pendiente de pago', 'Awaiting payment'], recibido: ['Recibido', 'Received'], preparando: ['En preparación', 'Preparing'], listo: ['Preparado', 'Ready'], recogido: ['Recogido', 'Collected'] };

/** Estado efectivo de un pedido en el instante `ahora` (ms). */
export function estadoDe(p, ahora = Date.now()) {
  if (p.recogidoAt) return 'recogido';
  if (!p.pagadoAt) return 'pendiente';
  const prep = p.prepAt || p.pagadoAt + RECIBIDO_S * 1000;
  if (!p.listoAt && ahora < prep) return 'recibido';
  const listo = p.listoAt || (p.auto !== false ? prep + (p.prep || PREP_S) * 1000 : 0);
  if (!listo || ahora < listo) return 'preparando';
  if (p.auto !== false && ahora >= listo + RECOGER_S * 1000) return 'recogido';
  return 'listo';
}
export const vista = (p, ahora = Date.now()) => { const e = estadoDe(p, ahora); return { id: p.id, numero: p.numero, estado: e, fase: FASES[e][0], fase_en: FASES[e][1], total: p.total, moneda: p.moneda, via: p.via || null, nombre: p.nombre || null, llamadas: p.llamadas || 0, llamado: p.llamadoAt ? new Date(p.llamadoAt).toISOString() : null, creado: new Date(p.creadoAt).toISOString(), pagado: p.pagadoAt ? new Date(p.pagadoAt).toISOString() : null, simulado: true }; };

/** Lógica pura sobre un mapa {id → pedido} y un contador; la usa el DO y los tests. */
export function crearCola(datos = { pedidos: {}, n: 0 }) {
  const d = datos; d.pedidos ||= {}; d.n ||= 0;
  const podar = (ahora) => { const l = Object.values(d.pedidos).sort((a, b) => a.creadoAt - b.creadoAt); let n = l.length; for (const p of l) if (ahora - p.creadoAt > VIDA_MS || n >= MAX) { delete d.pedidos[p.id]; n--; } };
  const buscar = (k) => d.pedidos[k] || Object.values(d.pedidos).filter((p) => p.numero === k).sort((a, b) => b.creadoAt - a.creadoAt)[0];
  return {
    datos: d,
    crear({ id, total = 0, moneda = 'EUR', prefijo = 'A', prep, nombre } = {}, ahora = Date.now()) {
      if (!ID.test(String(id || ''))) throw new Error('id de pedido inválido');
      if (d.pedidos[id]) return vista(d.pedidos[id], ahora);
      podar(ahora); d.n = d.n >= 999 ? 1 : d.n + 1;
      const p = { id, numero: String(prefijo || 'A').replace(/[^A-Z]/g, '').slice(0, 2) + String(d.n).padStart(3, '0'), total: Math.max(0, Math.min(9999, +total || 0)), moneda: String(moneda).replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR', creadoAt: ahora, prep: prep ? Math.max(3, Math.min(600, +prep)) : PREP_S, nombre: limpiaNombre(nombre) };
      d.pedidos[id] = p; return vista(p, ahora);
    },
    pagar(k, via = 'qr', ahora = Date.now()) { const p = buscar(k); if (!p) throw new Error('pedido no encontrado'); if (!p.pagadoAt) { p.pagadoAt = ahora; p.via = via === 'caja' ? 'caja' : 'qr'; } return vista(p, ahora); },
    avanzar(k, a, ahora = Date.now()) {
      const p = buscar(k); if (!p) throw new Error('pedido no encontrado');
      const e = estadoDe(p, ahora), destino = a || ORDEN[Math.min(4, ORDEN.indexOf(e) + 1)];
      if (!ORDEN.includes(destino)) throw new Error('estado inválido: ' + destino);
      if (destino === 'recibido') { p.pagadoAt = ahora; p.prepAt = 0; p.listoAt = 0; p.recogidoAt = 0; delete p.auto; }
      if (destino === 'preparando') { p.pagadoAt ||= ahora; p.prepAt = ahora; p.listoAt = 0; p.recogidoAt = 0; delete p.auto; }
      if (destino === 'listo') { p.pagadoAt ||= ahora; p.prepAt ||= ahora; p.listoAt = ahora; p.recogidoAt = 0; delete p.auto; }
      if (destino === 'recogido') { p.pagadoAt ||= ahora; p.recogidoAt = ahora; }
      return vista(p, ahora);
    },
    /** Volver a llamar a un pedido (lo pone «listo» si no lo estaba): las pantallas lo anuncian otra vez. */
    llamar(k, ahora = Date.now()) { const p = buscar(k); if (!p) throw new Error('pedido no encontrado'); if (estadoDe(p, ahora) !== 'listo') this.avanzar(p.id, 'listo', ahora); p.llamadoAt = ahora; p.llamadas = (p.llamadas || 0) + 1; return vista(p, ahora); },
    /** Vaciar la cola de la tienda y volver a numerar desde 001. */
    reiniciar() { const n = Object.keys(d.pedidos).length; d.pedidos = {}; d.n = 0; return { borrados: n }; },
    uno(k, ahora = Date.now()) { const p = buscar(k); return p ? vista(p, ahora) : null; },
    estado(ahora = Date.now()) {
      const l = Object.values(d.pedidos).map((p) => vista(p, ahora));
      const de = (e) => l.filter((p) => p.estado === e).sort((a, b) => a.pagado < b.pagado ? -1 : 1);
      return { recibido: de('recibido'), preparando: de('preparando'), listo: de('listo').reverse(), fases: ['recibido', 'preparando', 'listo'], recogidos: de('recogido').slice(-10).length, pendientes: de('pendiente').length, recibido_s: RECIBIDO_S, prep_s: PREP_S, recoger_s: RECOGER_S, ahora: new Date(ahora).toISOString(), simulado: true };
    },
  };
}

export class ColaTienda {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const u = new URL(request.url), op = u.pathname.split('/').pop();
    const datos = (await this.ctx.storage.get('cola')) || { pedidos: {}, n: 0 };
    const c = crearCola(datos);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const k = String(body.id || body.numero || u.searchParams.get('id') || u.searchParams.get('pedido') || '').slice(0, 64);
    let r, cambia = false;
    try {
      if (op === 'pedido' && request.method === 'POST') { r = c.crear(body); cambia = true; }
      else if (op === 'pedido') { r = c.uno(k); if (!r) return Response.json({ ok: false, error: 'pedido no encontrado' }, { status: 404 }); }
      else if (op === 'pagar') { r = c.pagar(k, body.via); cambia = true; }
      else if (op === 'avanzar') { r = c.avanzar(k, body.a || body.estado); cambia = true; }
      else if (op === 'llamar' && request.method === 'POST') { r = c.llamar(k); cambia = true; }
      else if (op === 'reiniciar' && request.method === 'POST') { r = c.reiniciar(); cambia = true; }
      else if (op === 'estado') r = c.estado();
      else return Response.json({ ok: false, error: 'operación desconocida' }, { status: 404 });
    } catch (e) { return Response.json({ ok: false, error: String(e.message || e) }, { status: 400 }); }
    if (cambia) await this.ctx.storage.put('cola', c.datos);
    return Response.json({ ok: true, ...r });
  }
}
