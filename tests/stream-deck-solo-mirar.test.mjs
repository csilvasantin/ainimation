// AdmiraDesk (26-nov-2026): el gemelo PÚBLICO del Stream Deck es solo para mirar. No puede pulsar ni leer la
// lanzadera: el control vive tras el login de admira.store (/control/admiradesk/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../digital-twins/stream-deck/index.html', import.meta.url), 'utf8');

test('el gemelo público no manda pulsaciones ni toca la API de la lanzadera', () => {
  assert.doesNotMatch(html, /method\s*:\s*['"]POST/i);
  assert.doesNotMatch(html, /lanzadera\/|api\/pulsar|control\/admiradesk\/api/);
  for (const m of html.matchAll(/fetch\(([^,)]+)/g)) assert.match(m[1], /LIVE_URL|ESTADO_URL/, 'solo lee cara y estado: ' + m[1]);
});

test('con la página AdmiraDesk activa remite al gemelo de control con login', () => {
  assert.match(html, /id="admiradeskAviso" hidden/);
  assert.match(html, /https:\/\/www\.admira\.store\/control\/admiradesk\//);
  assert.match(html, /pageName==='AdmiraDesk'/);
});
