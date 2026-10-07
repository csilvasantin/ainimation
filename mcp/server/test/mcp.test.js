import base from 'node:test';
import assert from 'node:assert/strict';
// Sin `npm ci` en mcp/server (p. ej. `node --test` desde la raíz del sitio) se SALTA en vez
// de romper toda la batería: es un paquete aparte con sus propias dependencias.
let Client, InMemoryTransport, crearServidor, manejar, HERRAMIENTAS, claveFlota, SIN_SDK = false;
try {
  ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
  ({ InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js'));
  ({ crearServidor, manejar, HERRAMIENTAS } = await import('../src/index.js'));
  ({ claveFlota } = await import('../src/identidad-flota.mjs'));
} catch (e) { if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e; SIN_SDK = true; }
const test = (name, ...rest) => (SIN_SDK ? base(name, { skip: 'faltan dependencias: npm ci en mcp/server' }, () => {}) : base(name, ...rest));

import { readFileSync } from 'node:fs';
const raiz = new URL('../../../', import.meta.url);
const PLANTILLA = readFileSync(new URL('plantillas/quiosco-de-pedidos.json', raiz), 'utf8');
const ESQUEMA = readFileSync(new URL('xperiencias/kiosko-pedido/menu.schema.json', raiz), 'utf8');
const CARTA = readFileSync(new URL('xperiencias/kiosko-pedido/menu.starbucks.json', raiz), 'utf8');
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
    if (u === `${SITIO}/plantillas/quiosco-de-pedidos.json`) return new Response(PLANTILLA, { status: 200 });
    if (u === `${SITIO}/xperiencias/kiosko-pedido/menu.schema.json`) return new Response(ESQUEMA, { status: 200 });
    if (u === `${SITIO}/xperiencias/kiosko-pedido/menu.starbucks.json`) return new Response(CARTA, { status: 200 });
    if (u === 'https://www.admiranext.com/marcablanca/clientes/index.json') return ok({ clientes: [{ id: 'starbucks', nombre: 'Starbucks', sector: 'Cafeterías' }] });
    if (u === 'https://www.admiranext.com/marcablanca/clientes/starbucks.json') return ok({ id: 'starbucks', nombre: 'Starbucks', modo: 'claro', colores: { primario: '#00704A' }, logo: { svg: '../logos/starbucks.svg' } });
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

test('las diecinueve herramientas están y las instrucciones dicen qué es', async () => {
  const { client } = await cliente();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [...HERRAMIENTAS].sort()); assert.equal(tools.length, 19);
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
  assert.equal(raiz.endpoint_mcp, 'https://mcp.test/mcp'); assert.equal(raiz.herramientas.length, 19);
  const get = await manejar(new Request('https://mcp.test/mcp'), ENV, deps);
  assert.equal(get.status, 405); assert.equal(get.headers.get('x-documentacion'), `${SITIO}/mcp/`);
  const clave = await claveFlota(ENV.MCP_FLOTA_SEED, 'Morfeo', 'MacMini');
  const body = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'p', version: '1' } } };
  const init = await manejar(new Request('https://mcp.test/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer ' + clave }, body: JSON.stringify(body) }), ENV, deps);
  assert.equal(init.status, 200);
  const j = await init.json();
  assert.equal(j.result.serverInfo.name, 'ainimation');
});

test('plantillas y crear_proyecto: el Quiosco de pedidos sale como proyecto del Director con su Admingo', async () => {
  const { client } = await cliente();
  const t = res(await client.callTool({ name: 'plantillas', arguments: {} }));
  assert.deepEqual(t.plantillas.map((x) => x.id), ['quiosco-de-pedidos', 'vacio']);
  assert.equal(t.plantillas[0].studio, `${SITIO}/studio.html?plantilla=quiosco`);
  const d = res(await client.callTool({ name: 'crear_proyecto', arguments: { plantilla: 'quiosco-de-pedidos', titulo: 'Mi quiosco' } }));
  assert.equal(d.proyecto.format, 'ainimation-project'); assert.equal(d.proyecto.plan.title, 'Mi quiosco');
  assert.deepEqual(d.proyecto.plan.stage, { w: 1080, h: 1920 }); assert.match(d.proyecto.plan.scripts.movie, /al empezar la película/);
  const v = res(await client.callTool({ name: 'crear_proyecto', arguments: { plantilla: 'vacio' } }));
  assert.equal(v.proyecto.plan.stageItems.length, 0);
});

