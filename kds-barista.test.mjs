// KDS de barra (cola/barista.html, Carlos 7-oct-2026): comandas con líneas, botones grandes y cola cerrada.
// node --test kds-barista.test.mjs — E2E con Playwright contra el relé SIMULADO: las peticiones a
// mcp-ainimation.admira.store las responde manejar() del worker con un Durable Object en memoria
// (nunca sale a la cola de producción). KDS_CAPTURAS=<dir> guarda capturas a 1440 y a tamaño iPad.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(raiz, 'cola/barista.html'), 'utf8');
const LATTE = { id: 'caffe-latte', name: 'Caffè Latte', qty: 2, options: { tamano: 'venti', leche: 'avena', temperatura: 'extra-caliente', extras: ['shot'] }, optionsText: 'Venti · Avena · Extra caliente · Shot extra de espresso' };
const COOKIE = { id: 'cookie-chocolate', name: 'Cookie de chocolate', qty: 1, options: {} };
// Sin optionsText: el KDS compone el texto con las etiquetas de la carta a partir de los ids.
const FRAPPE = { id: 'caramel-frappuccino', name: 'Caramel Frappuccino', qty: 1, options: { tamano: 'grande', leche: 'sin-lactosa', extras: ['nata', 'caramelo'] } };
const CERRADA = { COLA_KIOSKO_KEY: 'kiosko-e2e', COLA_BARRA_KEY: 'barra-e2e' };

