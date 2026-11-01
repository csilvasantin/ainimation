import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePresentation, acceptsMessage, trustedGeneratorOrigin, demo} from '../presentaciones/contract.mjs';
import {toDirector,prepareDirector,restoreDirector} from '../presentaciones/director.mjs';
const copy=()=>structuredClone(demo);
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
test('projection retains full visible text and excludes private extras at every level',()=>{
  const p=copy();p.password='secret';p.source.token='credential';p.slides[0].notes='private';
  const clean=validatePresentation(p);assert.deepEqual(clean,demo);assert.equal(JSON.stringify(clean).includes('secret'),false);
});
test('rejects malformed, oversized, duplicate or unsupported input without mutating it',()=>{
  for(const change of [p=>p.version=2,p=>p.source.language='xx',p=>p.slides[1].id=p.slides[0].id,p=>p.slides[0].title='a'.repeat(221),p=>p.source.id='../secret',p=>p.slides=[],p=>p.extra='a'.repeat(200001)]){
    const p=copy();change(p);const before=structuredClone(p);assert.throws(()=>validatePresentation(p));assert.deepEqual(p,before);
  }
});
test('exact origin, source window, channel and type are all required',()=>{
  const source={},channel='d869a3db-0132-4737-ae49-5f071dd104cb',origin='https://www.admiranext.com';
  const session={source,channel,origin},event={source,origin,data:{channel,type:'admiranext:presentation:load'}};
  assert.equal(acceptsMessage(event,session),true);
  for(const override of [{origin:'https://www.admiranext.com.evil.test'},{source:{}},{data:{channel:'other',type:event.data.type}},{data:{channel,type:'different'}}])assert.equal(acceptsMessage({...event,...override},session),false);
  for(const bad of ['null','file://','http://admiranext.com','https://evil.test','http://localhost.evil.test','http://127.0.0.1:9134/secret'])assert.equal(trustedGeneratorOrigin(bad),false);
  assert.equal(trustedGeneratorOrigin('http://127.0.0.1:9135'),true);
});
test('Director has resolvable navigation and hold markers, plus editable animated sprites',()=>{
  const plan=toDirector(copy()),labels=new Set(plan.markers.map(m=>m.label));
  assert.deepEqual(plan.presentationSource,demo);assert.equal(plan.cast.length,0);
  for(const rule of plan.rules)for(const action of rule.do)if(['goToMarker','playSegment'].includes(action.id))assert.ok(labels.has(action.value));
  assert.equal(plan.rules.filter(r=>r.id.startsWith('hold')).length,plan.scenes.length);
  for(const scene of plan.scenes){assert.ok(plan.stageItems.some(i=>i.startFrame===scene.startFrame&&i.keyframes?.length===2));}
  assert.ok(plan.stageItems.filter(i=>i.interactive).every(i=>plan.rules.some(r=>r.when.conds[0].value===i.id)));
});
test('long source copy is paginated in Director without losing a single character',()=>{
  const p=copy();p.slides[0].message='Hola mundo. '.repeat(70);p.slides[0].detail='Más información. '.repeat(110);
  const plan=toDirector(p),end=plan.scenes.findIndex(s=>s.beat===p.slides[1].title);
  assert.equal(plan.scenes.slice(0,end).map(s=>s.scene).join(''),p.slides[0].message+'\n\n'+p.slides[0].detail);
  assert.ok(plan.scenes.every(s=>s.scene.length<=420));assert.deepEqual(plan.presentationSource,p);
});
test('opening Director backs up exact workspace, restore also preserves the imported movie',()=>{
  const s=memory();s.setItem('ainimation-film-plan','old-film');s.setItem('ainimation-timeline-markers','old-markers');s.setItem('ainimation-score-labels','old-labels');
  const plan=prepareDirector(s,demo,'test');assert.equal(s.getItem('ainimation-score-labels'),null);
  const imported=s.getItem('ainimation-film-plan');restoreDirector(s,plan.presentationRecoveryKey);
  assert.equal(s.getItem('ainimation-film-plan'),'old-film');assert.equal(s.getItem('ainimation-timeline-markers'),'old-markers');assert.equal(s.getItem('ainimation-score-labels'),'old-labels');
  assert.equal(JSON.parse(s.getItem(plan.presentationRecoveryKey+':before-restore')).film,imported);
});
test('a failed import restores the old movie and markers',()=>{
  const s=memory();s.setItem('ainimation-film-plan','old-film');s.setItem('ainimation-timeline-markers','old-markers');
  const set=s.setItem;s.setItem=(key,value)=>{if(key==='ainimation-timeline-markers'&&value!=='old-markers')throw Error('quota');set(key,value);};
  assert.throws(()=>prepareDirector(s,demo,'fail'),/quota/);assert.equal(s.getItem('ainimation-film-plan'),'old-film');assert.equal(s.getItem('ainimation-timeline-markers'),'old-markers');
});
