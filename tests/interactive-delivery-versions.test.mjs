import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeliveryBatchVersions} from '../assets/interactive-delivery-history.mjs';

const receipt=i=>i.toString(16).padStart(64,'0');
const row=(i,status='success')=>({locationId:'venue-'+i,locationName:'Local '+i,screenId:'touch-'+i,screenName:'Táctil '+i,status,url:'https://www.admira.store/xpacios/pantalla/?loc=venue-'+i+'&screen=touch-'+i+'&ainimation='+receipt(i)});
const batch=(results=Array.from({length:5},(_,i)=>row(i+1)))=>({id:'batch',projectId:'project',projectTitle:'Catálogo',revision:9,createdAt:'2026-10-22T20:00:00Z',updatedAt:'2026-10-22T20:00:00Z',results});
const metadata=i=>({id:receipt(i),projectId:'project',sourceRevision:9,destination:{id:'venue-'+i,screen:{id:'touch-'+i,touch:true}},owner:'not-for-client'});
const response=(data,status=200)=>({status,ok:status>=200&&status<300,json:async()=>data});

test('consulta cinco recibos por GET público fijo sin credenciales ni redirecciones, con concurrencia limitada y sin cambiar datos',async()=>{
 const b=batch(),before=JSON.stringify(b),calls=[];let active=0,maximum=0;
 const report=await checkDeliveryBatchVersions(b,{now:()=> '2026-10-23T00:00:00Z',request:async(url,options)=>{calls.push({url,options});active++;maximum=Math.max(active,maximum);await new Promise(resolve=>setTimeout(resolve,2));active--;return response(metadata(parseInt(url.split('/').at(-1),16)));}});
 assert.equal(calls.length,5);assert.equal(maximum,3);for(const {url,options} of calls){assert.match(url,/^https:\/\/ainimation-interactive-library-preview\.csilvasantin\.workers\.dev\/api\/deliveries\/[a-f0-9]{64}$/);assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers,undefined);assert.equal(options.body,undefined);}
 assert.deepEqual(report.counts,{available:5,unavailable:0,unknown:0,no_link:0});assert.equal(report.checkedAt,'2026-10-23T00:00:00.000Z');assert.deepEqual(report.results.map(r=>r.locationId),b.results.map(r=>r.locationId));assert.ok(!JSON.stringify(report).includes('not-for-client'));assert.equal(JSON.stringify(b),before);
});

test('ausencia confirmada, servidor, red, JSON inválido y metadatos cruzados no se confunden con éxito',async()=>{
 for(const status of [404,410]){const r=await checkDeliveryBatchVersions(batch([row(1)]),{request:async()=>response({},status)});assert.equal(r.results[0].state,'unavailable');assert.equal(r.results[0].reason,'not_found');}
 for(const request of [async()=>response({},500),async()=>response({},401),async()=>response({},302),async()=>{throw Error('network');},async()=>({ok:true,status:200,json:async()=>{throw Error('json');}})]){const r=await checkDeliveryBatchVersions(batch([row(1)]),{request});assert.equal(r.results[0].state,'unknown');assert.equal(r.counts.unavailable,0);}
 for(const change of [d=>d.id=receipt(2),d=>d.projectId='other',d=>d.sourceRevision=8,d=>d.destination.id='other',d=>d.destination.screen.id='other',d=>d.destination.screen.touch=false,d=>delete d.destination,d=>delete d.destination.screen]){const d=metadata(1);change(d);const r=await checkDeliveryBatchVersions(batch([row(1)]),{request:async()=>response(d)});assert.equal(r.results[0].state,'unavailable');assert.equal(r.results[0].reason,'mismatch');assert.equal(r.counts.available,0);}
});

test('pendientes y errores sin enlace no generan consultas ni URLs, y un enlace inválido falla antes de consultar',async()=>{
 let calls=0;const request=async()=>{calls++;throw Error();};const r=await checkDeliveryBatchVersions(batch([row(1,'pending'),row(2,'sending'),row(3,'error')]),{request});assert.equal(calls,0);assert.deepEqual(r.counts,{available:0,unavailable:0,unknown:0,no_link:3});assert.ok(r.results.every(r=>r.state==='no_link'&&!r.url));
 for(const url of [row(1).url.replace('www.admira.store','evil.test'),row(1).url.replace('touch-1','touch-2'),row(1).url+'&next=https://evil.test'])await assert.rejects(checkDeliveryBatchVersions(batch([{...row(1),url}]),{request}));assert.equal(calls,0);
});

test('tiempo de espera limita tanto la petición como el cuerpo JSON y devuelve sin poder comprobar', {timeout:5000},async()=>{
 for(const body of [false,true]){let observed;const r=await checkDeliveryBatchVersions(batch([row(1)]),{timeoutMs:5,request:async(url,options)=>{observed=options.signal;return body?{ok:true,status:200,json:()=>new Promise(()=>{})}:new Promise(()=>{});}});assert.equal(r.results[0].state,'unknown');assert.equal(r.counts.unavailable,0);assert.equal(observed.aborted,true);}
});

test('cancelar aborta las consultas activas y no empieza los recibos que estaban en cola', {timeout:5000},async()=>{
 const controller=new AbortController(),signals=[];const running=checkDeliveryBatchVersions(batch(Array.from({length:10},(_,i)=>row(i+1))),{signal:controller.signal,request:(url,options)=>{signals.push(options.signal);return new Promise(()=>{});}});assert.equal(signals.length,3);controller.abort();const report=await running;assert.equal(report.cancelled,true);assert.equal(signals.length,3);assert.ok(signals.every(s=>s.aborted));assert.equal(report.counts.available,0);
 const before=signals.length;await checkDeliveryBatchVersions(batch(),{signal:controller.signal,request:()=>{signals.push(null);}});assert.equal(signals.length,before);
});