test('validar_admingo y compilar_admingo usan el compilador del Studio (errores con línea, reglas XPL)', async () => {
  const { client } = await cliente();
  const mal = res(await client.callTool({ name: 'validar_admingo', arguments: { fuente: 'al empezar la película\n  ir a marca "X"\n' } }));
  assert.equal(mal.ok, false); assert.equal(mal.errores[0].line, 3); assert.match(mal.errores[0].es, /fin/);
  const plan = JSON.parse(PLANTILLA).plan;
  const ok2 = res(await client.callTool({ name: 'compilar_admingo', arguments: { scripts: plan.scripts } }));
  assert.equal(ok2.ok, true); assert.ok(ok2.reglas_total >= 3); assert.equal(ok2.reglas_xpl[0].origin, 'admingo');
  assert.deepEqual(ok2.globales, ['pedido']); assert.ok(ok2.manejadores.movie.length >= 3);
  const fich = res(await client.callTool({ name: 'compilar_admingo', arguments: { fuente: '--@ sprite "b"\non mouseUp\n  go to marker "FIN"\nend\n' } }));
  assert.equal(fich.reglas_xpl[0].do[0].value, 'FIN');
});

test('menu_validar: la carta Starbucks pasa; una carta rota da errores claros', async () => {
  const { client } = await cliente();
  const d = res(await client.callTool({ name: 'menu_validar', arguments: {} }));
  assert.equal(d.ok, true, JSON.stringify(d.errores)); assert.ok(d.resumen.productos > 3);
  const m = JSON.parse(CARTA); m.items.push({ ...m.items[0] }); delete m.orderFlow;
  const e = res(await client.callTool({ name: 'menu_validar', arguments: { menu: m } }));
  assert.equal(e.ok, false); assert.ok(e.errores.some((x) => /orderFlow/.test(x))); assert.ok(e.errores.some((x) => /repetido/.test(x)));
});

test('publicar_xperiencia, enviar_a_admiratv, fijar_en_totem y marca_aplicar no inventan: URL, item interactive, /totem y ?marca', async () => {
  const { client } = await cliente();
  const p = res(await client.callTool({ name: 'publicar_xperiencia', arguments: { slug: 'toca-y-elige' } }));
  assert.equal(p.url, `${SITIO}/xperiencias/toca-y-elige/`); assert.equal(p.zip.estado, 'próximamente'); assert.equal(p.pixeria, null);
  const sin = await client.callTool({ name: 'publicar_xperiencia', arguments: { slug: 'toca-y-elige', pixeria: true } });
  assert.equal(sin.isError, true);
  const tv = res(await client.callTool({ name: 'enviar_a_admiratv', arguments: { slug: 'toca-y-elige', orientacion: 'vertical' } }));
  assert.equal(tv.item.type, 'interactive'); assert.deepEqual(tv.item.tags, ['vertical']); assert.equal(tv.envio_directo, 'próximamente');
  const k = res(await client.callTool({ name: 'fijar_en_totem', arguments: {} }));
  assert.equal(k.comando, '/totem kiosko'); assert.match(k.gemelo, /kiosko=1/); assert.match(k.url_en_totem, /store=starbucks-paseo-de-gracia&marca=starbucks/);
  const u = res(await client.callTool({ name: 'fijar_en_totem', arguments: { slug: 'toca-y-elige' } }));
  assert.equal(u.comando, `/totem url ${SITIO}/xperiencias/toca-y-elige/`);
  const m = res(await client.callTool({ name: 'marca_aplicar', arguments: { marca: 'starbucks' } }));
  assert.equal(m.url, `${SITIO}/xperiencias/kiosko-pedido/?marca=starbucks`); assert.equal(m.gemelo, '/marca starbucks'); assert.equal(m.logo, 'https://www.admiranext.com/marcablanca/logos/starbucks.svg');
  const no = await client.callTool({ name: 'marca_aplicar', arguments: { marca: 'nadie' } });
  assert.equal(no.isError, true);
});
