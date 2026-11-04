import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {prepareLocalFile,createMediaLibrary,verifyMediaRecords,sniffMedia,importMedia,exportMedia,exportMediaURLs,referencedMedia,MAX_IMAGE,MAX_VIDEO,MAX_LIBRARY} from '../sites/media.mjs';
import {createSiteSession} from '../sites/model.mjs';
import {mediaDropReplacement} from '../sites/drop.mjs';
const dom=new JSDOM('<!doctype html>');globalThis.window=dom.window;globalThis.DOMParser=dom.window.DOMParser;
globalThis.FileReader=class {readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();}).catch(()=>this.onerror());}};
const {buildDocument}=await import('../sites/preview.mjs');
const png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
const mp4=new Uint8Array([0,0,0,24,...Buffer.from('ftypisom'),0,0,0,0,...Buffer.from('isommp42')]);
const skip=async()=>{};
const file=(bytes,name='prueba.png',type='application/octet-stream')=>new File([bytes],name,{type});
async function image(){return prepareLocalFile(file(png),{inspect:skip});}
async function video(){return prepareLocalFile(file(mp4,'prueba.mp4'),{inspect:skip});}
function project(){return {format:'ainimation-imported-site',version:1,title:'PortAventura · prueba',url:'https://www.portaventuranext.com/',html:'<!doctype html><html><head><title>PortAventura</title></head><body><h1><span data-ain-id="ain-0">PortAventura</span></h1></body></html>',warnings:[],links:[],items:[{id:'ain-0',type:'text',value:'PortAventura',label:'PortAventura',alt:'',animation:'none',duration:1.2,delay:0}]};}
test('reconoce archivos por sus bytes, sin confiar en extensión o MIME',async()=>{
  assert.equal(sniffMedia(png),'image/png');assert.equal(sniffMedia(mp4),'video/mp4');
  const a=await prepareLocalFile(file(png,'falsa.html','text/html'),{inspect:skip});assert.equal(a.mime,'image/png');assert.match(a.id,/^ain-local:[a-f0-9]{64}$/);
  await assert.rejects(prepareLocalFile(file('<svg onload="alert(1)"></svg>','falsa.png','image/png'),{inspect:skip}),/Formato/);
});
test('rechaza vacío, tamaño, tipo equivocado y medios que no se pueden abrir',async()=>{
  await assert.rejects(prepareLocalFile(file('')),/vacío/);
  await assert.rejects(prepareLocalFile({size:MAX_VIDEO+1,arrayBuffer:async()=>{}}),/50 MB/);
  await assert.rejects(prepareLocalFile({size:MAX_IMAGE+1,arrayBuffer:async()=>{},slice:()=>new Blob([png])},{inspect:skip}),/10 MB/);
  await assert.rejects(prepareLocalFile(file(png),{expected:'video',inspect:skip}),/vídeo/);
  await assert.rejects(prepareLocalFile(file(png),{inspect:async()=>{throw Error('No abre');}}),/No abre/);
});
test('deduplica bytes y conserva ambas instancias del medio en el proyecto',async()=>{
  const a=await image(),lib=createMediaLibrary([a]);lib.add([await image()]);assert.equal(lib.size,a.size);
  const s=createSiteSession(project());s.addMediaBatch([{type:a.type,value:a.id,label:a.name},{type:a.type,value:a.id,label:a.name}]);
  assert.equal(referencedMedia(s.draft).size,1);assert.equal(s.draft.items.length,3);s.undo();assert.equal(s.draft.items.length,1);s.redo();assert.equal(s.draft.items.length,3);
  assert.equal(lib.records(referencedMedia(s.draft)).length,1);
});
test('la carga múltiple es un paso reversible y rechaza lotes incompletos',async()=>{
  const s=createSiteSession(project()),a=await image(),v=await video();
  s.addMediaBatch([{type:'image',value:a.id},{type:'video',value:v.id}]);assert.equal(s.draft.items.length,3);s.undo();assert.equal(s.draft.items.length,1);s.redo();
  const before=s.draft;assert.throws(()=>s.addMediaBatch([{type:'image',value:a.id},{type:'text',value:'inválido'}]));assert.deepEqual(s.draft,before);
});
test('sustituye medios locales sin cambiar el original ni romper el historial',async()=>{
  const s=createSiteSession(project()),a=await image(),v=await video();
  const id=s.addMedia('image','https://public.org/original.jpg');s.edit(id,{value:a.id});s.edit(id,{animation:'float'});
  assert.equal(s.draft.items.find(i=>i.id===id).value,a.id);assert.equal(s.original.items.length,1);
  s.undo();s.undo();assert.equal(s.draft.items.find(i=>i.id===id).value,'https://public.org/original.jpg');s.redo();assert.equal(s.draft.items.find(i=>i.id===id).value,a.id);
});
test('la sustitución por arrastre conserva identidad, descripción y animación en un paso reversible',async()=>{
  const s=createSiteSession(project()),a=await image();
  const id=s.addMedia('image','https://public.org/original.jpg');s.edit(id,{alt:'Portada accesible',animation:'rise',duration:2,delay:.4});
  const before=s.draft,options=mediaDropReplacement(s.draft,id,{source:'draft',id});
  await assert.rejects(prepareLocalFile(file(mp4,'clip.mp4'),{expected:options.expected,inspect:skip}),/imagen/);assert.deepEqual(s.draft,before);
  s.edit(options.replace,{value:a.id});const current=s.draft.items.find(i=>i.id===id);
  assert.deepEqual(current,{...before.items.find(i=>i.id===id),value:a.id});assert.deepEqual(s.original,createSiteSession(project()).original);
  s.undo();assert.deepEqual(s.draft,before);s.redo();assert.equal(s.draft.items.find(i=>i.id===id).value,a.id);
});
test('reabre blobs conservados y detecta corrupción e identidades falsas',async()=>{
  const a=await image(),lib=await verifyMediaRecords(structuredClone([a]),{inspect:skip});assert.equal(lib.records()[0].id,a.id);
  await assert.rejects(verifyMediaRecords([{...a,id:'ain-local:'+'0'.repeat(64)}],{inspect:skip}),/dañado/);
  await assert.rejects(verifyMediaRecords([a,a],{inspect:skip}),/repite/);
  assert.throws(()=>createMediaLibrary([{...a,size:a.size+1}]),/incompatible/);
});
test('límites de biblioteca y archivos perdidos no se aplican parcialmente',async()=>{
  const a=await image(),lib=createMediaLibrary([a]);assert.throws(()=>lib.records(new Set(['ain-local:'+'0'.repeat(64)])),/Falta/);
  const big=new Blob([new Uint8Array(MAX_VIDEO)],{type:'video/mp4'}),b={id:'ain-local:'+'1'.repeat(64),type:'video',mime:'video/mp4',name:'grande.mp4',size:MAX_VIDEO,blob:big};
  assert.throws(()=>lib.add([b,{...b,id:'ain-local:'+'2'.repeat(64)}]),/100 MB/);assert.equal(lib.size,a.size);
});
test('descarga y reapertura empaquetan cada archivo una vez sin URL blob temporal',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project());s.addMediaBatch([{type:a.type,value:a.id},{type:v.type,value:v.id}]);
  const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);assert.ok(!JSON.stringify(entries).includes('blob:'));
  const restored=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip});assert.equal(restored.size,a.size+v.size);
  assert.deepEqual(new Uint8Array(await restored.records()[0].blob.arrayBuffer()),png);
  const corrupted=structuredClone(entries);corrupted[0].data=corrupted[0].data.slice(0,-1)+'A';await assert.rejects(importMedia(corrupted,{inspect:skip}));
});
test('preview usa blobs aislados y HTML exportado incluye imagen y vídeo',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project());s.addMediaBatch([{type:a.type,value:a.id},{type:v.type,value:v.id}]);
  const preview=buildDocument(s.draft,{interactive:true,media:lib.previewMedia(s.draft)});assert.match(preview,/data-ain-local="ain-local:/);assert.ok(!/src="blob:/.test(preview));assert.throws(()=>buildDocument(s.draft),/Falta/);
  const html=buildDocument(s.draft,{media:await exportMediaURLs(lib,s.draft)});assert.match(html,/src="data:image\/png;base64,/);assert.match(html,/src="data:video\/mp4;base64,/);assert.ok(!/src="blob:/.test(html));
  const doc=new DOMParser().parseFromString(html,'text/html');assert.equal(doc.querySelectorAll('script').length,0);assert.ok(doc.querySelector('meta[http-equiv]').content.includes("script-src 'none'"));assert.equal(doc.head.firstElementChild.getAttribute('charset'),'utf-8');
  lib.dispose();
});
test('un medio no puede resolverse como otro tipo ni como documento activo',async()=>{
  const a=await image(),s=createSiteSession(project());s.addMedia('video',a.id);
  assert.throws(()=>buildDocument(s.draft,{media:new Map([[a.id,{type:'image',url:'blob:local'}]])}),/compatible/);
  assert.throws(()=>buildDocument(s.draft,{media:new Map([[a.id,{type:'video',url:'data:text/html,<script>alert(1)</script>'}]])}),/compatible/);
});
test('retirar un medio añadido es un paso reversible que conserva identidad y propiedades',()=>{
  const s=createSiteSession(project()),imageID=s.addMedia('image','https://media.org/cover.jpg'),videoID=s.addMedia('video','https://media.org/clip.mp4');
  s.edit(imageID,{alt:'Portada accesible',animation:'rise',duration:2,delay:.4});s.edit(videoID,{animation:'fade',duration:1.8});
  const before=s.draft,original=s.original;assert.equal(s.canRemoveMedia(imageID),true);assert.equal(s.canRemoveMedia(videoID),true);
  s.removeMedia(imageID);const removed=s.draft;assert.equal(removed.items.some(i=>i.id===imageID),false);assert.deepEqual(removed.items.find(i=>i.id===videoID),before.items.find(i=>i.id===videoID));
  let doc=new DOMParser().parseFromString(buildDocument(removed),'text/html');assert.equal(doc.querySelectorAll('#ain-added-media img').length,0);assert.equal(doc.querySelectorAll('#ain-added-media video').length,1);
  s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,removed);s.removeMedia(videoID);assert.deepEqual(s.draft,original);
  s.undo();assert.deepEqual(s.draft,removed);s.redo();assert.deepEqual(s.draft,original);assert.deepEqual(s.original,original);
  doc=new DOMParser().parseFromString(buildDocument(s.draft),'text/html');assert.equal(doc.querySelector('#ain-added-media'),null);
});
test('la retirada rechaza componentes originales, marcas falsas, otros tipos e IDs desconocidos sin tocar el historial',()=>{
  const p=project();p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});
  const saved=structuredClone(p);saved.items.push({...p.items[1],id:'ain-2',inserted:'true'},{...p.items[0],id:'ain-3',inserted:true},{...p.items[1],id:'ain-4',type:'background'});
  const s=createSiteSession(p,saved),before=s.draft,undo=s.canUndo,redo=s.canRedo;
  for(const id of ['ain-0','ain-1','ain-2','ain-3','ain-4','ain-999','']){assert.equal(s.canRemoveMedia(id),false);assert.throws(()=>s.removeMedia(id),/Sólo puedes retirar/);}
  assert.deepEqual(s.draft,before);assert.equal(s.canUndo,undo);assert.equal(s.canRedo,redo);assert.deepEqual(s.original,p);
});
test('retirar instancias conserva archivos compartidos; el guardado y paquete sólo incluyen las referencias vigentes',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project());
  const [first,second,clip]=s.addMediaBatch([{type:'image',value:a.id},{type:'image',value:a.id},{type:'video',value:v.id}]);
  s.removeMedia(first);let assets=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(assets.length,2);
  const reopen=await importMedia(JSON.parse(JSON.stringify(assets)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));
  assert.equal(restored.canRemoveMedia(second),true);assert.equal(restored.canRemoveMedia(first),false);assert.deepEqual(restored.draft,s.draft);
  let html=buildDocument(restored.draft,{media:await exportMediaURLs(reopen,restored.draft)}),doc=new DOMParser().parseFromString(html,'text/html');assert.equal(doc.querySelectorAll('#ain-added-media img').length,1);assert.equal(doc.querySelectorAll('#ain-added-media video').length,1);
  s.removeMedia(clip);assets=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.deepEqual(assets.map(a=>a.id),[a.id]);
  s.removeMedia(second);assert.equal((await exportMedia(lib,referencedMedia(s.original,s.draft))).length,0);
  assert.equal(lib.size,a.size+v.size);s.undo();s.undo();s.undo();
  html=buildDocument(s.draft,{media:await exportMediaURLs(lib,s.draft)});doc=new DOMParser().parseFromString(html,'text/html');assert.equal(doc.querySelectorAll('#ain-added-media img').length,2);assert.equal(doc.querySelectorAll('#ain-added-media video').length,1);
  assert.equal(s.draft.items.find(i=>i.id===first).value,a.id);
});
test('se puede retirar el último componente y volver a añadir después de deshacer sin conservar una rama de rehacer',()=>{
  const p=project();p.items=[];p.html='<!doctype html><html><body></body></html>';const s=createSiteSession(p),id=s.addMedia('image','https://media.org/cover.jpg');
  s.removeMedia(id);assert.equal(s.draft.items.length,0);assert.doesNotThrow(()=>buildDocument(s.draft));s.undo();assert.equal(s.draft.items[0].id,id);s.redo();s.undo();
  s.addMedia('video','https://media.org/clip.mp4');assert.equal(s.canRedo,false);assert.equal(s.draft.items.length,2);
});
