import test from 'node:test';
import assert from 'node:assert/strict';
import {connectGenerator} from '../presentaciones/editor/remote.mjs';
import {generatorProject} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const channel='58f502bd-f7e6-4b50-b870-b6bdf093a995',requestId='bc9d66be-002d-40ba-a899-c53e3d90fec3',origin='https://www.admiranext.com';
const source=()=>({client:'fixture-source',updatedAt:'r1',hero:{title:'Título',summary:'Texto',eyebrow:'Marca'},objective:'Objetivo',skeleton:[],closing:{title:'Cierre',action:'Continuar'}});
function setup(){let listener,loads=0;const messages=[],host={postMessage:(data,target)=>messages.push({data,target})},win={location:{search:new URLSearchParams({origin,channel}).toString()},parent:host,addEventListener:(_,fn)=>listener=fn,crypto:{randomUUID:()=>requestId}};const api=connectGenerator({win,onLoad:()=>loads++,onStatus:()=>{}});return {api,host,messages,get loads(){return loads;},emit:(data,overrides={})=>listener({origin,source:host,data:{channel,...data},...overrides})};}
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
