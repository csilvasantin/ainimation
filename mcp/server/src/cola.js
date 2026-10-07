/*
 * Gestor de colas de pedidos (Carlos, 7-oct-2026): el QR de pago del quiosco lleva al móvil a un
 * pago SIMULADO y de ahí a la pantalla de la cola, donde la persona ve su número pasar de
 * «En preparación» a «¡Listo para recoger!». Antes no existía ninguno en el ecosistema (solo el
 * dibujo «PEDIDO LISTO» del juego del gemelo). Un Durable Object por tienda (idFromName(store)).
 * Nunca hay dinero real: «pagar» solo marca el pedido como pagado-simulado.
 * Estados: pendiente → recibido (al pagar, RECIBIDO_S) → preparando (PREP_S) → listo «preparado» (o el barista) → recogido
 * (auto a los RECOGER s de estar listo, o el barista). El tiempo se evalúa al leer: sin alarmas.
 */
// Tres fases (Carlos, 7-oct-2026): recibido (30 s) → en preparación (1 min) → preparado/listo; recogido a los 2 min.
// Recibido bajó de 60 a 30 s esa misma tarde: es lo que dura la barra con el vaso en la pantalla de admira.tv.
export const RECIBIDO_S = 30, PREP_S = 60, RECOGER_S = 120, MAX = 300, VIDA_MS = 3 * 3600_000;
export const STORE = /^[a-z0-9-]{2,80}$/, ID = /^[A-Za-z0-9._-]{4,64}$/;
/** Nombre de pila para llamar al cliente: solo letras, espacios, guion y apóstrofo; máx. 24. */
export const limpiaNombre = (n) => String(n || '').normalize('NFC').replace(/[^\p{L} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24) || null;
/** Texto de una comanda: sin HTML ni caracteres de control, espacios colapsados y recortado a `max`. */
export const limpiaTexto = (t, max = 60) => String(t == null ? '' : t).normalize('NFC').replace(/<[^>]*>?/g, ' ').replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const MAX_LINEAS = 10, MAX_QTY = 10;
const OPCION = /^[a-z][a-z0-9_]{0,23}$/;
/**
 * Líneas de la comanda (Carlos, 7-oct-2026: «la barra con el detalle»). Formato del quiosco:
 * [{id, name, qty, options:{tamano, leche, temperatura, extras[]}, optionsText}]. El relé NO es fuente de
 * precios: guarda lo que la barra necesita para preparar. Como mucho MAX_LINEAS (el resto se cuenta en
 * `mas`), qty 1…MAX_QTY, textos recortados y sin HTML, como mucho 8 opciones de 8 valores.
 */
export function limpiaLineas(lines) {
  if (!Array.isArray(lines)) return { lineas: [], mas: 0 };
  const validas = lines.filter((l) => l && typeof l === 'object' && limpiaTexto(l.name || l.nombre));
  const lineas = validas.slice(0, MAX_LINEAS).map((l) => {
    const options = {};
    if (l.options && typeof l.options === 'object' && !Array.isArray(l.options)) {
      for (const [k, v] of Object.entries(l.options).slice(0, 8)) {
        if (!OPCION.test(k)) continue;
        const plano = (x) => typeof x === 'string' || typeof x === 'number';
        const val = Array.isArray(v) ? v.slice(0, 8).filter(plano).map((x) => limpiaTexto(x, 40)).filter(Boolean) : plano(v) ? limpiaTexto(v, 40) : '';
        if (Array.isArray(val) ? val.length : val) options[k] = val;
      }
    }
    const q = Math.round(+l.qty || 1);
    // optionsText legible lo manda el quiosco; si falta, la barra lo compone con las etiquetas de la carta
    // a partir de los ids de `options` (tamano: venti, leche: avena…). Solo el formato antiguo (array de
    // etiquetas) se convierte aquí.
    const optionsText = limpiaTexto(l.optionsText || (Array.isArray(l.options) ? l.options.join(' · ') : ''), 160);
    return { id: String(l.id || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) || null, name: limpiaTexto(l.name || l.nombre), qty: Math.max(1, Math.min(MAX_QTY, q || 1)), options, optionsText };
  });
  return { lineas, mas: Math.max(0, validas.length - MAX_LINEAS) };
}
/** Nombre de pila (primera palabra): lo único del cliente que ve el estado público con la cola cerrada. */
export const pila = (n) => (n ? String(n).split(' ')[0] : null) || null;
const tokenPago = () => { const b = new Uint8Array(12); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); };
const igual = (a, b) => { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
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
/**
 * Vista de un pedido. `detalle` (barra autorizada, o cola abierta) añade nombre completo, total, vía y las
 * líneas; sin él solo número, fase y nombre de pila (minimización de datos del estado público).
 */
export const vista = (p, ahora = Date.now(), detalle = true) => {
  const e = estadoDe(p, ahora);
  const base = { id: p.id, numero: p.numero, estado: e, fase: FASES[e][0], fase_en: FASES[e][1], nombre: detalle ? (p.nombre || null) : pila(p.nombre), llamadas: p.llamadas || 0, llamado: p.llamadoAt ? new Date(p.llamadoAt).toISOString() : null, creado: new Date(p.creadoAt).toISOString(), pagado: p.pagadoAt ? new Date(p.pagadoAt).toISOString() : null, simulado: true };
  if (!detalle) return base;
  return { ...base, total: p.total, moneda: p.moneda, via: p.via || null, lineas: p.lineas || [], ...(p.mas ? { lineas_mas: p.mas } : {}), articulos: (p.lineas || []).reduce((n, l) => n + l.qty, 0) + (p.mas || 0) };
};

/** Lógica pura sobre un mapa {id → pedido} y un contador; la usa el DO y los tests. */
export function crearCola(datos = { pedidos: {}, n: 0 }) {
  const d = datos; d.pedidos ||= {}; d.n ||= 0;
  const podar = (ahora) => { const l = Object.values(d.pedidos).sort((a, b) => a.creadoAt - b.creadoAt); let n = l.length; for (const p of l) if (ahora - p.creadoAt > VIDA_MS || n >= MAX) { delete d.pedidos[p.id]; n--; } };
  const buscar = (k) => d.pedidos[k] || Object.values(d.pedidos).filter((p) => p.numero === k).sort((a, b) => b.creadoAt - a.creadoAt)[0];
  return {
    datos: d,
    /** Alta (idempotente por id). Devuelve la vista completa y `pago`: el token que el QR lleva al móvil para pagar sin clave. */
    crear({ id, total = 0, moneda = 'EUR', prefijo = 'A', prep, nombre, lines, lineas } = {}, ahora = Date.now()) {
      if (!ID.test(String(id || ''))) throw new Error('id de pedido inválido');
      const l = limpiaLineas(lines || lineas);
      const ya = d.pedidos[id];
      if (ya) { if (!(ya.lineas || []).length && l.lineas.length) { ya.lineas = l.lineas; ya.mas = l.mas; } ya.pago ||= tokenPago(); return { ...vista(ya, ahora), pago: ya.pago }; }
      podar(ahora); d.n = d.n >= 999 ? 1 : d.n + 1;
      const p = { id, numero: String(prefijo || 'A').replace(/[^A-Z]/g, '').slice(0, 2) + String(d.n).padStart(3, '0'), total: Math.max(0, Math.min(9999, +total || 0)), moneda: String(moneda).replace(/[^A-Z]/g, '').slice(0, 3) || 'EUR', creadoAt: ahora, prep: prep ? Math.max(3, Math.min(600, +prep)) : PREP_S, nombre: limpiaNombre(nombre), lineas: l.lineas, mas: l.mas, pago: tokenPago() };
      d.pedidos[id] = p; return { ...vista(p, ahora), pago: p.pago };
    },
    /** ¿Este token de pago es el del pedido `k`? (el móvil que escaneó el QR paga sin clave de quiosco) */
    tokenValido(k, t) { const p = buscar(k); return !!(p && p.pago && igual(p.pago, t)); },
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
    uno(k, ahora = Date.now(), detalle = true) { const p = buscar(k); return p ? vista(p, ahora, detalle) : null; },
    /** Vista de barra (KDS): comandas abiertas (pagadas, sin recoger) por orden de llegada, con líneas. */
    comandas(ahora = Date.now()) {
      const l = Object.values(d.pedidos).map((p) => vista(p, ahora, true)).filter((p) => ['recibido', 'preparando', 'listo'].includes(p.estado));
      l.sort((a, b) => (a.pagado || a.creado) < (b.pagado || b.creado) ? -1 : 1);
      return { comandas: l, pendientes: Object.values(d.pedidos).filter((p) => estadoDe(p, ahora) === 'pendiente').length, ahora: new Date(ahora).toISOString(), simulado: true };
    },
    estado(ahora = Date.now(), detalle = true) {
      const l = Object.values(d.pedidos).map((p) => vista(p, ahora, detalle));
      const de = (e) => l.filter((p) => p.estado === e).sort((a, b) => a.pagado < b.pagado ? -1 : 1);
      return { recibido: de('recibido'), preparando: de('preparando'), listo: de('listo').reverse(), fases: ['recibido', 'preparando', 'listo'], recogidos: de('recogido').slice(-10).length, pendientes: de('pendiente').length, recibido_s: RECIBIDO_S, prep_s: PREP_S, recoger_s: RECOGER_S, ahora: new Date(ahora).toISOString(), simulado: true };
    },
  };
}

/*
 * Permisos (Carlos, 7-oct-2026, «cerrar la cola»): el worker resuelve las claves y pasa al DO la cabecera
 * interna x-cola-puede = lista de {kiosko, barra, admin} (el DO solo es alcanzable a través del worker, que
 * borra cualquier x-cola-puede que llegue de fuera). Con la cola abierta (sin secretos) el worker manda
 * kiosko,barra y todo funciona como antes.
 *   crear  → kiosko | barra («pedido en barra» de admira.tv) | admin; o el token de pago de un pedido ya creado
 *   pagar  → kiosko | admin | token de pago del pedido (x-cola-pago o body.pago: el móvil del QR)
 *   avanzar, comandas → barra | admin      llamar → barra | admin      reiniciar → admin
 *   estado, pedido (GET) → públicos; con barra el detalle (líneas, nombre completo), sin ella minimizados.
 */
const NO = (msg) => Response.json({ ok: false, error: msg }, { status: 401 });
export class ColaTienda {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const u = new URL(request.url), op = u.pathname.split('/').pop();
    const puede = new Set(String(request.headers.get('x-cola-puede') || '').split(',').map((x) => x.trim()).filter(Boolean));
    if (puede.has('admin')) { puede.add('kiosko'); puede.add('barra'); }
    const datos = (await this.ctx.storage.get('cola')) || { pedidos: {}, n: 0 };
    const c = crearCola(datos);
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
    const k = String(body.id || body.numero || u.searchParams.get('id') || u.searchParams.get('pedido') || '').slice(0, 64);
    const token = String(request.headers.get('x-cola-pago') || body.pago || '').slice(0, 64);
    const conToken = () => !!token && c.tokenValido(k, token);
    const detalle = puede.has('barra');
    let r, cambia = false;
    try {
      if (op === 'pedido' && request.method === 'POST') {
        if (!puede.has('kiosko') && !puede.has('barra') && !conToken()) return NO('crear pedido requiere la clave del quiosco (x-cola-clave)');
        r = c.crear(body); cambia = true;
        if (!puede.has('kiosko') && !puede.has('barra')) delete r.pago;
      }
      else if (op === 'pedido') { r = c.uno(k, Date.now(), detalle); if (!r) return Response.json({ ok: false, error: 'pedido no encontrado' }, { status: 404 }); }
      else if (op === 'pagar') { if (!puede.has('kiosko') && !conToken()) return NO('pagar requiere la clave del quiosco o el token de pago del QR (x-cola-pago)'); r = c.pagar(k, body.via); cambia = true; }
      else if (op === 'avanzar') { if (!puede.has('barra')) return NO('avanzar requiere la clave de barra (x-cola-clave)'); r = c.avanzar(k, body.a || body.estado); cambia = true; }
      else if (op === 'llamar' && request.method === 'POST') { if (!puede.has('barra')) return NO('llamar requiere la clave de barra'); r = c.llamar(k); cambia = true; }
      else if (op === 'reiniciar' && request.method === 'POST') { if (!puede.has('admin')) return NO('reiniciar requiere la clave de servicio'); r = c.reiniciar(); cambia = true; }
      else if (op === 'comandas') { if (!puede.has('barra')) return NO('la vista de barra requiere la clave de barra (x-cola-clave)'); r = c.comandas(); }
      else if (op === 'estado') r = c.estado(Date.now(), detalle);
      else return Response.json({ ok: false, error: 'operación desconocida' }, { status: 404 });
    } catch (e) { return Response.json({ ok: false, error: String(e.message || e) }, { status: 400 }); }
    if (cambia) await this.ctx.storage.put('cola', c.datos);
    return Response.json({ ok: true, ...r });
  }
}
