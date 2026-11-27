// Inventario de los gemelos de objetos (27-nov-2026): cada carpeta de /digital-twins/ tiene su entrada en el catálogo,
// su ficha en el índice, su URL en el sitemap, su sección ES + EN en la ayuda (anclas #<id> y #<id>-en), la barra común
// y su sello ?v=. Y el gemelo AdmiraNeXT01 habla con admira.store como el 05 (mirar público + pase para mandar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const leer = (p) => readFileSync(new URL(p, raiz), 'utf8');
const cat = JSON.parse(leer('digital-twins/catalogue.json'));
const indice = leer('digital-twins/index.html');
const ayuda = leer('digital-twins/help/index.html');
const sitemap = leer('sitemap.xml');
const stamp = leer('scripts/stamp-version.mjs');
const nav = leer('digital-twins/twin-nav.js');

const carpetas = readdirSync(new URL('digital-twins/', raiz), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'help' && existsSync(new URL(`digital-twins/${d.name}/index.html`, raiz)))
  .map((d) => d.name)
  .sort();
const porId = Object.fromEntries(cat.objects.map((o) => [o.id, o]));

test('el catálogo tiene fecha, cuenta y los trece objetos; ninguno repetido', () => {
  assert.match(cat.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(cat.count, cat.objects.length);
  assert.equal(cat.objects.length, 13);
  assert.equal(new Set(cat.objects.map((o) => o.id)).size, 13);
  assert.equal(cat.index, 'https://www.ainimation.studio/digital-twins/');
});

test('cada carpeta de /digital-twins/ está en el catálogo con su URL, y al revés (la taza vive en /taza/)', () => {
  for (const c of carpetas) {
    assert.ok(porId[c], `falta ${c} en catalogue.json`);
    assert.equal(porId[c].url, `https://www.ainimation.studio/digital-twins/${c}/`);
  }
  for (const o of cat.objects) {
    if (o.id === 'taza') { assert.equal(o.url, 'https://www.ainimation.studio/taza/'); continue; }
    assert.ok(carpetas.includes(o.id), `${o.id} está en el catálogo pero no tiene carpeta`);
  }
});

test('cada objeto tiene modo, ayuda con ancla y, salvo la taza, su ficha en el índice y su URL en el sitemap', () => {
  for (const o of cat.objects) {
    assert.ok(o.mode, `${o.id} sin mode`);
    assert.equal(o.help, `https://www.ainimation.studio/digital-twins/help/#${o.id}`);
    assert.ok(ayuda.includes(`<h3 id="${o.id}">`), `ayuda ES sin ancla #${o.id}`);
    assert.ok(ayuda.includes(`<h3 id="${o.id}-en">`), `ayuda EN sin ancla #${o.id}-en`);
    assert.ok(ayuda.includes(`href="#${o.id}"`) && ayuda.includes(`href="#${o.id}-en"`), `índice de la ayuda sin ${o.id}`);
    const href = o.id === 'taza' ? '/taza/' : `${o.id}/`;
    assert.ok(indice.includes(`class="twin-card" href="${href}"`), `índice sin ficha de ${o.id}`);
    if (o.id !== 'taza') assert.ok(sitemap.includes(`<loc>${o.url}</loc>`), `sitemap sin ${o.id}`);
  }
  assert.ok(sitemap.includes('<loc>https://www.ainimation.studio/digital-twins/help/</loc>'));
});

test('cada gemelo lleva la barra común, canonical propio y el sello ?v= de los gemelos', () => {
  for (const c of carpetas) {
    const html = leer(`digital-twins/${c}/index.html`);
    assert.match(html, /\/digital-twins\/twin-nav\.js\?v=/, `${c} sin twin-nav`);
    assert.ok(html.includes(`rel="canonical" href="https://www.ainimation.studio/digital-twins/${c}/"`), `${c} sin canonical`);
    assert.ok(stamp.includes(`'digital-twins/${c}'`), `stamp-version.mjs no sella digital-twins/${c}`);
  }
});

test('la barra común abre la ayuda en la sección del gemelo actual', () => {
  assert.match(nav, /const ayuda='\/digital-twins\/help\/'\+\(name&&name!=='digital-twins'&&name!=='help'\?'#'\+name:''\)/);
  assert.match(nav, /\['Ayuda \/ Help',ayuda\]/);
});

test('los dos PC son «en vivo o simulación» en el catálogo y en el índice; sus fichas ya no dicen solo simulación', () => {
  for (const id of ['admiranext01', 'admiranext05']) {
    assert.equal(porId[id].mode, 'live-or-local-simulation');
    assert.match(porId[id].state, /^https:\/\/www\.admira\.store\/supercomputer\/(pc-cocina\/)?api\/estado$/);
    assert.match(porId[id].pass, /\/api\/enlace$/);
  }
  assert.doesNotMatch(indice, /iluminación en simulación\."/);
  assert.doesNotMatch(indice, /Vista previa local\."/);
  assert.doesNotMatch(ayuda, /Los dos ordenadores funcionan en simulación local/);
});

test('AdmiraNeXT01 habla con admira.store como el 05: mirar sin cookies, pase para mandar, caída a simulación', () => {
  const a01 = leer('digital-twins/admiranext01/index.html');
  const a05 = leer('digital-twins/admiranext05/index.html');
  assert.match(a01, /const ORIGEN_API='https:\/\/www\.admira\.store';\nconst API=ORIGEN_API\+'\/supercomputer\/api';/);
  assert.match(a05, /const API=ORIGEN_API\+'\/supercomputer\/pc-cocina\/api';/);
  for (const html of [a01, a05]) {
    assert.match(html, /let SIM=true, simInforme=null;/);
    assert.match(html, /window\.open\(API\+'\/enlace\?o='\+encodeURIComponent\(location\.origin\)/);
    assert.match(html, /ev\.origin!==ORIGEN_API\|\|ev\.source!==w\|\|ev\.data\?\.type!=='admira:supercomputer:pase'/);
    assert.match(html, /Authorization:'Bearer '\+pase/);
    assert.match(html, /loader\.setCrossOrigin\('anonymous'\)/);
    assert.doesNotMatch(html, /use-credentials/);
    assert.doesNotMatch(html, /id="simMode"/);
    assert.match(html, /ponerSim\(true\);\n  return \{ok:true,enLinea:false/);
  }
  assert.match(a01, /ev\.data\.maquina!=='metahuman'/);
  assert.match(a05, /ev\.data\.maquina!=='pc-cocina'/);
  assert.match(a01, /'En vivo · AdmiraNeXT01'/);
  assert.match(a01, /'Simulación · AdmiraNeXT01 no está en línea'/);
  assert.match(a01, /toast\(SIM\?'Aplicado en gemelo \(sim\)':'Escena enviada a METAHUMAN'\)/);
  // Sin el pase, nada se manda a la máquina en simulación: api() aplica en el gemelo.
  assert.match(a01, /if\(SIM\)\{simAplicar\(ruta,cuerpo\);return \{ok:true,sim:true\};\}/);
});
