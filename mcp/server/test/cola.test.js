import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCola, estadoDe, RECIBIDO_S, PREP_S, RECOGER_S, ColaTienda } from '../src/cola.js';
import { manejar } from '../src/index.js';
test('cola: crear → pagar → preparando → listo (auto) → recogido (auto); numeración A001…', () => {
  const c = crearCola(), t = 1_000_000;
  assert.equal(c.crear({ id: 'ped-1111' }, t).numero, 'A001'); assert.equal(c.crear({ id: 'ped-2222' }, t).numero, 'A002');
  assert.equal(c.crear({ id: 'ped-1111' }, t).numero, 'A001', 'idempotente');
  assert.equal(c.uno('A001', t).estado, 'pendiente');
  assert.equal(c.pagar('A001', 'qr', t).estado, 'recibido');
  assert.equal(c.estado(t + RECIBIDO_S * 1000 - 1).recibido.length, 1);
  assert.equal(c.estado(t + RECIBIDO_S * 1000).preparando.length, 1);
  assert.equal(c.estado(t + (RECIBIDO_S + PREP_S) * 1000 - 1).preparando[0].fase, 'En preparación');
  assert.equal(c.estado(t + (RECIBIDO_S + PREP_S) * 1000).listo[0].numero, 'A001');
  assert.equal(c.uno('ped-1111', t + (RECIBIDO_S + PREP_S) * 1000).fase, 'Preparado');
  assert.equal(c.uno('ped-1111', t + (RECIBIDO_S + PREP_S + RECOGER_S) * 1000).estado, 'recogido');
  assert.equal(c.estado(t).pendientes, 1);
});
test('cola: el barista avanza fase a fase (recibido → preparando → listo) y lo listo se recoge solo', () => {
  const c = crearCola(), t = 5e6; c.crear({ id: 'ped-3333' }, t); c.pagar('ped-3333', 'caja', t);
  assert.equal(c.avanzar('A001', undefined, t + 1000).estado, 'preparando');
  assert.equal(c.uno('A001', t + 1000 + PREP_S * 1000 - 1).estado, 'preparando');
  assert.equal(c.avanzar('A001', undefined, t + 1500).estado, 'listo');
  assert.equal(c.uno('A001', t + 1500 + RECOGER_S * 1000).estado, 'recogido', 'preparado se recoge solo a los RECOGER_S');
  assert.equal(c.avanzar('A001', 'recogido', t + 2000).estado, 'recogido');
  assert.throws(() => c.pagar('nope', 'qr', t)); assert.throws(() => c.crear({ id: 'x' }, t));
});
test('HTTP /cola/*: Durable Object por tienda, store validada, CORS', async () => {
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const env = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) } };
  const post = (p, b) => manejar(new Request('https://w.test' + p, { method: 'POST', body: JSON.stringify(b) }), env);
  const r1 = await (await post('/cola/pedido?store=sb-test', { id: 'ped-abcd', total: 4.2 })).json(); assert.equal(r1.numero, 'A001');
  const r2 = await (await post('/cola/pagar?store=sb-test', { id: 'ped-abcd' })).json(); assert.equal(r2.estado, 'recibido');
  const e = await manejar(new Request('https://w.test/cola/estado?store=sb-test'), env); assert.equal(e.headers.get('access-control-allow-origin'), '*');
  assert.equal((await e.json()).recibido[0].numero, 'A001');
  assert.equal((await manejar(new Request('https://w.test/cola/estado?store=../x'), env)).status, 400);
  assert.equal((await manejar(new Request('https://w.test/cola/pedido?store=sb-test&pedido=A009'), env)).status, 404);
});
test('MCP cola_estado / cola_avanzar hablan con el Durable Object (sin pedirse a sí mismo por HTTP)', async () => {
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const env = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) } };
  await manejar(new Request('https://w.test/cola/pedido?store=sb-mcp', { method: 'POST', body: JSON.stringify({ id: 'ped-mcp1' }) }), env);
  const { crearServidor } = await import('../src/index.js');
  const s = crearServidor(env, { fetch: () => { throw new Error('no debe salir a la red'); } });
  const call = (n, a) => s._registeredTools[n].handler(a);
  const r = JSON.parse((await call('cola_avanzar', { store: 'sb-mcp', pedido: 'A001', a: 'listo' })).content[0].text); assert.equal(r.estado, 'listo');
  const e = JSON.parse((await call('cola_estado', { store: 'sb-mcp' })).content[0].text); assert.equal(e.listo[0].numero, 'A001'); assert.match(e.pantalla, /\/cola\/\?store=sb-mcp/);
});

