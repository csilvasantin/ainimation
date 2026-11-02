import test from 'node:test';
import assert from 'node:assert/strict';
import {generatorProject,nativeEdits,confirmSaved} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const ideas=()=>({client:'demo-test',displayName:'Demo',updatedAt:'r1',hero:{title:'Portada',summary:'Texto',eyebrow:'Marca'},objective:'Objetivo',skeleton:[{id:'stable-id',title:'Una idea',message:'Mensaje',detail:'Detalle',enabled:true},{id:'hidden',title:'No mostrar',enabled:false}],closing:{title:'Cierre',action:'Continuar'},notes:'PRIVATE-NOTES',password:'PRIVATE-KEY',translations:{en:{hero:{title:'Cover',summary:'Copy',eyebrow:'Brand'},objective:'Goal',skeleton:[{id:'stable-id',title:'Idea',message:'Message',detail:'Detail'}],closing:{title:'Closing',action:'Next'}}}});
test('adapter exposes audience fields only and preserves stable block bindings',()=>{
  const p=generatorProject(ideas());assert.equal(p.document.order.length,6);assert.equal(p.document.order[1],'style');assert.equal(p.document.bindings['block-0-title'].blockId,'stable-id');
  for(const secret of ['PRIVATE-NOTES','PRIVATE-KEY','No mostrar'])assert.equal(JSON.stringify(p).includes(secret),false);
  assert.ok(p.fields.filter(f=>!f.id.startsWith('thumbnail-')&&f.id!=='style-accent'&&f.id!=='style-tema'&&!f.id.endsWith('-align')).every(f=>f.type==='text'));assert.equal(p.fields.find(f=>f.id==='style-accent').type,'color');assert.deepEqual(p.fields.find(f=>f.id==='block-0-align').options,['left','center','right']);assert.equal(generatorProject(ideas(),'en').document.components.cover.title,'Cover');assert.throws(()=>generatorProject(ideas(),'ca'));
});
test('native save payload is bounded and uses the original revision, field and block identity',()=>{
  const p=generatorProject(ideas()),draft=editField(p,'block-0-title','Título nuevo'),changes=changesBetween(p,draft);
  assert.deepEqual(nativeEdits(p,changes),{language:'es',revision:'r1',refinement:true,edits:[{field:'skeleton.title',blockId:'stable-id',value:'Título nuevo'}]});
  const stale=ideas();stale.updatedAt='r2';assert.throws(()=>nativeEdits(generatorProject(stale),changes));
});
test('save confirmation requires a new matching revision and exact reread values',()=>{
  const original=ideas(),p=generatorProject(original),draft=editField(p,'closing-title','Cierre nuevo'),changes=changesBetween(p,draft);
  const saved=structuredClone(original);saved.updatedAt='r2';saved.closing.title='Cierre nuevo';
  assert.equal(confirmSaved(p,changes,{ok:true,revision:'r2'},saved).source.revision,'r2');
  assert.throws(()=>confirmSaved(p,changes,{ok:false,revision:'r2'},saved));assert.throws(()=>confirmSaved(p,changes,{ok:true,revision:'r1'},original));
  saved.closing.title='Otro texto';assert.throws(()=>confirmSaved(p,changes,{ok:true,revision:'r2'},saved));
});
test('adapter rejects ambiguous IDs and edits that the native writer would silently trim',()=>{
  const source=ideas();source.skeleton[1].id='stable-id';assert.throws(()=>generatorProject(source));
  const p=generatorProject(ideas()),draft=editField(p,'closing-title',' Texto con espacios ');assert.throws(()=>nativeEdits(p,changesBetween(p,draft)),/espacios/);
});
