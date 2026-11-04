import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {startUpdateNotice} from '../assets/update-notice.mjs';
import {stampPageRevision} from '../scripts/page-revision.mjs';

const A='aaaaaaaaaaaaaaaa', B='bbbbbbbbbbbbbbbb', C='cccccccccccccccc';
const page=revision=>`<!doctype html><html lang="es"><head><meta name="ain-page-revision" content="${revision}"></head><body><a href="#top">Inicio</a></body></html>`;
const response=(revision,overrides={})=>({ok:true,headers:new Headers({'content-type':'text/html; charset=utf-8'}),text:async()=>page(revision),...overrides});
const settle=()=>new Promise(setImmediate);
function fixture(t, {url='https://www.ainimation.studio/?lang=es#contact', revision=A, fetcher}={}) {
  const dom=new JSDOM(page(revision),{url,pretendToBeVisual:true});
  const win=dom.window,doc=win.document,calls=[],navigations=[];
  let next=response(A),tick;
  win.setInterval=fn=>{tick=fn;return 1;};win.clearInterval=()=>{};
  win.localStorage.setItem('ainimation:project',JSON.stringify({title:'Café',revision:12}));
  win.localStorage.setItem('ain_lang','es');
  win.sessionStorage.setItem('session','unchanged');
  const before=[...Object.entries(win.localStorage),...Object.entries(win.sessionStorage)];
  const request=async(...args)=>{calls.push(args);return fetcher?fetcher(...args):next;};
  const options={doc,win,request,navigate:url=>navigations.push(url)};
  const api=startUpdateNotice(options);
  t.after(()=>{api?.destroy();dom.window.close();});
  return {doc,win,api,options,calls,navigations,before,tick:()=>tick?.(),set:result=>next=result,banner:()=>doc.querySelector('.ain-update-notice'),storage:()=>[...Object.entries(win.localStorage),...Object.entries(win.sessionStorage)]};
}