// ── Comanda con líneas y cierre de la cola (Carlos, 7-oct-2026: KDS en barra + roles) ──────────────────
import { limpiaLineas, MAX_LINEAS } from '../src/cola.js';
import { clavesSeed, origenPermitido } from '../src/cola-acceso.js';
const LINEA = { id: 'caffe-latte', name: 'Caffè Latte', qty: 2, options: { tamano: 'Venti', leche: 'Avena', temperatura: 'Caliente', extras: ['Extra shot', 'Sirope vainilla'] }, optionsText: 'Venti · Avena · Caliente · Extra shot · Sirope vainilla' };
function relé(env = {}) {
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const e = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) }, ...env };
  const pedir = async (ruta, { body, headers = {}, method } = {}) => { const r = await manejar(new Request('https://w.test' + ruta, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }), e); return { status: r.status, h: r.headers, d: await r.json().catch(() => null) }; };
  return { pedir, env: e };
}
const CERRADA = { COLA_KIOSKO_KEY: 'kiosko-secreto-123', COLA_BARRA_KEY: 'barra-secreto-456' };
const K = { 'x-cola-clave': CERRADA.COLA_KIOSKO_KEY }, B = { 'x-cola-clave': CERRADA.COLA_BARRA_KEY };

test('líneas: se guardan saneadas (sin HTML, qty 1…10, máx. 10 líneas, opciones acotadas)', () => {
  const sucia = { id: '<b>x</b>', name: '<img src=x onerror=alert(1)>Frappuccino <script>alert(1)</script> Mocha', qty: 99, options: { tamano: '<i>Grande</i>', 'mal clave': 'x', extras: ['<b>Nata</b>', 7, ''], leche: { o: 1 } }, optionsText: 'a'.repeat(400) };
  const { lineas, mas } = limpiaLineas([sucia, { name: 'Agua', qty: -3 }, { name: '' }, null, ...Array.from({ length: 12 }, (_, i) => ({ name: 'Cookie ' + i, qty: 1 }))]);
  assert.equal(lineas.length, MAX_LINEAS); assert.equal(mas, 4, '14 válidas → 10 + 4 contadas');
  const l = lineas[0];
  assert.doesNotMatch(JSON.stringify(lineas), /[<>]/); assert.equal(l.name, 'Frappuccino alert(1) Mocha'); assert.equal(l.id, 'bxb');
  assert.equal(l.qty, 10); assert.equal(lineas[1].qty, 1);
  assert.deepEqual(l.options, { tamano: 'Grande', extras: ['Nata', '7'] }); assert.equal(l.optionsText.length, 160);
  const c = crearCola(); const r = c.crear({ id: 'ped-lin1', nombre: 'Ana María', total: 11.2, lines: [LINEA] }, 1e6);
  assert.match(r.pago, /^[0-9a-f]{24}$/, 'el alta devuelve el token de pago');
  assert.deepEqual(c.uno('A001', 1e6).lineas, [LINEA]); assert.equal(c.uno('A001', 1e6).articulos, 2); assert.equal(c.uno('A001', 1e6).total, 11.2);
  const pub = c.uno('A001', 1e6, false); assert.equal(pub.nombre, 'Ana'); assert.equal(pub.lineas, undefined); assert.equal(pub.total, undefined); assert.equal(pub.pago, undefined);
  assert.equal(c.estado(1e6).pendientes, 1); assert.equal(JSON.stringify(c.estado(1e6)).includes(r.pago), false, 'el token nunca sale en el estado');
});

