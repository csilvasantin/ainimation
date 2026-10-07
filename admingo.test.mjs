// Admingo · el Lingo de AdmiraNeXT (Carlos, 7-oct-2026).
// 1) lenguaje: sintaxis ES/EN, errores con línea, bajada a XPL, el script gana, globales por sesión.
// 2) aceptación: el quiosco del §6 se ESCRIBE en la ventana Script, se prueba en Play con la
//    ventana Mensaje, se publica y la pieza publicada llega a un número de pedido A00x.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
const A = createRequire(import.meta.url)('./assets/admingo.js');
const SHOTS = process.env.ADMINGO_SHOTS || '';

function fakeHost(over = {}) {
  const log = [], st = { frame: 1, facts: {} };
  return { log, st, host: Object.assign({ fact: (id) => st.facts[id], act: (...a) => log.push(a), frame: () => st.frame, markers: () => [{ label: 'INICIO', frame: 1 }, { label: 'MENU', frame: 25 }, { label: 'PAGO', frame: 49 }], goFrame: (f) => { st.frame = f; }, stay: () => log.push(['stay']), say: (t) => log.push(['say', t]), log: (m) => log.push(['log', m.text ?? m.es]), spriteText: (n) => `T:${n}`, lang: () => 'es' }, over) };
}

test('Admingo: misma pieza en español y en inglés, y las dos sintaxis de propiedades', () => {
  const es = 'al soltar\n  fijar el texto del sprite "precio" a "3 €"\n  ir a marca "PAGO"\nfin';
  const en = 'on mouseUp\n  set sprite("precio").text to "3 €"\n  go to marker "PAGO"\nend';
  for (const src of [es, en]) {
    const { host, log } = fakeHost();
    const vm = A.createVM({ sprites: { boton: src } }, host);
    assert.deepEqual(vm.errors, []);
    vm.tick({}); vm.tick({ click: 'boton' });
    assert.deepEqual(log.filter((l) => l[0] !== 'log'), [['setText', 'precio', '3 €'], ['goToMarker', 'PAGO']]);
  }
  assert.equal(A.translate('al soltar\n  ir a marca "carrito"\nfin', 'en').trim(), 'on mouseUp\n  go to marker "carrito"\nend');
});

