import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Normal installation uses the repo devDependency. Codex can use its shared runtime.
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch (error) {
  if (process.env.PLAYWRIGHT_MODULE) throw error;
  playwright = createRequire('/Users/csilvasantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/')('playwright');
}
let browser;
before(async () => { browser = await playwright.chromium.launch({headless:true}); });
after(async () => { await browser?.close(); });

const stockId = 'fixture-stock-1816';
const api = 'https://api.admira.store';
const token = 'fixture-api-token-never-persist';
const copy = value => JSON.parse(JSON.stringify(value));
const seed = () => ({
  schema:'capsula/1', ref:'capsula-url:1234567890abcdef', version:8, parentId:stockId,
  plantilla:'v5.7', orientaciones:['horizontal','vertical'], saga:{tema:'creatividad',color:'#3875c8'},
  textos:{titulo:'La escena del afeitado',tipologia:'Creatividad',gancho:'Recuerdas la película Depredador',giro:'Una escena que no estaba en el guion',remate:'La improvisación se hizo legendaria',fuente:{texto:'Vídeo: FILMAZIQ',url:'https://www.youtube.com/shorts/fixture'}},
  spans:[], media:[{id:'base',role:'background',tipo:'video',src:'https://media.fixture.test/base.mp4',t:[0,12],credito:'Vídeo: FILMAZIQ',recorte:{x:0,y:0,w:1,h:1}}],
  tiempos:{gancho:[0,3],giro:[3,9],remate:[9,12]},cartelas:{preroll:false,postroll:false},origen:{url:'https://www.youtube.com/shorts/fixture'}
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+rRZkAAAAASUVORK5CYII=', 'base64');

async function fixture(t, {authenticated = true, reviews = [], put} = {}) {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(5000);
  const errors = [], puts = [], polls = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = authenticated ? 'http://127.0.0.1:9134' : 'https://www.ainimation.studio';
  await context.addInitScript(({authenticated,token}) => {
    if (authenticated) window.ainCapsulaLocal = {token};
    const open = window.open;
    window.open = function (...args) { window.__lastOpenedPopup = open.apply(this, args); return window.__lastOpenedPopup; };
  }, {authenticated,token});
  const script = await readFile(new URL('../assets/capsula-editor.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../assets/styles.css',import.meta.url),'utf8') + await readFile(new URL('../assets/capsula-editor.css',import.meta.url),'utf8');
  const json = (route, body, headers = {}) => route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'ETag',...headers},body:JSON.stringify(body)});
  let draft = seed(), revision = 1;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/studio.html') return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${styles}</style></head><body class="studio-page director-focus"><script src="/assets/capsula-editor.js"></script></body></html>`});
    if (url.origin === origin && url.pathname === '/assets/capsula-editor.js') return route.fulfill({contentType:'application/javascript',body:script});
    if (url.origin === 'https://www.pixeria.com' && url.pathname === '/auth/bridge') return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Fixture auth bridge</title><p>Esperando sesión fixture</p>'});
    if (url.origin === api) {
      if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, If-Match','Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS'}});
      if (url.pathname === '/stock/capsula/' + stockId && request.method() === 'GET') return json(route,{ok:true,id:stockId,capsula:copy(draft),history:[{id:stockId,version:8,title:'Original conservado'}],reviews:copy(reviews),item:{num:1816}},{ETag:'"draft-' + revision + '"'});
      if (url.pathname === '/stock/capsula/' + stockId && request.method() === 'PUT') {
        const call = {body:request.postDataJSON(),headers:await request.allHeaders()}; puts.push(call);
        if (put) await put(call, puts.length);
        draft = copy(call.body); revision += 1;
        return json(route,{ok:true,capsula:{...copy(draft),updatedAt:'fixture-save-' + revision}},{ETag:'"draft-' + revision + '"'});
      }
      if (url.pathname === '/capsula/url/estado') {
        const renderId = url.searchParams.get('renderId'); polls.push(renderId);
        return json(route,{ok:true,ref:seed().ref,job:copy(reviews.find(review => review.renderId === renderId) || {status:'error',error:'unknown-fixture-job'})});
      }
      throw Error('Unexpected API request: ' + request.method() + ' ' + url.pathname);
    }
    if (url.hostname === 'media.fixture.test') return route.fulfill({contentType:'image/png',body:png});
    return route.abort();
  });
  const load = async () => {
    await page.goto(origin + '/studio.html?mode=capsula&admiraStockId=' + stockId);
    await page.waitForFunction(() => window.ainCapsula?.getState().capsula?.schema === 'capsula/1');
    await page.waitForFunction(() => !document.querySelector('[data-save]').disabled);
  };
  await load();
  return {page,context,puts,polls,errors,load};
}

