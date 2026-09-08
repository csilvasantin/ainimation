import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { crearServidor, manejar } from '../src/index.js';
import { claveFlota } from '../src/identidad-flota.mjs';

const SITIO = 'https://sitio.test', STOCK = 'https://stock.test';
const ENV = { SITIO, STOCK_API: STOCK, VERSION: 'v.08.09.2026.r1.12:00', MCP_FLOTA_SEED: 'semilla-de-prueba' };
const ok = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
function fetchFalso(peticiones) {
  return async (url, init = {}) => {
    const u = String(url); peticiones.push({ url: u, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null, headers: init.headers || {} });
    if (u === `${SITIO}/xperiencias/index.json`) return ok({ actualizado: '2026-09-08', xperiencias: [{ slug: 'toca-y-elige', title: 'Toca y Elige', blurb: 'Tres puertas.' }, { slug: 'admira-en-3-pasos', title: 'Admira en 3 pasos' }] });
    if (u === `${SITIO}/xperiencias/toca-y-elige/plan.json`) return ok({ title: 'Toca y Elige', fps: 24, totalFrames: 480, durationSeconds: 20, markers: [{ id: 'a' }, { id: 'b' }], cast: [{}], stageItems: [{}, {}] });
    if (u === `${SITIO}/xperiencias/toca-y-elige/rules.json`) return ok([{ id: 'r1' }, { id: 'r2' }]);
    if (u === `${SITIO}/xperiencias/admira-en-3-pasos/plan.json`) return ok({ title: 'Admira en 3 pasos', fps: 24, totalFrames: 720, durationSeconds: 60, markers: [], cast: [], stageItems: [] });
    if (u === `${SITIO}/xperiencias/admira-en-3-pasos/rules.json`) return new Response('no', { status: 404 });
    if (u === `${SITIO}/version.json`) return ok({ version: 'v.08.09.2026.r1.12:00', signature: 'MorfeoMacMini · MacMini', gitShort: 'abc1234', deployedAt: '2026-09-08T10:00:00Z' });
    if (u.startsWith(`${SITIO}/help/`) || u.startsWith(`${SITIO}/mcp/`)) return new Response('<html>', { status: 200 });
    if (u.startsWith(`${STOCK}/stock/list`)) return ok({ items: [{ id: 'a1', title: 'Toca y Elige animation', type: 'animation', motor: 'ainimation', category: 'animaciones' }, { id: 'l1', title: 'Enlace', type: 'link', category: 'enlace' }] });
    if (u === `${STOCK}/stock/publish`) return ok({ ok: true, id: 'stock-9' });
    return new Response('Not found', { status: 404 });
  };
}
async function cliente(identidad = null) {
  const peticiones = [];
  const server = crearServidor(ENV, { fetch: fetchFalso(peticiones) }, identidad);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  const client = new Client({ name: 'agente-de-prueba', version: '1' });
  await client.connect(a);
  return { client, peticiones };
}
const res = (r) => JSON.parse(r.content[0].text);

test('las siete herramientas están y las instrucciones dicen qué es', async () => {
  const { client } = await cliente();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['quien_soy', 'sitio_estado', 'stock_animaciones', 'xperiencia_canal_item', 'xperiencia_detalle', 'xperiencia_publicar', 'xperiencias_listar']);
  assert.match(client.getInstructions(), /Xperiencias/);
});

test('xperiencias_listar lee index.json (única fuente) y resume cada plan', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'xperiencias_listar', arguments: {} }));
  assert.equal(d.total, 2);
  assert.deepEqual(d.xperiencias[0], { slug: 'toca-y-elige', titulo: 'Toca y Elige', resumen: 'Tres puertas.', url: `${SITIO}/xperiencias/toca-y-elige/`, plan: { titulo: 'Toca y Elige', fps: 24, frames: 480, duracion_s: 20, marcadores: 2, cast: 1, elementos: 2 } });
});

