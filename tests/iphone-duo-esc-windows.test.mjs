import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Carlos, 25-nov-2026: «que la función de Esc funcione y salga el escritorio de Windows 11 cuando no está el player de Admira.tv»
for (const d of ['iphone-duo', 'iphone-duo-fisico']) {
  const leer = (f) => readFileSync(new URL(`../digital-twins/${d}/${f}`, import.meta.url), 'utf8');
  const html = leer('index.html'), js = leer('twin.mjs'), css = leer('twin.css');

  test(`${d}: Esc quita el player y enseña el escritorio de Windows 11`, () => {
    assert.match(js, /case 'escape': salir\(\); estado\(\); return;/);
    assert.match(js, /frame\.hidden = !st\.on; win\.hidden = st\.on;/);
    assert.match(html, /class="win-wall"/);                       // fondo Bloom
    assert.match(html, /class="win-icons"/);                      // iconos del escritorio
    assert.match(html, /class="win-start"/);                      // Inicio centrado en la barra de tareas
    assert.match(html, /id="winClock"/); assert.match(html, /id="winDate"/);
    assert.match(css, /\.win-bar \{[^}]*justify-content: center/);
  });

  test(`${d}: Esc otra vez, 0 o 1–9 devuelven el player; Fn sigue mandando las teclas a Windows`, () => {
    assert.match(js, /if \(!st\.on && !st\.fn && !st\.detenido\) \{\s*if \(k === 'escape'\) \{ volver\(\); return; \}/);
    assert.match(js, /if \(\/\^\[0-9\]\$\/\.test\(k\)\) \{ const n = Number\(k\); volver\(\); volverA\(n\); return; \}/);
    assert.match(js, /function volver\(\) \{ cerrarFicha\(\); st\.detenido = false; st\.on = true;/);
  });

  test(`${d}: el foco nunca se queda en el iframe del player (Esc llega siempre al gemelo)`, () => {
    assert.match(css, /\.panel iframe \{[^}]*pointer-events: none/);
  });
}
