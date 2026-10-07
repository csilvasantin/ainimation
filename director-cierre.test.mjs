// Director · cierre de huecos (Carlos, 7-oct-2026): tramo de texto/formas en el Stage,
// keyframes en botones/quiosco, Property Inspector para todo sprite, idioma de la plantilla.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const SHOTS = process.env.DIRECTOR_SHOTS || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css' };
const serve = (root) => new Promise((r) => { const s = http.createServer((q, res) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
function unzipStore(buf, dir) { let i = 0; while (buf.readUInt32LE(i) === 0x04034b50) { const size = buf.readUInt32LE(i + 18), n = buf.readUInt16LE(i + 26), x = buf.readUInt16LE(i + 28); const name = buf.slice(i + 30, i + 30 + n).toString(); const st = i + 30 + n + x; fs.writeFileSync(path.join(dir, name), buf.slice(st, st + size)); i = st + size; } }

test('Director: tramo, keyframes, Inspector universal e idioma publicado', { timeout: 180000 }, async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const srv = await serve(process.cwd()); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('dialog', (d) => d.accept());
    await page.goto(`${base}/studio.html`); await page.waitForFunction(() => window.ainDirector && window.ainTransport);
    await page.click('[data-member-menu]'); await page.click('[data-file-new]'); await page.waitForTimeout(300);
    // 1 · texto y forma respetan su tramo en el Stage
    await page.evaluate(() => { const p = currentPlan(); p.stageItems = [
      { id: 'forma1', type: 'rect-fill', x: 10, y: 10, w: 20, h: 20, color: '#ff0000', startFrame: 1, durationFrames: 10 },
      { id: 'texto1', type: 'text', x: 10, y: 60, text: 'Hola', color: '#ffffff', startFrame: 20, durationFrames: 10 }]; p.totalFrames = 60; saveFilmPlan(p); renderFilmPlan(p); });
    const shown = (id) => page.evaluate((i) => { const n = document.querySelector(`.stage-item[data-stage-item-id="${i}"]`); return !!n && getComputedStyle(n).display !== 'none'; }, id);
    await page.evaluate(() => window.ainTransport.setFrame(5)); await page.waitForTimeout(200);
    assert.equal(await shown('forma1'), true); assert.equal(await shown('texto1'), false, 'texto fuera de tramo oculto');
    await page.evaluate(() => window.ainTransport.setFrame(25)); await page.waitForTimeout(200);
    assert.equal(await shown('forma1'), false, 'forma fuera de tramo oculta'); assert.equal(await shown('texto1'), true);
    // 2 · Property Inspector para una forma (clic en el Stage) → cambia color
    await page.click('.stage-item[data-stage-item-id="texto1"]', { force: true }); await page.waitForTimeout(400);
    assert.match(await page.locator('.dk-inspector').innerText(), /Text|Texto/);
    await page.evaluate(() => window.ainTransport.setFrame(5)); await page.waitForTimeout(150);
    await page.click('.stage-item[data-stage-item-id="forma1"]', { force: true }); await page.waitForTimeout(400);
    assert.match(await page.locator('.dk-inspector').innerText(), /rectangle|Rectángulo/i);
    const col = page.locator('.dk-inspector [data-k="color"]'); await col.fill('#00ff00'); await col.press('Tab'); await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => currentPlan().stageItems.find((i) => i.id === 'forma1').color), '#00ff00');
    await page.locator('.dk-inspector [data-k="durationFrames"]').fill('40'); await page.locator('.dk-inspector [data-k="durationFrames"]').press('Tab'); await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => currentPlan().stageItems.find((i) => i.id === 'forma1').durationFrames), 40);
    await page.screenshot({ path: SHOTS ? path.join(SHOTS, 'director-11-inspector-forma.png') : '/dev/null' });
    // 3 · botón con keyframes: ◆ en el 1, x=60 en el 21 → a mitad camino en el 11
    await page.evaluate(() => window.ainTransport.setFrame(1)); await page.waitForTimeout(150);
    await page.click('.dk-insert > .menu-button'); await page.click('[data-dk-insert-button]'); await page.waitForTimeout(250);
    await page.locator('.dk-inspector [data-k="durationFrames"]').fill('30'); await page.locator('.dk-inspector [data-k="durationFrames"]').press('Tab'); await page.waitForTimeout(200);
    const x0 = await page.evaluate(() => currentPlan().stageItems.at(-1).x);
    await page.click('.dk-inspector [data-kf-add]'); await page.waitForTimeout(200);
    await page.evaluate(() => window.ainTransport.setFrame(21)); await page.waitForTimeout(400);
    const xi = page.locator('.dk-inspector [data-k="x"]'); await xi.fill('60'); await xi.press('Tab'); await page.waitForTimeout(300);
    const kfs = await page.evaluate(() => currentPlan().stageItems.at(-1).keyframes.map((k) => [k.frame, Math.round(k.x)]));
    assert.deepEqual(kfs, [[1, Math.round(x0)], [21, 60]]);
    await page.evaluate(() => window.ainTransport.setFrame(11)); await page.waitForTimeout(400);
    const left = await page.evaluate(() => parseFloat(document.querySelector('.dk-item[data-dk-type=button]').style.left));
    assert.ok(Math.abs(left - (x0 + 60) / 2) < 3, `interpolado ${left}`);
    await page.screenshot({ path: SHOTS ? path.join(SHOTS, 'director-12-keyframes-boton.png') : '/dev/null' });
    // 4 · plantilla publicada sigue ?lang=es/en
    await page.click('.dk-plantillas > .menu-button'); await page.click('[data-dk-template-kiosk]'); await page.waitForTimeout(1200);
    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('[data-member-menu]'); await page.click('[data-publish-xperiencia]'); await page.fill('form [name=nombre]', 'Quiosco idiomas'); await page.click('form .xp-pub-ok'); })()]);
    const out = path.join(process.cwd(), 'tmp-idiomas'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out); const zp = path.join(out, 'p.zip'); await dl.saveAs(zp); unzipStore(fs.readFileSync(zp), out);
    for (const [lg, txt, cat] of [['es', 'Toca para empezar', /Cafés|calientes/i], ['en', 'Touch to start', /coffee|Hot/i]]) {
      const pub = await ctx.newPage(); await pub.setViewportSize({ width: 540, height: 960 }); const perr = []; pub.on('pageerror', (e) => perr.push(String(e)));
      await pub.goto(`${base}/tmp-idiomas/index.html?lang=${lg}`); await pub.waitForTimeout(1200);
      assert.ok(await pub.locator(`.xp-hot >> text=${txt}`).count(), `${lg}: ${txt}`);
      await pub.click('.xp-hot >> nth=0'); await pub.waitForTimeout(600);
      assert.match(await pub.locator('[data-aink=cat] >> nth=0').innerText(), cat);
      if (SHOTS) await pub.screenshot({ path: path.join(SHOTS, `director-13-publicada-${lg}.png`) });
      assert.deepEqual(perr, []); await pub.close();
    }
    fs.rmSync(out, { recursive: true, force: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});