test('popup auth rejects wrong origin, state and window; accepts bound popup without persisting token', async t => {
  const {page,context,puts,errors} = await fixture(t,{authenticated:false});
  await page.locator('[data-text-field="giro"]').fill('Texto que requiere guardar');
  const popupReady = context.waitForEvent('page');
  await page.locator('[data-save]').click();
  const popup = await popupReady;
  await popup.waitForLoadState('domcontentloaded');
  const state = new URL(popup.url()).searchParams.get('state');
  assert.match(state, /^[a-zA-Z0-9_-]{16,128}$/);
  const data = {type:'ainimation:auth',state,token,expiresAt:Date.now()+600000};
  for (const spoof of [
    {origin:'https://attacker.example',source:'popup',data},
    {origin:'https://www.pixeria.com',source:'popup',data:{...data,state:'incorrect-state-123456'}},
    {origin:'https://www.pixeria.com',source:'self',data}
  ]) {
    await page.evaluate(spoof => window.dispatchEvent(new MessageEvent('message',{origin:spoof.origin,source:spoof.source==='popup'?window.__lastOpenedPopup:window,data:spoof.data})),spoof);
    await page.waitForTimeout(60);
    assert.equal(puts.length, 0, 'untrusted message must not authorize a write');
    assert.equal(popup.isClosed(), false);
  }
  // The accepted result uses an actual browser message from the cross-origin popup.
  await popup.evaluate(data => window.opener.postMessage(data,'https://www.ainimation.studio'),data);
  await page.waitForFunction(() => document.querySelector('[data-save-state]').textContent === 'Borrador guardado en Stock');
  assert.equal(puts.length, 1);
  assert.equal(puts[0].headers.authorization,'Bearer ' + token);
  assert.equal(puts[0].headers['if-match'],'"draft-1"');
  const storage = await page.evaluate(() => JSON.stringify({local:{...localStorage},session:{...sessionStorage},cookie:document.cookie}));
  assert.equal(storage.includes(token),false);
  assert.deepEqual(errors, []);
});

test('a delayed save preserves newer edits and uses the response ETag on the next save', async t => {
  let received, release;
  const started = new Promise(resolve => {received = resolve;});
  const responseGate = new Promise(resolve => {release = resolve;});
  const {page,puts,errors} = await fixture(t,{put:async (_call,index) => {if(index===1){received();await responseGate;}}});
  await page.locator('[data-text-field="giro"]').fill('Primera edición enviada');
  await page.evaluate(() => { window.__pendingSave = window.ainCapsula.save(); });
  await started;
  await page.locator('[data-text-field="giro"]').fill('Segunda edición aún sin guardar');
  release();
  assert.equal(await page.evaluate(() => window.__pendingSave),false);
  let state = await page.evaluate(() => window.ainCapsula.getState());
  assert.equal(state.capsula.textos.giro,'Segunda edición aún sin guardar');
  assert.equal(state.dirty,true);
  assert.equal(puts[0].body.textos.giro,'Primera edición enviada');
  assert.equal(puts[0].headers['if-match'],'"draft-1"');
  const stored = await page.evaluate(stockId => JSON.parse(localStorage.getItem('ainimation-capsula-' + stockId)),stockId);
  assert.equal(stored.capsula.textos.giro,'Segunda edición aún sin guardar');
  assert.equal(await page.evaluate(() => window.ainCapsula.save()),true);
  assert.equal(puts[1].headers['if-match'],'"draft-2"');
  assert.equal(puts[1].body.textos.giro,'Segunda edición aún sin guardar');
  state = await page.evaluate(() => window.ainCapsula.getState());
  assert.equal(state.dirty,false);
  assert.deepEqual(errors, []);
});

