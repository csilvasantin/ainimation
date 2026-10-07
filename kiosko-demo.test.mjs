// «/demo pedido» (Carlos, 7-oct-2026): una clienta simulada pide a Admirito de punta a punta.
// node --test kiosko-demo.test.mjs — unitarios (demo-pedido.js) + E2E con una cara FALSA (hace de cerebro),
// la voz (/voz) y la cola SIMULADAS: nunca se llama a ElevenLabs, al cerebro ni a la cola de producción.
// Grabación opcional: DEMO_PEDIDO_REC=<carpeta> graba vídeo y capturas de la demo (todo simulado).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dir = 'xperiencias/kiosko-pedido';
const KD = require(`./${dir}/demo-pedido.js`);
const KA = require(`./${dir}/pedido-avatar.js`);
const menu = JSON.parse(fs.readFileSync(`${dir}/menu.starbucks.json`, 'utf8'));
const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const STORE = 'starbucks-paseo-de-gracia';
const VOZ = { cliES: 'ajOR9IDAaubDK5qtLUqQ', cliEN: 'EXAVITQu4vr4xnSDxMaL', admES: 'Nh2zY9kknu6z4pZy6FhD', admEN: 'TX3LPaxmHKxFdv7VOQHJ' };
const draft = (lines, extra = {}) => ({ type: 'order-draft', version: 1, store: STORE, lines, customerName: null, ready: false, missing: [], summary: '', ...extra });
const latte = { id: 'caffe-latte', qty: 1, options: { tamano: 'grande', leche: 'avena', temperatura: 'normal', extras: [] } };
const croissant = { id: 'croissant', qty: 1, options: {} };
const valida = (d) => KA.validateDraft(menu, d, { stores: [STORE] });

// ── unitarios: comando ──
test('comando: «/demo pedido» y «/demo order» son el interruptor; lo demás no', () => {
  for (const t of ['/demo pedido', '  /DEMO   Pedido ', '/ demo order', '/demo Order']) assert.ok(KD.parseCommand(t), t);
  assert.equal(KD.parseCommand('/demo pedido').target, 'pedido'); assert.equal(KD.parseCommand('/demo order').target, 'order');
  for (const t of ['/demo', 'demo pedido', '/demo pedidos', '/demo pedido ya', '/demopedido', 'un latte', '', null]) assert.equal(KD.parseCommand(t), null, String(t));
});

// ── unitarios: voces ──
test('voces: la clienta es una chica distinta de Admirito en ES y EN; Admirito usa su voz de siempre (la del cerebro)', () => {
  assert.equal(KD.voiceFor('customer', 'es').id, VOZ.cliES); assert.equal(KD.voiceFor('customer', 'en').id, VOZ.cliEN);
  assert.equal(KD.voiceFor('admirito', 'es').id, VOZ.admES); assert.equal(KD.voiceFor('admirito', 'en').id, VOZ.admEN);
  for (const l of ['es', 'en']) assert.notEqual(KD.voiceFor('customer', l).id, KD.voiceFor('admirito', l).id);
  // misma voz que el cerebro da a Admirito (omnipublicity-api/src/avatar-voice.js) si el repo está al lado
  const av = path.resolve('../../../Documents/Admirito/github-csilvasantin/omnipublicity-api/src/avatar-voice.js');
  if (fs.existsSync(av)) { const src = fs.readFileSync(av, 'utf8'); assert.ok(src.includes(VOZ.admES) && src.includes(VOZ.admEN)); }
  assert.equal(KD.vozUrl('customer', 'es', 'Hola, ¿qué tal?'), 'https://mcp-ainimation.admira.store/voz?voz=' + VOZ.cliES + '&texto=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F');
  // el proxy acepta ids crudos de ElevenLabs (vozId): la demo no depende de redeplegar /voz
  assert.match(VOZ.cliEN, /^[A-Za-z0-9]{16,32}$/);
});

