import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { controlFor, nodeForAction, physicalSummary, statusText, swipeAction, wheelAction, PHASE_COLORS } from '../digital-twins/apple-watch-ultra/controls.mjs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('corona y pantalla pausan, el botón de Acción avanza y el lateral retrocede; la rueda sobre la corona navega', () => {
  for (const node of ['DigitalCrown', 'CrownRing', 'CrownRidge7', 'Screen', 'Crystal']) assert.equal(controlFor(node), 'toggle');
  assert.equal(controlFor('ActionButton'), 'next');
  assert.equal(controlFor('SideButton'), 'prev');
  assert.equal(controlFor('BandTopTube3'), null);
  assert.equal(wheelAction(40), 'next');
  assert.equal(wheelAction(-40), 'prev');
  assert.equal(wheelAction(1), null);
  assert.equal(swipeAction(60, 5), 'next', 'deslizar a la derecha sobre la esfera = siguiente');
  assert.equal(swipeAction(-60, 5), 'prev', 'a la izquierda = anterior');
  assert.equal(swipeAction(2, 2), null);
  assert.equal(nodeForAction('toggle'), 'DigitalCrown');
  assert.equal(PHASE_COLORS.confirmed, '#22da65');
});

test('la ficha del reloj físico y la línea de estado cuentan lo que pasa', () => {
  const now = 1_800_000_000_000;
  assert.match(physicalSummary(null, now), /sin latido todavía/);
  assert.equal(physicalSummary({ received: now - 3000, online: true, paused: false, battery: 0.7, title: 'Me at the zoo', index: 0, total: 2 }, now),
    'Reloj físico: en antena · batería 70 % · Me at the zoo (1/2) · visto hace 3 s');
  assert.match(physicalSummary({ received: now - 90000, online: false }, now), /sin señal desde hace 90 s/);
  assert.equal(statusText(null), 'Esperando la señal de Admira TV');
  assert.equal(statusText({ playing: true, paused: true, onAir: { source: 'playlist', title: 'Así sonaba 1985', index: 1, total: 3 } }), 'Playlist del reloj · en pausa · Así sonaba 1985 (2/3)');
  assert.match(statusText({ playing: false, onAir: { source: 'playlist', id: '' } }), /Playlist del reloj vacía/);
  assert.equal(statusText({ pending: { phase: 'pending' } }), 'Orden enviada al reloj físico · esperando su eco');
});

test('el gemelo está catalogado, enlazado desde la portada y sellado como los demás', () => {
  const catalogue = JSON.parse(read('../digital-twins/catalogue.json'));
  const watch = catalogue.objects.find(object => object.id === 'apple-watch-ultra');
  assert.equal(watch.url, 'https://www.ainimation.studio/digital-twins/apple-watch-ultra/');
  assert.equal(watch.mode, 'playlist-and-live-feed');
  assert.deepEqual(watch.screen, { width: 410, height: 502 });
  assert.match(read('../digital-twins/index.html'), /href="apple-watch-ultra\/"/);
  assert.match(read('../scripts/stamp-version.mjs'), /'digital-twins\/apple-watch-ultra'/);
  const page = read('../digital-twins/apple-watch-ultra/index.html');
  assert.match(page, /data-src="https:\/\/admira\.tv\/apple-watch\.html"/);
  assert.match(page, /data-src="https:\/\/admira\.tv\/mando\?embed=galleon&amp;screen=apple-watch-ultra"/);
  assert.match(page, /src="\.\/twin\.mjs\?v=/);
  assert.ok(fs.existsSync(new URL('../digital-twins/apple-watch-ultra/apple-watch-ultra.glb', import.meta.url)));
});
