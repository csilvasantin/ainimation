import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { posterOf, physicalSummary, statusText, SCREEN, NOW_URL } from '../digital-twins/eink-sy11-ab/preview.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('la pantalla de la tinta es 480 × 800 y el latido apunta a la SY11-ab', () => {
  assert.deepEqual({ ...SCREEN }, { width: 480, height: 800 });
  assert.equal(NOW_URL, 'https://api.admira.store/signage/now?screen=eink-sy11-ab');
  assert.equal(posterOf({ id: '1794939498841-gykb31' }), 'https://stock.admira.store/stock/1794939498841-gykb31/poster.jpg');
  assert.equal(posterOf({ thumbnail: 'https://example.test/p.jpg' }), 'https://example.test/p.jpg');
  assert.equal(posterOf(null), '');
});

test('la ficha de la pantalla física y la línea de estado cuentan lo que pasa', () => {
  const now = 1_800_000_000_000;
  assert.match(physicalSummary(null, now), /sin latido todavía/);
  assert.equal(physicalSummary({ lastSeen: now - 4000, item: { title: '17 October 2026' }, device: { eink: { firmware: 'SY11-014' } } }, now),
    'SY11-ab física: en antena · 17 October 2026 · visto hace 4 s · firmware SY11-014');
  assert.equal(statusText({ eink: { item: { id: 'a', title: 'Rocky' } }, wall: { mode: 'sync' } }), 'Previo en la tinta · Rocky · espejo sync');
  assert.match(statusText({}), /Esperando el previo/);
});

test('el gemelo está catalogado, enlazado desde la portada y sellado como los demás', () => {
  const catalogue = JSON.parse(read('../digital-twins/catalogue.json'));
  const eink = catalogue.objects.find(object => object.id === 'eink-sy11-ab');
  assert.equal(eink.url, 'https://www.ainimation.studio/digital-twins/eink-sy11-ab/');
  assert.equal(eink.mode, 'playlist-and-live-feed');
  assert.deepEqual(eink.screen, { width: 480, height: 800 });
  assert.match(read('../digital-twins/index.html'), /href="eink-sy11-ab\/"/);
  assert.match(read('../scripts/stamp-version.mjs'), /'digital-twins\/eink-sy11-ab'/);
  const page = read('../digital-twins/eink-sy11-ab/index.html');
  assert.match(page, /src="\.\/twin\.mjs\?v=/);
  assert.match(page, /480 × 800/);
  assert.ok(fs.existsSync(new URL('../digital-twins/eink-sy11-ab/sy11-ab.glb', import.meta.url)));
  assert.match(read('../digital-twins/help/index.html'), /eink-sy11-ab/);
});
