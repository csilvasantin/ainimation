import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Carlos, 25-nov-2026 11:09: «son gemelos y actúan iguales, principio de telemetría».
const sync = readFileSync(new URL('../digital-twins/iphone-duo/sync.mjs', import.meta.url), 'utf8');

test('canal de telemetría: admira.tv/api/twin-sync, long-poll y sin secretos en la página', () => {
  assert.match(sync, /const API = 'https:\/\/admira\.tv\/api\/twin-sync'/);
  assert.match(sync, /&since=\$\{cursor\}&wait=1/);
  assert.doesNotMatch(sync, /Authorization|Bearer|apiKey|api_key|token=|password/i);
  assert.match(sync, /kind: 'cmd', from: 'twin', client, action, arg/);
});

for (const d of ['iphone-duo', 'iphone-duo-fisico']) {
  const js = readFileSync(new URL(`../digital-twins/${d}/twin.mjs`, import.meta.url), 'utf8');
  const html = readFileSync(new URL(`../digital-twins/${d}/index.html`, import.meta.url), 'utf8');
  test(`${d}: cada tecla del player sale como orden y el gemelo se alinea con el Duo físico`, () => {
    assert.match(js, /import \{ crearSync \} from '\.\.\/iphone-duo\/sync\.mjs\?v=/);
    for (const o of ["tx('next')", "tx('prev')", "tx('togglepause')", "tx('win')", "tx('tv')", "tx('stop')", "tx('start')", "tx('info')", "tx('infoclose')", "tx('key', Number(k))", "tx('seek', 10)", "tx('seek', -10)", "tx('last')", "tx('first')", "tx(st.mute ? 'unmute' : 'mute')"]) assert.ok(js.includes(o), o);
    assert.match(js, /async function alinear\(d\)/);
    assert.match(js, /canal\('goto ' \+ i\)/);
    assert.match(js, /canal\(d\.paused \? 'pause' : 'resume'\)/);
    assert.match(js, /alOrden: \(ev, \{ duoEnLinea \}\) => \{ if \(!duoEnLinea\) aplicarOrden\(ev\); \}/);
    assert.match(html, /id="duoFisico"/);
  });
}