// ── unitarios: guion ──
test('guion: ids reales de la carta, breve, ES y EN, con bebida (tamaño + leche), algo de comer, nombre y confirmación', () => {
  for (const l of ['es', 'en']) {
    const s = KD.script(l);
    assert.deepEqual(s.steps.map((x) => x.kind), ['drink', 'extra', 'name']);
    for (const st of s.steps.filter((x) => x.line)) {
      const r = KA.validateLine(menu, st.line); assert.ok(!r.error, st.line.id); assert.deepEqual(r.issues, []);
    }
    assert.equal(s.steps[0].line.options.tamano, 'grande'); assert.equal(s.steps[0].line.options.leche, 'avena');
    assert.equal(menu.items.find((i) => i.id === s.steps[1].line.id).category, 'comida');
    for (const t of [s.open, s.confirm, s.pay, ...s.steps.map((x) => x.text)]) assert.ok(t.length > 3 && t.length <= 120, t);
    assert.ok(KA.validName(s.name));
  }
  assert.match(KD.script('es').steps[2].text, /Lucía/); assert.match(KD.script('en').steps[2].text, /Lucy/);
  assert.equal(KD.script('es').close('Lucía', 'A001'), '¡Gracias, Lucía! Tu pedido es el A001. Te avisamos en la barra.');
  assert.equal(KD.spell('A001'), 'A 1'); assert.equal(KD.spell('A120'), 'A 120'); assert.equal(KD.spell('7'), '7');
});

test('huecos: la clienta rellena lo que el cerebro pregunta (missing) con lo que quería, en su idioma', () => {
  assert.equal(KD.gapText(menu, ['leche'], 'es'), 'Con leche de avena, por favor.');
  assert.equal(KD.gapText(menu, ['leche'], 'en'), 'Oat milk, please.');
  assert.equal(KD.gapText(menu, ['tamano'], 'es'), 'Grande, por favor.');
  assert.equal(KD.gapText(menu, ['tamano'], 'en'), 'A grande, please.');
  assert.equal(KD.gapText(menu, ['tamano', 'leche'], 'es'), 'Grande, por favor. Con leche de avena, por favor.');
  assert.equal(KD.gapText(menu, ['temperatura'], 'es'), 'Normal, por favor.', 'lo que el guion no dice: el valor por defecto de la carta');
  assert.equal(KD.gapText(menu, ['temperatura'], 'en'), 'Regular, please.');
  assert.equal(KD.gapText(menu, ['customerName'], 'es'), 'Me llamo Lucía.');
  assert.equal(KD.gapText(menu, ['customerName'], 'en'), "My name's Lucy.");
  assert.equal(KD.gapText(menu, ['raro'], 'es'), 'Lo que me recomiendes.');
});

