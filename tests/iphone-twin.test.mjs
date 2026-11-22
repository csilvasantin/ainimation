import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controlFor, nodeForAction, physicalSummary, statusText, swipeAction, PHASE_COLORS, SCREEN } from '../digital-twins/iphone-pro-max/controls.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('pantalla, Acción y lateral pausan; volumen + retrocede; volumen − y Control de cámara avanzan; deslizar navega', () => {
  for (const node of ['Screen', 'Crystal', 'ActionButton', 'SideButton']) assert.equal(controlFor(node), 'toggle');
  assert.equal(controlFor('VolumeUp'), 'prev');
  assert.equal(controlFor('VolumeDown'), 'next');
  assert.equal(controlFor('CameraControl'), 'next');
  assert.equal(controlFor('Lens1'), null);
  assert.equal(swipeAction(0, 40), 'next');
  assert.equal(swipeAction(0, -40), 'prev');
  assert.equal(swipeAction(-60, 10), 'next');
  assert.equal(swipeAction(60, 10), 'prev');
  assert.equal(swipeAction(1, 1), null);
  assert.equal(nodeForAction('toggle'), 'ActionButton');
  assert.equal(PHASE_COLORS.confirmed, '#22da65');
  assert.deepEqual({ ...SCREEN }, { width: 440, height: 956 });
});

test('la ficha del iPhone físico y la línea de estado cuentan lo que pasa', () => {
  const now = 1_800_000_000_000;
  assert.match(physicalSummary(null, now), /sin latido todavía/);
  assert.equal(physicalSummary({ received: now - 3000, online: true, paused: false, battery: 0.7, title: 'Me at the zoo', index: 0, total: 2 }, now),
    'iPhone físico: en antena · batería 70 % · Me at the zoo (1/2) · visto hace 3 s');
  assert.match(physicalSummary({ received: now - 90000, online: false }, now), /sin señal desde hace 90 s/);
  assert.equal(statusText({ playing: true, paused: true, onAir: { source: 'playlist', title: 'Así sonaba 1985', index: 1, total: 3 } }), 'Playlist del iPhone · en pausa · Así sonaba 1985 (2/3)');
  assert.match(statusText({ playing: false, onAir: { source: 'playlist', id: '' } }), /Playlist del iPhone vacía/);
  assert.equal(statusText({ pending: { phase: 'pending' } }), 'Orden enviada al iPhone físico · esperando su eco');
});

test('el gemelo está catalogado, enlazado desde la portada y sellado como los demás', () => {
  const catalogue = JSON.parse(read('../digital-twins/catalogue.json'));
  const phone = catalogue.objects.find(object => object.id === 'iphone-pro-max');
  assert.equal(phone.url, 'https://www.ainimation.studio/digital-twins/iphone-pro-max/');
  assert.equal(phone.mode, 'playlist-and-live-feed');
  assert.deepEqual(phone.screen, { width: 440, height: 956 });
  assert.match(read('../digital-twins/index.html'), /href="iphone-pro-max\/"/);
  assert.match(read('../scripts/stamp-version.mjs'), /'digital-twins\/iphone-pro-max'/);
  const page = read('../digital-twins/iphone-pro-max/index.html');
  assert.match(page, /data-src="https:\/\/admira\.tv\/iphone\.html"/);
  assert.match(page, /data-src="https:\/\/admira\.tv\/mando\?embed=galleon&amp;screen=iphone-pro-max"/);
  assert.match(page, /src="\.\/twin\.mjs\?v=/);
  assert.ok(fs.existsSync(new URL('../digital-twins/iphone-pro-max/iphone-pro-max.glb', import.meta.url)));
  assert.match(read('../digital-twins/help/index.html'), /iphone-pro-max/);
});
