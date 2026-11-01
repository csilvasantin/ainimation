import test from 'node:test';
import assert from 'node:assert/strict';
import {connectGenerator} from '../presentaciones/editor/remote.mjs';
import {generatorProject} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const channel='58f502bd-f7e6-4b50-b870-b6bdf093a995',requestId='bc9d66be-002d-40ba-a899-c53e3d90fec3',origin='https://www.admiranext.com';
const source=()=>({client:'fixture-source',updatedAt:'r1',hero:{title:'Título',summary:'Texto',eyebrow:'Marca'},objective:'Objetivo',skeleton:[],closing:{title:'Cierre',action:'Continuar'}});
function setup(){let listener,loads=0;const messages=[],assetEvents=[],host={postMessage:(data,target)=>messages.push({data,target})},win={location:{search:new URLSearchParams({origin,channel}).toString()},parent:host,addEventListener:(_,fn)=>listener=fn,crypto:{randomUUID:()=>requestId}};const api=connectGenerator({win,onLoad:()=>loads++,onStatus:()=>{},onConflictAssets:event=>assetEvents.push(event)});return {api,host,messages,assetEvents,get loads(){return loads;},emit:(data,overrides={})=>listener({origin,source:host,data:{channel,...data},...overrides})};}
test('only the exact host window, origin and channel can load a real project',()=>{
  const s=setup(),project=generatorProject(source());
  for(const override of [{origin:'https://evil.test'},{source:{}},{data:{channel:'wrong',type:'admiranext:refinement:load',project}}])s.emit({type:'admiranext:refinement:load',project},override);
  assert.equal(s.loads,0);s.emit({type:'admiranext:refinement:load',project});assert.equal(s.loads,1);assert.equal(s.messages[0].target,origin);
});
test('save requires the pending request and a matching new revision containing the exact edits',async()=>{
  const s=setup(),p=generatorProject(source()),draft=editField(p,'closing-title','Nuevo'),changes=changesBetween(p,draft),pending=s.api.save(changes);
  assert.equal(s.messages.at(-1).data.type,'ainimation:refinement:save');
  const after=source();after.updatedAt='r2';after.closing.title='Nuevo';
  s.emit({type:'admiranext:refinement:saved',requestId:'wrong',project:generatorProject(after)});
  s.emit({type:'admiranext:refinement:saved',requestId,project:generatorProject(after)});assert.equal((await pending).source.revision,'r2');
});
test('a mismatched saved value rejects confirmation; an explicit error also preserves the caller draft',async()=>{
  const s=setup(),p=generatorProject(source()),draft=editField(p,'closing-title','Nuevo'),changes=changesBetween(p,draft);
  const pending=s.api.save(changes),after=source();after.updatedAt='r2';s.emit({type:'admiranext:refinement:saved',requestId,project:generatorProject(after)});await assert.rejects(pending,/no contiene/);
  const retry=s.api.save(changes);s.emit({type:'admiranext:refinement:error',requestId,error:'Conflicto de revisión'});await assert.rejects(retry,/Conflicto/);assert.equal(draft.document.components.closing.title,'Nuevo');
});
test('a correlated conflict rejects once with the current revision and never retries a write',async()=>{
  const s=setup(),p=generatorProject(source()),draft=editField(p,'closing-title','Nuestro borrador'),changes=changesBetween(p,draft),pending=s.api.save(changes),after=source();after.updatedAt='r2';after.closing.title='Cambio del origen';const current=generatorProject(after);
  s.emit({type:'admiranext:refinement:conflict',requestId:'wrong',project:current});
  s.emit({type:'admiranext:refinement:conflict',requestId,project:current,phase:'after-rejection'});
  await assert.rejects(pending,error=>error.code==='source_conflict'&&error.current.source.revision==='r2'&&error.phase==='after-rejection');
  assert.equal(s.messages.filter(m=>m.data.type==='ainimation:refinement:save').length,1);assert.equal(draft.document.components.closing.title,'Nuestro borrador');
});
test('conflict images require the exact request, source, revision, origin and resource allowlist',async()=>{
  const s=setup(),p=generatorProject(source()),draft=editField(p,'closing-title','Nuestro borrador'),pending=s.api.save(changesBetween(p,draft)),after=source();after.updatedAt='r2';const url='/presentaciones/fixture-source/images/slide-01-cover.jpg';after.thumbnailMedia=[{url,label:'Arte actual'}];const current=generatorProject(after);
  s.emit({type:'admiranext:refinement:conflict',requestId,project:current});await assert.rejects(pending,/otra revisión/);
  s.emit({type:'admiranext:refinement:error',requestId,error:'Fallback para inspectores anteriores'});
  const message={type:'admiranext:refinement:conflict-assets',requestId,source:current.source,assets:{[url]:'data:image/jpeg;base64,YQ==','https://evil.test/x':'data:image/jpeg;base64,YQ=='}};
  s.emit({...message,requestId:'wrong'});s.emit({...message,source:{...current.source,revision:'r3'}});s.emit(message,{origin:'https://evil.test'});assert.equal(s.assetEvents.length,0);
  s.emit(message);assert.deepEqual(s.assetEvents[0].assets,{[url]:'data:image/jpeg;base64,YQ=='});
  s.emit({type:'admiranext:refinement:load',project:current});s.emit(message);assert.equal(s.assetEvents.length,1);
});
test('a conflict for another project cannot replace the pending source context',async()=>{
  const s=setup(),p=generatorProject(source()),pending=s.api.save(changesBetween(p,editField(p,'closing-title','Nuestro borrador'))),after=source();after.client='another-source';after.updatedAt='r2';
  s.emit({type:'admiranext:refinement:conflict',requestId,project:generatorProject(after)});await assert.rejects(pending,error=>!error.code&&/no corresponde/.test(error.message));assert.equal(s.assetEvents.length,0);
});
