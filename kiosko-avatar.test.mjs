// Avatar en el quiosco (Carlos, 7-oct-2026): la conversación con el avatar rellena el pedido.
// node --test kiosko-avatar.test.mjs — unitarios (pedido-avatar.js) + E2E con una cara FALSA y una cola SIMULADA:
// nunca se llama al cerebro real (digitalavatar.ai) ni a la cola de producción.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = 'xperiencias/kiosko-pedido';
const KA = require(`./${dir}/pedido-avatar.js`);
const menu = JSON.parse(fs.readFileSync(`${dir}/menu.starbucks.json`, 'utf8'));
const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const pago = fs.readFileSync(`${dir}/pago-simulado.html`, 'utf8');
const STORE = 'starbucks-paseo-de-gracia';
const draft = (lines, extra = {}) => ({ type: 'order-draft', version: 1, store: STORE, lines, customerName: '', ready: false, missing: [], summary: '', ...extra });
const latte = { id: 'caffe-latte', qty: 1, options: { tamano: 'grande', leche: 'avena', temperatura: 'normal', extras: ['shot'] } };

// ── unitarios ──
test('borrador válido: el quiosco calcula el precio (ignora precios del avatar) y rellena el nombre', () => {
  const r = KA.validateDraft(menu, draft([{ ...latte, price: 0.01, unitPrice: 0.01 }, { id: 'croissant', qty: 2 }], { customerName: 'Carlos', ready: true }), { stores: [STORE] });
  assert.equal(r.ok, true); assert.equal(r.ready, true); assert.equal(r.customerName, 'Carlos');
  assert.equal(r.lines[0].unitPrice, 5.2); // 3,60 + 0,40 grande + 0,50 avena + 0,70 shot
  assert.equal(r.lines[1].unitPrice, 2.2); assert.equal(r.total, 9.6);
  assert.deepEqual(r.lines[0].options.map((o) => o.id), ['grande', 'avena', 'normal', 'shot']);
});
test('borrador: ids desconocidos, cantidades fuera de 1–10 y opciones que no están en la carta', () => {
  const r = KA.validateDraft(menu, draft([{ id: 'pizza', qty: 1 }, { id: 'americano', qty: 11 }, { id: 'americano', qty: 0 }, { id: 'americano', qty: 1.5 },
    { id: 'te-verde', qty: 10, options: { tamano: 'gigante', leche: 'avena' } }]), { stores: [STORE] });
  assert.equal(r.rejected.length, 4, r.rejected.join());
  assert.equal(r.lines.length, 1); assert.equal(r.lines[0].qty, 10);
  assert.equal(r.lines[0].options[0].id, 'grande', 'tamaño inventado → el de la carta por defecto');
  assert.ok(r.issues.some((i) => /gigante/.test(i)) && r.issues.some((i) => /leche/.test(i)));
  assert.equal(KA.validateDraft(menu, draft([latte], { ready: true, customerName: 'Ana' }), { stores: [STORE] }).ready, true);
  assert.equal(KA.validateDraft(menu, draft([latte, { id: 'pizza' }], { ready: true, customerName: 'Ana' }), { stores: [STORE] }).ready, false, 'con líneas descartadas no se confirma');
});
test('borrador: tienda distinta, tipo o versión erróneos, demasiadas líneas, extras con tope', () => {
  assert.equal(KA.validateDraft(menu, draft([latte], { store: 'otra-tienda' }), { stores: [STORE] }).ok, false);
  assert.equal(KA.validateDraft(menu, { ...draft([latte]), type: 'order' }).ok, false);
  assert.equal(KA.validateDraft(menu, { ...draft([latte]), version: 2 }).ok, false);
  assert.equal(KA.validateDraft(menu, null).ok, false);
  assert.equal(KA.validateDraft(menu, draft(Array.from({ length: 30 }, () => ({ id: 'cookie', qty: 1 })))).lines.length, KA.MAX_LINES);
  const e = KA.validateDraft(menu, draft([{ id: 'mocha', qty: 1, options: { extras: ['shot', 'vainilla', 'caramelo', 'nata', 'descafeinado', 'shot'] } }]));
  assert.equal(e.lines[0].options.filter((o) => o.group === 'extras').length, 4, 'extras.max = 4');
  const vacio = KA.validateDraft(menu, draft([], { missing: ['lines'] }));
  assert.equal(vacio.ok, true, 'lines:[] vacía el carrito a propósito'); assert.equal(vacio.ready, false);
});
test('ready: solo con missing vacío, nombre válido y líneas', () => {
  assert.equal(KA.validateDraft(menu, draft([latte], { ready: true, customerName: 'Carlos', missing: ['leche'] })).ready, false);
  assert.equal(KA.validateDraft(menu, draft([latte], { ready: true, customerName: 'C' })).ready, false);
  assert.equal(KA.validateDraft(menu, draft([], { ready: true, customerName: 'Carlos' })).ready, false);
  assert.deepEqual(KA.validateDraft(menu, draft([latte], { missing: ['customerName', 'x;<b>'] })).missing, ['customerName', 'xb']);
});
test('lo que falta por preguntar se marca en la línea («Leche ?») y cuenta como cambio', () => {
  const sin = KA.validateDraft(menu, draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'venti' } }], { missing: ['leche'] }));
  assert.deepEqual(sin.lines[0].pending, ['leche']); assert.equal(sin.lines[0].unitPrice, 4.4, 'precio con la leche por defecto mientras tanto');
  const con = KA.validateDraft(menu, draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'venti', leche: 'entera' } }]));
  assert.deepEqual(con.lines[0].pending, []); assert.deepEqual(KA.changedLines(sin.lines, con.lines), [0]);
});
test('nombre: misma regla que #custName del quiosco', () => {
  const src = html.slice(html.indexOf('function custName()'), html.indexOf('function colaCrear'));
  assert.match(src, /replace\(\/\[\^\\p\{L\} '\\-\]\/gu,""\)\.replace\(\/\\s\+\/g," "\)\.trim\(\)\.slice\(0,24\)/);
  assert.equal(KA.cleanName('  <b>Carlos</b> 123 '), 'bCarlosb');
  assert.equal(KA.cleanName("María-José O'Neil   de la Fuente y Más"), "María-José O'Neil de la ", 'como el quiosco: recorta a 24 tras limpiar');
  assert.equal(KA.validName('C1'), false); assert.equal(KA.validName('Jo'), true);
  assert.equal(KA.validateDraft(menu, draft([latte], { customerName: '<script>' })).customerName, 'script');
});
test('líneas para la cola: opciones legibles en castellano, ids de la carta y límites', () => {
  const r = KA.validateDraft(menu, draft([{ ...latte, qty: 2, options: { ...latte.options, extras: ['shot', 'vainilla'] } }, { id: 'cookie', qty: 1 }]));
  const q = KA.queueLines(r.lines);
  assert.deepEqual(q[0], { id: 'caffe-latte', name: 'Caffè Latte', qty: 2, options: { tamano: 'grande', leche: 'avena', temperatura: 'normal', extras: ['shot', 'vainilla'] }, optionsText: 'Grande · Avena · Normal · +Shot extra de espresso · +Sirope de vainilla' });
  assert.equal(KA.queueLines(Array.from({ length: 14 }, () => r.lines[1])).length, 10, 'tope de la cola: 10 líneas');
  assert.deepEqual(q[1], { id: 'cookie', name: 'Cookie', qty: 1, options: {}, optionsText: '' });
  const d = KA.cartDraft(r.lines, STORE, 'Carlos');
  assert.deepEqual(d.lines[0].options, { tamano: 'grande', leche: 'avena', temperatura: 'normal', extras: ['shot', 'vainilla'] });
  assert.equal(d.type, 'order-draft'); assert.equal(d.ready, false); assert.deepEqual(d.missing, []);
  assert.deepEqual(KA.cartDraft([], STORE, '').missing, ['lines', 'customerName']);
});
test('orígenes: la cara solo desde digitalavatar.ai (o su proxy) y el anfitrión solo desde la lista', () => {
  for (const o of ['https://digitalavatar.ai', 'https://www.digitalavatar.ai', 'https://neo-digitalavatar.csilvasantin.workers.dev', 'http://127.0.0.1:9134']) assert.ok(KA.isAvatarOrigin(o), o);
  for (const o of ['https://evil.com', 'https://digitalavatar.ai.evil.com', 'http://digitalavatar.ai', 'https://ainimation.studio', 'null', '']) assert.ok(!KA.isAvatarOrigin(o), o);
  for (const o of ['https://www.admira.store', 'https://xpaceos.com', 'https://www.ainimation.studio', 'https://admira.tv', 'http://localhost:8080']) assert.ok(KA.isHostOrigin(o), o);
  for (const o of ['https://admira.store.evil.com', 'https://evilxpaceos.com', 'http://www.admira.store', 'https://digitalavatar.ai', '*']) assert.ok(!KA.isHostOrigin(o), o);
  assert.match(KA.avatarUrl('good', { brand: 'starbucks', store: STORE, lang: 'es' }), /^https:\/\/digitalavatar\.ai\/nube\.html\?embed=1&kiosk=1&brand=starbucks&store=starbucks-paseo-de-gracia&lang=es&mode=order&tier=good&avatar=admirito$/);
  assert.equal(KA.level('off'), 'off'); assert.equal(KA.level('neo'), 'best'); assert.equal(KA.level('xx'), 'good');
});
test('nunca postMessage(…, "*") con pedido o nombre', () => {
  assert.doesNotMatch(html, /postMessage\([^)]*,\s*"\*"\)/); assert.doesNotMatch(pago, /postMessage\([^)]*,\s*"\*"\)/);
  assert.match(html, /<script src="pedido-avatar\.js"><\/script>/);
});

// ── E2E ──
const CARA = `<!doctype html><meta charset="utf-8"><title>cara falsa</title><body style="margin:0;background:#cde">CARA FALSA<script>
window.asked=[];window.ctx=[];
addEventListener('message',e=>{const d=e.data||{};if(d.type==='da-ask')asked.push(d.question);if(d.type==='da-context')ctx.push(d);});
window.answer=(action,answer)=>parent.postMessage({type:'da-answer',answer:answer||'Vale',spoke:false,error:null,action},'*');
</script>`;
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__cara.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(CARA); }
    if (u.pathname === '/__anfitrion.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(`<!doctype html><body style="margin:0"><iframe id="k" style="width:540px;height:960px;border:0" src="/${dir}/?store=starbucks-qa&avatar=off"></iframe><script>window.got=[];addEventListener('message',e=>{if(e.data&&e.data.source==='ainimation-xperiencia')got.push({event:e.data.event,order:e.data.order});});</script>`); }
    const p = path.join(process.cwd(), decodeURIComponent(u.pathname));
    const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}
