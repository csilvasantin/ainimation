// Xperiencia «Vuelta al 95» desde Admira Director · prueba de punta a punta (DeepAgent Neo, 25-nov-2026).
// Chromium headless (Playwright) con el código real de los dos repos: www.ainimation.studio se sirve desde este
// checkout y www.admira.live desde el checkout del repo 32.-ConsejoAdmiraNextGame; la API /api/win95/ajuste la
// atiende su función real con un KV en memoria y una sesión de Google firmada. Orígenes, window.open/opener y
// postMessage van tal cual en producción. Se salta si no hay navegador o no está el otro checkout
// (ADMIRA_LIVE_DIR lo fija; por defecto se buscan ~/Claude/32.-ConsejoAdmiraNextGame y ~/Claude/wt-win95-director).
// node --test director-xperiencia.test.mjs   · XPERIENCIA_SHOTS=<carpeta> guarda capturas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AIN = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.XPERIENCIA_SHOTS || '';
const candidatos = [process.env.ADMIRA_LIVE_DIR, path.join(os.homedir(), 'Claude/32.-ConsejoAdmiraNextGame'), path.join(os.homedir(), 'Claude/wt-win95-director')].filter(Boolean);
const LIVE = candidatos.find((d) => fs.existsSync(path.join(d, 'windows95/index.html')) && fs.existsSync(path.join(d, 'functions/api/win95/ajuste.js')));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.gif': 'image/gif', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
function serveFile(root, pathname) {
  let p = path.join(root, decodeURIComponent(pathname));
  if (!p.startsWith(root)) return null;
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) return null;
  return { body: fs.readFileSync(p), contentType: types[path.extname(p)] || 'application/octet-stream' };
}
const nombreReproductor = (page) => page.evaluate(() => document.querySelector('#ampName').textContent.trim());
const esperarArranque = (page) => page.waitForFunction(() => (document.querySelector('#ampName')?.textContent || '').trim().length > 0, null, { timeout: 20000 });