test('xperiencia_detalle devuelve plan y reglas; una que no existe se dice con la lista', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'xperiencia_detalle', arguments: { slug: 'toca-y-elige' } }));
  assert.equal(d.plan.durationSeconds, 20); assert.equal(d.reglas_total, 2);
  const sin = res(await client.callTool({ name: 'xperiencia_detalle', arguments: { slug: 'admira-en-3-pasos' } }));
  assert.equal(sin.reglas, null); assert.equal(sin.reglas_total, 0);
  const no = await client.callTool({ name: 'xperiencia_detalle', arguments: { slug: 'no-existe' } });
  assert.equal(no.isError, true); assert.match(no.content[0].text, /no está en .*index\.json \(hay: toca-y-elige, admira-en-3-pasos\)/);
});

test('xperiencia_canal_item es el mismo JSON que copia el botón de la galería', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'xperiencia_canal_item', arguments: { slug: 'toca-y-elige' } }));
  assert.deepEqual(d.item, { id: 'xp-toca-y-elige', type: 'interactive', title: 'Admira · Toca y Elige', url: `${SITIO}/xperiencias/toca-y-elige/`, tags: ['horizontal'], durationSeconds: 20 });
});

test('stock_animaciones filtra lo que es de ainimation', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'stock_animaciones', arguments: { limite: 10 } }));
  assert.equal(d.miradas, 2); assert.deepEqual(d.animaciones.map((a) => a.id), ['a1']);
});

test('xperiencia_publicar exige clave de flota y publica en el stock con la URL viva como fuente', async () => {
  const anon = await cliente();
  const no = await anon.client.callTool({ name: 'xperiencia_publicar', arguments: { slug: 'toca-y-elige' } });
  assert.equal(no.isError, true); assert.match(no.content[0].text, /exige la clave de flota/);
  assert.ok(!anon.peticiones.some((p) => p.url.endsWith('/stock/publish')), 'sin clave no se toca el stock');
  const yo = await cliente({ persona: 'Morfeo', equipo: 'MacMini', agente: 'MorfeoMacMini', tipo: 'agente', via: 'clave-flota' });
  const d = res(await yo.client.callTool({ name: 'xperiencia_publicar', arguments: { slug: 'toca-y-elige', etiquetas: ['demo'] } }));
  assert.equal(d.ok, true); assert.equal(d.publicado_por, 'MorfeoMacMini'); assert.equal(d.stock.id, 'stock-9');
  const pub = yo.peticiones.find((p) => p.url.endsWith('/stock/publish'));
  assert.equal(pub.method, 'POST');
  assert.equal(pub.body.type, 'animation'); assert.equal(pub.body.motor, 'ainimation'); assert.equal(pub.body.sourceUrl, `${SITIO}/xperiencias/toca-y-elige/`);
  assert.deepEqual(pub.body.tags, ['xperiencia', 'interactivo', 'ainimation', 'demo']); assert.equal(pub.body.by, 'MorfeoMacMini');
});

test('sitio_estado lee el sello y las puertas', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'sitio_estado', arguments: {} }));
  assert.equal(d.version, 'v.08.09.2026.r1.12:00'); assert.equal(d.firma, 'MorfeoMacMini · MacMini');
  assert.deepEqual(d.puertas, { '/help/': 200, '/mcp/': 200, '/mcp/manifest.json': 200, '/xperiencias/index.json': 200 });
});

test('HTTP: / describe el servicio, /mcp por GET dice 405 con la documentación, y la clave de flota da identidad', async () => {
  const deps = { fetch: fetchFalso([]) };
  const raiz = await (await manejar(new Request('https://mcp.test/'), ENV, deps)).json();
  assert.equal(raiz.endpoint_mcp, 'https://mcp.test/mcp'); assert.equal(raiz.herramientas.length, 7);
  const get = await manejar(new Request('https://mcp.test/mcp'), ENV, deps);
  assert.equal(get.status, 405); assert.equal(get.headers.get('x-documentacion'), `${SITIO}/mcp/`);
  const clave = await claveFlota(ENV.MCP_FLOTA_SEED, 'Morfeo', 'MacMini');
  const body = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'p', version: '1' } } };
  const init = await manejar(new Request('https://mcp.test/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer ' + clave }, body: JSON.stringify(body) }), ENV, deps);
  assert.equal(init.status, 200);
  const j = await init.json();
  assert.equal(j.result.serverInfo.name, 'ainimation');
});
