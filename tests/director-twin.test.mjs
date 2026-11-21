import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitFrame,acceptsFrameRequest} from '../assets/director-twin.mjs';
test('wide Stage fits LCD and portrait mosaic without distortion; cover crops symmetrically',()=>{
 const source={width:1920,height:1080};let draw;
 const ctx={fillRect(){},drawImage(...args){draw=args;}};
 fitFrame(ctx,source,480,640);assert.equal(draw[1],0);assert.equal(draw[2],185);assert.equal(draw[3],480);assert.equal(draw[4],270);
 fitFrame(ctx,source,480,640,'cover');assert.ok(draw[1]<0);assert.equal(draw[2],0);assert.equal(draw[4],640);
 fitFrame(ctx,source,720,384);assert.equal(draw[2],0);assert.ok(draw[1]>0);assert.equal(draw[4],384);
 assert.throws(()=>fitFrame(ctx,{width:0,height:1080},720,384),/dimensiones/);
});
test('only the selected same-origin preview frame and current session can request Stage images',()=>{
 const frame={},other={},options={origin:'https://www.ainimation.studio',source:frame,session:'current'};
 const event={origin:options.origin,source:frame,data:{type:'ain:director:request',session:'current'}};
 assert.equal(acceptsFrameRequest(event,options),true);
 for(const invalid of [{...event,origin:'https://evil.example'},{...event,source:other},{...event,data:{...event.data,session:'previous'}},{...event,data:{...event.data,type:'publish'} }])assert.equal(acceptsFrameRequest(invalid,options),false);
});
