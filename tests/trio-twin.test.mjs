import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEVICES, MODES, deviceStatus, frameAccepted, placement, wallSummary } from '../digital-twins/trio/controls.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('los tres aparatos van a escala real sobre la pared de 288 mm, alineados y en orden reloj · iPhone · Fold', () => {
  const [watch, phone, fold] = DEVICES.map(d => placement(d, 0.2).x);
  assert.ok(watch < phone && phone < fold);
  assert.ok(Math.abs(fold - (145 + 143 / 2 - 144) / 10 * 0.2) < 1e-9);
  assert.equal(DEVICES.map(d => d.id).join(','), 'apple-watch-ultra,iphone-pro-max,samsung-fold');
  assert.ok(Object.keys(MODES).join(',') === 'own,sync,extended');
});

test('cada fotograma se acepta sólo si mide lo que pinta su pantalla; las fichas y el resumen cuentan la pared', () => {
  const fold = DEVICES[2];
  assert.equal(frameAccepted({ width: 1080, height: 960 }, fold), true);
  assert.equal(frameAccepted({ width: 440, height: 956 }, fold), false);
  assert.match(deviceStatus(fold, null), /esperando/);
  assert.equal(deviceStatus(fold, { playing: true, onAir: { title: 'Rocky', index: 1, total: 3 }, physical: { online: true } }), 'Fold: Rocky (2/3) · físico en antena');
  assert.equal(wallSummary([null, null, null]), 'Pared: sin señal');
  assert.equal(wallSummary([{ wall: { mode: 'sync' }, onAir: { id: 'a' } }, { wall: { mode: 'sync' }, onAir: { id: 'a' } }, { wall: { mode: 'sync' }, onAir: { id: 'a' } }]), 'Pared sincronizada · los tres en la misma pieza');
  assert.match(wallSummary([{ wall: { mode: 'extended' }, onAir: { id: 'a' } }, { wall: { mode: 'extended' }, onAir: { id: 'b' } }]), /Pared extendida · esperando/);
  assert.equal(wallSummary([{ wall: { mode: 'own' } }]), 'Pared: cada aparato con su playlist');
});

test('el escenario está catalogado, enlazado y sellado; manda el modo por postMessage a un player', () => {
  const catalogue = JSON.parse(read('../digital-twins/catalogue.json'));
  const trio = catalogue.objects.find(object => object.id === 'trio');
  assert.equal(trio.url, 'https://www.ainimation.studio/digital-twins/trio/');
  assert.deepEqual(trio.devices, ['apple-watch-ultra', 'iphone-pro-max', 'samsung-fold']);
  assert.match(read('../digital-twins/index.html'), /href="trio\/"/);
  assert.match(read('../scripts/stamp-version.mjs'), /'digital-twins\/trio'/);
  const page = read('../digital-twins/trio/index.html');
  for (const mode of ['own', 'sync', 'extended']) assert.match(page, new RegExp('data-mode="' + mode + '"'));
  assert.match(page, /src="\.\/twin\.mjs\?v=/);
  const twin = read('../digital-twins/trio/twin.mjs');
  assert.match(twin, /type: 'admira:watch:wall', mode: button\.dataset\.mode/);
  assert.match(read('../digital-twins/help/index.html'), /digital-twins\/trio\//);
});
