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
