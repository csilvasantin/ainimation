// Quiosco de pedido (xperiencias/kiosko-pedido): contrato estático + recorrido E2E en navegador.
// node --test kiosko-pedido.test.mjs   (el E2E se salta si no hay Chrome/Chromium para Playwright)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const dir = 'xperiencias/kiosko-pedido';
const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const pago = fs.readFileSync(`${dir}/pago-simulado.html`, 'utf8');
const menu = JSON.parse(fs.readFileSync(`${dir}/menu.starbucks.json`, 'utf8'));
const schema = JSON.parse(fs.readFileSync(`${dir}/menu.schema.json`, 'utf8'));

test('la carta de ejemplo cumple lo básico del esquema y se anuncia como ejemplo', () => {
  for (const k of schema.required) assert.ok(menu[k], `falta ${k}`);
  assert.equal(menu.example, true);
  assert.match(menu.disclaimer.es, /EJEMPLO/); assert.equal(menu.orderFlow.mode, 'simulated');
  const cats = new Set(menu.categories.map((c) => c.id));
  for (const i of menu.items) {
    assert.ok(cats.has(i.category), `${i.id}: categoría inexistente`);
    assert.ok(fs.existsSync(path.join(dir, i.image)), `${i.id}: falta ${i.image}`);
    for (const g of i.optionGroups) assert.ok(['single', 'multi'].includes(g.type));
  }
});
test('nunca hay campos de tarjeta y el pago se dice simulado', () => {
  assert.doesNotMatch(html + pago, /\b(?:CVV|card number|número de tarjeta)\b|type="(?:tel|number)"[^>]*card/i);
  assert.match(pago, /PAGO SIMULADO/); assert.match(pago, /noindex/);
});
test('el quiosco habla con su anfitrión por postMessage (order · payment)', () => {
  assert.match(html, /source:"ainimation-xperiencia"/);
  assert.match(html, /host\("order"/); assert.match(html, /host\("payment"/);
  assert.match(html, /resetSeconds\|\|12/);
});

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const p = path.join(process.cwd(), decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, () => r(srv)));
}

test('E2E: atracción → producto con opciones → carrito → QR → pago simulado → número', async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    await page.goto(base + '?store=starbucks-qa');
    await page.waitForFunction(() => window.__kioskReady);
    await page.click('#s-attract');
    await page.click('[data-item="caffe-latte"]');
    await page.click('[data-opt="tamano|venti"]'); await page.click('[data-opt="leche|avena"]'); await page.click('[data-opt="extras|shot"]');
    assert.match(await page.textContent('#addBtn'), /5,[0-9]0/); // 3,60 + 0,80 + 0,50 + 0,70 = 5,60
    await page.click('#addBtn');
    await page.click('[data-up="cookie"]');
    assert.equal((await page.$$('#lines .line')).length, 2);
    await page.click('#toPay');
    await page.waitForSelector('#qr img', { state: 'attached' });
    const url = await page.getAttribute('#qr', 'data-url');
    assert.match(url, /pago-simulado\.html\?pedido=ped-/);
    await page.click('#qr');
    const frame = page.frameLocator('#payFrame');
    await frame.locator('#pay').click();
    await page.waitForSelector('#s-done.on');
    assert.match(await page.textContent('#orderNum'), /^A\d{3}$/);
    const ev = await page.evaluate(() => window.__kioskEvents.map((e) => e.event + ':' + (e.status || '')));
    assert.ok(ev.includes('payment:paid') && ev.includes('order:paid-simulated'), ev.join());
  } finally { await browser.close(); srv.close(); }
});

// Gestor de colas (7-oct-2026): la vigilancia del pago pide /cola/pedido?store=…&id=… (no un segundo «?»).
test('cola: el quiosco consulta el relé con una URL bien formada', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('./xperiencias/kiosko-pedido/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /colaApi\("[a-z]+\?/);
  assert.match(src, /colaApi\("pedido",null,"&id="/);
});
