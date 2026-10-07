// Director operativo · prueba de aceptación (Carlos, 7-oct-2026):
// se monta un quiosco de pedidos SOLO con la interfaz del editor (Playwright), se prueba en
// Play, se guarda/exporta, se publica y la Xperiencia publicada funciona sola.
// node --test director-quiosco.test.mjs   (se salta si no hay navegador)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';

const SHOTS = process.env.DIRECTOR_SHOTS || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
function serve(root) {
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}
function unzipStore(buf, dir) { // el zip del Studio es «store»: sin compresión
  let i = 0; const out = [];
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18), nlen = buf.readUInt16LE(i + 26), xlen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nlen).toString(); const start = i + 30 + nlen + xlen;
    fs.writeFileSync(path.join(dir, name), buf.slice(start, start + size)); out.push(name); i = start + size;
  }
  return out;
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `director-${name}.png`) }); };

test('Director: quiosco montado con la interfaz → Play → guardar → publicar → la pieza funciona', { timeout: 240000 }, async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const srv = await serve(process.cwd()); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    let promptAnswer = '';
    page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(promptAnswer) : d.accept()));
    await page.goto(`${base}/studio.html`); await page.waitForFunction(() => window.ainDirector && window.ainXPL);
    const menu = async (cls, item) => { await page.click(`${cls} > .menu-button`); await page.click(item); await page.waitForTimeout(150); };
    const archivo = async (item) => { await page.click('[data-member-menu]'); await page.click(item); await page.waitForTimeout(200); };

    // 1 · proyecto nuevo, Stage vertical de tótem, Carta de ejemplo
    await archivo('[data-file-new]');
    await page.click('[data-dk-stage-size]'); await page.click('[data-dk-size="1080x1920"]');
    await menu('.dk-carta', '[data-dk-menu-sample]'); await page.waitForTimeout(400);
    // 2 · pantallas (marcas) y sprites, todo desde Insertar + Inspector
    const screen = async (name) => { promptAnswer = name; await menu('.dk-insert', '[data-dk-new-screen]'); await page.waitForTimeout(250); };
    const prop = async (k, v) => { const f = page.locator(`.dk-inspector [data-k="${k}"]`); await f.fill(String(v)); await f.press('Tab'); await page.waitForTimeout(120); };
    await screen('INICIO');
    await menu('.dk-insert', '[data-dk-insert-button]'); await prop('texts.es', 'Toca para empezar'); await prop('texts.en', 'Toca para empezar'); await prop('spriteName', 'btnEmpezar'); await prop('y', 60);
    const views = [['CATEGORIAS', 'categories', 'carta'], ['PRODUCTOS', 'items', 'productos'], ['OPCIONES', 'options', 'opciones'], ['CARRITO', 'cart', 'carrito'], ['PAGO', 'qr', 'pago'], ['NUMERO', 'number', 'numero']];
    for (const [mark, view, sprite] of views) { await screen(mark); await menu('.dk-insert', `[data-dk-insert-${view}]`); await prop('spriteName', sprite); }
    await shot(page, '1-stage-sprites');
    const built = await page.evaluate(() => ({ items: currentPlan().stageItems.map((i) => i.spriteName), marks: loadTimelineMarkers(240).map((m) => `${m.label}@${m.frame}`), stage: currentPlan().stage, menu: !!currentPlan().menu }));
    assert.deepEqual(built.items, ['btnEmpezar', 'carta', 'productos', 'opciones', 'carrito', 'pago', 'numero']);
    assert.deepEqual(built.marks, ['INICIO@1', 'CATEGORIAS@25', 'PRODUCTOS@49', 'OPCIONES@73', 'CARRITO@97', 'PAGO@121', 'NUMERO@145']);
    assert.deepEqual(built.stage, { w: 1080, h: 1920 }); assert.ok(built.menu);

    // 3 · comportamientos con la ventana Behaviour (CUANDO → ENTONCES)
    await page.click('.window-menu > .menu-button'); await page.click('.window-menu-list [data-open-window="script"]');
    const card = () => page.locator('.script-window .xpl-rule').last();
    const condRow = (i) => card().locator('.xpl-block').nth(0).locator('.xpl-row').nth(i);
    const actRow = (i) => card().locator('.xpl-block').nth(1).locator('.xpl-row').nth(i);
    async function rule(conds, actions) {
      await page.click('.script-window .xpl-add.primary'); await page.waitForTimeout(120);
      for (let i = 0; i < conds.length; i += 1) {
        const [fact, a, b] = conds[i];
        if (i) { await card().locator('.xpl-block').nth(0).locator('.xpl-add').click(); }
        await condRow(i).locator('select').nth(0).selectOption(fact);
        if (fact === 'click' || fact === 'markerReached') await condRow(i).locator('select').nth(1).selectOption(a);
        if (fact === 'idleSeconds') { await condRow(i).locator('select').nth(1).selectOption(a); const n = condRow(i).locator('input[type=number]'); await n.fill(String(b)); await n.press('Tab'); }
      }
      for (let i = 0; i < actions.length; i += 1) {
        const [id, v] = actions[i];
        if (i) await card().locator('.xpl-block').nth(1).locator('.xpl-add').click();
        await actRow(i).locator('select').nth(0).selectOption(id);
        if (v) await actRow(i).locator('select').nth(1).selectOption(v);
      }
    }
    const go = (m) => [['goToMarker', m], ['stop']];
    await rule([['markerReached', 'CATEGORIAS']], [['goToMarker', 'INICIO']]);
    await rule([['click', 'btnEmpezar']], go('CATEGORIAS'));
    await rule([['click', 'carta']], go('PRODUCTOS'));
    await rule([['click', 'productos']], go('OPCIONES'));
    await rule([['click', 'opciones']], go('CARRITO'));
    await rule([['click', 'carrito']], go('PAGO'));
    await rule([['orderPaid']], go('NUMERO'));
    await rule([['idleSeconds', '>', 12]], [['clearCart'], ['goToMarker', 'INICIO']]);
    await shot(page, '2-behaviour');
    const rules = await page.evaluate(() => currentPlan().rules.map((r) => window.XPL.ruleSentence(r, 'es')));
    assert.equal(rules.length, 8, rules.join('\n'));

    // 4 · guardar en el navegador y exportar el proyecto (.json), y volver a abrirlo
    promptAnswer = 'Quiosco montado a mano'; await archivo('[data-project-save]');
    const [dl] = await Promise.all([page.waitForEvent('download'), menu('.dk-plantillas', '[data-dk-export-project]')]);
    const projFile = path.join(os.tmpdir(), `proyecto-${Date.now()}.json`); await dl.saveAs(projFile);
    const proj = JSON.parse(fs.readFileSync(projFile, 'utf8'));
    assert.equal(proj.format, 'ainimation-project'); assert.equal(proj.plan.rules.length, 8); assert.equal(proj.plan.markers.length, 7); assert.ok(proj.plan.menu);
    await page.reload(); await page.waitForFunction(() => window.ainDirector);
    assert.equal(await page.evaluate(() => currentPlan().stageItems.length), 7, 'el Stage sobrevive a la recarga');
    await archivo('[data-file-new]');
    await page.setInputFiles('[data-project-open-input]', projFile); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => currentPlan().rules.length), 8, 'Abrir recupera reglas');
    assert.equal(await page.evaluate(() => loadTimelineMarkers(240).length), 7, 'Abrir recupera marcas');

    // 5 · Play (proyector) dentro del Studio
    await page.click('.control-menu > .menu-button'); await page.click('.control-menu-list [data-play-toggle]'); await page.waitForTimeout(800);
    const vis = () => page.evaluate(() => [...document.querySelectorAll('.dk-item')].filter((n) => !n.hidden).map((n) => n.dataset.dkType + ':' + ((n.dataset.ainkView || n.querySelector('[data-aink-view]')?.dataset.ainkView) || n.textContent.trim().slice(0, 20))).join('|'));
    await page.click('.dk-item >> text=Toca para empezar'); await page.waitForTimeout(500);
    assert.match(await vis(), /categories/);
    await page.click('.dk-item [data-aink=cat] >> nth=0'); await page.waitForTimeout(500);
    await page.click('.dk-item [data-aink=item] >> nth=0'); await page.waitForTimeout(500);
    await page.click('.dk-item [data-aink=opt] >> text=Venti'); await shot(page, '3-play-opciones');
    await page.click('.dk-item [data-aink=add]'); await page.waitForTimeout(500);
    assert.match(await vis(), /cart/); await page.click('.dk-item [data-aink=pay]'); await page.waitForTimeout(600);
    await page.click('.dk-item [data-aink=counter]'); await page.waitForTimeout(700);
    assert.match(await vis(), /number/); await shot(page, '4-play-numero');
    await page.keyboard.press('Escape');

    // 6 · Publicar Xperiencia → zip → la pieza publicada corre sola
    const [zipDl] = await Promise.all([page.waitForEvent('download'), (async () => {
      await archivo('[data-publish-xperiencia]'); await page.fill('.xp-pub form [name=nombre], form [name=nombre]', 'Quiosco montado a mano'); await page.click('form .xp-pub-ok');
    })()]);
    const outDir = path.join(process.cwd(), 'tmp-publicada'); fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir);
    const zp = path.join(outDir, 'p.zip'); await zipDl.saveAs(zp);
    const files = unzipStore(fs.readFileSync(zp), outDir);
    assert.deepEqual(files.sort(), ['index.html', 'menu.json', 'plan.json', 'rules.json']);
    const pub = await ctx.newPage(); const perr = []; pub.on('pageerror', (e) => perr.push(String(e)));
    await pub.setViewportSize({ width: 540, height: 960 });
    await pub.goto(`${base}/tmp-publicada/index.html?lang=es`); await pub.waitForTimeout(1200);
    await shot(pub, '5-publicada-inicio');
    await pub.click('text=Toca para empezar'); await pub.waitForTimeout(900);
    await pub.click('[data-aink=cat] >> nth=1'); await pub.waitForTimeout(900);
    await pub.click('[data-aink=item] >> nth=0'); await pub.waitForTimeout(900);
    await pub.click('[data-aink=add]'); await pub.waitForTimeout(900);
    await pub.click('[data-aink=pay]'); await pub.waitForTimeout(800);
    await shot(pub, '6-publicada-qr');
    assert.ok(await pub.locator('.aink-qrbox img, .aink-qrbox canvas').count() > 0, 'hay QR');
    await pub.click('[data-aink=qr]'); await pub.waitForTimeout(2500);
    const pay = pub.frames().find((f) => /pago-simulado/.test(f.url()));
    if (pay) { await pay.click('#pay'); } else { await pub.click('[data-aink=counter]'); }
    await pub.waitForTimeout(1500);
    const num = await pub.locator('.aink-num b').textContent();
    assert.match(num, /^A\d{3}$/); await shot(pub, '7-publicada-numero');
    const ev = await pub.evaluate(() => (window.__xpEvents || []).map((e) => e.event + ':' + (e.status || '')));
    assert.ok(ev.some((e) => e.startsWith('order:')), ev.join());
    await pub.waitForTimeout(13500);
    assert.equal(await pub.evaluate(() => document.querySelectorAll('[data-kiosk]:not([style*="display: none"])').length), 0, 'a los 12 s vuelve al inicio');
    assert.deepEqual(perr, []); assert.deepEqual(errors, []);
    fs.rmSync(outDir, { recursive: true, force: true });
  } finally { await browser.close(); srv.close(); }
});
