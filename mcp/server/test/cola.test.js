import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCola, estadoDe, PREP_S, RECOGER_S, ColaTienda } from '../src/cola.js';
import { manejar } from '../src/index.js';
test('cola: crear → pagar → preparando → listo (auto) → recogido (auto); numeración A001…', () => {
  const c = crearCola(), t = 1_000_000;
  assert.equal(c.crear({ id: 'ped-1111' }, t).numero, 'A001'); assert.equal(c.crear({ id: 'ped-2222' }, t).numero, 'A002');
  assert.equal(c.crear({ id: 'ped-1111' }, t).numero, 'A001', 'idempotente');
  assert.equal(c.uno('A001', t).estado, 'pendiente');
  assert.equal(c.pagar('A001', 'qr', t).estado, 'preparando');
  assert.equal(c.estado(t + PREP_S * 1000 - 1).preparando.length, 1);
  assert.equal(c.estado(t + PREP_S * 1000).listo[0].numero, 'A001');
  assert.equal(c.uno('ped-1111', t + (PREP_S + RECOGER_S) * 1000).estado, 'recogido');
  assert.equal(c.estado(t).pendientes, 1);
});
test('cola: el barista avanza a mano y anula el automático', () => {
  const c = crearCola(), t = 5e6; c.crear({ id: 'ped-3333' }, t); c.pagar('ped-3333', 'caja', t);
  assert.equal(c.avanzar('A001', undefined, t + 1000).estado, 'listo');
  assert.equal(c.uno('A001', t + 9e6).estado, 'listo', 'listo manual no se recoge solo');
  assert.equal(c.avanzar('A001', 'recogido', t + 2000).estado, 'recogido');
  assert.throws(() => c.pagar('nope', 'qr', t)); assert.throws(() => c.crear({ id: 'x' }, t));
});
test('HTTP /cola/*: Durable Object por tienda, store validada, CORS', async () => {
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const env = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) } };
  const post = (p, b) => manejar(new Request('https://w.test' + p, { method: 'POST', body: JSON.stringify(b) }), env);
  const r1 = await (await post('/cola/pedido?store=sb-test', { id: 'ped-abcd', total: 4.2 })).json(); assert.equal(r1.numero, 'A001');
  const r2 = await (await post('/cola/pagar?store=sb-test', { id: 'ped-abcd' })).json(); assert.equal(r2.estado, 'preparando');
  const e = await manejar(new Request('https://w.test/cola/estado?store=sb-test'), env); assert.equal(e.headers.get('access-control-allow-origin'), '*');
  assert.equal((await e.json()).preparando[0].numero, 'A001');
  assert.equal((await manejar(new Request('https://w.test/cola/estado?store=../x'), env)).status, 400);
  assert.equal((await manejar(new Request('https://w.test/cola/pedido?store=sb-test&pedido=A009'), env)).status, 404);
});
