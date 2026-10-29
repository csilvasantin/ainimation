import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/cast-library.js';
const {entries} = globalThis.ainCastLibrary;
const seed = () => ({cast: [
  {id:'z', name:'Zorro 10', src:'z.png', imported:true, onStage:false, mediaType:'image'},
  {id:'a', name:'Árbol 2', fileName:'bosque.png', src:'a.png', imported:true, onStage:true, mediaType:'image'},
  {id:'v', name:'Zorro 2', src:'v.mp4', imported:true, onStage:false, mediaType:'video'},
  {name:'Instancia Z', src:'z.png', imported:true, onStage:true, mediaType:'image', instanceOf:'z'},
  {name:'Generado sin importar', mediaType:'image'},
]});
test('accent-insensitive search combines all words and filename',()=>{
  assert.deepEqual(entries(seed(),{query:'arbol bosque'}).visible.map(x=>x.index),[1]);
  assert.equal(entries(seed(),{query:'<script>'}).visible.length,0);
});
test('counts represent source members, never sprites',()=>{
  const result=entries(seed());assert.equal(result.available.length,3);assert.equal(result.visible.length,3);
});
test('usage includes an active clone of a source whose own sprite is off',()=>{
  assert.deepEqual(entries(seed(),{usage:'used'}).visible.map(x=>x.index),[0,1]);
  assert.deepEqual(entries(seed(),{usage:'unused'}).visible.map(x=>x.index),[2]);
});
test('inactive instances do not mark a source as used',()=>{
  const p=seed();p.cast[3].onStage=false;assert.deepEqual(entries(p,{usage:'unused'}).visible.map(x=>x.index),[0,2]);
});
test('sorts naturally while preserving original indexes and full plan',()=>{
  const p=seed(), before=structuredClone(p);assert.deepEqual(entries(p,{sort:'name'}).visible.map(x=>x.index),[1,2,0]);
  assert.deepEqual(entries(p,{sort:'type'}).visible.map(x=>x.index),[1,0,2]);assert.deepEqual(p,before);
});
test('type, usage and search compose without excluding unrelated project data',()=>{
  const p=seed();assert.deepEqual(entries(p,{query:'zorro',types:['image'],usage:'used'}).visible.map(x=>x.index),[0]);
  assert.equal(entries(p,{query:'missing'}).available.length,3);
});
test('blank queries, empty libraries and duplicate names have stable results',()=>{
  assert.equal(entries({cast:[]},{query:'  '}).visible.length,0);
  const p=seed();p.cast[1].name=p.cast[0].name;assert.deepEqual(entries(p,{sort:'name',types:['image']}).visible.map(x=>x.index),[0,1]);
});
