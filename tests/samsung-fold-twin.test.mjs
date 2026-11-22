import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controlFor, nodeForAction, physicalSummary, statusText, swipeAction, PHASE_COLORS, SCREEN } from '../digital-twins/samsung-fold/controls.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('pantalla y lateral pausan; volumen + retrocede; volumen − avanza; deslizar navega', () => {
  for (const node of ['Screen', 'Crystal', 'SideButton']) assert.equal(controlFor(node), 'toggle');
  assert.equal(controlFor('VolumeUp'), 'prev');
  assert.equal(controlFor('VolumeDown'), 'next');
  assert.equal(controlFor('Hinge'), null);
  assert.equal(controlFor('Lens1'), null);
  assert.equal(swipeAction(60, 10), 'next', 'a la derecha, siguiente');
  assert.equal(swipeAction(-60, 10), 'prev', 'a la izquierda, anterior');
  assert.equal(swipeAction(0, -40), 'next');
  assert.equal(swipeAction(0, 40), 'prev');
  assert.equal(swipeAction(1, 1), null);
  assert.equal(nodeForAction('toggle'), 'SideButton');
  assert.equal(PHASE_COLORS.confirmed, '#22da65');
  assert.deepEqual({ ...SCREEN }, { width: 1080, height: 960 });
});

test('la ficha del Fold físico y la línea de estado cuentan lo que pasa', () => {
  const now = 1_800_000_000_000;
  assert.match(physicalSummary(null, now), /sin latido todavía/);
  assert.equal(physicalSummary({ received: now - 3000, online: true, paused: false, battery: 0.7, title: 'Me at the zoo', index: 0, total: 2 }, now),
    'Fold físico: en antena · batería 70 % · Me at the zoo (1/2) · visto hace 3 s');
  assert.match(physicalSummary({ received: now - 90000, online: false }, now), /sin señal desde hace 90 s/);
  assert.equal(statusText({ playing: true, paused: true, onAir: { source: 'playlist', title: 'Así sonaba 1985', index: 1, total: 3 } }), 'Playlist del Fold · en pausa · Así sonaba 1985 (2/3)');
  assert.match(statusText({ playing: false, onAir: { source: 'playlist', id: '' } }), /Playlist del Fold vacía/);
  assert.equal(statusText({ pending: { phase: 'pending' } }), 'Orden enviada al Fold físico · esperando su eco');
});

test('el gemelo está catalogado, enlazado desde la portada y sellado como los demás', () => {
  const catalogue = JSON.parse(read('../digital-twins/catalogue.json'));
  const fold = catalogue.objects.find(object => object.id === 'samsung-fold');
  assert.equal(fold.url, 'https://www.ainimation.studio/digital-twins/samsung-fold/');
  assert.equal(fold.mode, 'playlist-and-live-feed');
  assert.deepEqual(fold.screen, { width: 1080, height: 960 });
  assert.match(read('../digital-twins/index.html'), /href="samsung-fold\/"/);
  assert.match(read('../scripts/stamp-version.mjs'), /'digital-twins\/samsung-fold'/);
  const page = read('../digital-twins/samsung-fold/index.html');
  assert.match(page, /data-src="https:\/\/admira\.tv\/fold\.html"/);
  assert.match(page, /data-src="https:\/\/admira\.tv\/mando\?embed=galleon&amp;screen=samsung-fold"/);
  assert.match(page, /src="\.\/twin\.mjs\?v=/);
  assert.ok(fs.existsSync(new URL('../digital-twins/samsung-fold/samsung-fold.glb', import.meta.url)));
  assert.match(read('../digital-twins/help/index.html'), /samsung-fold/);
});
