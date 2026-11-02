import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRevisions} from '../presentaciones/editor/conflict-report.mjs';
import {conflictFixture} from '../presentaciones/editor/conflict-fixtures.mjs';
import {generatorProject} from '../presentaciones/editor/generator.mjs';
import {editField} from '../presentaciones/editor/project.mjs';
for(const kind of ['site','presentation'])test(kind+': three-way comparison keeps every input, resource and untouched component intact',()=>{
  const data=conflictFixture(kind),before=structuredClone(data),report=compareRevisions(data.original,data.draft,data.current),row=id=>report.rows.find(r=>r.field===id);
  assert.equal(row('thumbnail-title').status,'conflict');assert.equal(row('thumbnail-image').status,'conflict');assert.equal(row('thumbnail-logo').status,'conflict');assert.equal(row('thumbnail-font').status,'both-same');assert.equal(row('thumbnail-layout').status,'source-only');assert.equal(row('hero-message').status,'draft-only');
  assert.equal(row('thumbnail-logoStyle').status,'draft-only');assert.equal(report.metadataChanged,true);assert.equal(report.rows.some(r=>r.field==='action-label'),false);assert.deepEqual(data,before);
});
test('changed field contracts, removed fields and newly declared fields are not silently matched',()=>{
  const {original,draft,current}=conflictFixture('site');current.fields=current.fields.filter(f=>f.id!=='hero-message');current.fields.find(f=>f.id==='thumbnail-title').maxLength=150;
  current.document.extra='Un nuevo campo';current.fields.push({id:'new-field',label:'Nuevo campo',type:'text',maxLength:80,path:['extra']});
  const report=compareRevisions(original,draft,current);assert.equal(report.rows.find(r=>r.field==='hero-message').status,'unavailable');assert.equal(report.rows.find(r=>r.field==='thumbnail-title').currentAvailable,false);assert.equal(report.rows.find(r=>r.field==='new-field').added,true);
});
test('native slide bindings disambiguate reused component indices after a source reorder',()=>{
  const source={client:'conflict-fixture',updatedAt:'r1',hero:{title:'Muestra'},skeleton:[{id:'a',title:'A'},{id:'b',title:'B'}],closing:{}};
  const original=generatorProject(source),draft=editField(original,'block-0-title','Nuestro ajuste');source.updatedAt='r2';source.skeleton.reverse();const current=generatorProject(source),report=compareRevisions(original,draft,current);
  assert.equal(report.rows.find(r=>r.field==='block-0-title').status,'unavailable');assert.equal(report.rows.find(r=>r.field==='block-0-title').current,null);assert.equal(draft.document.components['block-0'].title,'Nuestro ajuste');
});
test('different sources and changed data outside declared draft fields cannot enter comparison',()=>{
  const {original,draft,current}=conflictFixture('presentation');const wrong=structuredClone(current);wrong.source.id='another';assert.throws(()=>compareRevisions(original,draft,wrong),/otro proyecto/);
  const forged=structuredClone(draft);forged.document.navigation.scenes[0].next='unknown';assert.throws(()=>compareRevisions(original,forged,current),/fuera/);
  const same=structuredClone(current);same.source.revision=original.source.revision;assert.throws(()=>compareRevisions(original,draft,same),/otra revisión/);
});
