import test from 'node:test';
import assert from 'node:assert/strict';
import {createFixtureRecovery,fixtureRecoveryAllowed,fixtureRecoveryKey} from '../presentaciones/editor/fixture-recovery.mjs';
import {compareRevisions} from '../presentaciones/editor/conflict-report.mjs';
import {resolveRevisions} from '../presentaciones/editor/conflict-resolution.mjs';
const location=(kind='site',phase='before-save')=>({protocol:'http:',hostname:'127.0.0.1',search:'?'+new URLSearchParams({conflictFixture:kind,conflictPhase:phase})});
function memory(){const values=new Map();let reads=0,writes=0;return {values,get reads(){return reads;},get writes(){return writes;},getItem(key){reads++;return values.get(key)??null;},setItem(key,value){writes++;values.set(key,value);}};}
const ui=(decisions={})=>({decisions,open:true,historyReviewed:false});
const open=(device,kind='site',phase='before-save')=>createFixtureRecovery({location:location(kind,phase),storage:()=>device});
const choices=store=>Object.fromEntries(compareRevisions(store.session.original,store.session.draft,store.data.current).rows.map(row=>[row.field,row.status==='conflict'?'draft':'current']));
test('normal pages, production, remote channels and arbitrary projects never access recovery storage',()=>{
  let touches=0;const storage=()=>{touches++;throw Error('Must not access');};
  for(const [loc,remote]of [[{...location(),hostname:'www.ainimation.studio'},false],[{...location(),protocol:'https:'},false],[{...location(),search:''},false],[{...location(),search:'?conflictFixture=client-project'},false],[location(),true],[{...location(),search:location().search+'&origin=https://www.admiranext.com'},false],[{...location(),search:location().search+'&channel='},false]]){
    assert.equal(fixtureRecoveryAllowed(loc,remote),false);assert.equal(createFixtureRecovery({location:loc,remote,storage}),null);
  }
  assert.equal(touches,0);
});
for(const kind of ['site','presentation'])test(kind+': reload restores edited draft, source revision, partial decisions, closed panel and exact changes',()=>{
  const device=memory(),store=open(device,kind);assert.equal(device.writes,0);store.session.edit('thumbnail-title','Una muestra recuperable');store.session.edit('hero-x',12);
  const decisions={'thumbnail-title':'draft','thumbnail-image':'current'};assert.equal(store.persist({...ui(decisions),open:false}),true);
  const restored=open(device,kind);assert.equal(restored.state,'restored');assert.deepEqual(restored.session.original,store.session.original);assert.deepEqual(restored.session.draft,store.session.draft);assert.deepEqual(restored.session.changes,store.session.changes);assert.deepEqual(restored.ui,{...ui(decisions),open:false});assert.equal(device.writes,1);
  const raw=device.getItem(store.key);assert.equal(raw.includes('data:image/'),false);assert.equal(raw.includes('credentials'),false);assert.equal(JSON.parse(raw).project,undefined);
});
for(const kind of ['site','presentation'])test(kind+': resolved draft survives reload and undo/redo restores the prior revision and comparison history',()=>{
  const device=memory(),store=open(device,kind),decisions=choices(store),old=store.session.draft;assert.equal(store.persist(ui(decisions)),true);
  const result=resolveRevisions(store.session.original,store.session.draft,store.data.current,decisions);store.session.rebase(result.current,result.draft,decisions);store.session.edit('hero-title','Después de combinar');store.session.undo();store.persist(ui(decisions));
  const restored=open(device,kind);assert.equal(restored.session.original.source.revision,'demo-r2');assert.deepEqual(restored.session.draft,result.draft);assert.equal(restored.session.canRedo,true);
  restored.session.undo();assert.equal(restored.session.original.source.revision,'demo-r1');assert.deepEqual(restored.session.draft,old);restored.session.redo();assert.deepEqual(restored.session.draft,result.draft);restored.session.redo();assert.equal(restored.session.draft.document.components.hero.title,'Después de combinar');
});
test('kind and phase keep separate copies and after-save review state is recovered only in its own fixture',()=>{
  const device=memory(),site=open(device),deck=open(device,'presentation'),uncertain=open(device,'site','after-save');
  site.session.edit('thumbnail-title','Site ficticio');site.persist(ui());deck.session.edit('thumbnail-title','Presentación ficticia');deck.persist(ui());uncertain.persist({...ui(),historyReviewed:true});
  assert.equal(open(device).session.draft.document.components.thumbnail.title,'Site ficticio');assert.equal(open(device,'presentation').session.draft.document.components.thumbnail.title,'Presentación ficticia');assert.equal(open(device).ui.historyReviewed,false);assert.equal(open(device,'site','after-save').ui.historyReviewed,true);assert.equal(device.values.size,3);
});
test('corrupt, future, stale, injected and invalid command copies remain byte-for-byte intact without repair or retry',()=>{
  const good=memory(),seed=open(good);seed.persist(ui());const original=JSON.parse(good.getItem(seed.key));
  const cases=['{broken',JSON.stringify({...original,version:99}),JSON.stringify({...original,basis:original.basis+'older'}),JSON.stringify({...original,client:'actual-client',assets:'data:image/png;base64,YQ=='}),JSON.stringify({...original,actions:[{type:'edit',field:'unknown',value:'No'}]}),JSON.stringify({...original,actions:[{type:'edit',field:'hero-x',value:999}]}),JSON.stringify({...original,actions:[{type:'resolve',decisions:{}}]}),JSON.stringify({...original,decisions:{unknown:'draft'}}),JSON.stringify({...original,actions:[{type:'edit',field:'thumbnail-image',value:'data:image/png;base64,YQ=='}]})];
  for(const raw of cases){const device=memory();device.values.set(seed.key,raw);const store=open(device);assert.equal(store.blocked,true);assert.equal(device.writes,0);store.session.edit('thumbnail-title','Nuevo ajuste ficticio');assert.equal(store.persist(ui()),false);assert.equal(device.getItem(seed.key),raw);assert.equal(device.writes,0);}
});
test('a copy changed outside the controller blocks replacement even if the new data is valid',()=>{
  const device=memory(),a=open(device),b=open(device);a.persist(ui({'thumbnail-title':'draft'}));const raw=device.getItem(a.key);b.session.edit('thumbnail-title','Otro borrador ficticio');assert.equal(b.persist(ui()),false);assert.equal(b.state,'changed');assert.equal(device.getItem(a.key),raw);assert.equal(device.writes,1);
});
test('storage read failures do not attempt writes and a quota failure is attempted once with no retries',()=>{
  let calls=0;const unavailable=createFixtureRecovery({location:location(),storage:()=>{calls++;throw Error('Denied');}});assert.equal(unavailable.state,'unavailable');unavailable.session.edit('thumbnail-title','Muestra');unavailable.persist(ui());assert.equal(calls,1);
  const device=memory(),store=open(device);store.persist(ui());const good=device.getItem(store.key);let attempts=0;device.setItem=()=>{attempts++;throw Error('Quota');};store.session.edit('hero-x',12);assert.equal(store.persist(ui()),false);store.session.edit('hero-x',13);assert.equal(store.persist(ui()),false);assert.equal(attempts,1);assert.equal(device.getItem(store.key),good);
});
test('unchanged snapshots are not rewritten and reset/branching retain the existing history semantics',()=>{
  const device=memory(),store=open(device);store.persist(ui());store.persist(ui());assert.equal(device.writes,1);store.session.edit('hero-x',12);store.session.reset();store.session.undo();store.session.edit('hero-title','Nueva rama ficticia');store.persist(ui());const restored=open(device);assert.equal(restored.session.canRedo,false);assert.equal(restored.session.draft.document.components.hero.x,12);assert.equal(restored.session.draft.document.components.hero.title,'Nueva rama ficticia');
});
test('non-fixture media is never saved and an oversized history retains the last good copy',()=>{
  const device=memory(),store=open(device);store.persist(ui());const before=device.getItem(store.key);store.session.edit('thumbnail-image','data:image/png;base64,YQ==');assert.equal(store.state,'unsupported');assert.equal(store.persist(ui()),false);assert.equal(device.getItem(store.key),before);
  const second=memory(),limited=open(second);limited.persist(ui());const good=second.getItem(limited.key);for(let i=0;i<=300;i++)limited.session.edit('hero-title','Muestra '+i);assert.equal(limited.state,'limit');assert.equal(limited.persist(ui()),false);assert.equal(second.getItem(limited.key),good);
});