test('Admingo: errores con número de línea, sin eval y con tope de pasos', () => {
  const r = A.parse('on mouseUp\n  if the cartCount > 0 then\n    stop\nend');
  assert.equal(r.errors[0].line, 4); assert.match(r.errors[0].es, /fin si/);
  assert.equal(A.parse('al soltar\n  ir a marca\nfin').errors[0].line, 2);
  const { host, log } = fakeHost();
  const vm = A.createVM({ movie: 'on startMovie\n  repeat while TRUE\n    put 1\n  end repeat\nend' }, host);
  vm.tick({});
  assert.ok(log.some((l) => l[0] === 'log' && /vueltas|pasos/.test(l[1])), 'el bucle infinito se corta');
  const src = fs.readFileSync('assets/admingo.js', 'utf8');
  assert.doesNotMatch(src, /\beval\(|new Function|Function\(/);
});

test('Admingo: «al soltar» simple se baja a regla XPL y el script gana a la regla del autor', () => {
  const prog = A.compileScripts({ sprites: { btn: 'al soltar\n  ir a marca "MENU"\n  parar\nfin', otro: 'al soltar\n  poner 1 en n\nfin' } });
  assert.deepEqual(prog.rules.map((r) => [r.when.conds[0].value, r.do.map((d) => d.id)]), [['btn', ['goToMarker', 'stop']]]);
  const { host } = fakeHost();
  const vm = A.createVM({ sprites: { btn: 'al soltar\n  ir a marca "MENU"\nfin' } }, host);
  const merged = vm.mergeRules([{ id: 'autor', when: { conds: [{ fact: 'click', value: 'btn' }] }, do: [{ id: 'goToMarker', value: 'PAGO' }] }, { id: 'otra', when: { conds: [{ fact: 'idleSeconds', op: '>', value: 5 }] }, do: [] }]);
  assert.deepEqual(merged.map((r) => r.id), ['otra', 'adm-btn-mouseUp']);
});

test('Admingo: las globales se reinician en cada sesión nueva del quiosco', () => {
  const { host, st, log } = fakeHost();
  const vm = A.createVM({ movie: 'global n\non startMovie\n  put n\nend\nal soltar\n  poner n + 1 en n\n  put n\nfin' }, host);
  vm.tick({}); vm.tick({ click: 'x' }); st.frame = 30; vm.tick({ click: 'x' });
  assert.deepEqual(log.filter((l) => l[0] === 'log').map((l) => l[1]), ['', '1', '2']);
  st.frame = 1; vm.tick({}); vm.tick({ click: 'x' });
  assert.equal(log.filter((l) => l[0] === 'log').pop()[1], '1', 'vuelta al inicio = sesión nueva');
});

/* --------------------------------------------- aceptación (navegador) --- */
const MOVIE = fs.readFileSync('assets/director-kiosk.js', 'utf8').match(/const ADMINGO_MOVIE = `([\s\S]*?)`;/)[1];
const SPRITES = {
  btnEmpezar: 'al soltar\n  ir a marca "CATEGORIAS"\nfin',
  carta: 'al soltar\n  ir a marca "PRODUCTOS"\nfin',
  productos: 'on mouseUp\n  go to marker "OPCIONES"\nend',
  opciones: 'al soltar\n  añadir al carrito the selectedItem talla the selectedSize\n  fijar el texto del sprite "hCarrito" a "Tu pedido (" & the cartCount & ")"\n  ir a marca "CARRITO"\nfin',
  carrito: 'al soltar\n  si the cartCount = 0 entonces\n    decir "Tu carrito está vacío"\n  si no\n    ir a marca "PAGO"\n  fin si\nfin',
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css' };
const serve = (root) => new Promise((r) => { const s = http.createServer((q, res) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
function unzipStore(buf, dir) { let i = 0; const out = []; while (buf.readUInt32LE(i) === 0x04034b50) { const size = buf.readUInt32LE(i + 18), n = buf.readUInt16LE(i + 26), x = buf.readUInt16LE(i + 28); const name = buf.slice(i + 30, i + 30 + n).toString(); const st = i + 30 + n + x; fs.writeFileSync(path.join(dir, name), buf.slice(st, st + size)); out.push(name); i = st + size; } return out; }

test('Admingo: el quiosco se escribe en la ventana Script, se prueba en Play y la pieza publicada llega a A00x', { timeout: 300000 }, async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const srv = await serve(process.cwd()); const base = `http://127.0.0.1:${srv.address().port}`;
  const shot = (pg, n) => (SHOTS ? pg.screenshot({ path: path.join(SHOTS, `admingo-${n}.png`) }) : null);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('dialog', (d) => d.accept());
    await page.goto(`${base}/studio.html`); await page.waitForFunction(() => window.ainDirector && window.Admingo && window.ainAdmingo?.openScript && document.querySelector('.dk-plantillas')); await page.waitForTimeout(800);
    // plantilla (sprites + marcas) y se BORRA su lógica: todo se vuelve a escribir a mano
    await page.click('.dk-plantillas > .menu-button'); await page.click('[data-dk-template-kiosk]'); await page.waitForTimeout(1200);
    await page.click('.window-menu > .menu-button'); await page.click('.window-menu-list [data-adm-open-script]'); await page.waitForTimeout(300);
    const ed = page.locator('[data-adm-editor]');
    async function write(scope, text) {
      await page.selectOption('[data-adm-scope]', scope); await page.waitForTimeout(150);
      await ed.click(); await page.keyboard.press('Control+a'); await page.keyboard.press('Delete');
      await page.keyboard.type(text); await page.waitForTimeout(450);
    }
    for (const n of ['btnAtras', 'btnMas']) await write(`sprite:${n}`, '');
    // error a propósito: falta «fin si» → aparece con su número de línea
    await write('movie', 'al soltar\n  si the cartCount > 0 entonces\n    parar\nfin');
    await page.waitForTimeout(400);
    assert.match(await page.locator('.adm-errors').innerText(), /(Línea|Line) 4: .*(fin si|end if)/);
    assert.equal(await page.locator('.adm-gutter b.err').count(), 1);
    await shot(page, '1-error-linea');
    await write('movie', MOVIE);
    for (const [n, src] of Object.entries(SPRITES)) await write(`sprite:${n}`, src);
    await page.selectOption('[data-adm-scope]', 'movie'); await page.waitForTimeout(400);
    assert.match(await page.locator('.adm-errors').innerText(), /(Sin errores|No errors).*(bajados a reglas XPL|compiled to XPL)/);
    // autocompletar: escribir «the orderN» + Tab → «the orderNumber»
    await ed.click(); await page.keyboard.press('Control+End'); await page.keyboard.type('\n-- the orderN'); await page.waitForTimeout(200);
    assert.ok(await page.locator('.adm-ac button').count() > 0, 'hay sugerencias');
    await page.keyboard.press('Tab'); await page.waitForTimeout(200);
    assert.match(await ed.inputValue(), /-- the orderNumber$/);
    await shot(page, '2-script-ventana');
    const scripts = await page.evaluate(() => currentPlan().scripts);
    assert.equal(scripts.sprites.opciones.trim(), SPRITES.opciones);
    assert.equal(Object.keys(scripts.sprites).sort().join(), Object.keys(SPRITES).sort().join());
    await page.click('[data-adm-close]');

    // Play en el Studio + ventana Mensaje en vivo
    await page.click('.control-menu > .menu-button'); await page.click('.control-menu-list [data-play-toggle]'); await page.waitForTimeout(1200);
    await page.click('.dk-item >> text=/Touch to start|Toca para empezar/'); await page.waitForTimeout(700);
    await page.keyboard.press('Control+m'); await page.fill('[data-adm-msg-input]', 'put the marker'); await page.press('[data-adm-msg-input]', 'Enter'); await page.waitForTimeout(300);
    assert.match(await page.locator('[data-adm-log]').innerText(), /CATEGORIAS/);
    await page.fill('[data-adm-msg-input]', 'ir a marca "INICIO"'); await page.press('[data-adm-msg-input]', 'Enter'); await page.waitForTimeout(600);
    await page.fill('[data-adm-msg-input]', 'put the marker & " · " & the cartCount'); await page.press('[data-adm-msg-input]', 'Enter'); await page.waitForTimeout(300);
    assert.match(await page.locator('[data-adm-log]').innerText(), /INICIO · 0/);
    await shot(page, '3-mensaje-en-play');
    await page.click('[data-adm-msg-close]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // Publicar → zip con scripts.admingo → la pieza publicada corre sola
    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('[data-member-menu]'); await page.click('[data-publish-xperiencia]'); await page.fill('form [name=nombre]', 'Quiosco Admingo'); await page.click('form .xp-pub-ok'); })()]);
    const out = path.join(process.cwd(), 'tmp-admingo'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
    const zp = path.join(out, 'p.zip'); await dl.saveAs(zp); const files = unzipStore(fs.readFileSync(zp), out);
    assert.ok(files.includes('scripts.admingo'), files.join());
    assert.match(fs.readFileSync(path.join(out, 'scripts.admingo'), 'utf8'), /--@ sprite "opciones"[\s\S]*añadir al carrito/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'rules.json'), 'utf8')), [], 'la lógica es Admingo, no reglas');
    const pub = await ctx.newPage(); const perr = []; pub.on('pageerror', (e) => perr.push(String(e)));
    await pub.setViewportSize({ width: 540, height: 960 });
    await pub.goto(`${base}/tmp-admingo/index.html?lang=es`); await pub.waitForTimeout(1200);
    const c = async (s) => { await pub.click(s, { timeout: 8000 }); await pub.waitForTimeout(600); };
    await c('.xp-hot >> text=Toca para empezar'); await c('[data-aink=cat] >> nth=0'); await c('[data-aink=item] >> nth=0');
    await c('[data-aink=opt] >> nth=1'); await c('[data-aink=add]');
    assert.match(await pub.locator('.xp-btn >> text=/Tu pedido \\(1\\)/').innerText(), /Tu pedido \(1\)/);
    assert.equal(await pub.evaluate(() => window.__admingoVM.program.errors.length), 0);
    await shot(pub, '4-publicada-carrito');
    await c('[data-aink=pay]'); await c('[data-aink=counter]'); await pub.waitForTimeout(500);
    const num = await pub.locator('.aink-num b').textContent();
    assert.match(num, /^A\d{3}$/);
    const said = await pub.evaluate(() => window.__admingoSaid || []);
    assert.ok(said.some((s) => s.text === `¡Gracias! Tu pedido es el ${num}` && s.lang === 'es-ES'), JSON.stringify(said));
    await shot(pub, '5-publicada-numero');
    await pub.waitForTimeout(13500);
    assert.ok(await pub.locator('.xp-hot >> text=Toca para empezar').isVisible(), 'a los 12 s vuelve al inicio');
    assert.deepEqual(perr, []); assert.deepEqual(errors, []);
    fs.rmSync(out, { recursive: true, force: true });
  } finally { await browser.close(); srv.close(); }
});
