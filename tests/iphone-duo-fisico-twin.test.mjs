import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = leer('digital-twins/iphone-duo-fisico/index.html');
const js = leer('digital-twins/iphone-duo-fisico/twin.mjs');
const phone = leer('digital-twins/iphone-duo-fisico/phone3d.mjs');
const thinkpad = leer('digital-twins/iphone-duo/index.html');
const indice = leer('digital-twins/index.html');
const sitemap = leer('sitemap.xml');
const stamp = leer('scripts/stamp-version.mjs');
const cat = JSON.parse(leer('digital-twins/catalogue.json'));

test('dos gemelos del iPhone Duo en el catálogo, el índice y el sitemap; ninguno se indexa', () => {
  const a = cat.objects.find(x => x.id === 'iphone-duo'), b = cat.objects.find(x => x.id === 'iphone-duo-fisico');
  assert.equal(a.name, 'iPhone Duo · ThinkPad X1'); assert.equal(b.name, 'iPhone Duo');
  assert.equal(b.url, 'https://www.ainimation.studio/digital-twins/iphone-duo-fisico/');
  assert.match(indice, /href="iphone-duo\/"/); assert.match(indice, /href="iphone-duo-fisico\/"/);
  assert.match(sitemap, /digital-twins\/iphone-duo-fisico\//);
  assert.match(html, /noindex,nofollow/);
});

test('enlaces visibles entre los dos gemelos', () => {
  assert.match(html, /class="otro-gemelo"><a href="\/digital-twins\/iphone-duo\/"/);
  assert.match(thinkpad, /class="otro-gemelo"><a href="\/digital-twins\/iphone-duo-fisico\/"/);
});

test('misma lógica y teclas que el gemelo ThinkPad, con su propia máquina y el modelo del teléfono', () => {
  assert.match(js, /import \{ crearEscena \} from '\.\/phone3d\.mjs\?v=/);
  assert.match(js, /const SCREEN = 'iphone-duo'/);
  assert.match(js, /const MACHINE = 'gemelo-iphone-duo-fisico-ainimation'/);
  assert.match(js, /fit: 'contain'/);
  assert.match(js, /case 'space': (tx\('togglepause'\); )?pausa\(\); return;/);
  assert.match(js, /alPerderContexto: \(\) => vistaPlana\(/);
});

test('teléfono plegable de titanio: mismo teclado y atlas, bisagra, cámaras y player real en CSS3D', () => {
  assert.match(phone, /import \{ FN, ROWS, pintarCelda, atlasTex, LADO, rotulo \} from '\.\.\/iphone-duo\/deck3d\.mjs\?v=/);
  assert.match(phone, /CSS3DObject\(panel\)/);
  assert.match(phone, /function bisagra\(grados\)/);
  assert.match(phone, /webglcontextlost/);
  assert.match(phone, /titanio/);
  assert.match(phone, /módulo de cámaras/);
});

test('el sello ?v= de los gemelos sigue a sus propios archivos e incluye el iPhone Duo físico', () => {
  assert.match(stamp, /twinVersion/);
  assert.match(stamp, /'digital-twins\/iphone-duo-fisico'/);
});
