// La vista pública consulta el espejo. El control exige autorizar el panel local.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../digital-twins/stream-deck/index.html', import.meta.url), 'utf8');

test('el gemelo conserva la consulta pública y limita el control al panel local autorizado', () => {
  assert.doesNotMatch(html, /lanzadera\/|api\/pulsar|control\/admiradesk\/api/);
  for (const m of html.matchAll(/fetch\(([^,)]+)/g)) assert.match(m[1], /LIVE_URL|ESTADO_URL/);
  assert.match(html, /e.origin!==MANDO_LOCAL\|\|e.source!==ventanaXL/);
  assert.match(html, /estadoXL\?\.habilitadas.includes\(pos\)/);
  assert.match(html, /pedirXL\('pulsar',\{pos,revision:estadoXL.revision\}\)/);
});

test('con la página AdmiraDesk activa remite al gemelo de control con login', () => {
  assert.match(html, /id="admiradeskAviso" hidden/);
  assert.match(html, /https:\/\/www\.admira\.store\/control\/admiradesk\//);
  assert.match(html, /pageName==='AdmiraDesk'/);
});