test('barista.html: contrato estático (clave por cabecera, botones del KDS, bilingüe, sin innerHTML sin escapar)', () => {
  assert.match(html, /x-cola-clave/); assert.match(html, /\/cola\/comandas/);
  for (const a of ['preparando', 'listo', 'recogido']) assert.match(html, new RegExp(`b\\('${a}'`));
  assert.match(html, /bEnt:'Entregado'/); assert.match(html, /bEnt:'Handed over'/);
  assert.match(html, /min-height:64px/, 'botones táctiles grandes');
  assert.doesNotMatch(html, /relay\+'\/cola\/[a-z]+\?[^']*clave=/, 'la clave nunca va en la URL al relé');
});

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const srv = http.createServer((req, res) => {
    const p = path.join(raiz, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    if (!f.startsWith(raiz) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

test('E2E KDS: cola cerrada → pide clave → comandas con líneas por llegada → aviso de nueva → Preparando/Listo/Entregado', async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  let manejar, ColaTienda; try { ({ manejar } = await import('./mcp/server/src/index.js')); ({ ColaTienda } = await import('./mcp/server/src/cola.js')); } catch (e) { return t.skip('sin dependencias del worker (npm ci en mcp/server): ' + e.message); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const env = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) }, ...CERRADA };
  const rele = async (op, body, clave = CERRADA.COLA_KIOSKO_KEY) => (await manejar(new Request(`https://mcp-ainimation.admira.store/cola/${op}?store=sb-kds`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cola-clave': clave }, body: JSON.stringify(body) }), env)).json();
  const pedido = async (id, nombre, lines) => { await rele('pedido', { id, nombre, lines, total: 9 }); return rele('pagar', { id, via: 'qr' }); };
  const llamadas = [];
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}`;
  const capturas = process.env.KDS_CAPTURAS;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
      const q = route.request();
      if (!q.url().startsWith('https://mcp-ainimation.admira.store/')) return route.abort();
      const r = await manejar(new Request(q.url(), { method: q.method(), headers: q.headers(), body: ['GET', 'HEAD', 'OPTIONS'].includes(q.method()) ? undefined : q.postData() }), env);
      llamadas.push({ metodo: q.method(), url: q.url().replace(/^.*\/cola\//, ''), clave: q.headers()['x-cola-clave'] || null, status: r.status });
      return route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
    });
    await pedido('ped-kds-1', 'Ana María', [LATTE, COOKIE]);
    const page = await ctx.newPage();
    await page.goto(`${base}/cola/barista.html?store=sb-kds`);
    // 1) Cola cerrada y sin clave: el KDS no enseña comandas y pide la clave de barra.
    await page.waitForSelector('#clave.on'); assert.match(await page.textContent('#l'), /Falta la clave de barra/);
    assert.equal(await page.locator('article.c').count(), 0);
    await page.fill('#claveI', 'clave-mala'); await page.click('#claveOk');
    await page.waitForFunction(() => document.querySelector('#clave.on') && /Falta la clave/.test(document.querySelector('#l').textContent));
    await page.fill('#claveI', CERRADA.COLA_BARRA_KEY); await page.click('#claveOk');
    // 2) Con la clave: la comanda con número, nombre completo, hora, espera y líneas.
    const a1 = page.locator('article[data-numero="A001"]'); await a1.waitFor();
    assert.match(await a1.textContent(), /Ana María/);
    assert.match(await a1.locator('li').first().textContent(), /2×\s*Caffè Latte\s*Venti · Avena · Extra caliente · Shot extra de espresso/);
    assert.match(await a1.locator('li').nth(1).textContent(), /1×\s*Cookie de chocolate/);
    assert.match(await a1.locator('.meta').textContent(), /🕑 \d{2}:\d{2}.*espera \d+:\d{2}/);
    assert.equal(await page.evaluate(() => localStorage.getItem('cola:barra:sb-kds')), CERRADA.COLA_BARRA_KEY);
    assert.ok(llamadas.some((l) => l.url.startsWith('comandas') && l.clave === CERRADA.COLA_BARRA_KEY && l.status === 200), 'la clave va en x-cola-clave');
    assert.ok(llamadas.every((l) => !/clave=/.test(l.url)), 'nunca en la URL');
    // 3) Llega una comanda nueva: tarjeta resaltada, aviso visible y «ding»; orden por llegada.
    await pedido('ped-kds-2', 'Luis', [FRAPPE]);
    await page.waitForFunction(() => window.__kds.nuevas.includes('A002'), null, { timeout: 8000 });
    assert.ok(await page.locator('article[data-numero="A002"].nueva').count()); assert.match(await page.textContent('#nueva'), /Nueva comanda · A002 Luis/);
    assert.ok(await page.evaluate(() => window.__kds.sonidos) >= 1);
    assert.deepEqual(await page.locator('article.c').evaluateAll((l) => l.map((e) => e.dataset.numero)), ['A001', 'A002']);
    await page.waitForFunction(() => /Grande · Sin lactosa · Nata montada · Sirope de caramelo/.test(document.querySelector('article[data-numero="A002"]').textContent));
    if (capturas) { fs.mkdirSync(capturas, { recursive: true }); await page.waitForTimeout(400); await page.screenshot({ path: path.join(capturas, 'kds-barista-1440.png'), fullPage: true }); }
    // 4) Botones grandes: Preparando → Listo → Entregado (sale de la barra).
    const alto = await a1.locator('button[data-a="listo"]').evaluate((b) => b.getBoundingClientRect().height); assert.ok(alto >= 64, 'botón táctil ≥ 64 px');
    await a1.locator('button[data-a="preparando"]').click();
    await page.waitForSelector('article[data-numero="A001"].preparando'); assert.equal(await a1.locator('button[data-a="preparando"]').getAttribute('aria-pressed'), 'true');
    await a1.locator('button[data-a="listo"]').click(); await page.waitForSelector('article[data-numero="A001"].listo');
    assert.equal((await rele('estado', {}, CERRADA.COLA_BARRA_KEY)).listo[0].numero, 'A001');
    await a1.locator('button[data-a="recogido"]').click(); await page.waitForSelector('article[data-numero="A001"]', { state: 'detached' });
    assert.ok(llamadas.filter((l) => l.url.startsWith('avanzar')).every((l) => l.status === 200 && l.clave === CERRADA.COLA_BARRA_KEY));
    // 5) Bilingüe.
    await page.click('#bLang'); assert.match(await page.textContent('h1'), /Counter · orders/); assert.match(await page.textContent('article[data-numero="A002"]'), /Handed over/);
    await page.click('#bLang');
    // 6) Capturas a tamaño iPad (horizontal 1180×820 y 1024×768) con varias comandas.
    if (capturas) {
      await pedido('ped-kds-3', 'Marta', [{ ...LATTE, qty: 1 }, { id: 'te-chai', name: 'Chai Tea Latte', qty: 1, options: { tamano: 'alto', leche: 'soja' } }]);
      await pedido('ped-kds-4', 'Jordi', [{ ...COOKIE, qty: 3 }]);
      await page.waitForFunction(() => document.querySelectorAll('article.c').length >= 3);
      await page.locator('article[data-numero="A002"] button[data-a="preparando"]').click(); await page.waitForSelector('article[data-numero="A002"].preparando');
      for (const [w, h] of [[1180, 820], [1024, 768]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700); await page.screenshot({ path: path.join(capturas, `kds-barista-ipad-${w}x${h}.png`) }); }
    }
    // 7) Sin clave de nuevo («Olvidar»): vuelve a pedirla.
    await page.click('#bClave'); await page.click('#claveX'); await page.waitForFunction(() => /Falta la clave/.test(document.querySelector('#l').textContent));
  } finally { await browser.close(); srv.close(); }
});

test('E2E KDS: cola abierta (sin secretos) funciona sin clave y avisa de que está abierta', async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin playwright'); }
  let manejar, ColaTienda; try { ({ manejar } = await import('./mcp/server/src/index.js')); ({ ColaTienda } = await import('./mcp/server/src/cola.js')); } catch (e) { return t.skip('sin dependencias del worker'); }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  let browser; try { browser = await chromium.launch(exe ? { executablePath: exe } : {}); } catch { return t.skip('sin navegador'); }
  const mem = new Map(); const obj = new ColaTienda({ storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } });
  const env = { COLA: { idFromName: (n) => n, get: () => ({ fetch: (r) => obj.fetch(r) }) } };
  await manejar(new Request('https://mcp-ainimation.admira.store/cola/pedido?store=sb-abierta', { method: 'POST', body: JSON.stringify({ id: 'ped-ab-1', nombre: 'Eva', lines: [LATTE] }) }), env);
  await manejar(new Request('https://mcp-ainimation.admira.store/cola/pagar?store=sb-abierta', { method: 'POST', body: JSON.stringify({ id: 'ped-ab-1' }) }), env);
  const srv = await serve();
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => { const q = route.request(); if (!q.url().startsWith('https://mcp-ainimation.admira.store/')) return route.abort(); const r = await manejar(new Request(q.url(), { method: q.method(), headers: q.headers(), body: ['GET', 'HEAD', 'OPTIONS'].includes(q.method()) ? undefined : q.postData() }), env); return route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() }); });
    await page.goto(`http://127.0.0.1:${srv.address().port}/cola/barista.html?store=sb-abierta&lang=en`);
    await page.waitForSelector('article[data-numero="A001"]'); assert.match(await page.textContent('article[data-numero="A001"]'), /Eva/);
    await page.waitForSelector('.warn.abierta'); assert.match(await page.textContent('#w'), /Queue OPEN/);
    await page.click('article[data-numero="A001"] button[data-a="listo"]'); await page.waitForSelector('article[data-numero="A001"].listo');
  } finally { await browser.close(); srv.close(); }
});
