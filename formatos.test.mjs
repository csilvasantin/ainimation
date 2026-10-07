// Formatos (Carlos, 7-oct-2026): el quiosco refluye a 9:16, 16:9, cuadrado y tótems raros; el Director
// tiene presets de los players del gemelo y una Vista responsive con fit/fill. node --test formatos.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css', '.png': 'image/png' };
const serve = () => new Promise((r) => { const s = http.createServer((q, res) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p; if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); });
async function browser(t) {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { t.skip('sin playwright'); return null; }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); } catch { t.skip('sin navegador'); return null; }
}

test('el quiosco refluye: lado corto 1080, sin bandas, y reorganiza la atracción en horizontal', { timeout: 90000 }, async (t) => {
  const b = await browser(t); if (!b) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    for (const [w, h, fmt, sw, sh] of [[540, 960, 'vertical', 1080, 1920], [1280, 720, 'horizontal', 1920, 1080], [800, 800, 'cuadrado', 1080, 1080], [400, 900, 'vertical', 1080, 2430]]) {
      const p = await b.newPage({ viewport: { width: w, height: h } });
      await p.goto(`${base}/xperiencias/kiosko-pedido/?store=starbucks-qa&formato=x&w=${w}&h=${h}`);
      await p.waitForFunction(() => window.__kioskReady);
      const f = await p.evaluate(() => window.__kioskFormato);
      assert.equal(f.formato, fmt); assert.equal(f.w, sw); assert.equal(f.h, sh);
      const box = await p.locator('#stage').boundingBox();
      assert.ok(Math.abs(box.width - w) < 2 && Math.abs(box.height - h) < 2, `${w}x${h}: llena el player (${box.width}x${box.height})`);
      if (fmt !== 'vertical') assert.equal(await p.$eval('#s-attract', (n) => getComputedStyle(n).display), 'grid');
      await p.click('#s-attract'); await p.click('[data-item="caffe-latte"]'); await p.click('#addBtn');
      assert.equal((await p.$$('#lines .line')).length, 1, `${fmt}: se puede pedir`);
      await p.close();
    }
  } finally { await b.close(); srv.close(); }
});

test('Director: presets de players del gemelo y Vista responsive fit/fill', { timeout: 120000 }, async (t) => {
  const b = await browser(t); if (!b) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }); p.on('dialog', (d) => d.accept());
    await p.goto(`${base}/studio.html?plantilla=quiosco`);
    await p.waitForFunction(() => window.ainDirector?.responsivePreview && window.currentPlan?.()?.template === 'quiosco-de-pedidos', null, { timeout: 30000 });
    const sizes = await p.evaluate(() => window.ainDirector.PRESETS.map((x) => `${x.w}x${x.h}`));
    for (const s of ['800x1800', '1280x800', '1024x768', '1080x1920', '1920x1080', '1080x1080']) assert.ok(sizes.includes(s), s);
    await p.click('[data-dk-stage-size]'); await p.click('[data-dk-responsive]');
    await p.waitForSelector('.dk-responsive [data-dk-format="Tótem 4:9"] iframe');
    await p.waitForTimeout(1500);
    const frames = await p.$$eval('.dk-resp-grid iframe', (fs) => fs.map((f) => [f.style.width, f.style.height, f.contentWindow.XP_FORMATO && f.contentWindow.XP_FORMATO.ajuste]));
    assert.equal(frames.length, 4); assert.ok(frames.every((f) => f[2] === 'fit'), JSON.stringify(frames));
    if (process.env.FORMATOS_SHOTS) await p.screenshot({ path: process.env.FORMATOS_SHOTS + '/formatos-director-responsive.png' });
    await p.check('.dk-responsive input[value=fill]'); await p.waitForTimeout(1500);
    assert.ok((await p.$$eval('.dk-resp-grid iframe', (fs) => fs.map((f) => f.contentWindow.XP_FORMATO?.ajuste))).every((a) => a === 'fill'));
  } finally { await b.close(); srv.close(); }
});