test('no notice for current revision; requests bypass caches and omit credentials',async t=>{
  const f=fixture(t);await settle();assert.equal(f.banner(),null);
  const [url,opts]=f.calls[0];assert.equal(new URL(url).hash,'');assert.equal(new URL(url).searchParams.get('lang'),'es');assert.ok(new URL(url).searchParams.has('ain-update-check'));
  assert.equal(opts.cache,'no-store');assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.ok(opts.signal);
});
test('new revision offers consent; only Update navigates and preserves language/hash/data',async t=>{
  const f=fixture(t);await settle();const previous=f.doc.querySelector('a');previous.focus();
  f.set(response(B));await f.api.check();const banner=f.banner();assert.equal(banner.hidden,false);assert.match(banner.textContent,/nueva versión/);assert.equal(f.doc.activeElement,previous);assert.equal(banner.querySelector('[role="status"]').getAttribute('aria-live'),'polite');
  assert.deepEqual(f.navigations,[]);assert.deepEqual(f.storage(),f.before);
  banner.querySelector('button').click();assert.equal(f.navigations.length,1);const target=new URL(f.navigations[0]);assert.equal(target.searchParams.get('ain-version'),B);assert.equal(target.searchParams.get('lang'),'es');assert.equal(target.hash,'#contact');assert.deepEqual(f.storage(),f.before);
});
test('Later suppresses this revision in memory and a subsequent release can notify',async t=>{
  const f=fixture(t);await settle();f.set(response(B));await f.api.check();f.banner().querySelectorAll('button')[1].click();assert.equal(f.banner().hidden,true);
  await f.api.check();assert.equal(f.banner().hidden,true);assert.deepEqual(f.navigations,[]);
  f.set(response(C));await f.api.check();assert.equal(f.banner().hidden,false);assert.equal(f.doc.querySelectorAll('.ain-update-notice').length,1);assert.deepEqual(f.storage(),f.before);
  f.set(response(A));await f.api.check();assert.equal(f.banner().hidden,true);
});
test('notice follows language changes without fetching or losing dismissal',async t=>{
  const f=fixture(t);await settle();f.set(response(B));await f.api.check();const calls=f.calls.length;
  f.doc.documentElement.lang='en';f.win.dispatchEvent(new f.win.CustomEvent('ainimation:language'));assert.match(f.banner().textContent,/new version/);assert.equal(f.banner().querySelector('button').textContent,'Update');assert.equal(f.banner().querySelectorAll('button')[1].textContent,'Later');assert.equal(f.calls.length,calls);
  f.doc.documentElement.lang='es';await settle();assert.match(f.banner().textContent,/Actualizar/);
});
test('hidden or offline tabs do not poll; return to visibility/online checks immediately',async t=>{
  const f=fixture(t);await settle();const base=f.calls.length;
  Object.defineProperty(f.doc,'visibilityState',{configurable:true,value:'hidden'});f.tick();f.doc.dispatchEvent(new f.win.Event('visibilitychange'));await settle();assert.equal(f.calls.length,base);
  Object.defineProperty(f.doc,'visibilityState',{configurable:true,value:'visible'});Object.defineProperty(f.win.navigator,'onLine',{configurable:true,value:false});await f.api.check();assert.equal(f.calls.length,base);
  Object.defineProperty(f.win.navigator,'onLine',{configurable:true,value:true});f.set(response(B));f.doc.dispatchEvent(new f.win.Event('visibilitychange'));await settle();assert.equal(f.banner().hidden,false);
  f.win.dispatchEvent(new f.win.Event('online'));await settle();assert.equal(f.calls.length,base+2);
});
test('invalid HTML, error responses and failed network do not offer an update',async t=>{
  const f=fixture(t);await settle();
  for(const result of [response(B,{ok:false}),response(B,{headers:new Headers({'content-type':'application/json'})}),response('',{text:async()=>'<html>maintenance</html>'}),response('<script>bad</script>'),response(B,{text:async()=>{throw Error('offline');}})]){f.set(result);await f.api.check();assert.equal(f.banner(),null);}
  assert.deepEqual(f.navigations,[]);assert.deepEqual(f.storage(),f.before);
});
test('overlapping requests are coalesced; destroy ignores late responses and removes listeners',async t=>{
  let resolve;const f=fixture(t,{fetcher:()=>new Promise(done=>resolve=done)});assert.equal(f.calls.length,1);await f.api.check();f.tick();assert.equal(f.calls.length,1);
  const signal=f.calls[0][1].signal;f.api.destroy();assert.equal(signal.aborted,true);resolve(response(B));await settle();assert.equal(f.banner(),null);f.win.dispatchEvent(new f.win.Event('online'));assert.equal(f.calls.length,1);
});
test('duplicate module startup reuses the same checker; editor pages and missing markers are excluded',async t=>{
  const f=fixture(t);await settle();assert.equal(startUpdateNotice(f.options),f.api);assert.equal(f.calls.length,1);
  const editor=fixture(t,{url:'https://www.ainimation.studio/sites/'});assert.equal(editor.api,null);assert.equal(editor.calls.length,0);
  const missing=fixture(t,{revision:''});assert.equal(missing.api,null);assert.equal(missing.calls.length,0);
});
test('page revision is stable, detects HTML-only changes and changes to asset tokens',()=>{
  const source='<html><head><script src="/assets/app.js?v=aaa"></script></head><body>Login</body></html>';
  const first=stampPageRevision(source);assert.equal(stampPageRevision(first),first);
  const revision=html=>html.match(/ain-page-revision" content="([a-f0-9]{16})/)[1];
  assert.notEqual(revision(stampPageRevision(source.replace('Login','Cuenta'))),revision(first));
  assert.notEqual(revision(stampPageRevision(source.replace('?v=aaa','?v=bbb'))),revision(first));
  assert.equal((stampPageRevision(first).match(/name="ain-page-revision"/g)||[]).length,1);
});
test('only the home page loads the checker and stylesheet',()=>{
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(index,/src="\/assets\/update-notice\.mjs/);assert.match(index,/href="\/assets\/update-notice\.css/);
  for(const file of ['studio.html','studio-live.html','sites/index.html','interactivos/index.html','capsulas/index.html','presentaciones/editor/index.html'])assert.ok(!readFileSync(new URL('../'+file,import.meta.url),'utf8').includes('update-notice.mjs'),file);
});
