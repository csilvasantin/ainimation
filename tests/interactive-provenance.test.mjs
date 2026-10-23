import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {deviceLabel,versionIdentity} from '../assets/interactive-provenance.mjs';
import {mergeCloud} from '../assets/interactive-cloud.mjs';
import {template} from '../assets/interactive-project.mjs';
import {route} from '../cloud-library/worker.mjs';
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('dispositivo estable por sesión y distinto entre almacenes; iPad no se etiqueta como Mac',()=>{
 const a=store(),b=store(),nav={platform:'MacIntel',userAgent:'Mac',maxTouchPoints:0};
 assert.equal(deviceLabel(a,nav),deviceLabel(a,nav));assert.notEqual(deviceLabel(a,nav),deviceLabel(b,nav));
 assert.match(deviceLabel(store(),{...nav,maxTouchPoints:5}),/^iPad/);
 assert.deepEqual(versionIdentity({updatedAt:'invalid'}),{date:'Fecha no registrada',device:'Dispositivo no registrado'});
 assert.match(versionIdentity({updatedAt:'2026-10-23T05:00:00Z',sourceDevice:'iPhone · sesión ABC123'}).date,/7:00:00.*Madrid/);
});
test('conflicto conserva fecha y origen de cada versión sin modificar las entradas',()=>{
 const local={id:'one',revision:2,updatedAt:'2026-10-23T05:01:00Z',sourceDevice:'Mac · sesión ABC123',project:template()};
 const remote=structuredClone(local);remote.project.scenes[0].body='iPhone';remote.revision=3;remote.updatedAt='2026-10-23T05:02:00Z';remote.sourceDevice='iPhone · sesión DEF456';
 const before=JSON.stringify([local,remote]),out=mergeCloud({version:1,activeId:'one',projects:[local]},[remote]);
 assert.equal(JSON.stringify([local,remote]),before);const cloud=out.library.projects[0],copy=out.library.projects[1];
 assert.equal(cloud.sourceDevice,remote.sourceDevice);assert.equal(cloud.updatedAt,remote.updatedAt);assert.equal(copy.sourceDevice,local.sourceDevice);assert.equal(copy.updatedAt,local.updatedAt);assert.equal(out.uploads[0].sourceDevice,local.sourceDevice);
});
test('API conserva origen, protege revisión, acepta clientes antiguos y no cambia proyectos ajenos',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../cloud-library/schema.sql',import.meta.url),'utf8'));
 const env={LIBRARY_DB:{prepare:sql=>({bind:(...args)=>({all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:db.prepare(sql).run(...args)})})})}};
 const req=(id,value)=>route(new Request('https://test/projects/'+id,{method:'PUT',body:JSON.stringify(value)}),env,async()=> 'owner');
 const project=template();await req('old',{project,baseRevision:0});const before=db.prepare("SELECT * FROM interactive_projects WHERE id='old'").get();
 assert.equal((await req('test',{project,baseRevision:0,sourceDevice:'Mac · sesión ABC123'})).status,200);
 assert.equal((await req('test',{project,baseRevision:0,sourceDevice:'iPhone'})).status,409);
 const list=await(await route(new Request('https://test/projects'),env,async()=> 'owner')).json();assert.equal(list.projects.find(p=>p.id==='test').sourceDevice,'Mac · sesión ABC123');assert.equal(list.projects.find(p=>p.id==='old').sourceDevice,null);
 assert.equal((await req('test',{project,baseRevision:1,sourceDevice:{bad:true}})).status,400);assert.deepEqual(db.prepare("SELECT * FROM interactive_projects WHERE id='old'").get(),before);
});

test('nombre reconocible persiste sin modificar proyectos ni etiquetas históricas',async()=>{
 const {setDeviceName,deviceName}=await import('../assets/interactive-provenance.mjs');const storage=store();storage.setItem('ainimation:interactive:library:v1','original');
 setDeviceName(storage,'  Mac del estudio  ');assert.equal(deviceName(storage),'Mac del estudio');assert.equal(deviceLabel(storage),'Mac del estudio');assert.equal(storage.getItem('ainimation:interactive:library:v1'),'original');
 const previous={updatedAt:'2026-10-23',sourceDevice:'Mac · sesión ABC123'};assert.equal(versionIdentity(previous).device,'Mac · sesión ABC123');
 assert.throws(()=>setDeviceName(storage,'a'.repeat(61)));assert.throws(()=>setDeviceName(storage,'Mac\nEstudio'));assert.equal(deviceName(storage),'Mac del estudio');
 setDeviceName(storage,'');assert.match(deviceLabel(storage),/sesión/);const other=store();setDeviceName(other,'Mac de pruebas');assert.equal(deviceLabel(other),'Mac de pruebas');assert.notEqual(deviceLabel(storage),deviceLabel(other));
});