test('cola abierta (sin secretos): todo como antes, con aviso en /cola/estado y detalle para todos', async () => {
  const { pedir } = relé();
  const c = await pedir('/cola/pedido?store=sb-abierta', { body: { id: 'ped-ab01', nombre: 'Ana María', lines: [LINEA] } }); assert.equal(c.status, 200); assert.ok(c.d.pago);
  assert.equal((await pedir('/cola/pagar?store=sb-abierta', { body: { id: 'ped-ab01' } })).status, 200);
  assert.equal((await pedir('/cola/avanzar?store=sb-abierta', { body: { numero: 'A001', a: 'preparando' } })).d.estado, 'preparando');
  const e = await pedir('/cola/estado?store=sb-abierta'); assert.match(e.d.aviso, /cola abierta: falta COLA_BARRA_KEY y COLA_KIOSKO_KEY/);
  assert.deepEqual(e.d.acceso, { kiosko: 'abierto', barra: 'abierta', detalle: true });
  assert.equal(e.d.preparando[0].nombre, 'Ana María'); assert.deepEqual(e.d.preparando[0].lineas, [LINEA]);
  assert.equal((await pedir('/cola/comandas?store=sb-abierta')).d.comandas[0].numero, 'A001');
  assert.equal((await pedir('/cola/llamar?store=sb-abierta', { body: { numero: 'A001' } })).status, 403, 'llamar sigue exigiendo clave');
});

test('cola cerrada: sin clave → 401; el quiosco crea, el móvil paga con su token, solo la barra avanza', async () => {
  const { pedir } = relé(CERRADA), S = '?store=sb-cerrada';
  assert.equal((await pedir('/cola/pedido' + S, { body: { id: 'ped-ce01' } })).status, 401, 'crear sin clave');
  assert.equal((await pedir('/cola/pedido' + S, { body: { id: 'ped-ce01' }, headers: B })).status, 200, 'la barra crea «pedido en barra» (admira.tv)');
  const alta = await pedir('/cola/pedido' + S, { body: { id: 'ped-ce02', nombre: 'Ana María', total: 5.6, lines: [LINEA] }, headers: K });
  assert.equal(alta.status, 200); assert.equal(alta.d.numero, 'A002'); const t = alta.d.pago; assert.ok(t);
  assert.equal(alta.h.get('access-control-allow-origin'), null, 'POST sin Origin: sin CORS');
  assert.equal((await pedir('/cola/pagar' + S, { body: { id: 'ped-ce02' } })).status, 401, 'pagar sin clave ni token');
  assert.equal((await pedir('/cola/pagar' + S, { body: { id: 'ped-ce02' }, headers: { 'x-cola-pago': 'f'.repeat(24) } })).status, 401, 'token falso');
  assert.equal((await pedir('/cola/pagar' + S, { body: { id: 'ped-ce01' }, headers: { 'x-cola-pago': t } })).status, 401, 'el token es de UN pedido');
  const re = await pedir('/cola/pedido' + S, { body: { id: 'ped-ce02' }, headers: { 'x-cola-pago': t } }); assert.equal(re.status, 200, 'el móvil re-crea (idempotente) con su token'); assert.equal(re.d.pago, undefined, 'y no recibe el token de vuelta');
  assert.equal((await pedir('/cola/pagar' + S, { body: { id: 'ped-ce02', via: 'qr' }, headers: { 'x-cola-pago': t } })).d.estado, 'recibido');
  assert.equal((await pedir('/cola/avanzar' + S, { body: { numero: 'A002', a: 'listo' } })).status, 401, 'avanzar sin clave');
  assert.equal((await pedir('/cola/avanzar' + S, { body: { numero: 'A002', a: 'listo' }, headers: K })).status, 401, 'el quiosco no avanza');
  assert.equal((await pedir('/cola/avanzar' + S, { body: { numero: 'A002', a: 'preparando' }, headers: B })).d.estado, 'preparando');
  assert.equal((await pedir('/cola/avanzar' + S, { body: { numero: 'A002', a: 'preparando' }, headers: { authorization: 'Bearer ' + CERRADA.COLA_BARRA_KEY } })).status, 200, 'Bearer también vale');
  assert.equal((await pedir('/cola/comandas' + S)).status, 401); assert.equal((await pedir('/cola/comandas' + S, { headers: K })).status, 401);
  const kds = await pedir('/cola/comandas' + S, { headers: B }); assert.deepEqual(kds.d.comandas.map((p) => p.numero), ['A002']); assert.deepEqual(kds.d.comandas[0].lineas, [LINEA]);
  assert.equal((await pedir('/cola/llamar' + S, { body: { numero: 'A002' }, headers: B })).d.llamadas, 1, 'la barra vuelve a llamar');
  assert.equal((await pedir('/cola/reiniciar' + S, { body: {}, headers: B })).status, 403, 'reiniciar sigue siendo de servicio');
  assert.equal((await pedir('/cola/estado?store=sb-cerrada&x-cola-puede=admin', { headers: { 'x-cola-puede': 'admin,barra,kiosko' } })).d.acceso.detalle, false, 'x-cola-puede de fuera no cuela');
});

