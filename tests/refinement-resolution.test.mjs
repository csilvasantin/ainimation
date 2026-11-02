import test from 'node:test';
import assert from 'node:assert/strict';
import {conflictFixture} from '../presentaciones/editor/conflict-fixtures.mjs';
import {planResolution,resolveRevisions,resolutionAssets} from '../presentaciones/editor/conflict-resolution.mjs';
import {createSession} from '../presentaciones/editor/session.mjs';
import {editField,changesBetween,applyChanges,validateProject} from '../presentaciones/editor/project.mjs';
import {generatorProject} from '../presentaciones/editor/generator.mjs';
const ready=data=>Object.fromEntries(planResolution(data.original,data.draft,data.current).rows.filter(row=>row.required).map(row=>[row.field,'current']));
for(const kind of ['site','presentation'])test(kind+': mixed choices preserve current structure and all untouched fields, rebased changes replay exactly',()=>{
  const data=conflictFixture(kind),snapshot=structuredClone(data);
  const decisions={...ready(data),'thumbnail-title':'draft','thumbnail-image':'draft','thumbnail-logo':'current','thumbnail-accent':'original','thumbnail-layout':'current','thumbnail-font':'draft'};
  const result=resolveRevisions(data.original,data.draft,data.current,decisions),thumb=result.draft.document.components.thumbnail;
  assert.equal(thumb.title,data.draft.document.components.thumbnail.title);assert.equal(thumb.image,data.resources.draftArt);assert.equal(thumb.logo,data.resources.currentLogo);assert.equal(thumb.font,'fira-sans');assert.equal(thumb.layout,'editorial');assert.equal(thumb.accent,data.original.document.components.thumbnail.accent);
  assert.equal(result.draft.document.components.hero.message,data.draft.document.components.hero.message);
  for(const key of ['navigation','media','extension'])assert.deepEqual(result.draft.document[key],data.current.document[key]);
  assert.deepEqual(result.draft.document.components.action,data.current.document.components.action);assert.deepEqual(result.draft.fields,data.current.fields);assert.deepEqual(result.draft.source,data.current.source);
  assert.deepEqual(applyChanges(data.current,result.changes),result.draft);assert.throws(()=>applyChanges(data.original,result.changes),/revisión/);assert.deepEqual(data,snapshot);
});
test('conflicting values have no default; one-sided and matching values suggest their own side',()=>{
  const data=conflictFixture(),plan=planResolution(data.original,data.draft,data.current),row=id=>plan.rows.find(r=>r.field===id);
  assert.equal(plan.unresolved,4);assert.equal(row('thumbnail-title').choice,null);assert.equal(row('hero-message').choice,'draft');assert.equal(row('thumbnail-layout').choice,'current');assert.equal(row('thumbnail-font').choice,'current');
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current),/Elige/);
});
test('all current choices produce a clean draft on current rather than undoing source-only changes',()=>{
  const data=conflictFixture(),decisions=Object.fromEntries(planResolution(data.original,data.draft,data.current).rows.map(r=>[r.field,'current']));
  const result=resolveRevisions(data.original,data.draft,data.current,decisions);assert.deepEqual(result.draft,data.current);assert.equal(result.changes.changes.length,0);
});
test('removed or rebound fields cannot recover old values and edited ones require an explicit current choice',()=>{
  const data=conflictFixture();data.current.fields=data.current.fields.filter(f=>f.id!=='hero-message');
  const row=planResolution(data.original,data.draft,data.current).rows.find(r=>r.field==='hero-message');assert.equal(row.choice,null);assert.deepEqual(row.options,['current']);
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current,{...ready(data),'hero-message':'draft'}),/recuperar/);
  const result=resolveRevisions(data.original,data.draft,data.current,ready(data));assert.deepEqual(result.draft.document.components.hero,data.current.document.components.hero);
});
test('new fields remain current and choices cannot inject values or unknown fields',()=>{
  const data=conflictFixture();data.current.document.newField='Nuevo';data.current.fields.push({id:'new-field',label:'Nuevo campo',type:'text',maxLength:100,path:['newField']});
  const result=resolveRevisions(data.original,data.draft,data.current,ready(data));assert.equal(result.draft.document.newField,'Nuevo');
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current,{...ready(data),'new-field':'original'}),/recuperar/);
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current,{...ready(data),'new-field':'Texto inyectado'}),/recuperar/);
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current,{...ready(data),unknown:'draft'}),/otro campo/);
});
test('resolution validates the complete thumbnail and preserves inputs when invalid',()=>{
  const data=conflictFixture();data.draft=editField(data.draft,'thumbnail-title','');const before=structuredClone(data);
  assert.throws(()=>resolveRevisions(data.original,data.draft,data.current,{...ready(data),'thumbnail-title':'draft'}),/titular/);assert.deepEqual(data,before);
});
test('a resolution is one reversible history step, including the original revision and prior draft history',()=>{
  const data=conflictFixture('presentation'),s=createSession(data.original);for(const c of changesBetween(data.original,data.draft).changes)s.edit(c.field,c.after);
  const previous=s.draft,result=resolveRevisions(data.original,previous,data.current,{...ready(data),'thumbnail-title':'draft'});s.rebase(result.current,result.draft);
  assert.deepEqual(s.original,data.current);assert.deepEqual(s.draft,result.draft);s.undo();assert.deepEqual(s.original,data.original);assert.deepEqual(s.draft,previous);s.redo();assert.deepEqual(s.changes,result.changes);
  s.edit('hero-title','Después de resolver');s.undo();assert.deepEqual(s.draft,result.draft);s.reset();assert.deepEqual(s.draft,data.current);s.undo();assert.deepEqual(s.draft,result.draft);
});
test('a second source conflict produces changes against the newest revision with no lost metadata',()=>{
  const data=conflictFixture(),r2=resolveRevisions(data.original,data.draft,data.current,{...ready(data),'thumbnail-title':'draft'});let r3=editField(data.current,'thumbnail-title','Otro cambio');r3.source.revision='demo-r3';r3.document.extension.next='Conservar también';r3=validateProject(r3);
  assert.throws(()=>applyChanges(r3,r2.changes),/revisión/);
  const merged=resolveRevisions(r2.current,r2.draft,r3,{'thumbnail-title':'draft'});assert.equal(merged.changes.source.revision,'demo-r3');assert.equal(merged.draft.document.extension.next,'Conservar también');assert.equal(merged.draft.document.components.thumbnail.title,data.draft.document.components.thumbnail.title);
});
test('asset selection uses current bytes for shared refs, includes selected old refs, and drops unrelated data',()=>{
  const data=conflictFixture(),result=resolveRevisions(data.original,data.draft,data.current,{...ready(data),'thumbnail-image':'draft'});
  const assets=resolutionAssets({[data.resources.draftArt]:'old',shared:'old',unrelated:'secret'},{[data.resources.currentLogo]:'new',shared:'current'},result.draft);
  assert.equal(assets[data.resources.draftArt],'old');assert.equal(assets[data.resources.currentLogo],'new');assert.equal(assets.unrelated,undefined);
  result.draft.document.thumbnailMedia.push({url:'shared',label:'Compartido'});assert.equal(resolutionAssets({shared:'old'},{shared:'current'},result.draft).shared,'current');
});
test('session rebases reject other sources, undeclared edits and same revisions without touching history',()=>{
  const data=conflictFixture(),s=createSession(data.original),wrong=structuredClone(data.current);wrong.source.id='other';assert.throws(()=>s.rebase(wrong,wrong),/mismo origen/);
  const forged=structuredClone(data.current);forged.document.extension.forged='No';assert.throws(()=>s.rebase(data.current,forged),/fuera/);assert.throws(()=>s.rebase(data.original,data.original),/otra revisión/);assert.equal(s.canUndo,false);assert.deepEqual(s.original,data.original);
});
test('number and color decisions use the same typed resolution as text and thumbnail fields',()=>{
  const data=conflictFixture();data.draft=editField(editField(data.draft,'hero-x',12),'hero-color','#123456');data.current=editField(editField(data.current,'hero-x',16),'hero-color','#654321');
  const result=resolveRevisions(data.original,data.draft,data.current,{...ready(data),'hero-x':'draft','hero-color':'original'});
  assert.equal(result.draft.document.components.hero.x,12);assert.equal(result.draft.document.components.hero.color,data.original.document.components.hero.color);
});
test('reordered native bindings never apply an old scene edit onto another scene',()=>{
  const source={client:'conflict-fixture',updatedAt:'r1',hero:{title:'Muestra'},skeleton:[{id:'a',title:'A'},{id:'b',title:'B'}],closing:{}};
  const original=generatorProject(source),draft=editField(original,'block-0-title','Nuestro ajuste');source.updatedAt='r2';source.skeleton.reverse();const current=generatorProject(source),data={original,draft,current};
  assert.throws(()=>resolveRevisions(original,draft,current,{...ready(data),'block-0-title':'draft'}),/recuperar/);
  assert.deepEqual(resolveRevisions(original,draft,current,ready(data)).draft,current);
});