test('plan de la clienta: guion por turnos, huecos primero, nombre saltado si ya está, ready → confirmar', () => {
  const p0 = { step: 0, turns: 0, gaps: {} };
  let n = KD.planNext(p0, null, 'es', menu);
  assert.equal(n.say.kind, 'drink'); assert.deepEqual(p0, { step: 0, turns: 0, gaps: {} }, 'no muta el estado');
  // el cerebro pregunta la leche (y el nombre): primero la leche
  const d1 = valida(draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche', 'customerName'] }));
  n = KD.planNext(n.state, d1, 'es', menu); assert.equal(n.say.kind, 'gap'); assert.equal(n.say.text, 'Con leche de avena, por favor.');
  const d2 = valida(draft([latte], { missing: ['customerName'] }));
  n = KD.planNext(n.state, d2, 'es', menu); assert.equal(n.say.kind, 'extra');
  n = KD.planNext(n.state, valida(draft([latte, croissant], { missing: ['customerName'] })), 'es', menu); assert.equal(n.say.kind, 'name'); assert.equal(n.say.text, 'A nombre de Lucía.');
  const ready = valida(draft([latte, croissant], { customerName: 'Lucía', ready: true }));
  assert.equal(ready.ready, true);
  assert.equal(KD.planNext(n.state, ready, 'es', menu).say.kind, 'confirm');
  // el nombre ya lo tiene el cerebro: el paso del nombre se salta
  const conNombre = valida(draft([latte, croissant], { customerName: 'Lucía', missing: [] }));
  const s2 = KD.planNext({ step: 2, gaps: {} }, conNombre, 'es', menu);
  assert.equal(s2.say.kind, 'enough', 'sin nada pendiente y sin ready: «Nada más, gracias» una vez');
  assert.equal(KD.planNext(s2.state, conNombre, 'es', menu).say, null, 'después, nada que decir → la demo se para');
  // un hueco que el cerebro insiste en pedir: como mucho 2 veces
  let st = { step: 1, gaps: {} }; const terco = valida(draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche'] }));
  for (let i = 0; i < 2; i++) { const r = KD.planNext(st, terco, 'en', menu); assert.equal(r.say.text, 'Oat milk, please.'); st = r.state; }
  assert.notEqual(KD.planNext(st, terco, 'en', menu).say.kind, 'gap');
  // antes de pedir la bebida no se rellenan huecos
  assert.equal(KD.planNext(p0, terco, 'es', menu).say.kind, 'drink');
});

test('trozos para /voz: ≤ 240 caracteres, por frases y sin perder palabras', () => {
  assert.deepEqual(KD.chunks('Hola.'), ['Hola.']); assert.deepEqual(KD.chunks('  '), []);
  const largo = Array.from({ length: 12 }, (_, i) => `Frase número ${i + 1} con algo de texto para alargarla bastante.`).join(' ');
  const c = KD.chunks(largo); assert.ok(c.length > 1); assert.ok(c.every((x) => x.length <= 240)); assert.equal(c.join(' '), largo);
  const sinPuntos = 'palabra '.repeat(80).trim(); const c2 = KD.chunks(sinPuntos); assert.ok(c2.every((x) => x.length <= 240)); assert.equal(c2.join(' '), sinPuntos);
});

// ── unitarios: máquina de estados ──
function fake(plan, over = {}) {
  const ev = { says: [], asked: [], cleanup: [], notice: [], taps: [], prefetch: [], states: [], finish: 0, maxVoices: 0 };
  let voices = 0, cut = null; const lang = over.lang || 'es';
  const deps = {
    lang: () => lang, menu: () => menu, prepare: async () => {}, pause: () => 0, wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    speak: (who, text) => new Promise((r) => { voices++; ev.maxVoices = Math.max(ev.maxVoices, voices); ev.says.push({ who, text }); const done = () => { voices--; cut = null; r(); }; cut = done; setTimeout(() => { if (cut === done) done(); }, over.speakMs || 2); }),
    prefetch: (who, text) => ev.prefetch.push({ who, text }), bubble: () => {}, thinking: () => {},
    ask: (q) => { ev.asked.push(q); const r = plan.shift(); if (r !== undefined) setTimeout(() => demo.onAnswer(r), 2); },
    validate: (a) => valida(a),
    tapConfirm: async () => { ev.taps.push('confirm'); return true; }, tapCounter: async () => { ev.taps.push('counter'); return 'A007'; },
    customerName: () => 'Lucía', notice: (m) => ev.notice.push(m), cleanup: (r) => { ev.cleanup.push(r); if (cut) cut(); }, finish: () => { ev.finish++; },
    onState: (s) => ev.states.push(s), ...over.deps,
  };
  const demo = KD.createDemo(deps);
  return { demo, ev };
}
const until = async (fn, ms = 3000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 5)); } };
const planES = () => [
  { answer: '¿Con qué leche?', action: draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche', 'customerName'] }) },
  { answer: 'Con avena. ¿Algo más?', action: draft([latte], { missing: ['customerName'] }) },
  { answer: 'Un croissant. ¿A qué nombre?', action: draft([latte, croissant], { missing: ['customerName'] }) },
  { answer: 'Lucía, ¿lo confirmo?', action: draft([latte, croissant], { customerName: 'Lucía', ready: true }) },
];

test('máquina: turnos alternos clienta ⇄ Admirito hasta confirmar, pagar en barra y número (una voz cada vez)', async () => {
  const { demo, ev } = fake(planES());
  assert.equal(demo.toggle(), 'started'); assert.equal(demo.active(), true);
  await until(() => demo.state === 'done');
  assert.deepEqual(ev.asked, ['Hola. Quería un caffè latte grande con leche de avena, por favor.', 'Con leche de avena, por favor.', 'Y un croissant de mantequilla, por favor.', 'A nombre de Lucía.']);
  assert.deepEqual(ev.says.map((s) => s.who), ['admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'customer', 'admirito']);
  assert.equal(ev.says[1].text, ev.asked[0]); assert.equal(ev.says[2].text, '¿Con qué leche?', 'Admirito dice la respuesta REAL del cerebro');
  assert.deepEqual(ev.says.slice(-3).map((s) => s.text), ['Sí, confírmalo.', 'Pago en barra.', '¡Gracias, Lucía! Tu pedido es el A 1.'.replace('A 1', 'A 7') + ' Te avisamos en la barra.']);
  assert.deepEqual(ev.taps, ['confirm', 'counter']); assert.equal(ev.finish, 1); assert.equal(demo.number, 'A007'); assert.equal(demo.turns, 4);
  assert.equal(ev.maxVoices, 1, 'nunca dos voces a la vez');
  const adm = ev.says.filter((s) => s.who === 'admirito').map((s) => s.text); assert.equal(new Set(adm).size, adm.length, 'ninguna frase dos veces');
  assert.ok(ev.prefetch.some((p) => p.who === 'customer' && p.text === 'Con leche de avena, por favor.'), 'precarga la frase siguiente de la clienta');
  assert.deepEqual(ev.cleanup, [], 'al terminar bien no se limpia: se queda en el número');
});

test('máquina: el segundo «/demo pedido» la para en mitad (corta, limpia y no pregunta más)', async () => {
  const { demo, ev } = fake([]); // el cerebro no contesta: se para esperando
  demo.toggle(); await until(() => ev.asked.length === 1);
  assert.equal(demo.toggle(), 'stopped'); assert.equal(demo.state, 'stopped'); assert.equal(demo.reason, 'comando'); assert.deepEqual(ev.cleanup, ['comando']);
  const n = ev.says.length; await new Promise((r) => setTimeout(r, 60));
  assert.equal(ev.says.length, n); assert.equal(ev.asked.length, 1);
  demo.onAnswer({ answer: 'tarde', action: null }); await new Promise((r) => setTimeout(r, 20));
  assert.equal(ev.says.length, n, 'una respuesta tardía del cerebro no se dice');
  assert.equal(demo.toggle(), 'started', 'y vuelve a arrancar');
  demo.stop('fin');
});

test('máquina: un toque mientras habla la para; el audio se corta y no sigue', async () => {
  const { demo, ev } = fake(planES(), { speakMs: 5000 });
  demo.start(); await until(() => ev.says.length === 1);
  assert.equal(demo.stop('toque'), true); assert.equal(demo.reason, 'toque'); assert.deepEqual(ev.cleanup, ['toque']);
  await new Promise((r) => setTimeout(r, 40)); assert.equal(ev.says.length, 1); assert.equal(ev.asked.length, 0);
  assert.equal(demo.stop('toque'), false, 'parada ya parada: nada');
});

test('máquina: si falla el cerebro (error o silencio), la demo se para con aviso', async () => {
  const a = fake([{ error: 'xai_key_not_set' }]); a.demo.start();
  await until(() => a.demo.state === 'failed');
  assert.equal(a.demo.reason, 'brain'); assert.deepEqual(a.ev.cleanup, ['fallo']); assert.match(a.ev.notice[0], /cerebro no responde/);
  const b = fake([], { deps: { askTimeout: 40 }, lang: 'en' }); b.demo.start();
  await until(() => b.demo.state === 'failed'); assert.match(b.ev.notice[0], /brain is not answering/);
  const c = fake([{ answer: '', action: null }]); c.demo.start(); await until(() => c.demo.state === 'failed'); assert.equal(c.demo.reason, 'brain');
  const d = fake([], { deps: { prepare: async () => { throw Object.assign(new Error('x'), { kind: 'face' }); } } }); d.demo.start();
  await until(() => d.demo.state === 'failed'); assert.match(d.ev.notice[0], /avatar no está disponible/);
  const e = fake(planES(), { deps: { tapConfirm: async () => false } }); e.demo.start(); await until(() => e.demo.state === 'failed'); assert.equal(e.demo.reason, 'confirm');
});

test('máquina: como mucho 6 frases de la clienta al cerebro; si no se completa, aviso', async () => {
  const terco = { answer: '¿Y la leche?', action: draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche', 'tamano'] }) };
  const { demo, ev } = fake(Array.from({ length: 20 }, () => terco)); demo.start();
  await until(() => demo.state === 'failed');
  assert.ok(ev.asked.length <= KD.MAX_TURNS, String(ev.asked.length)); assert.equal(demo.reason, 'stuck'); assert.match(ev.notice[0], /no se completó/);
});

test('quiosco: carga demo-pedido.js, intercepta el comando antes de la cara y para con el toque', () => {
  assert.match(html, /<script src="demo-pedido\.js"><\/script>/);
  const ask = html.slice(html.indexOf('function avAsk('), html.indexOf('function avMic('));
  assert.ok(ask.indexOf('KD.parseCommand(q)') < ask.indexOf('da-ask'), 'el comando nunca viaja a la cara');
  assert.match(html, /e\.isTrusted&&demoOn\(\)/);
  assert.match(html, /da-audio",on:false/);
  assert.doesNotMatch(html, /postMessage\([^)]*,\s*"\*"\)/);
});

// ── E2E ──
function wav(seconds = 0.35, rate = 22050) { // tono suave de prueba (no se llama a ElevenLabs)
  const n = Math.round(seconds * rate), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 330 * i / rate) * 6000), 44 + i * 2);
  return b;
}
// cara falsa: hace de cerebro con el plan que pone el test (window.__plan en el quiosco) y apunta lo que recibe
const CARA = `<!doctype html><meta charset="utf-8"><title>cara falsa</title><body style="margin:0;background:#cde;font:20px sans-serif">CARA FALSA<script>
const P=parent;P.__face=P.__face||{asked:[],audio:[],ctx:[]};
addEventListener('message',e=>{const d=e.data||{};
  if(d.type==='da-audio')P.__face.audio.push(d.on);
  if(d.type==='da-context')P.__face.ctx.push(d);
  if(d.type==='da-ask'){P.__face.asked.push(d.question);const r=(P.__plan||[]).shift();if(r===undefined)return;
    setTimeout(()=>parent.postMessage(Object.assign({type:'da-answer',spoke:false,muted:true},r),'*'),r.delay||250);}});
</script>`;
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__cara.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(CARA); }
    const p = path.join(process.cwd(), decodeURIComponent(u.pathname));
    const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}