async function colaSimulada(page) {
  const calls = []; let n = 0; const pedidos = {};
  await page.route(/^https:\/\/mcp-ainimation\.admira\.store\//, async (route) => {
    const req = route.request(); const u = new URL(req.url()); const op = u.pathname.replace(/^\/cola\//, '');
    let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    const h = req.headers(); calls.push({ op, method: req.method(), body, clave: h['x-cola-clave'] || null, pago: h['x-cola-pago'] || null, url: req.url() });
    if (op === 'pedido' && req.method() === 'POST') { if (!pedidos[body.id]) { n += 1; pedidos[body.id] = { id: body.id, numero: (body.prefijo || 'A') + String(n).padStart(3, '0'), estado: 'pendiente', pago: 'tok-' + n }; } return route.fulfill({ json: { ok: true, ...pedidos[body.id] } }); }
    if (op === 'pedido') return route.fulfill({ json: pedidos[u.searchParams.get('id')] || { ok: false } });
    if (op === 'pagar') { const p = pedidos[body?.id]; if (p) p.estado = 'recibido'; return route.fulfill({ json: { ok: true, ...(p || {}) } }); }
    return route.fulfill({ json: { ok: true } });
  });
  // la cara REAL y su cerebro nunca en los tests
  await page.route(/digitalavatar\.ai|brain\.digitalavatar|admiranext\.com/, (r) => r.abort());
  return calls;
}
async function launch(t) {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { t.skip('sin playwright'); return null; }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); } catch { t.skip('sin navegador'); return null; }
}
const cara = (page) => page.frames().find((f) => { try { return new URL(f.url()).pathname === '/__cara.html'; } catch { return false; } });

