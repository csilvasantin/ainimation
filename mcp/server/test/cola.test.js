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
