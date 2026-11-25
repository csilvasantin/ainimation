import test from 'node:test';
import assert from 'node:assert/strict';
import { hingePose, physicalView, registryTags, mediaOf, SCREEN_ID } from '../digital-twins/galaxy-z-fold5/controls.mjs';
test('articulation uses symmetric pivots and clamps local input', () => {
  assert.deepEqual(hingePose(180), { angle:180, left:-0, right:0, hingeY:.305 });
  assert.equal(hingePose(0).left, -Math.PI / 2); assert.equal(hingePose(90).right, Math.PI / 4);
  assert.equal(hingePose(-5).angle, 0); assert.equal(hingePose(999).angle, 180); assert.equal(hingePose('invalid').angle, 180);
});
test('stale or missing USB observations never claim current playback', () => {
  const now=1_000_000,state={lastSeen:now-15000,health:{status:'opened'},item:{title:'A'},device:{display:{playbackPaused:false}}};
  assert.equal(physicalView(state,now).playing,true); assert.equal(physicalView(state,now).angle,180);
  assert.equal(physicalView(state,now+61000).playing,false); assert.equal(physicalView(null,now).fresh,false);
  assert.equal(physicalView({...state,health:{status:'half-opened'}},now).angle,90);
  const closed=physicalView({...state,item:null,health:{status:'closed-audio'}},now);
  assert.equal(closed.angle,0);assert.match(closed.detail,/audio continúa/);
});
test('content links are HTTPS and preserve the native screen identity', () => {
  assert.equal(SCREEN_ID,'fold-carlos-pruebas');
  for(const url of ['javascript:alert(1)','http://example.com/a.mp4','https://user:pass@example.com/a.mp4']) assert.equal(mediaOf({url}),null);
  assert.equal(mediaOf({url:'https://stock.admira.store/a.mp3',type:'music'}).kind,'audio');
  assert.deepEqual(registryTags({ok:true,element:{routingTags:['#samsung','samsung','custom']}}),['samsung','custom']);
});