test('E2E avatar: la conversación llena el carrito, «¿Lo confirmo?», Confirmar → comanda con líneas en la cola', { timeout: 120000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    const ctxB = await browser.newContext({ viewport: { width: 540, height: 960 } });
    const page = await ctxB.newPage();
    const calls = await colaSimulada(ctxB); // quiosco y «móvil» comparten la cola simulada
    await page.goto(base + '?store=starbucks-qa&avatarSrc=/__cara.html#clave=k-de-prueba');
    await page.waitForFunction(() => window.__kioskReady && document.documentElement.classList.contains('av-on'));
    assert.doesNotMatch(page.url(), /clave|k-de-prueba/, 'la clave sale de la URL');
    assert.equal(await page.evaluate(() => localStorage.getItem('cola:kiosko:starbucks-qa')), 'k-de-prueba');
    await page.waitForFunction(() => window.__kioskAvatar.sent.some((m) => m.type === 'da-context' && m.mode === 'order'));
    const ctx0 = await cara(page).evaluate(() => window.ctx[0]);
    assert.equal(ctx0.mode, 'order'); assert.equal(ctx0.store, 'starbucks-qa'); assert.equal(ctx0.lang, 'es'); assert.equal(ctx0.order, null);
    // escribir en el quiosco pregunta a la cara (da-ask)
    await page.fill('#avQ', 'un latte grande con avena'); await page.press('#avQ', 'Enter');
    await cara(page).waitForFunction(() => window.asked.length === 1);
    // un da-answer que NO viene de la cara (la propia página) se ignora
    await page.evaluate((d) => window.postMessage({ type: 'da-answer', answer: 'x', action: d }, '*'), draft([{ id: 'cookie', qty: 3 }]));
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 0, 'origen/ventana no permitidos');
    // 1) borrador incompleto (falta la leche): carrito con precio del quiosco
    await cara(page).evaluate((d) => window.answer(d, '¿Con qué leche?'), draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande', extras: ['shot'] } }], { store: 'starbucks-qa', missing: ['leche'] }));
    await page.waitForSelector('#s-cart.on');
    assert.equal((await page.$$('#lines .line')).length, 1);
    assert.match(await page.textContent('#total'), /4,70/);
    assert.match(await page.textContent('#avOrder'), /Falta: leche/);
    assert.match(await page.textContent('#lines .line'), /Leche \?/);
    assert.match(await page.textContent('#avSaid'), /¿Con qué leche\?/);
    assert.equal(await page.isVisible('#confirm'), false);
    // 2) acumulado: leche + 2 croissants; falta el nombre → pantalla del nombre
    await cara(page).evaluate((d) => window.answer(d), draft([latte, { id: 'croissant', qty: 2 }], { missing: ['customerName'] }));
    await page.waitForSelector('#s-name.on');
    assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 2);
    assert.equal(await page.$$eval('#avOrder .ln:not(.tt)', (n) => n.length), 2, 'el cliente ve el pedido formarse en la columna del avatar');
    // 3) con nombre y ready → resumen con total y botón grande; aún NO hay comanda
    await cara(page).evaluate((d) => window.answer(d, '¿Lo confirmo?'), draft([latte, { id: 'croissant', qty: 2 }], { customerName: 'Carlos', ready: true }));
    await page.waitForSelector('#confirm.on');
    assert.equal(await page.inputValue('#custName'), 'Carlos');
    assert.match(await page.textContent('#cfTotal'), /9,60/); assert.match(await page.textContent('#cfOk'), /Confirmar pedido/);
    assert.match(await page.textContent('#cfWho'), /Carlos/);
    assert.equal(calls.filter((c) => c.op === 'pedido' && c.method === 'POST').length, 0, 'la comanda solo nace al confirmar');
    // 4) Confirmar (toque) → pago; la cola recibe las líneas con sus opciones
    await page.click('#cfOk');
    await page.waitForSelector('#s-pay.on');
    await page.waitForFunction(() => window.__kioskCola && window.__kioskCola.numero);
    const crear = calls.find((c) => c.op === 'pedido' && c.method === 'POST');
    assert.equal(crear.body.nombre, 'Carlos'); assert.equal(crear.body.total, 9.6); assert.equal(crear.clave, 'k-de-prueba');
    assert.ok(calls.filter((c) => c.method === 'GET').every((c) => !c.clave), 'la clave solo viaja en los POST');
    assert.deepEqual(crear.body.lines, [
      { id: 'caffe-latte', name: 'Caffè Latte', qty: 1, options: { tamano: 'grande', leche: 'avena', temperatura: 'normal', extras: ['shot'] }, optionsText: 'Grande · Avena · Normal · +Shot extra de espresso' },
      { id: 'croissant', name: 'Croissant de mantequilla', qty: 2, options: {}, optionsText: '' }]);
    // un borrador tardío no toca un pedido ya en pago
    await cara(page).evaluate((d) => window.answer(d), draft([{ id: 'cookie', qty: 1 }]));
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 2);
    // el QR lleva el token de pago de la cola y el móvil (pago-simulado) lo manda como x-cola-pago
    await page.waitForFunction(() => /[?&]t=tok-1(&|$)/.test(document.getElementById('qr').dataset.url || ''));
    const movilUrl = await page.getAttribute('#qr', 'data-url');
    const movil0 = await ctxB.newPage(); await movil0.goto(movilUrl); await movil0.click('#pay');
    await page.waitForSelector('#s-done.on');
    assert.match(await page.textContent('#orderNum'), /^A\d{3}$/);
    await page.waitForTimeout(400);
    const movil = calls.filter((c) => c.pago === 'tok-1').map((c) => c.op);
    assert.ok(movil.includes('pedido') && movil.includes('pagar'), 'el móvil manda x-cola-pago: ' + JSON.stringify(calls.map((c) => [c.op, c.method, c.clave, c.pago])));
    assert.ok(calls.some((c) => c.op === 'pagar' && c.clave === 'k-de-prueba'), 'el quiosco paga con x-cola-clave');
    await cara(page).waitForFunction(() => window.ctx.some((c) => c.order === null && window.ctx.indexOf(c) > 0), null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__kioskAvatar.confirmed), 'toque');
  } finally { await browser.close(); srv.close(); }
});