async function simulado(ctx) {
  const cola = [], voz = []; let n = 0; const pedidos = {}; const audio = wav();
  await ctx.route(/^https:\/\/mcp-ainimation\.admira\.store\//, async (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (u.pathname === '/voz') { voz.push({ voz: u.searchParams.get('voz'), texto: u.searchParams.get('texto') }); return route.fulfill({ status: 200, headers: { 'content-type': 'audio/wav', 'access-control-allow-origin': '*' }, body: audio }); }
    const op = u.pathname.replace(/^\/cola\//, ''); let body = null; try { body = req.postDataJSON(); } catch { body = null; }
    cola.push({ op, method: req.method(), body });
    if (op === 'pedido' && req.method() === 'POST') { if (!pedidos[body.id]) { n += 1; pedidos[body.id] = { id: body.id, numero: (body.prefijo || 'A') + String(n).padStart(3, '0'), estado: 'pendiente', pago: 'tok-' + n }; } return route.fulfill({ json: { ok: true, ...pedidos[body.id] } }); }
    if (op === 'pedido') return route.fulfill({ json: pedidos[u.searchParams.get('id')] || { ok: false } });
    if (op === 'pagar') { const p = pedidos[body?.id]; if (p) p.estado = 'recibido'; return route.fulfill({ json: { ok: true, ...(p || {}) } }); }
    return route.fulfill({ json: { ok: true } });
  });
  await ctx.route(/digitalavatar\.ai|brain\.digitalavatar|admiranext\.com|elevenlabs/, (r) => r.abort()); // nada real
  return { cola, voz };
}
async function launch(t) {
  let chromium; try { ({ chromium } = await import('playwright')); } catch { t.skip('sin playwright'); return null; }
  const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
  try { return await chromium.launch(exe ? { executablePath: exe } : {}); } catch { t.skip('sin navegador'); return null; }
}
const REC = process.env.DEMO_PEDIDO_REC || '';
const [VW, VH, VS] = (REC && process.env.DEMO_PEDIDO_VIEW || '540x960x2').split('x').map(Number); // 540×960 @2 = capturas 1080×1920
const TAG = REC ? `${VW * VS}x${VH * VS}` : '';
const shot = async (page, name) => { if (REC) await page.screenshot({ path: path.join(REC, `${TAG}-${name}.png`) }); };
const state = (page) => page.evaluate(() => window.kiosko.demo.state);
// apunta cada bocadillo que aparece (las esperas a un bocadillo concreto serían carreras: dura lo que dura la frase)
const spyBubbles = (page) => page.evaluate(() => { window.__bubbles = []; new MutationObserver(() => { const d = document.querySelector('#demoBubbles .db:not(.th)'); if (!d) return;
  const k = d.classList.contains('cli') ? 'cli' : 'adm', t = d.textContent, last = window.__bubbles.at(-1); if (!last || last.t !== t) window.__bubbles.push({ k, t }); }).observe(document.getElementById('demoBubbles'), { childList: true, subtree: true }); });
