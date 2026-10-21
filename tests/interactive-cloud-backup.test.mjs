import test from 'node:test';
import assert from 'node:assert/strict';
import {syncLibrary} from '../assets/interactive-cloud.mjs';
import {LIBRARY_KEY} from '../assets/interactive-library.mjs';
import {template} from '../assets/interactive-project.mjs';
const endpoint='https://cloud.test',backupKey='ainimation:cloud:backup:'+endpoint;
function setup(){
 const project=template();project.scenes[0].image='data:image/png;base64,'+'a'.repeat(400000);
 const record={id:'original',revision:1,updatedAt:'2026-10-21',project};
 const before=JSON.stringify({version:1,activeId:record.id,projects:[record]});
 const oldBackup='previous saved library',map=new Map([[LIBRARY_KEY,before],[backupKey,oldBackup]]);
 const storage={getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem:(k,v)=>{if([...map].reduce((n,[key,value])=>n+(key===k?0:value.length),v.length)>600000)throw new DOMException('quota','QuotaExceededError');map.set(k,v);}};
 const remote=structuredClone(record);remote.project.title='Desde otro dispositivo';
 return{record,before,oldBackup,storage,map,request:async()=>Response.json({account:'owner',projects:[record, {...remote,id:'recovered',project:{...remote.project,scenes:remote.project.scenes.map(s=>({...s,image:undefined}))}}]})};
}
test('recuperación con biblioteca grande archiva ambas copias antes de liberar su espacio',async()=>{
 const s=setup(),archive=new Map();
 const result=await syncLibrary(s.storage,endpoint,'google',s.request,{upload:false,archive:async entries=>{for(const [key,value]of entries)archive.set(key,value);}});
 assert.equal(result.projects.length,2);assert.deepEqual(result.projects[0],s.record);
 assert.equal(archive.get(backupKey),s.before);assert.equal(archive.get(backupKey+':migrated'),s.oldBackup);
 assert.equal(s.storage.getItem(backupKey),null);assert.equal(JSON.parse(s.storage.getItem(LIBRARY_KEY)).projects.length,2);
});
test('fallo de archivo conserva biblioteca y copia antigua sin subir nada',async()=>{
 const s=setup();let calls=0;
 await assert.rejects(syncLibrary(s.storage,endpoint,'google',async(...args)=>{calls++;return s.request(...args);},{archive:async()=>{throw Error('disco lleno');}}),/disco lleno/);
 assert.equal(calls,1);assert.equal(s.storage.getItem(LIBRARY_KEY),s.before);assert.equal(s.storage.getItem(backupKey),s.oldBackup);
});
test('editar durante el archivo de seguridad no permite sobrescribir el trabajo nuevo',async()=>{
 const s=setup(),edited=JSON.parse(s.before);edited.projects[0].project.title='Trabajo mientras recuperaba';const after=JSON.stringify(edited);
 await assert.rejects(syncLibrary(s.storage,endpoint,'google',s.request,{upload:false,archive:async()=>{s.storage.setItem(LIBRARY_KEY,after);}}),/editado durante/);
 assert.equal(s.storage.getItem(LIBRARY_KEY),after);assert.equal(s.storage.getItem(backupKey),s.oldBackup);
});
