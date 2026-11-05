import test from 'node:test';
import assert from 'node:assert/strict';
import {createActiveSitePreference} from '../sites/active-site.mjs';
const KEY='ainimation-last-site';
function storage(initial='A'){
  let current=initial;const writes=[];
  return {writes,getItem(key){assert.equal(key,KEY);return current;},setItem(key,id){assert.equal(key,KEY);current=id;writes.push(id);}};
}
test('la copia elegida sólo se recuerda tras terminar su apertura y no cambia los registros guardados',async()=>{
  const store=storage(),preference=createActiveSitePreference(store),a={id:'A',draft:{title:'Originales',items:[{id:'ain-0'}]}},b={id:'B',draft:{title:'PortAventura',items:[{id:'ain-1',value:'archivo compartido'}]}},saved=new Map([['A',a],['B',b]]),before=JSON.stringify([...saved]);
  let finish,received;const ready=new Promise(resolve=>{finish=resolve;});
  const pending=preference.openSaved('B',saved,async record=>{received=record;await ready;return 'B abierta';});
  assert.equal(received,b);assert.equal(preference.read(),'A');assert.deepEqual(store.writes,[]);finish();assert.equal(await pending,'B abierta');assert.equal(preference.read(),'B');
  await preference.openSaved('A',saved,async record=>assert.equal(record,a));assert.equal(preference.read(),'A');assert.deepEqual(store.writes,['B','A']);assert.equal(JSON.stringify([...saved]),before);assert.equal(saved.get('B'),b);
});
test('una apertura fallida o un ID aún no guardado conservan la preferencia anterior',async()=>{
  const store=storage(),preference=createActiveSitePreference(store),saved=new Map([['A',{id:'A'}],['B',{id:'B'}]]);
  await assert.rejects(preference.openSaved('B',saved,async()=>{throw Error('Archivo incompatible');}),/incompatible/);assert.equal(preference.read(),'A');assert.deepEqual(store.writes,[]);
  let opened=false;await assert.rejects(preference.openSaved('nuevo',saved,async()=>{opened=true;}),/no está guardada/);assert.equal(opened,false);assert.equal(preference.remember('nuevo',saved),false);assert.equal(preference.remember('',saved),false);assert.equal(preference.read(),'A');
  saved.set('nuevo',{id:'nuevo'});assert.equal(preference.remember('nuevo',saved),true);assert.equal(preference.read(),'nuevo');
});
test('sin almacenamiento de preferencias o con errores la copia guardada sigue abriéndose',async()=>{
  const blocked={getItem(){throw Error('Lectura no disponible');},setItem(){throw Error('Escritura no disponible');}},denied={getItem(){return null;},get setItem(){throw Error('Acceso no disponible');}};
  for(const store of [undefined,blocked,denied]){
    const preference=createActiveSitePreference(store),record={id:'B'},saved=new Map([['B',record]]);let opened=false;
    assert.equal(preference.read(),'');assert.equal(await preference.openSaved('B',saved,async value=>{assert.equal(value,record);opened=true;return 'lista';}),'lista');assert.equal(opened,true);assert.equal(preference.remember('B',saved),false);
  }
});