const soft = (p) => p.catch(() => null); // capturas: si el momento ya pasó, no falla la prueba
// voces: cada frase pidió la voz de quien la dice; nunca se solapan; Admirito no repite frase
async function checkVoices(page, voz, lang) {
  const log = await page.evaluate(() => window.__demoAudio);
  const ids = lang === 'en' ? { customer: VOZ.cliEN, admirito: VOZ.admEN } : { customer: VOZ.cliES, admirito: VOZ.admES };
  assert.ok(log.length >= 6);
  for (const e of log) { assert.equal(e.voice, ids[e.who], e.who + ': ' + e.text); assert.deepEqual(e.via, ['voz'], 'suena la voz de ElevenLabs (simulada), no la del navegador'); }
  const who = new Map(log.map((e) => [e.text, e.who]));
  for (const r of voz) { const w = who.get(r.texto); if (w) assert.equal(r.voz, ids[w], `«${r.texto}» con la voz de ${w}`); else assert.ok([ids.customer, ids.admirito].includes(r.voz)); }
  assert.ok(voz.every((r) => r.voz !== ids.admirito || !log.some((e) => e.who === 'customer' && e.text === r.texto)), 'la clienta nunca con la voz de Admirito');
  for (let i = 1; i < log.length; i++) assert.ok(log[i].t0 >= log[i - 1].t1 - 1, `solapan: «${log[i - 1].text}» / «${log[i].text}»`);
  const adm = log.filter((e) => e.who === 'admirito').map((e) => e.text); assert.equal(new Set(adm).size, adm.length, 'Admirito no dice dos veces la misma frase');
  return log;
}

