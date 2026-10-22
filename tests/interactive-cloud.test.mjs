import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCloud,syncLibrary} from '../assets/interactive-cloud.mjs';
import {template,validate,playerHtml} from '../assets/interactive-project.mjs';
import {LIBRARY_KEY} from '../assets/interactive-library.mjs';
import {route} from '../cloud-library/worker.mjs';
const record=()=>({id:'one',revision:1,updatedAt:'2026-10-20',project:template()});
const library=r=>({version:1,activeId:r.id,projects:[r]});
test('un segundo dispositivo recupera proyectos y mantiene el suyo',()=>{const own=record();own.id='two';const out=mergeCloud(library(own),[record()]);assert.equal(out.library.projects.length,2);assert.equal(out.uploads[0].id,'two');});
test('ediciones simultáneas conservan ambas versiones y el proyecto activo local',()=>{const r=record(),local=structuredClone(r),remote=structuredClone(r);local.project.title='Local';remote.project.title='Móvil';remote.revision=2;const out=mergeCloud(library(local),[remote],{one:{revision:1,content:JSON.stringify(r.project)}});assert.equal(out.library.projects.length,2);assert.equal(out.library.projects.find(x=>x.id==='one').project.title,'Móvil');assert.equal(out.library.projects.find(x=>x.id===out.library.activeId).project.title,'Local · copia de este equipo');});
test('un cambio remoto sustituye solo la copia local sin editar',()=>{const r=record(),remote=structuredClone(r);remote.project.title='Móvil';remote.revision=2;const out=mergeCloud(library(r),[remote],{one:{revision:1,content:JSON.stringify(r.project)}});assert.equal(out.library.projects.length,1);assert.equal(out.library.projects[0].project.title,'Móvil');assert.equal(out.uploads.length,0);});
test('fallo de red conserva íntegra la biblioteca',async()=>{const original=JSON.stringify(library(record())),map=new Map([[LIBRARY_KEY,original]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};await assert.rejects(syncLibrary(storage,'https://example.test','token',async()=>{throw Error('offline');}));assert.equal(storage.getItem(LIBRARY_KEY),original);});
test('la API exige identidad y utiliza propietario verificado en las lecturas',async()=>{assert.equal((await route(new Request('https://test/projects'),{})).status,401);let bindings;const env={LIBRARY_DB:{prepare:()=>({bind:(...args)=>{bindings=args;return{all:async()=>({results:[]})};}})}};const response=await route(new Request('https://test/projects'),env,async()=> 'verified-user');assert.equal(response.status,200);assert.deepEqual(bindings,['verified-user']);});
test('una escritura con revisión obsoleta devuelve conflicto',async()=>{const env={LIBRARY_DB:{prepare:()=>({bind:()=>({run:async()=>({meta:{changes:0}})})})}};const response=await route(new Request('https://test/projects/one',{method:'PUT',body:JSON.stringify({project:template(),baseRevision:2})}),env,async()=> 'user');assert.equal(response.status,409);});
test('imágenes autocontenidas sobreviven la validación y exportación; SVG y URL ajena se rechazan',()=>{const p=template();p.scenes[0].image='data:image/png;base64,aGVsbG8=';assert.equal(validate(p).scenes[0].image,p.scenes[0].image);assert.match(playerHtml(p),/img-src data:/);p.scenes[0].image='https://example.test/tracking.png';assert.throws(()=>validate(p));p.scenes[0].image='data:image/svg+xml;base64,aGVsbG8=';assert.throws(()=>validate(p));});

test('Google exige firma válida, caducidad y cuenta autorizada en la vista previa',async()=>{
 const {authenticate}=await import('../cloud-library/worker.mjs');
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='test-key';
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 async function request(overrides={}){const head=encode({alg:'RS256',kid:'test-key'}),payload=encode({iss:'https://accounts.google.com',aud:'test-client',sub:'google-sub',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,email:'owner@example.test',email_verified:true,...overrides});const msg=head+'.'+payload;const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(msg));return new Request('https://test/projects',{headers:{authorization:'Bearer '+msg+'.'+Buffer.from(sig).toString('base64url')}});}
 const env={GOOGLE_CLIENT_ID:'test-client',PREVIEW_EMAILS:'owner@example.test'};
 try{assert.equal(await authenticate(await request(),env),'google-sub');for(const invalid of [{exp:0},{exp:null},{aud:'other'},{iss:'https://evil.test'},{email:'other@example.test'},{email_verified:false}])await assert.rejects(authenticate(await request(invalid),env));const forged=await request();const header=forged.headers.get('authorization');forged.headers.set('authorization',header.slice(0,-8)+'AAAAAAAA');await assert.rejects(authenticate(forged,env));}finally{globalThis.fetch=original;}
});

test('sincronización con imágenes guarda bases compactas y conserva el cambio remoto sin duplicados',async()=>{const r=record();r.project.scenes[0].image='data:image/png;base64,'+'a'.repeat(400000);let cloud=structuredClone(r);const map=new Map([[LIBRARY_KEY,JSON.stringify(library(r))]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{const total=[...map.entries()].reduce((n,[key,val])=>n+(key===k?0:val.length),0)+v.length;if(total>1000000)throw Error('quota');map.set(k,v);}};const request=async()=>Response.json({account:'owner',projects:[cloud]});await syncLibrary(storage,'https://example.test','token',request);const bases=JSON.parse(map.get('ainimation:cloud:bases:https://example.test:owner'));assert.equal(bases.one.contentHash.length,64);assert.equal(bases.one.content,undefined);cloud.project.title='Desde móvil';cloud.revision++;const result=await syncLibrary(storage,'https://example.test','token',request);assert.equal(result.projects.length,1);assert.equal(result.projects[0].project.title,'Desde móvil');});

test('avisa del conflicto solo después de conservar ambas versiones, incluso si falla la subida',async()=>{
 for(const upload of [false,true]){
  const base=record(),local=structuredClone(base),remote=structuredClone(base);local.project.title='iPhone';remote.project.title='Ordenador';remote.revision=2;
  const map=new Map([[LIBRARY_KEY,JSON.stringify(library(local))],['ainimation:cloud:bases:https://example.test:owner',JSON.stringify({one:{revision:1,content:JSON.stringify(base.project)}})]]);
  const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};let conflicts;
  const result=syncLibrary(storage,'https://example.test','token',async(url,options)=>{if(options.method==='PUT')throw Error('offline al subir');return Response.json({account:'owner',projects:[remote]});},{upload,onConflicts:items=>{conflicts=items;const saved=JSON.parse(storage.getItem(LIBRARY_KEY));assert.equal(saved.projects.length,2);assert.equal(saved.projects.find(p=>p.id===items[0].copyId).project.title,'iPhone · copia de este equipo');}});
  if(upload)await assert.rejects(result,/offline al subir/);else await result;
  assert.equal(conflicts.length,1);assert.equal(conflicts[0].projectId,'one');
 }
});
test('recuperar un cambio remoto sin edición local no avisa de conflicto',async()=>{
 const base=record(),remote=structuredClone(base);remote.project.title='Ordenador';remote.revision=2;
 const map=new Map([[LIBRARY_KEY,JSON.stringify(library(base))],['ainimation:cloud:bases:https://example.test:owner',JSON.stringify({one:{revision:1,content:JSON.stringify(base.project)}})]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const out=await syncLibrary(storage,'https://example.test','token',async()=>Response.json({account:'owner',projects:[remote]}),{upload:false,onConflicts:()=>assert.fail('falso conflicto')});
 assert.equal(out.projects.length,1);assert.equal(out.projects[0].project.title,'Ordenador');
});
