import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT,validateProject,editField,changesBetween,applyChanges,reverseChanges} from '../presentaciones/editor/project.mjs';
const fixture=(kind='site')=>({format:PROJECT,version:1,kind,title:'Proyecto ficticio',source:{adapter:kind==='site'?'owned-site':'presentation-generator',id:'fixture-1',revision:'r1'},
  document:{components:{hero:{title:'Original',color:'#c3ff6b',layout:{x:10},motion:'fade',visible:true},chart:{source:'untouched',series:[1,2,3]},form:{handler:'/original-api',fields:['email']},navigation:{next:'closing'}},assets:[{id:'asset-1',src:'/media/original.mp4'}],extension:{custom:'keep exactly'}},
  fields:[{id:'hero-title',label:'Titular',path:['components','hero','title'],type:'text',maxLength:220},{id:'hero-color',label:'Color',path:['components','hero','color'],type:'color'},
    {id:'hero-x',label:'Posición X',path:['components','hero','layout','x'],type:'number',min:0,max:100},{id:'hero-motion',label:'Entrada',path:['components','hero','motion'],type:'choice',options:['none','fade','slide']},{id:'hero-visible',label:'Visible',path:['components','hero','visible'],type:'boolean'}]});
for(const kind of ['site','presentation'])test(`${kind}: edit, compare, apply and undo preserve all other components and source`,()=>{
  const original=fixture(kind),snapshot=structuredClone(original);
  let draft=editField(original,'hero-title','Nuevo titular');draft=editField(draft,'hero-x',25);draft=editField(draft,'hero-motion','slide');
  const changes=changesBetween(original,draft);assert.equal(changes.changes.length,3);assert.deepEqual(applyChanges(original,changes),draft);
  assert.deepEqual(applyChanges(draft,reverseChanges(changes)),original);assert.deepEqual(original,snapshot);
  for(const k of ['chart','form','navigation'])assert.deepEqual(draft.document.components[k],original.document.components[k]);
  assert.deepEqual(draft.document.assets,original.document.assets);assert.deepEqual(draft.document.extension,original.document.extension);
});
test('an empty changeset preserves unknown extension data exactly',()=>{const p=fixture();assert.deepEqual(applyChanges(p,changesBetween(p,p)),p);});
test('unsupported edits, type changes and out-of-range values are rejected',()=>{
  const p=fixture();for(const [id,value] of [['missing','anything'],['hero-title','a'.repeat(221)],['hero-color','url(https://evil.test)'],['hero-x',101],['hero-x','10'],['hero-motion','javascript'],['hero-visible','true']])assert.throws(()=>editField(p,id,value));
});
test('source identity, adapter and current revision all gate application',()=>{
  const p=fixture(),changes=changesBetween(p,editField(p,'hero-title','Nuevo'));
  for(const key of ['id','adapter','revision']){const current=structuredClone(p);current.source[key]='different';assert.throws(()=>applyChanges(current,changes),/revisión/);}
});
test('concurrent edits to the same component block saving and leave both copies intact',()=>{
  const p=fixture(),a=editField(p,'hero-title','Otra pestaña'),changes=changesBetween(p,editField(p,'hero-title','Mi copia')),before=structuredClone(a);
  assert.throws(()=>applyChanges(a,changes),/componente/);assert.deepEqual(a,before);
});
test('changes outside declared fields cannot be silently dropped',()=>{
  const p=fixture(),d=editField(p,'hero-title','Nuevo');d.document.components.form.handler='/changed';assert.throws(()=>changesBetween(p,d),/fuera/);
  const manifest=structuredClone(p);manifest.fields[0].maxLength=400;assert.throws(()=>changesBetween(p,manifest),/contrato/);
});
test('invalid paths, duplicate fields and unsafe document keys are rejected',()=>{
  for(const change of [p=>p.fields.push(p.fields[0]),p=>p.fields[0].path=['components','missing'],p=>p.fields[0].path=['__proto__','title'],p=>p.document=JSON.parse('{"__proto__":{"polluted":true}}'),p=>p.document.components.hero.title=()=>{},p=>p.source.revision='',p=>p.source.id=123,p=>p.fields[0].id=123,p=>p.fields.push({id:'length',label:'Invalid',type:'number',min:0,max:20,path:['assets','length']})]){const p=fixture();change(p);assert.throws(()=>validateProject(p));}
  assert.equal({}.polluted,undefined);
});
test('tampered before-values and duplicate changes fail atomically',()=>{
  const p=fixture(),d=editField(editField(p,'hero-title','Nuevo'),'hero-x',40),changes=changesBetween(p,d),before=structuredClone(p);
  changes.changes[1].before=15;assert.throws(()=>applyChanges(p,changes));assert.deepEqual(p,before);
  const duplicate=changesBetween(p,d);duplicate.changes.push(duplicate.changes[0]);assert.throws(()=>applyChanges(p,duplicate));assert.deepEqual(p,before);
});
