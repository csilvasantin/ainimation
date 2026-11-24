import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../digital-twins/iphone-duo/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../digital-twins/iphone-duo/twin.mjs', import.meta.url), 'utf8');
const cat = JSON.parse(readFileSync(new URL('../digital-twins/catalogue.json', import.meta.url), 'utf8'));

test('el gemelo del iPhone Duo está en el catálogo y no se indexa', () => {
  const o = cat.objects.find(x => x.id === 'iphone-duo');
  assert.ok(o); assert.equal(o.url, 'https://www.ainimation.studio/digital-twins/iphone-duo/');
  assert.match(html, /noindex,nofollow/);
});

test('emite la pantalla iphone-duo de admira.tv, encuadrada (fit=contain), y habla sólo con admira.tv', () => {
  assert.match(js, /const SCREEN = 'iphone-duo'/);
  assert.match(js, /fit: 'contain'/);
  assert.match(js, /e\.origin !== CANAL/);
  assert.match(js, /postMessage\(\{ source: 'admira-tv-panel', command, requestId \}, CANAL\)/);
});

test('mismos pitidos de 8 bits que la app del Duo (N, P, i)', () => {
  assert.match(js, /siguiente: \[\[880, \.055\], \[1320, \.075\]\]/);
  assert.match(js, /anterior: \[\[660, \.055\], \[440, \.075\]\]/);
  assert.match(js, /info: \[\[1047, \.04\], \[1568, \.04\], \[2093, \.07\]\]/);
  assert.match(js, /o\.type = 'square'/);
});

test('con la ficha i abierta cualquier tecla sólo la cierra; Fn manda las teclas a Windows', () => {
  assert.match(js, /if \(st\.info\) \{ cerrarFicha\(\); return; \}/);
  assert.match(js, /const player = st\.on && !st\.fn;/);
});

const deck = readFileSync(new URL('../digital-twins/iphone-duo/deck3d.mjs', import.meta.url), 'utf8');

test('modelo 3D como el resto de gemelos: three.js, órbita, bisagra y pantalla real en CSS3D', () => {
  assert.match(deck, /OrbitControls/);
  assert.match(deck, /CSS3DObject\(panel\)/);
  assert.match(deck, /function bisagra\(grados\)/);
  assert.match(html, /"three":"https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0/);
});

test('barra espaciadora larga de ThinkPad (5,40) y ⏯ pausa / reanuda con pitido', () => {
  assert.match(deck, /\['space', '', 5\.4\]/);
  assert.match(js, /case 'space': pausa\(\); return;/);
  assert.match(js, /canal\('togglepause'\)/);
  assert.match(js, /pausa: \[\[440, \.05\], \[0, \.03\], \[440, \.05\]\]/);
});

test('iconos multimedia clásicos sólo en las teclas: M 🔊/🔇 según el estado, N ⏭, P ⏮, espacio ⏯', () => {
  assert.match(deck, /if \(k === 'm'\) return s\.mute \? 'mudo' : 'altavoz';/);
  assert.match(deck, /n: 'siguiente', p: 'anterior', space: 'playpausa'/);
  assert.match(deck, /if \(!s \|\| !s\.on\) return null;/);
});
