/*
 * Cierre de la cola (Carlos, 7-oct-2026): quién puede crear, pagar, avanzar y ver el detalle de las comandas.
 *
 * Claves (secretos del worker; nunca en git):
 *   COLA_KIOSKO_KEY  clave de dispositivo del quiosco (todas las tiendas)
 *   COLA_BARRA_KEY   clave de la barra (todas las tiendas)
 *   COLAS_SEED       opcional, el MISMO secreto que admira.tv: deriva claves por tienda
 *                      barra   gc_… = HMAC(COLAS_SEED, "gestorColas:sala:<store>")    (la «clave de sala» de admira.tv)
 *                      quiosco gk_… = HMAC(COLAS_SEED, "gestorColas:kiosko:<store>")
 *   COLA_ADMIN       clave de servicio (ya existía: llamar/reiniciar desde admira.tv); vale para todo
 * Se presentan en la cabecera x-cola-clave (o Authorization: Bearer); la de servicio en x-cola-admin.
 *
 * Despliegue sin romper nada: un rol solo se cierra si su secreto existe. Sin COLA_KIOSKO_KEY ni COLAS_SEED
 * cualquiera crea y paga (como hasta hoy); sin COLA_BARRA_KEY ni COLAS_SEED cualquiera avanza y el estado
 * público lleva el detalle. En ambos casos /cola/estado avisa y el log dice «cola abierta: falta …».
 */
async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** Claves por tienda derivadas de COLAS_SEED (mismo algoritmo que admira.tv functions/gestorColas/_lib.js). */
export async function clavesSeed(seed, store) {
  if (!seed) return { barra: null, kiosko: null };
  return { barra: 'gc_' + (await hmacHex(seed, 'gestorColas:sala:' + store)).slice(0, 24), kiosko: 'gk_' + (await hmacHex(seed, 'gestorColas:kiosko:' + store)).slice(0, 24) };
}
const igual = (a, b) => { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

/** ¿Qué roles están cerrados? (solo si su secreto existe) */
export const cerrada = (env = {}) => ({ kiosko: !!(env.COLA_KIOSKO_KEY || env.COLAS_SEED), barra: !!(env.COLA_BARRA_KEY || env.COLAS_SEED) });

/** Aviso honrado mientras falte algún secreto (va en /cola/estado y en el log). */
export function avisoAbierta(env = {}) {
  const c = cerrada(env), falta = [];
  if (!c.barra) falta.push('COLA_BARRA_KEY');
  if (!c.kiosko) falta.push('COLA_KIOSKO_KEY');
  return falta.length ? 'cola abierta: falta ' + falta.join(' y ') + ' (o COLAS_SEED)' : null;
}

/**
 * Roles de una petición: { kiosko, barra, admin } según la clave presentada, y `puede` = lo que se le deja
 * hacer (un rol abierto lo puede todo el mundo). `claveBarra` = presentó de verdad la clave de barra o la de
 * servicio (llamar exige clave incluso con la barra abierta, como antes).
 */
export async function acceso(request, env = {}, store = '', extra = {}) {
  const h = request.headers.get('authorization') || '';
  const clave = extra.clave || request.headers.get('x-cola-clave') || (h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  const admin = !!env.COLA_ADMIN && igual(request.headers.get('x-cola-admin'), env.COLA_ADMIN);
  const s = await clavesSeed(env.COLAS_SEED, store);
  const barra = admin || igual(clave, env.COLA_BARRA_KEY) || igual(clave, s.barra);
  const kiosko = admin || igual(clave, env.COLA_KIOSKO_KEY) || igual(clave, s.kiosko);
  const c = cerrada(env);
  const puede = [];
  if (kiosko || !c.kiosko) puede.push('kiosko');
  if (barra || !c.barra) puede.push('barra');
  if (admin) puede.push('admin');
  return { admin, barra, kiosko, claveBarra: admin || barra, puede, cerrada: c };
}

/*
 * CORS (7-oct-2026): GET abierto a cualquiera (pantallas, gemelo, iPad); escritura solo desde orígenes de la
 * casa. Una petición POST de navegador desde otro origen recibe 403; sin cabecera Origin (servidor a servidor:
 * admira.tv, MCP, curl) pasa y decide la clave.
 */
const CASA = /^https:\/\/([a-z0-9-]+\.)*(ainimation\.studio|admira\.tv|admira\.store|xpaceos\.com)$/;
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
export function origenPermitido(origin, env = {}) {
  if (!origin) return false;
  const extra = String(env.COLA_ORIGENES || '').split(',').map((x) => x.trim()).filter(Boolean);
  return CASA.test(origin) || LOCAL.test(origin) || extra.includes(origin);
}
export const CABECERAS_COLA = 'Content-Type, Accept, Authorization, X-Cola-Clave, X-Cola-Pago, X-Cola-Admin';
/** Cabeceras CORS de /cola/*: lectura con «*», escritura con el origen de la casa (o ninguno). */
export function corsCola(request, env = {}) {
  const origin = request.headers.get('origin') || '';
  const casa = origenPermitido(origin, env);
  const escritura = request.method === 'POST' || (request.method === 'OPTIONS' && /POST/i.test(request.headers.get('access-control-request-method') || ''));
  if (!escritura) return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': casa ? 'GET, POST, OPTIONS' : 'GET, OPTIONS', 'Access-Control-Allow-Headers': CABECERAS_COLA, 'Access-Control-Max-Age': '600' };
  if (!casa) return { Vary: 'Origin' };
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': CABECERAS_COLA, 'Access-Control-Max-Age': '600', Vary: 'Origin' };
}
