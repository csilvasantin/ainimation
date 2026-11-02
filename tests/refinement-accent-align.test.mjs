import test from 'node:test';
import assert from 'node:assert/strict';
import {generatorProject,nativeEdits,confirmSaved} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const ideas=()=>({client:'sample-proposal',updatedAt:'r1',hero:{title:'Título'},objective:'O',skeleton:[{id:'a',title:'A',message:'m'},{id:'b',title:'B',align:'right'}],closing:{title:'C',action:'X'},translations:{en:{hero:{title:'T'},skeleton:[{id:'a',title:'A'},{id:'b',title:'B'}],closing:{}}}});
test('projects accent (default #ffb000) and per-slide align from the base script',()=>{
  const p=generatorProject(ideas());assert.equal(p.document.components.style.accent,'#ffb000');assert.equal(p.document.components['block-1'].align,'right');
  assert.equal(generatorProject(ideas(),'en').document.components['block-1'].align,'right');
  const saved={...ideas(),accent:'#00aa11'};assert.equal(generatorProject(saved).document.components.style.accent,'#00aa11');
  const bogus={...ideas(),accent:'#FFF'};bogus.skeleton[0].align='justify';const q=generatorProject(bogus);assert.equal(q.document.components.style.accent,'#ffb000');assert.equal(q.document.components['block-0'].align,'left');
});
test('nativeEdits sends layout separately from translated texts',()=>{
  const p=generatorProject(ideas());let d=editField(p,'style-accent','#123abc');d=editField(d,'block-0-align','center');d=editField(d,'closing-title','Nuevo');
  const out=nativeEdits(p,changesBetween(p,d));assert.deepEqual(out.layout,{accent:'#123abc',align:[{blockId:'a',value:'center'}]});
  assert.deepEqual(out.edits,[{field:'closing.title',value:'Nuevo'}]);
});
test('invalid hex and align are rejected; 20-change limit holds',()=>{
  const p=generatorProject(ideas());
  assert.throws(()=>editField(p,'block-0-align','justify'));assert.throws(()=>editField(p,'style-accent','red'));
  assert.throws(()=>nativeEdits(p,changesBetween(p,editField(p,'style-accent','#ABCDEF'))),/minúsculas/);
  const many={...ideas(),skeleton:Array.from({length:20},(_,i)=>({id:'s'+i,title:'S'}))},q=generatorProject(many);let d=editField(q,'style-accent','#000000');
  for(let i=0;i<20;i++)d=editField(d,'block-'+i+'-align','center');assert.throws(()=>nativeEdits(q,changesBetween(q,d)),/entre 1 y 20/);
});
test('confirmSaved rereads accent and align exactly',()=>{
  const p=generatorProject(ideas()),cs=changesBetween(p,editField(editField(p,'style-accent','#123abc'),'block-0-align','center'));
  const good={...ideas(),updatedAt:'r2',accent:'#123abc'};good.skeleton[0].align='center';assert.equal(confirmSaved(p,cs,{ok:true,revision:'r2'},good).document.components.style.accent,'#123abc');
  const bad={...ideas(),updatedAt:'r2',accent:'#123abc'};assert.throws(()=>confirmSaved(p,cs,{ok:true,revision:'r2'},bad),/no coincide/);
});