test('E2E avatar: el toque manda (borrador en espera) y la cara se entera de los cambios a mano', { timeout: 90000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    await colaSimulada(page);
    await page.goto(base + '?store=starbucks-qa&avatarSrc=/__cara.html&lang=en');
    await page.waitForFunction(() => window.__kioskReady && window.__kioskAvatar.sent.length > 0);
    assert.match(await page.textContent('#avTitle'), /Ask Admirito/);
    await page.click('#s-attract'); await page.click('[data-item="americano"]');
    await cara(page).evaluate((d) => window.answer(d), draft([latte]));
    await page.waitForFunction(() => window.kiosko.state.avatar.pending);
    assert.equal(await page.evaluate(() => window.kiosko.state.screen), 'item', 'no se saca al cliente de su pantalla');
    assert.equal(await page.isVisible('#avPending'), true);
    // el cliente añade su americano a mano: el borrador pendiente se descarta y la cara recibe el carrito
    await page.click('#addBtn');
    await page.waitForTimeout(1800);
    const st = await page.evaluate(() => window.kiosko.state);
    assert.equal(st.avatar.pending, false); assert.deepEqual(st.cart.map((l) => l.id), ['americano']);
    const ctx = await cara(page).evaluate(() => window.ctx.filter((c) => c.order).pop());
    assert.equal(ctx.order.type, 'order-draft'); assert.deepEqual(ctx.order.lines, [{ id: 'americano', qty: 1, options: { tamano: 'grande' } }]);
    // quitar el avatar → quiosco clásico; volver a ponerlo desde la cabecera
    await page.click('#avOff');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('av-on')), false);
    await page.click('#s-cart .avToggle');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('av-on')), true);
  } finally { await browser.close(); srv.close(); }
});