test('reloading restores chronological reviews and the newest status for every phase', async t => {
  const reviews = [
    {renderId:'phase1-new',phase:1,status:'error',createdAt:'2026-10-23T11:00:00Z'},
    {renderId:'phase3-new',phase:3,status:'preview_ready',createdAt:'2026-10-23T12:00:00Z'},
    {renderId:'phase1-old',phase:1,status:'preview_ready',createdAt:'2026-10-23T10:00:00Z'},
    {renderId:'phase2-new',phase:2,status:'preview_ready',createdAt:'2026-10-23T10:30:00Z'}
  ];
  const {page,polls,errors,load} = await fixture(t,{reviews});
  for (let visit = 0; visit < 2; visit += 1) {
    await page.waitForFunction(() => window.ainCapsula.getState().renderResult?.job?.renderId === 'phase1-new');
    const states = await page.locator('[data-reviews] .ce-review-line small').allTextContents();
    assert.deepEqual(states,['Error','Listo','Listo']);
    const saved = await page.evaluate(() => window.ainCapsula.getState().reviews.map(review => review.renderId));
    assert.deepEqual(saved,['phase1-old','phase2-new','phase1-new','phase3-new']);
    assert.equal(polls.at(-1),'phase1-new');
    await page.locator('[data-phase="1"]').click();
    await page.waitForFunction(() => window.ainCapsula.getState().renderResult?.job?.renderId === 'phase2-new');
    assert.equal(polls.at(-1),'phase2-new');
    await page.locator('[data-phase="2"]').click();
    await page.waitForFunction(() => window.ainCapsula.getState().renderResult?.job?.renderId === 'phase3-new');
    assert.equal(polls.at(-1),'phase3-new');
    if (!visit) await load();
  }
  assert.deepEqual(errors, []);
});

test('text styles cannot reuse a selection from another field or a range spanning fields', async t => {
  const {page,errors} = await fixture(t);
  const selectGiro = () => page.evaluate(() => {
    const el = document.querySelector('[data-text-field="giro"]'); el.focus();
    const range = document.createRange(); range.setStart(el.firstChild,0);range.setEnd(el.firstChild,4);
    const selection = getSelection();selection.removeAllRanges();selection.addRange(range);
    el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  await selectGiro();
  await page.locator('[data-text-field="gancho"]').focus();
  await page.locator('[data-style="enfasis"]').click();
  assert.deepEqual(await page.evaluate(() => window.ainCapsula.getState().capsula.spans),[]);
  assert.deepEqual(errors, []);
  await selectGiro();
  await page.evaluate(() => {
    const giro = document.querySelector('[data-text-field="giro"]');
    const remate = document.querySelector('[data-text-field="remate"]');
    const range = document.createRange();range.setStart(giro.firstChild,0);range.setEnd(remate.firstChild,4);
    const selection = getSelection();selection.removeAllRanges();selection.addRange(range);
    giro.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  await page.locator('[data-style="cifra"]').click();
  assert.deepEqual(await page.evaluate(() => window.ainCapsula.getState().capsula.spans),[]);
  assert.deepEqual(errors, []);
  // A fresh, valid selection still applies exactly to its own field.
  await selectGiro();
  await page.locator('[data-style="enfasis"]').click();
  assert.deepEqual(await page.evaluate(() => window.ainCapsula.getState().capsula.spans),[{campo:'giro',ini:0,fin:4,estilo:'enfasis'}]);
  assert.deepEqual(errors, []);
});



test('repeated preview requests share one save and one render job', async t => {
  const {page,context,puts,errors} = await fixture(t);
  const queued=[];
  await context.route(api+'/capsula/url/encargar', async route => {
    queued.push(route.request().postDataJSON());
    await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,ref:seed().ref,job:{renderId:'duplicate-check',phase:1,status:'en-cola',previewOnly:true}})});
  });
  await page.locator('[data-text-field="giro"]').fill('Una única revisión');
  await page.evaluate(() => Promise.all([window.ainCapsula.queuePreview(),window.ainCapsula.queuePreview()]));
  assert.equal(puts.length,1);
  assert.equal(queued.length,1);
  assert.equal(queued[0].previewOnly,true);
  assert.equal(queued[0].capsula.textos.giro,'Una única revisión');
  assert.equal(queued[0].capsuleVersion,9);
  assert.deepEqual(errors,[]);
});

test('editing while a preview is queued retains the new draft without showing a stale render', async t => {
  const {page,context,errors} = await fixture(t);
  let release,received;
  const started=new Promise(resolve=>{received=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  await context.route(api+'/capsula/url/encargar', async route => {
    received();await gate;
    await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,ref:seed().ref,job:{renderId:'earlier-copy',phase:1,status:'en-cola',previewOnly:true}})});
  });
  await page.evaluate(()=>{window.__queue=window.ainCapsula.queuePreview();});
  await started;
  await page.locator('[data-text-field="giro"]').fill('Cambios posteriores al envío');
  release();await page.evaluate(()=>window.__queue);
  const state=await page.evaluate(()=>window.ainCapsula.getState());
  assert.equal(state.dirty,true);
  assert.equal(state.capsula.textos.giro,'Cambios posteriores al envío');
  assert.equal(state.renderResult,null);
  assert.equal(state.reviews.at(-1).renderId,'earlier-copy');
  assert.match(await page.locator('[data-notice]').textContent(),/edición anterior/);
  assert.deepEqual(errors,[]);
});