test('estado público minimizado con la barra cerrada: número y nombre de pila; con clave de barra, todo', async () => {
  const { pedir } = relé(CERRADA), S = '?store=sb-pub';
  await pedir('/cola/pedido' + S, { body: { id: 'ped-pu01', nombre: 'Ana María López', total: 9.9, lines: [LINEA] }, headers: K });
  await pedir('/cola/pagar' + S, { body: { id: 'ped-pu01' }, headers: K });
  const pub = await pedir('/cola/estado' + S); const p = pub.d.recibido[0];
  assert.equal(pub.d.aviso, undefined); assert.deepEqual(pub.d.acceso, { kiosko: 'cerrado', barra: 'cerrada', detalle: false });
  assert.equal(p.numero, 'A001'); assert.equal(p.nombre, 'Ana'); assert.equal(p.estado, 'recibido');
  for (const k of ['lineas', 'total', 'via', 'pago', 'articulos']) assert.equal(p[k], undefined, k);
  assert.doesNotMatch(JSON.stringify(pub.d), /María|López|Latte|9\.9/);
  assert.equal((await pedir('/cola/pedido' + S + '&pedido=A001')).d.nombre, 'Ana', '/cola/pedido también minimiza');
  assert.equal(pub.h.get('access-control-allow-origin'), '*', 'GET sigue abierto');
  const bar = await pedir('/cola/estado' + S, { headers: B }); assert.equal(bar.d.recibido[0].nombre, 'Ana María López'); assert.deepEqual(bar.d.recibido[0].lineas, [LINEA]);
  assert.deepEqual((await pedir('/cola/pedido' + S + '&id=ped-pu01', { headers: B })).d.lineas, [LINEA]);
});