test('Director ↔ Vuelta al 95: abrir, esquema, aplicar, guardar, arrancar con el ajuste y volver a fábrica', async (t) => {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { return t.skip('sin Playwright'); }
  if (!LIVE) return t.skip('sin el checkout de admira.live (ADMIRA_LIVE_DIR)');
  const api = await import(pathToFileURL(path.join(LIVE, 'functions/api/win95/ajuste.js')).href);
  const { emitirSesion, COOKIE_SESION } = await import(pathToFileURL(path.join(LIVE, 'chat-hilo-lib.mjs')).href);
  const kv = new Map();
  const env = { CHAT_KV: { async get(k) { return kv.get(k) ?? null; }, async put(k, v) { kv.set(k, v); }, async delete(k) { kv.delete(k); } }, PUERTA_FIRMA: 'z'.repeat(48), CONSUMOS_LECTURAS_TOKEN: 'x'.repeat(32) };
  const cookie = COOKIE_SESION + '=' + (await emitirSesion(env, 'csilva@admira.com')).valor;
  const llamadas = [];
  let browser;
  try { browser = await chromium.launch(); } catch (e) { return t.skip('sin navegador: ' + e.message); }
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.route('**/*', async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.hostname === 'www.ainimation.studio') {
        const f = serveFile(AIN, u.pathname === '/' ? '/index.html' : u.pathname);
        return f ? route.fulfill(f) : route.fulfill({ status: 404, body: '' });
      }
      if (u.hostname === 'www.admira.live') {
        if (u.pathname === '/api/win95/ajuste') {
          const h = req.headers();
          const r = new Request(req.url(), { method: req.method(), headers: { cookie, origin: h.origin || '', 'content-type': h['content-type'] || '' }, body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() || '' });
          const fn = { GET: api.onRequestGet, PUT: api.onRequestPut, POST: api.onRequestPost, DELETE: api.onRequestDelete }[req.method()];
          const res = await fn({ request: r, env });
          llamadas.push(req.method() + ' ' + res.status);
          return route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
        }
        if (u.pathname === '/auth-gate.js' || u.pathname === '/windows95/admira_api_content.js') return route.fulfill({ contentType: 'text/javascript', body: '' });
        if (u.pathname === '/windows95' || u.pathname === '/windows95/') return route.fulfill(serveFile(LIVE, '/windows95/index.html'));
        const f = serveFile(LIVE, u.pathname);
        return f ? route.fulfill(f) : route.fulfill({ status: 404, body: '' });
      }
      return route.abort();
    });
    const errores = [];
    const director = await context.newPage();
    director.on('pageerror', (e) => errores.push('director: ' + e.message));
    await director.goto('https://www.ainimation.studio/studio.html?enter=1', { waitUntil: 'domcontentloaded' });
    await director.waitForSelector('[data-window="xperiencia"] .xp-head .button', { state: 'attached', timeout: 20000 });
    await director.waitForTimeout(1500);
    if (await director.evaluate(() => document.body.classList.contains('director-focus'))) await director.click('[data-director-interface-toggle]');
    await director.evaluate(() => { const w = document.querySelector('[data-window="xperiencia"]'); w.classList.remove('is-hidden', 'is-minimized'); w.scrollIntoView(); });
    await director.waitForSelector('[data-window="xperiencia"] .xp-head .button', { state: 'visible', timeout: 8000 });

    // 1 · abrir: ventana propia con director=1 y el origen del Director
    const [popup] = await Promise.all([context.waitForEvent('page'), director.click('[data-window="xperiencia"] .xp-head .button')]);
    popup.on('pageerror', (e) => errores.push('95: ' + e.message));
    await popup.waitForLoadState('domcontentloaded');
    const abierta = new URL(popup.url());
    assert.equal(abierta.origin + abierta.pathname.replace(/\/$/, ''), 'https://www.admira.live/windows95');
    assert.equal(abierta.searchParams.get('director'), '1');
    assert.equal(abierta.searchParams.get('origen'), 'https://www.ainimation.studio');

    // 2 · esquema → formulario
    await director.waitForSelector('.xp-form:not([hidden])', { timeout: 20000 });
    const grupos = await director.$$eval('.xp-group summary', (ss) => ss.map((s) => s.textContent));
    assert.equal(grupos.length, 5, grupos.join('|'));
    assert.match(await director.textContent('.xp-status'), /fábrica|factory/i);
    if (SHOTS) await director.screenshot({ path: path.join(SHOTS, 'xperiencia-1-director.png') });

    // 3 · aplicar: el 95 se reinicia con el borrador, nada guardado
    await esperarArranque(popup);
    assert.equal(await nombreReproductor(popup), 'WINAMP');
    await director.fill('[data-ruta="names.player"]', 'Winamp 2.95');
    await director.fill('[data-ruta="visitor"]', 'Carlos');
    await Promise.all([popup.waitForEvent('load'), director.click('.xp-foot button:nth-child(1)')]);
    await esperarArranque(popup);
    assert.equal(await nombreReproductor(popup), 'WINAMP 2.95');
    assert.equal(kv.size, 0, 'aplicar no guarda');
    await director.waitForSelector('.xp-form:not([hidden])', { timeout: 20000 });
    if (SHOTS) { await popup.waitForTimeout(4500); await popup.screenshot({ path: path.join(SHOTS, 'xperiencia-2-win95.png') }); }

    // 4 · guardar: PUT con la sesión de la página; un visitante nuevo arranca con el ajuste
    await Promise.all([popup.waitForEvent('load'), director.click('.xp-foot button:nth-child(2)')]);
    await director.waitForFunction(() => /Guardado en admira.live|Saved to admira.live/.test(document.querySelector('.xp-status').textContent), null, { timeout: 15000 });
    const guardado = JSON.parse(kv.get('win95:ajuste'));
    assert.equal(guardado.by, 'Carlos');
    assert.deepEqual(guardado.ajuste, { visitor: 'Carlos', names: { player: 'Winamp 2.95' } });
    const visitante = await context.newPage();
    await visitante.goto('https://www.admira.live/windows95', { waitUntil: 'domcontentloaded' });
    await esperarArranque(visitante);
    assert.equal(await nombreReproductor(visitante), 'WINAMP 2.95');
    await visitante.close();

    // 5 · valores de fábrica: DELETE y el 95 vuelve a lo suyo
    director.once('dialog', (d) => d.accept());
    await Promise.all([popup.waitForEvent('load'), director.click('.xp-foot button:nth-child(4)')]);
    await director.waitForFunction(() => /fábrica restaurados|Factory values restored/.test(document.querySelector('.xp-status').textContent), null, { timeout: 15000 });
    assert.equal(kv.size, 0);
    const visitante2 = await context.newPage();
    await visitante2.goto('https://www.admira.live/windows95', { waitUntil: 'domcontentloaded' });
    await esperarArranque(visitante2);
    assert.equal(await nombreReproductor(visitante2), 'WINAMP');

    assert.deepEqual(llamadas.filter((l) => !l.startsWith('GET')), ['PUT 200', 'DELETE 200']);
    assert.deepEqual(errores, []);
  } finally {
    await browser.close();
  }
});