test('E2E anfitrión: kiosk-fill del tótem rellena el quiosco (también con ?avatar=off) y el pedido vuelve a su origen', { timeout: 90000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const origin = `http://127.0.0.1:${srv.address().port}`;
  try {
    const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
    await colaSimulada(page);
    await page.goto(origin + '/__anfitrion.html');
    const k = page.frameLocator('#k'); const kf = () => page.frames().find((f) => f.url().includes('kiosko-pedido'));
    await page.waitForFunction(() => document.getElementById('k').contentWindow.__kioskReady);
    assert.equal(await kf().evaluate(() => document.documentElement.classList.contains('av-can')), false, '?avatar=off: sin avatar');
    await page.evaluate((d) => document.getElementById('k').contentWindow.postMessage({ source: 'admira-avatar', type: 'kiosk-fill', draft: d }, '*'), draft([latte], { customerName: 'Lucía', ready: true }));
    await k.locator('#confirm.on').waitFor();
    assert.equal(await kf().evaluate(() => window.kiosko.state.cart[0].unitPrice), 5.2);
    // API pública: add (una línea) y fill (sustituye)
    const add = await kf().evaluate(() => window.kiosko.add({ id: 'cookie', qty: 2 }));
    assert.equal(add.ok, true); assert.equal(add.lines, 2);
    assert.equal((await kf().evaluate(() => window.kiosko.add({ id: 'cookie', qty: 99 }))).ok, false);
    const fill = await kf().evaluate((d) => window.kiosko.fill(d), draft([{ id: 'muffin', qty: 1 }], { customerName: 'Lucía', ready: true }));
    assert.equal(fill.applied, true); assert.equal(fill.total, 2.9);
    await k.locator('#cfOk').click();
    await k.locator('#s-pay.on').waitFor();
    await k.locator('#payCounter').click();
    await k.locator('#s-done.on').waitFor();
    await page.waitForFunction(() => window.got.some((m) => m.event === 'order'));
    const o = await page.evaluate(() => window.got.find((m) => m.event === 'order').order);
    assert.equal(o.customerName, 'Lucía'); assert.equal(o.lines[0].id, 'muffin'); assert.equal(o._colaLines, undefined);
  } finally { await browser.close(); srv.close(); }
});