test('CORS: GET abierto; escritura solo desde orígenes de la casa (403 al resto, preflight sin permiso)', async () => {
  const { pedir } = relé(), S = '?store=sb-cors';
  for (const o of ['https://www.ainimation.studio', 'https://admira.tv', 'https://mcp.admira.store', 'https://www.xpaceos.com', 'http://localhost:8080', 'http://127.0.0.1:5173']) assert.ok(origenPermitido(o), o);
  for (const o of ['https://evil.com', 'https://ainimation.studio.evil.com', 'http://www.ainimation.studio', 'null', '']) assert.ok(!origenPermitido(o), o);
  const ok = await pedir('/cola/pedido' + S, { body: { id: 'ped-co01' }, headers: { origin: 'https://www.ainimation.studio' } });
  assert.equal(ok.status, 200); assert.equal(ok.h.get('access-control-allow-origin'), 'https://www.ainimation.studio'); assert.equal(ok.h.get('vary'), 'Origin');
  const malo = await pedir('/cola/avanzar' + S, { body: { numero: 'A001', a: 'listo' }, headers: { origin: 'https://evil.com' } });
  assert.equal(malo.status, 403); assert.equal(malo.h.get('access-control-allow-origin'), null);
  const pre = await manejar(new Request('https://w.test/cola/pagar' + S, { method: 'OPTIONS', headers: { origin: 'https://evil.com', 'access-control-request-method': 'POST' } }), {});
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), null);
  const preOk = await manejar(new Request('https://w.test/cola/pagar' + S, { method: 'OPTIONS', headers: { origin: 'https://admira.tv', 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-cola-clave' } }), {});
  assert.equal(preOk.headers.get('access-control-allow-origin'), 'https://admira.tv'); assert.match(preOk.headers.get('access-control-allow-headers'), /X-Cola-Clave/);
  const get = await pedir('/cola/estado' + S, { headers: { origin: 'https://evil.com' } }); assert.equal(get.status, 200); assert.equal(get.h.get('access-control-allow-origin'), '*');
});

test('COLAS_SEED (el de admira.tv) cierra la cola con claves por tienda gc_ (barra) y gk_ (quiosco)', async () => {
  const seed = 'semilla-de-prueba'; const { pedir } = relé({ COLAS_SEED: seed });
  const a = await clavesSeed(seed, 'sb-seed'), b = await clavesSeed(seed, 'otra-tienda');
  assert.match(a.barra, /^gc_[0-9a-f]{24}$/); assert.match(a.kiosko, /^gk_[0-9a-f]{24}$/); assert.notEqual(a.barra, b.barra);
  assert.equal((await pedir('/cola/pedido?store=sb-seed', { body: { id: 'ped-se01' }, headers: { 'x-cola-clave': b.kiosko } })).status, 401, 'la clave de otra tienda no vale');
  assert.equal((await pedir('/cola/pedido?store=sb-seed', { body: { id: 'ped-se01' }, headers: { 'x-cola-clave': a.kiosko } })).status, 200);
  assert.equal((await pedir('/cola/avanzar?store=sb-seed', { body: { numero: 'A001', a: 'listo' }, headers: { 'x-cola-clave': a.kiosko } })).status, 401);
  assert.equal((await pedir('/cola/avanzar?store=sb-seed', { body: { numero: 'A001', a: 'listo' }, headers: { 'x-cola-clave': a.barra } })).d.estado, 'listo');
  const adm = relé({ ...CERRADA, COLA_ADMIN: 'servicio-789' });
  assert.equal((await adm.pedir('/cola/pedido?store=sb-adm', { body: { id: 'ped-ad01' }, headers: { 'x-cola-admin': 'servicio-789' } })).status, 200, 'la clave de servicio vale para todo');
  assert.equal((await adm.pedir('/cola/reiniciar?store=sb-adm', { body: {}, headers: { 'x-cola-admin': 'servicio-789' } })).d.borrados, 1);
});

test('MCP con la cola cerrada: cola_estado sin clave minimiza; con clave de barra trae líneas; cola_avanzar exige clave', async () => {
  const { pedir, env } = relé(CERRADA);
  await pedir('/cola/pedido?store=sb-mcpc', { body: { id: 'ped-mc01', nombre: 'Ana María', lines: [LINEA] }, headers: K });
  const { crearServidor } = await import('../src/index.js');
  const anon = crearServidor(env, { fetch: () => { throw new Error('red'); } });
  const call = (s, n, a) => s._registeredTools[n].handler(a);
  const e = JSON.parse((await call(anon, 'cola_estado', { store: 'sb-mcpc', pedido: 'A001' })).content[0].text); assert.equal(e.nombre, 'Ana'); assert.equal(e.lineas, undefined);
  assert.match((await call(anon, 'cola_avanzar', { store: 'sb-mcpc', pedido: 'A001', a: 'listo' })).content[0].text, /clave de barra/);
  const conClave = JSON.parse((await call(anon, 'cola_estado', { store: 'sb-mcpc', pedido: 'A001', clave: CERRADA.COLA_BARRA_KEY })).content[0].text); assert.deepEqual(conClave.lineas, [LINEA]);
  const flota = crearServidor(env, {}, { agente: 'SubMorfeoMacMini' });
  assert.equal(JSON.parse((await call(flota, 'cola_avanzar', { store: 'sb-mcpc', pedido: 'A001', a: 'listo' })).content[0].text).estado, 'listo', 'la clave de flota cuenta como barra');
});