test('E2E demo ES: «/demo pedido» → turnos alternos → carrito → «¿Lo confirmo?» → Confirmar → Pagar en barra → número', { timeout: 120000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    if (REC) fs.mkdirSync(REC, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: REC ? VW : 540, height: REC ? VH : 960 }, deviceScaleFactor: REC ? VS : 1, ...(REC ? { recordVideo: { dir: REC, size: { width: VW, height: VH } } } : {}) });
    const page = await ctx.newPage(); const { cola, voz } = await simulado(ctx);
    await page.goto(base + '?store=starbucks-qa&avatarSrc=/__cara.html');
    await page.waitForFunction(() => window.__kioskReady && document.documentElement.classList.contains('av-on'));
    await page.evaluate((plan) => { window.__plan = plan; }, [
      { answer: '¡Marchando un caffè latte grande! ¿Con qué leche lo quieres?', action: draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche', 'customerName'] }) },
      { answer: 'Perfecto, con leche de avena. ¿Te apetece algo más?', action: draft([latte], { missing: ['customerName'] }) },
      { answer: 'Un croissant de mantequilla, hecho. ¿A qué nombre lo pongo?', action: draft([latte, croissant], { missing: ['customerName'] }) },
      { answer: 'Gracias, Lucía: un caffè latte grande con avena y un croissant. Revísalo y confírmalo en el quiosco.', action: draft([latte, croissant], { customerName: 'Lucía', ready: true }), delay: 600 },
    ]);
    await shot(page, '00-atraccion'); await spyBubbles(page);
    await page.fill('#avQ', '/demo pedido'); await page.press('#avQ', 'Enter');
    assert.equal(await page.inputValue('#avQ'), '', 'el comando se borra de la caja');
    await page.waitForSelector('#demoTalk.on');
    if (await soft(page.waitForSelector('#demoTalk .db.cli', { timeout: 15000 }))) await shot(page, '01-clienta-pide');
    await page.waitForFunction(() => window.kiosko.state.cart.length > 0, null, { timeout: 30000 }); await shot(page, '02-carrito-en-vivo');
    if (await soft(page.waitForSelector('#confirm.on', { timeout: 60000 }))) await shot(page, '03-lo-confirmo');
    if (await soft(page.waitForSelector('#s-done.on', { timeout: 60000 }))) await shot(page, '04-numero');
    await page.waitForFunction(() => window.kiosko.demo.state.state === 'done', null, { timeout: 30000 });
    await shot(page, '05-cierre');
    const bubbles = await page.evaluate(() => window.__bubbles);
    assert.deepEqual(bubbles.map((b) => b.k), ['adm', 'cli', 'adm', 'cli', 'adm', 'cli', 'adm', 'cli', 'adm', 'cli', 'cli', 'adm'], 'un bocadillo por frase, alternando');
    assert.ok(bubbles.every((b) => b.k === 'cli' ? b.t.startsWith('Clienta · Lucía') : b.t.startsWith('Admirito')), 'cada bocadillo dice quién habla');
    assert.ok(await page.evaluate(() => window.__kioskAvatar.confirmed === 'toque'), 'Confirmar se pulsó como un toque');
    const face = await page.evaluate(() => window.__face);
    assert.deepEqual(face.asked, ['Hola. Quería un caffè latte grande con leche de avena, por favor.', 'Con leche de avena, por favor.', 'Y un croissant de mantequilla, por favor.', 'A nombre de Lucía.']);
    assert.ok(!face.asked.some((q) => /demo/i.test(q)), '«/demo pedido» nunca llega a la cara (ni al cerebro)');
    assert.equal(face.audio[0], false, 'la cara se queda sin voz propia: suena una sola voz'); assert.equal(face.audio.at(-1), true, 'y la recupera al terminar');
    const st = await state(page); assert.equal(st.turns, 4); assert.match(st.number, /^A\d{3}$/);
    assert.equal(await page.textContent('#orderNum'), st.number);
    const crear = cola.find((c) => c.op === 'pedido' && c.method === 'POST');
    assert.equal(crear.body.nombre, 'Lucía - demo', 'la comanda real lleva la marca de demo en el nombre (el relé no tiene campo de vía al crear)');
    assert.deepEqual(crear.body.lines.map((l) => l.id), ['caffe-latte', 'croissant']); assert.equal(crear.body.lines[0].options.leche, 'avena');
    assert.ok(cola.some((c) => c.op === 'pagar' && c.body.via === 'caja'), 'pagar en barra');
    const log = await checkVoices(page, voz, 'es');
    assert.deepEqual(log.map((e) => e.who), ['admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'admirito', 'customer', 'customer', 'admirito']);
    assert.equal(log.at(-1).text, `¡Gracias, Lucía! Tu pedido es el A ${Number(st.number.slice(1))}. Te avisamos en la barra.`, 'Admirito cierra con el nombre y el número');
    assert.match(bubbles.at(-1).t, new RegExp('Admirito.*Tu pedido es el ' + st.number), 'el bocadillo enseña el número tal cual');
    assert.equal(await page.evaluate(() => window.__kioskSaid), undefined, 'el «¡Gracias!» de siempre no se dice encima del cierre');
    const kioskOrder = await page.evaluate(() => window.kiosko.state.order); assert.equal(kioskOrder.demo, true); assert.equal(kioskOrder.customerName, 'Lucía');
    if (REC) { const v = page.video(); await ctx.close(); if (v) fs.renameSync(await v.path(), path.join(REC, `demo-pedido-es-${TAG}.webm`)); } else await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('E2E demo EN: «/demo order» con voces en inglés (Sarah / Liam) hasta el número', { timeout: 120000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); // 16:9: el avatar va a la izquierda
    const page = await ctx.newPage(); const { cola, voz } = await simulado(ctx);
    await page.goto(base + '?store=starbucks-qa&avatarSrc=/__cara.html&lang=en');
    await page.waitForFunction(() => window.__kioskReady && document.documentElement.classList.contains('av-on'));
    await page.evaluate((plan) => { window.__plan = plan; }, [
      { answer: 'A grande caffè latte with oat milk, coming up. Anything else?', action: draft([latte], { missing: ['customerName'] }) },
      { answer: 'And a butter croissant. What name should I put?', action: draft([latte, croissant], { missing: ['customerName'] }) },
      { answer: 'Thanks, Lucy. Please check it and confirm it on the kiosk.', action: draft([latte, croissant], { customerName: 'Lucy', ready: true }) },
    ]);
    await spyBubbles(page);
    await page.fill('#avQ', '/demo order'); await page.press('#avQ', 'Enter');
    await page.waitForFunction(() => window.kiosko.demo.state.state === 'done', null, { timeout: 60000 });
    const bubbles = await page.evaluate(() => window.__bubbles);
    assert.equal(bubbles.filter((b) => b.k === 'cli').length, 5); assert.ok(bubbles.filter((b) => b.k === 'cli').every((b) => b.t.startsWith('Customer · Lucy')));
    const face = await page.evaluate(() => window.__face);
    assert.deepEqual(face.asked, ['Hi. Could I get a grande caffè latte with oat milk, please?', 'And a butter croissant, please.', "It's for Lucy."]);
    const log = await checkVoices(page, voz, 'en');
    assert.equal(log[0].text, "Hi! I'm Admirito. What would you like today?");
    assert.ok(log.some((e) => e.who === 'customer' && e.text === "I'll pay at the counter."));
    assert.equal(cola.find((c) => c.op === 'pedido' && c.method === 'POST').body.nombre, 'Lucy - demo');
    assert.match(await page.textContent('#s-done'), /Thank you/);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});

test('E2E demo: el segundo «/demo pedido» la para y limpia; un toque también; si el cerebro falla, aviso', { timeout: 120000 }, async (t) => {
  const browser = await launch(t); if (!browser) return; const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/${dir}/`;
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } }); const { voz } = await simulado(page);
    await page.goto(base + '?store=starbucks-qa&avatarSrc=/__cara.html');
    await page.waitForFunction(() => window.__kioskReady && document.documentElement.classList.contains('av-on'));
    // 1) a mitad (carrito ya con la bebida, el cerebro «pensando» la 2.ª respuesta) → «/demo pedido» otra vez
    await page.evaluate((plan) => { window.__plan = plan; }, [
      { answer: '¿Con qué leche lo quieres?', action: draft([{ id: 'caffe-latte', qty: 1, options: { tamano: 'grande' } }], { missing: ['leche', 'customerName'] }) },
      { answer: 'Muy tarde', action: draft([latte], { missing: ['customerName'] }), delay: 4000 },
    ]);
    await page.fill('#avQ', '/demo pedido'); await page.press('#avQ', 'Enter');
    await page.waitForFunction(() => window.__face && window.__face.asked.length === 2, null, { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 1);
    await page.click('#avQ'); // tocar la caja del avatar NO la para (ahí se escribe el comando)
    assert.notEqual((await state(page)).state, 'stopped');
    await page.evaluate(() => { window.__f1 = document.querySelector('#avFace iframe'); });
    await page.fill('#avQ', '/demo pedido'); await page.press('#avQ', 'Enter');
    const s1 = await state(page); assert.equal(s1.state, 'stopped'); assert.equal(s1.reason, 'comando');
    const k = await page.evaluate(() => window.kiosko.state);
    assert.equal(k.screen, 'attract'); assert.equal(k.cart.length, 0); assert.equal(k.avatar.confirm, false);
    assert.equal(await page.isVisible('#demoTalk'), false);
    const nAudio = (await page.evaluate(() => window.__demoAudio)).length, nVoz = voz.length;
    await page.waitForTimeout(4500); // llega la respuesta tardía: ni se dice ni toca el carrito
    assert.equal((await page.evaluate(() => window.__demoAudio)).length, nAudio, 'audio cortado: nada más suena');
    assert.equal(voz.length, nVoz); assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 0);
    assert.equal(await page.evaluate(() => { const f = document.querySelector('#avFace iframe'); return !!f && f !== window.__f1; }), true, 'cara nueva tras parar (conversación limpia, con su voz)');
    assert.equal(await page.evaluate(() => window.__face.asked.length), 2, 'y no se le pregunta nada más');
    // 2) vuelve a arrancar y un toque en la pantalla la para
    await page.evaluate(() => { window.__plan = [{ answer: '¿Con qué leche?', action: null, delay: 5000 }]; });
    await page.fill('#avQ', '/demo pedido'); await page.press('#avQ', 'Enter');
    await page.waitForFunction(() => window.kiosko.demo.state.state === 'thinking', null, { timeout: 30000 });
    await page.mouse.click(270, 800);
    const s2 = await state(page); assert.equal(s2.state, 'stopped'); assert.equal(s2.reason, 'toque');
    assert.equal(await page.evaluate(() => window.kiosko.state.screen), 'attract');
    // 3) el cerebro falla → la demo se para sola con un aviso visible
    await page.evaluate(() => { window.__plan = [{ error: 'xai_key_not_set' }]; });
    await page.fill('#avQ', '/demo pedido'); await page.press('#avQ', 'Enter');
    await page.waitForFunction(() => window.kiosko.demo.state.state === 'failed', null, { timeout: 30000 });
    assert.match(await page.textContent('#demoNote'), /el cerebro no responde/); assert.equal(await page.isVisible('#demoNote'), true);
    assert.equal(await page.evaluate(() => window.kiosko.state.cart.length), 0);
  } finally { await browser.close(); srv.close(); }
});
