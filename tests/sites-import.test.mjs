import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {importURL,publicURL,publicIP,boundedText,default as worker} from '../site-import/worker.mjs';
const dom=new JSDOM('<!doctype html>',{url:'https://www.ainimation.studio/sites/'});
globalThis.window=dom.window;globalThis.DOMParser=dom.window.DOMParser;
const {importSite,cssURLs}=await import('../sites/import.mjs');
const {createSiteSession,normalizeURL,validateSite}=await import('../sites/model.mjs');
const {buildDocument}=await import('../sites/preview.mjs');
const sample=`<!doctype html><title>Prueba</title><link rel="stylesheet" href="/main.css"><style>body{background:#030b09}</style><h1>Hola <em>mundo</em></h1><img src="/cover.jpg" alt="Portada" onerror="alert(1)"><video><source src="/film.mp4"></video><svg><path d="M0 0 L20 20"/></svg><a href="/otra">Otra</a><script>top.location='https://evil.test'</script><iframe src="https://evil.test"></iframe><form><input name="secret"></form>`;
async function fixture(){return importSite('www.portaventuranext.com',{read:async(url,kind)=>({url,kind,content:kind==='css'?'.cover{background:url(./wall.jpg)}':sample})});}
test('normaliza dominios y rechaza protocolos y credenciales',()=>{
  assert.equal(normalizeURL('www.portaventuranext.com'),'https://www.portaventuranext.com/');
  for(const u of ['javascript:alert(1)','http://example.org','https://a:b@example.org'])assert.throws(()=>normalizeURL(u));
});
test('sólo URL públicas HTTPS, sin IP, puerto ni red privada',()=>{
  for(const u of ['https://127.0.0.1','https://2130706433','https://[::1]','https://app.local','https://a.internal','http://public.org','https://public.org:8443','https://u:p@public.org'])assert.throws(()=>publicURL(u));
  assert.equal(publicURL('https://www.portaventuranext.com').hostname,'www.portaventuranext.com');
  for(const ip of ['10.0.0.1','100.64.0.1','127.1.1.1','169.254.169.254','192.168.1.1','172.16.0.1','198.18.0.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1'])assert.equal(publicIP(ip),false,ip);
  for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(publicIP(ip),true);
});
test('comprueba cada redirección y no transmite credenciales',async()=>{
  const hosts=[],calls=[];
  const result=await importURL('https://public.org', 'html',async(url,options)=>{
    calls.push({url,options});return calls.length===1?new Response(null,{status:302,headers:{location:'https://other.org/page'}}):new Response('<h1>sí</h1>',{headers:{'content-type':'text/html'}});
  },async h=>hosts.push(h));
  assert.deepEqual(hosts,['public.org','other.org']);assert.equal(result.url,'https://other.org/page');
  assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.headers.cookie,undefined);
  await assert.rejects(importURL('https://public.org','html',async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1'}}),async()=>{}));
});
test('DNS público se comprueba antes de leer HTML',async()=>{
  let targets=0;await assert.rejects(importURL('https://public.org','html',async url=>{
    if(String(url).startsWith('https://cloudflare-dns.com'))return Response.json({Status:0,Answer:[{type:1,data:'10.0.0.1'}]});targets++;return new Response('');
  }),/servidor público/);assert.equal(targets,0);
});
test('rechaza contenido no HTML y limita bytes recibidos',async()=>{
  await assert.rejects(importURL('https://public.org','html',async()=>new Response('{}',{headers:{'content-type':'application/json'}}),async()=>{}),/HTML/);
  await assert.rejects(boundedText(new Response('x',{headers:{'content-length':'2000001'}})),/2 MB/);
  await assert.rejects(boundedText(new Response('x'.repeat(2000001))),/2 MB/);
});
test('CORS, métodos y límite de peticiones del worker',async()=>{
  assert.equal((await worker.fetch(new Request('https://importer/import',{headers:{origin:'https://evil.org'}}))).status,403);
  assert.equal((await worker.fetch(new Request('https://importer/import',{method:'POST',headers:{origin:'https://www.ainimation.studio'}}))).status,404);
  const r=await worker.fetch(new Request('https://importer/import',{headers:{origin:'https://www.ainimation.studio'}}),{IMPORT_LIMITER:{limit:async()=>({success:false})}});
  assert.equal(r.status,429);assert.equal(r.headers.get('access-control-allow-origin'),'https://www.ainimation.studio');
});
test('importa contenido real, CSS y medios con URL absolutas',async()=>{
  const p=await fixture();assert.equal(p.title,'Prueba');assert.ok(p.items.some(i=>i.value==='Hola '));
  assert.equal(p.items.find(i=>i.type==='image').value,'https://www.portaventuranext.com/cover.jpg');
  assert.equal(p.items.find(i=>i.type==='video').value,'https://www.portaventuranext.com/film.mp4');
  assert.ok(p.items.some(i=>i.type==='graphic'));assert.ok(p.html.includes('https://www.portaventuranext.com/wall.jpg'));
  assert.ok(p.links.includes('https://www.portaventuranext.com/otra'));assert.ok(p.warnings.length);
});
test('aísla HTML activo, también al reabrir un proyecto alterado',async()=>{
  const p=await fixture();p.html+='<script>alert(1)</script><iframe src="https://evil.org"></iframe><img src=x onerror=alert(1)><meta http-equiv=refresh content="0;url=https://evil.org">';
  const output=buildDocument(p),doc=new DOMParser().parseFromString(output,'text/html');
  assert.equal(doc.querySelectorAll('script,iframe,form,input,[onerror],[srcdoc]').length,0);
  assert.ok(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("script-src 'none'"));
  assert.equal(doc.querySelectorAll('meta[http-equiv="refresh"]').length,0);
});
test('la vista sólo ejecuta su puente con nonce y sin acceso al origen',async()=>{
  const doc=new DOMParser().parseFromString(buildDocument(await fixture(),{interactive:true,channel:'qa'}),'text/html');
  assert.equal(doc.querySelectorAll('script').length,1);assert.ok(doc.querySelector('script').getAttribute('nonce'));
  assert.ok(doc.querySelector('meta[http-equiv]').content.includes("connect-src 'none'"));
});
test('editar, animar, deshacer, rehacer y recuperar una copia',async()=>{
  const p=await fixture(),session=createSiteSession(p,p),id=p.items.find(i=>i.type==='text').id;
  assert.equal(session.canUndo,false);session.edit(id,{value:'Nueva portada',animation:'rise',duration:2,delay:.4});
  assert.ok(buildDocument(session.draft).includes('Nueva portada'));assert.ok(buildDocument(session.draft).includes('data-ain-animation="rise"'));
  session.undo();assert.equal(session.draft.items.find(i=>i.id===id).value,'Hola ');session.redo();
  const restored=createSiteSession(p,JSON.parse(JSON.stringify(session.draft)));assert.equal(restored.draft.items.find(i=>i.id===id).value,'Nueva portada');
  assert.throws(()=>session.edit(id,{animation:'evil'}));assert.throws(()=>session.edit(id,{duration:Infinity}));
});
test('reemplaza imagen y vídeo, añade medios y conserva el original',async()=>{
  const p=await fixture(),session=createSiteSession(p);
  const image=p.items.find(i=>i.type==='image');session.edit(image.id,{value:'https://media.org/new.jpg',alt:'Nueva imagen'});
  const video=p.items.find(i=>i.type==='video');session.edit(video.id,{value:'https://media.org/new.mp4'});
  session.addMedia('image','https://media.org/added.jpg');session.addMedia('video','https://media.org/added.mp4');
  const doc=new DOMParser().parseFromString(buildDocument(session.draft),'text/html');
  assert.equal(doc.querySelector('img').getAttribute('src'),'https://media.org/new.jpg');assert.equal(doc.querySelector('video').getAttribute('src'),'https://media.org/new.mp4');
  assert.equal(doc.querySelectorAll('#ain-added-media img,#ain-added-media video').length,2);assert.equal(session.original.items.length,p.items.length);
  assert.throws(()=>session.edit(image.id,{value:'javascript:alert(1)'}));
});
test('CSS convierte rutas y retira imports; rechaza paquetes incompatibles',async()=>{
  assert.equal(cssURLs('@import "x.css";a{background:url(./x.png)}','https://public.org/path/'),'a{background:url("https://public.org/path/x.png")}');
  const p=await fixture();p.items[0].duration=-1;assert.throws(()=>validateSite(p));
});
