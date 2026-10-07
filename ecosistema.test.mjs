// /help y /mcp conectan ainimation.studio con la Galaxia Admira (Carlos, 7-oct-2026).
// node --test ecosistema.test.mjs — sin red ni dependencias.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const manifest = JSON.parse(leer('mcp/manifest.json'));
const pagina = leer('mcp/index.html'), llms = leer('mcp/llms.txt'), help = leer('help/index.html');
const servidor = leer('mcp/server/src/index.js');
const HERR = JSON.parse(servidor.match(/export const HERRAMIENTAS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));

test('el manifest declara exactamente las herramientas que registra el servidor', () => {
  const nombres = manifest.mcp_server.tools.map((t) => t.name);
  assert.deepEqual([...nombres].sort(), [...HERR].sort());
  assert.equal(manifest.mcp_server.tool_count, HERR.length);
  for (const n of HERR) assert.match(servidor, new RegExp(`registerTool\\('${n}'`), `${n} sin registrar`);
  for (const t of ['listar_xperiencias', 'plantillas', 'crear_proyecto', 'validar_admingo', 'compilar_admingo', 'publicar_xperiencia', 'menu_validar', 'enviar_a_admiratv', 'fijar_en_totem', 'marca_aplicar']) assert.ok(nombres.includes(t), t);
  for (const t of manifest.mcp_server.tools) assert.ok(['vivo', 'próximamente'].includes(t.estado), t.name);
});

test('la página humana y llms.txt listan todas las herramientas y lo que es próximamente', () => {
  for (const n of HERR) { assert.ok(pagina.includes(`<code>${n}</code>`), `página: ${n}`); assert.ok(llms.includes('`' + n + '`'), `llms: ${n}`); }
  assert.match(pagina, /id="proximamente"/); assert.match(pagina, /id="como-corre"/); assert.match(pagina, /wrangler deploy/);
  for (const x of manifest.mcp_server.proximamente) assert.ok(pagina.includes(x.que.replace(/&/g, '&amp;')), x.que);
  assert.equal(manifest.http_api, null, 'no hay API HTTP propia: no se inventa');
});

test('el manual es bilingüe y cubre el Director y el Ecosistema', () => {
  const ids = ['primeros-pasos', 'cast', 'stage', 'score', 'inspector', 'behaviour', 'admingo', 'mensaje', 'plantillas', 'publicar', 'quiosco', 'pago', 'ecosistema', 'agentes'];
  for (const id of ids) {
    const sec = help.split(`<section id="${id}">`)[1]; assert.ok(sec, id);
    const cuerpo = sec.split('</section>')[0];
    assert.match(cuerpo, /<div lang="es">/, `${id} ES`); assert.match(cuerpo, /<div lang="en">/, `${id} EN`);
  }
  for (const k of ['Pixeria', 'admira.tv', '"interactive"', '/totem kiosko', '/totem url', '/marca', 'marcablanca', 'Yokup', 'admira.biz', 'say-ack', 'https://www.ainimation.studio']) assert.ok(help.includes(k), k);
  assert.match(help, /no hay TPV real, ni dinero real, ni campos de tarjeta/);
  assert.match(help, /sello-novedades\.js/);
});

test('la plantilla que sirve crear_proyecto existe y es un proyecto del Director con Admingo', () => {
  const p = JSON.parse(leer('plantillas/quiosco-de-pedidos.json'));
  assert.equal(p.format, 'ainimation-project'); assert.equal(p.plan.template, 'quiosco-de-pedidos');
  assert.deepEqual(p.plan.stage, { w: 1080, h: 1920 }); assert.match(p.plan.scripts.movie, /al empezar la película/);
});

test('el quiosco pide voz al tótem por postMessage y solo sin acuse usa la del navegador', () => {
  const k = leer('xperiencias/kiosko-pedido/index.html');
  assert.match(k, /type:"say",id:id/); assert.match(k, /d\.type==="say-ack"&&d\.id===id/); assert.match(k, /if\(!ok\)\{removeEventListener\("message",ack\);local\(\);\}\},500\)/);
});
