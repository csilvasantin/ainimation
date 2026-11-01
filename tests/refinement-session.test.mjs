import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,componentFields} from '../presentaciones/editor/fixtures.mjs';
import {createSession} from '../presentaciones/editor/session.mjs';
import {applyChanges} from '../presentaciones/editor/project.mjs';
for(const kind of ['site','presentation'])test(`${kind}: inspector edit -> compare -> undo/redo retains source, navigation and media`,()=>{
  const original=fixture(kind),session=createSession(original);
  session.edit('hero-title','Un titular nuevo');session.edit('hero-color','#ffcc88');session.edit('hero-x',16);
  assert.equal(session.changes.changes.length,3);assert.deepEqual(applyChanges(original,session.changes),session.draft);
  for(const key of ['navigation','media','extension'])assert.deepEqual(session.draft.document[key],original.document[key]);
  assert.deepEqual(session.draft.document.components.action.behavior,original.document.components.action.behavior);
  session.undo();assert.equal(session.draft.document.components.hero.x,6);session.redo();assert.equal(session.draft.document.components.hero.x,16);
  session.undo();session.undo();session.undo();assert.deepEqual(session.draft,original);assert.equal(session.canUndo,false);assert.equal(session.canRedo,true);
});
test('reset is reversible and a new edit after undo removes only the redo branch',()=>{
  const s=createSession(fixture());s.edit('hero-title','Mi título');s.reset();assert.equal(s.changes.changes.length,0);s.undo();assert.equal(s.draft.document.components.hero.title,'Mi título');s.edit('hero-x',12);assert.equal(s.canRedo,false);assert.equal(s.draft.document.components.hero.title,'Mi título');
});
test('independent project sessions retain their own original and draft when switching',()=>{
  const site=createSession(fixture('site')),deck=createSession(fixture('presentation'));site.edit('hero-title','Site nuevo');deck.edit('detail-title','Escena nueva');
  assert.equal(site.draft.document.components.hero.title,'Site nuevo');assert.equal(deck.draft.document.components.detail.title,'Escena nueva');assert.equal(deck.original.document.components.detail.title,'Del mensaje al movimiento.');
});
test('invalid edits leave draft and history intact; read objects cannot mutate the session',()=>{
  const s=createSession(fixture()),before=s.draft;assert.throws(()=>s.edit('hero-x',25));assert.deepEqual(s.draft,before);assert.equal(s.canUndo,false);
  s.draft.document.components.hero.title='External mutation';s.original.document.components.hero.title='External mutation';assert.deepEqual(s.draft,before);assert.deepEqual(s.original,before);
  s.edit('hero-title',before.document.components.hero.title);assert.equal(s.canUndo,false);
});
test('component selection exposes only its own declared fields',()=>{
  const p=fixture();assert.equal(componentFields(p,'hero').length,4);assert.deepEqual(componentFields(p,'action').map(f=>f.id),['action-label','action-color']);assert.deepEqual(componentFields(p,'unknown'),[]);
});
