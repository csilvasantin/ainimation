import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {prepareLocalFile,createMediaLibrary,verifyMediaRecords,sniffMedia,importMedia,exportMedia,exportMediaURLs,referencedMedia,MAX_IMAGE,MAX_VIDEO,MAX_LIBRARY} from '../sites/media.mjs';
import {createSiteSession,validateSite,DEFAULT_MEDIA_WIDTH,MIN_MEDIA_WIDTH,MAX_MEDIA_WIDTH} from '../sites/model.mjs';
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
test('duplicar imagen o vídeo añadido crea un ID nuevo y conserva todas sus propiedades en un paso reversible',()=>{
  for(const type of ['image','video']){
    const s=createSiteSession(project()),source=s.addMedia(type,'https://media.org/'+(type==='image'?'cover.jpg':'clip.mp4'));
    s.edit(source,{alt:'Descripción accesible',animation:'rise',duration:2.3,delay:.4});const before=s.draft,original=s.original,item=before.items.find(i=>i.id===source);
    assert.equal(s.canDuplicateMedia(source),true);const id=s.duplicateMedia(source),after=s.draft;
    assert.notEqual(id,source);assert.equal(before.items.some(i=>i.id===id),false);assert.deepEqual(after.items.find(i=>i.id===id),{...item,id});assert.equal(after.items.findIndex(i=>i.id===id),after.items.findIndex(i=>i.id===source)+1);
    assert.deepEqual(s.original,original);s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,after);
    s.edit(id,{alt:'Otra descripción',animation:'float'});assert.deepEqual(s.draft.items.find(i=>i.id===source),item);
  }
});
test('duplicar rechaza originales, marcas falsas y otros tipos sin cambiar el historial',()=>{
  const p=project();p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});
  const draft=structuredClone(p);draft.items.push({...p.items[1],id:'ain-2',inserted:'true'},{...p.items[0],id:'ain-3',inserted:true},{...p.items[1],id:'ain-4',type:'background'});
  const s=createSiteSession(p,draft),before=s.draft,undo=s.canUndo,redo=s.canRedo;
  for(const id of ['ain-0','ain-1','ain-2','ain-3','ain-4','ain-999','']){assert.equal(s.canDuplicateMedia(id),false);assert.throws(()=>s.duplicateMedia(id),/Sólo puedes duplicar/);}
  assert.deepEqual(s.draft,before);assert.equal(s.canUndo,undo);assert.equal(s.canRedo,redo);assert.deepEqual(s.original,p);
});
test('duplicar respeta el límite de 500 componentes sin aplicar cambios parciales',()=>{
  const p=project(),draft=structuredClone(p);
  for(let n=1;n<499;n++)draft.items.push({...p.items[0],id:'ain-'+n,type:'image',value:'https://media.org/cover.jpg',inserted:true});
  const s=createSiteSession(p,draft),id=s.duplicateMedia('ain-1');assert.equal(s.draft.items.length,500);assert.equal(id,'ain-499');const full=s.draft;
  assert.throws(()=>s.duplicateMedia('ain-1'),/Límite/);assert.deepEqual(s.draft,full);s.undo();assert.deepEqual(s.draft,draft);s.redo();assert.deepEqual(s.draft,full);
});
test('las instancias duplicadas comparten bytes y sobreviven a guardado, paquete, exportación y retirada independiente',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project());
  const [sourceImage,sourceVideo]=s.addMediaBatch([{type:'image',value:a.id},{type:'video',value:v.id}]);s.edit(sourceImage,{alt:'Foto compartida',animation:'zoom',duration:1.8,delay:.3});
  const copyImage=s.duplicateMedia(sourceImage),copyVideo=s.duplicateMedia(sourceVideo);assert.equal(lib.size,a.size+v.size);assert.equal(referencedMedia(s.draft).size,2);
  const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);const reopened=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));
  assert.deepEqual(restored.draft,s.draft);assert.equal(restored.draft.items.find(i=>i.id===copyImage).value,a.id);assert.equal(restored.draft.items.find(i=>i.id===copyVideo).value,v.id);
  const doc=new DOMParser().parseFromString(buildDocument(restored.draft,{media:await exportMediaURLs(reopened,restored.draft)}),'text/html');assert.equal(doc.querySelectorAll('#ain-added-media img').length,2);assert.equal(doc.querySelectorAll('#ain-added-media video').length,2);assert.equal(doc.querySelectorAll('script').length,0);
  restored.removeMedia(copyImage);assert.equal(restored.draft.items.find(i=>i.id===sourceImage).value,a.id);assert.equal((await exportMedia(reopened,referencedMedia(restored.original,restored.draft))).length,2);
});
test('subir y bajar medios añadidos conserva identidad y propiedades en un paso reversible',()=>{
  const s=createSiteSession(project()),[a,b,c]=s.addMediaBatch([{type:'image',value:'https://media.org/a.jpg'},{type:'video',value:'https://media.org/b.mp4'},{type:'image',value:'https://media.org/c.jpg'}]);
  s.edit(b,{alt:'Vídeo accesible',animation:'float',duration:2.4,delay:.3});const before=s.draft,original=s.original;
  assert.equal(s.canMoveMedia(a,-1),false);assert.equal(s.canMoveMedia(a,1),true);assert.equal(s.canMoveMedia(c,1),false);
  assert.equal(s.moveMedia(b,-1),true);const moved=s.draft;assert.deepEqual(moved.items.map(i=>i.id),['ain-0',b,a,c]);
  assert.deepEqual([...moved.items].sort((a,b)=>a.id.localeCompare(b.id)),[...before.items].sort((a,b)=>a.id.localeCompare(b.id)));
  s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,moved);assert.equal(s.moveMedia(b,1),true);assert.deepEqual(s.draft,before);assert.deepEqual(s.original,original);
});
test('ordenar no mueve originales intercalados ni admite marcas falsas, otros tipos o direcciones inválidas',()=>{
  const p=project();p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});
  const draft=structuredClone(p),a={...p.items[1],id:'ain-2'},b={...p.items[1],id:'ain-3',type:'video',value:'https://media.org/clip.mp4'},fake={...a,id:'ain-4',inserted:'true'},text={...p.items[0],id:'ain-5',inserted:true};
  draft.items=[p.items[0],a,p.items[1],fake,text,b];const s=createSiteSession(p,draft),before=s.draft;
  for(const id of ['ain-0','ain-1','ain-4','ain-5','ain-999']){assert.equal(s.canMoveMedia(id,1),false);assert.throws(()=>s.moveMedia(id,1),/Sólo puedes ordenar/);}
  for(const direction of [0,2,-2,'1',null,NaN]){assert.equal(s.canMoveMedia('ain-2',direction),false);assert.throws(()=>s.moveMedia('ain-2',direction),/Dirección/);}
  assert.deepEqual(s.draft,before);s.moveMedia('ain-3',-1);assert.deepEqual(s.draft.items.map(i=>i.id),['ain-0','ain-3','ain-1','ain-4','ain-5','ain-2']);
  for(const index of [0,2,3,4])assert.deepEqual(s.draft.items[index],before.items[index]);assert.deepEqual(s.original,p);
});
test('los límites y un único medio no crean pasos de historial ni descartan Rehacer',()=>{
  const s=createSiteSession(project()),a=s.addMedia('image','https://media.org/a.jpg');assert.equal(s.canMoveMedia(a,-1),false);assert.equal(s.canMoveMedia(a,1),false);
  const before=s.draft;assert.equal(s.moveMedia(a,-1),false);assert.equal(s.moveMedia(a,1),false);s.undo();assert.deepEqual(s.draft,project());s.redo();assert.deepEqual(s.draft,before);
  const b=s.addMedia('video','https://media.org/b.mp4');s.moveMedia(a,1);s.undo();assert.equal(s.canRedo,true);assert.equal(s.moveMedia(a,-1),false);assert.equal(s.canRedo,true);s.redo();assert.deepEqual(s.draft.items.map(i=>i.id),['ain-0',b,a]);
});
test('el orden de medios locales se conserva al guardar, empaquetar y exportar sin duplicar archivos',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project()),[first,clip,last]=s.addMediaBatch([{type:'image',value:a.id},{type:'video',value:v.id},{type:'image',value:a.id}]);
  s.edit(last,{alt:'Foto final',animation:'rise',duration:1.8,delay:.2});s.moveMedia(last,-1);s.moveMedia(last,-1);const order=[last,first,clip];
  assert.equal(lib.size,a.size+v.size);const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);
  const reopened=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));assert.deepEqual(restored.draft,s.draft);
  for(const options of [{interactive:true,media:reopened.previewMedia(restored.draft)},{media:await exportMediaURLs(reopened,restored.draft)}]){
    const doc=new DOMParser().parseFromString(buildDocument(restored.draft,options),'text/html');assert.deepEqual([...doc.querySelectorAll('#ain-added-media [data-ain-id]')].map(e=>e.dataset.ainId),order);
    const el=doc.querySelector('[data-ain-id="'+last+'"]');assert.equal(el.alt,'Foto final');assert.equal(el.dataset.ainAnimation,'rise');
  }
});
test('el ancho de imagen y vídeo añadido cambia en un paso reversible y el valor inicial no crea cambios',()=>{
  for(const type of ['image','video']){
    const s=createSiteSession(project()),id=s.addMedia(type,'https://media.org/'+(type==='image'?'cover.jpg':'clip.mp4')),before=s.draft;
    assert.equal(s.canSetMediaWidth(id),true);s.edit(id,{maxWidth:DEFAULT_MEDIA_WIDTH});assert.deepEqual(s.draft,before);s.undo();assert.deepEqual(s.draft,s.original);s.redo();
    s.edit(id,{maxWidth:320});const after=s.draft;assert.deepEqual(after.items.find(i=>i.id===id),{...before.items.find(i=>i.id===id),maxWidth:320});
    s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,after);s.edit(id,{maxWidth:DEFAULT_MEDIA_WIDTH});assert.deepEqual(s.draft,before);s.undo();assert.deepEqual(s.draft,after);
  }
});
test('el ancho rechaza valores vacíos, fracciones, límites y paquetes manipulados sin cambios parciales',()=>{
  const s=createSiteSession(project()),id=s.addMedia('image','https://media.org/cover.jpg');
  for(const maxWidth of [MIN_MEDIA_WIDTH,MAX_MEDIA_WIDTH]){s.edit(id,{maxWidth});assert.equal(s.draft.items.find(i=>i.id===id).maxWidth,maxWidth);}
  const before=s.draft;
  for(const maxWidth of [0,MIN_MEDIA_WIDTH-1,MAX_MEDIA_WIDTH+1,1.5,NaN,Infinity,'320','320px;position:fixed',null,undefined]){
    assert.throws(()=>s.edit(id,{maxWidth}),/ancho/);assert.deepEqual(s.draft,before);const draft=structuredClone(before);draft.items.find(i=>i.id===id).maxWidth=maxWidth;assert.throws(()=>validateSite(draft),/ancho/);
  }
  s.undo();assert.equal(s.draft.items.find(i=>i.id===id).maxWidth,MIN_MEDIA_WIDTH);
});
test('el ancho no se edita ni se aplica a originales, otros tipos o marcas de inserción falsas',()=>{
  const p=project();p.html=p.html.replace('</body>','<img data-ain-id="ain-1" style="width:123px;height:auto"></body>');p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});
  const draft=structuredClone(p);draft.items.push({...p.items[1],id:'ain-2',inserted:'true'},{...p.items[0],id:'ain-3',inserted:true},{...p.items[1],id:'ain-4',type:'background'});const s=createSiteSession(p,draft),before=s.draft;
  for(const id of ['ain-0','ain-1','ain-2','ain-3','ain-4']){assert.equal(s.canSetMediaWidth(id),false);assert.throws(()=>s.edit(id,{maxWidth:320}),/no editable/);}
  assert.deepEqual(s.draft,before);assert.deepEqual(s.original,p);const doc=new DOMParser().parseFromString(buildDocument(s.original),'text/html');assert.equal(doc.querySelector('img').style.width,'123px');
  for(const id of ['ain-0','ain-2','ain-3','ain-4']){const bad=structuredClone(draft);bad.items.find(i=>i.id===id).maxWidth=320;assert.throws(()=>validateSite(bad),/ancho/);}
});
test('guardar, duplicar, ordenar y exportar conservan anchos y archivos sin cambiar animaciones ni referencias',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project()),[photo,clip]=s.addMediaBatch([{type:'image',value:a.id},{type:'video',value:v.id}]);
  s.edit(photo,{alt:'Foto de prueba',animation:'rise',duration:1.8,delay:.2});const before=s.draft;s.edit(photo,{maxWidth:320});s.edit(clip,{maxWidth:480});
  for(const old of before.items){const now=s.draft.items.find(i=>i.id===old.id),{maxWidth,...rest}=now;assert.deepEqual(rest,old);}
  const copy=s.duplicateMedia(photo);s.moveMedia(copy,1);assert.equal(s.draft.items.find(i=>i.id===copy).maxWidth,320);
  const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);assert.equal(lib.size,a.size+v.size);
  const reopened=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));assert.deepEqual(restored.draft,s.draft);
  const html=buildDocument(restored.draft,{media:await exportMediaURLs(reopened,restored.draft)}),doc=new DOMParser().parseFromString(html,'text/html');
  for(const [id,width]of [[photo,320],[clip,480],[copy,320]]){const el=doc.querySelector('[data-ain-id="'+id+'"]');assert.equal(el.style.width,'min(100%, '+width+'px)');assert.equal(el.style.height,'auto');}
  assert.equal(doc.querySelectorAll('script').length,0);const legacy=createSiteSession(project());const id=legacy.addMedia('image','https://media.org/old.jpg');const oldDoc=new DOMParser().parseFromString(buildDocument(legacy.draft),'text/html');assert.equal(oldDoc.querySelector('[data-ain-id="'+id+'"]').style.width,'min(100%, 640px)');
});
test('ocultar y mostrar imagen o vídeo añadido es un paso reversible que conserva todas las propiedades',()=>{
  for(const type of ['image','video']){
    const s=createSiteSession(project()),id=s.addMedia(type,'https://media.org/'+(type==='image'?'cover.jpg':'clip.mp4')),added=s.draft;
    assert.equal(s.canSetMediaVisibility(id),true);s.edit(id,{hidden:false});assert.deepEqual(s.draft,added);s.undo();assert.deepEqual(s.draft,s.original);s.redo();
    s.edit(id,{maxWidth:320,alt:'Descripción accesible',animation:'rise',duration:1.8,delay:.3});const before=s.draft;s.edit(id,{hidden:true});const hidden=s.draft;
    assert.deepEqual(hidden.items.find(i=>i.id===id),{...before.items.find(i=>i.id===id),hidden:true});s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,hidden);
    s.edit(id,{hidden:false});assert.deepEqual(s.draft,before);s.undo();assert.deepEqual(s.draft,hidden);assert.deepEqual(s.original,project());
  }
});
test('la visibilidad rechaza estados falsos, originales y otros tipos sin cambiar copia ni historial',()=>{
  const p=project();p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});
  const draft=structuredClone(p);draft.items.push({...p.items[1],id:'ain-2',inserted:'true'},{...p.items[0],id:'ain-3',inserted:true},{...p.items[1],id:'ain-4',type:'background'});
  const s=createSiteSession(p,draft),before=s.draft;
  for(const id of ['ain-0','ain-1','ain-2','ain-3','ain-4']){assert.equal(s.canSetMediaVisibility(id),false);assert.throws(()=>s.edit(id,{hidden:true}),/no editable/);}
  assert.deepEqual(s.draft,before);const id=s.addMedia('video','https://media.org/clip.mp4'),added=s.draft;
  for(const hidden of ['true','false','until-found',0,1,null,undefined,{}]){assert.throws(()=>s.edit(id,{hidden}),/verdadero o falso/);assert.deepEqual(s.draft,added);const bad=structuredClone(added);bad.items.find(i=>i.id===id).hidden=hidden;assert.throws(()=>validateSite(bad),/verdadero o falso/);}
  for(const target of ['ain-0','ain-2','ain-3','ain-4']){const bad=structuredClone(added);bad.items.find(i=>i.id===target).hidden=true;assert.throws(()=>validateSite(bad),/verdadero o falso/);}
  s.undo();assert.deepEqual(s.draft,before);
});
test('los medios ocultos conservan archivos al guardar, duplicar, ordenar, reabrir y exportar',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project()),[photo,clip]=s.addMediaBatch([{type:'image',value:a.id},{type:'video',value:v.id}]);
  s.edit(photo,{maxWidth:320,animation:'float',hidden:true});s.edit(clip,{maxWidth:480,hidden:true});const copy=s.duplicateMedia(photo);s.moveMedia(copy,1);
  assert.equal(s.draft.items.find(i=>i.id===copy).hidden,true);assert.equal(s.draft.items.find(i=>i.id===copy).maxWidth,320);const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);assert.equal(lib.size,a.size+v.size);
  const reopened=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));assert.deepEqual(restored.draft,s.draft);
  let doc=new DOMParser().parseFromString(buildDocument(restored.draft,{media:await exportMediaURLs(reopened,restored.draft)}),'text/html');
  for(const id of [photo,clip,copy]){const el=doc.querySelector('[data-ain-id="'+id+'"]');assert.equal(el.hidden,true);assert.equal(el.style.display,'none');assert.equal(el.style.getPropertyPriority('display'),'important');assert.ok(el.getAttribute('src').startsWith('data:'));}
  assert.equal(doc.querySelector('video').controls,true);assert.equal(doc.querySelector('video').autoplay,false);assert.equal(doc.querySelectorAll('script').length,0);
  restored.edit(copy,{hidden:false});doc=new DOMParser().parseFromString(buildDocument(restored.draft,{media:await exportMediaURLs(reopened,restored.draft)}),'text/html');assert.equal(doc.querySelector('[data-ain-id="'+copy+'"]').hidden,false);assert.equal(doc.querySelector('[data-ain-id="'+copy+'"]').style.display,'block');assert.equal(doc.querySelector('[data-ain-id="'+photo+'"]').hidden,true);assert.equal((await exportMedia(reopened,referencedMedia(restored.original,restored.draft))).length,2);
});
test('el estado oculto sólo se aplica a nodos añadidos y conserva los originales aunque traigan marcas de inserción',()=>{
  const p=project();p.html=p.html.replace('</body>','<img data-ain-id="ain-1" style="display:block;width:123px"></body>');p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true,hidden:true});
  const s=createSiteSession(p),id=s.addMedia('image','https://media.org/added.jpg');s.edit(id,{hidden:true});
  const doc=new DOMParser().parseFromString(buildDocument(s.draft),'text/html');assert.equal(doc.querySelector('[data-ain-id="ain-1"]').hidden,false);assert.equal(doc.querySelector('[data-ain-id="ain-1"]').style.display,'block');assert.equal(doc.querySelector('[data-ain-id="'+id+'"]').hidden,true);assert.equal(s.canSetMediaVisibility('ain-1'),false);
});
test('nombrar imagen y vídeo añadido normaliza el texto y cambia sólo su etiqueta en un paso reversible',()=>{
  for(const type of ['image','video']){
    const s=createSiteSession(project()),id=s.addMedia(type,'https://media.org/'+(type==='image'?'cover.jpg':'clip.mp4'));s.edit(id,{maxWidth:320,hidden:true,alt:'Descripción accesible',animation:'rise',duration:1.8,delay:.3});
    const before=s.draft,patch={label:'  Portada principal  '};assert.equal(s.canRenameMedia(id),true);s.edit(id,patch);const after=s.draft;
    assert.equal(patch.label,'  Portada principal  ');assert.deepEqual(after.items.find(i=>i.id===id),{...before.items.find(i=>i.id===id),label:'Portada principal'});
    s.edit(id,{label:' Portada principal '});s.undo();assert.deepEqual(s.draft,before);s.redo();assert.deepEqual(s.draft,after);assert.deepEqual(s.original,project());
  }
});
test('renombrar rechaza vacíos, nombres largos, originales y otros tipos sin cambios parciales',()=>{
  const p=project();p.items.push({...p.items[0],id:'ain-1',type:'image',value:'https://media.org/original.jpg',inserted:true});const draft=structuredClone(p);draft.items.push({...p.items[1],id:'ain-2',inserted:'true'},{...p.items[0],id:'ain-3',inserted:true},{...p.items[1],id:'ain-4',type:'background'});
  const s=createSiteSession(p,draft),before=s.draft;
  for(const id of ['ain-0','ain-1','ain-2','ain-3','ain-4']){assert.equal(s.canRenameMedia(id),false);assert.throws(()=>s.edit(id,{label:'Nombre nuevo'}),/no editable/);}
  assert.deepEqual(s.draft,before);const id=s.addMedia('video','https://media.org/clip.mp4');s.edit(id,{label:'a'.repeat(200)});const valid=s.draft;
  for(const label of ['', ' \t\n ', 'a'.repeat(201), null, undefined, 123, {}]){assert.throws(()=>s.edit(id,{label}),/1 a 200/);assert.deepEqual(s.draft,valid);}
  s.undo();assert.equal(s.draft.items.find(i=>i.id===id).label,'Vídeo añadido');
});
test('guardar, duplicar y reabrir conservan nombres independientes sin renombrar archivos, proyecto ni descripción',async()=>{
  const a=await image(),v=await video(),lib=createMediaLibrary([a,v]),s=createSiteSession(project()),[photo,clip]=s.addMediaBatch([{type:'image',value:a.id,label:a.name},{type:'video',value:v.id,label:v.name}]);
  s.edit(photo,{maxWidth:320,hidden:true,alt:'Descripción de la foto',animation:'float'});const beforeHTML=buildDocument(s.draft,{media:await exportMediaURLs(lib,s.draft)});s.edit(photo,{label:'Portada principal'});s.edit(clip,{label:'Vídeo de cabecera'});
  assert.equal(buildDocument(s.draft,{media:await exportMediaURLs(lib,s.draft)}),beforeHTML);const copy=s.duplicateMedia(photo);assert.equal(s.draft.items.find(i=>i.id===copy).label,'Portada principal');s.edit(copy,{label:'Portada secundaria'});assert.equal(s.draft.items.find(i=>i.id===photo).label,'Portada principal');
  const entries=await exportMedia(lib,referencedMedia(s.original,s.draft));assert.equal(entries.length,2);assert.deepEqual(entries.map(a=>a.name),[a.name,v.name]);assert.equal(lib.size,a.size+v.size);assert.equal(s.draft.title,project().title);assert.equal(s.draft.url,project().url);
  const reopened=await importMedia(JSON.parse(JSON.stringify(entries)),{inspect:skip}),restored=createSiteSession(s.original,JSON.parse(JSON.stringify(s.draft)));assert.deepEqual(restored.draft,s.draft);assert.equal(restored.draft.items.find(i=>i.id===photo).alt,'Descripción de la foto');assert.equal(restored.draft.items.find(i=>i.id===copy).hidden,true);assert.equal(restored.draft.items.find(i=>i.id===copy).maxWidth,320);assert.equal(reopened.records()[0].name,a.name);
});
