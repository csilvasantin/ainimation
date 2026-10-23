import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeliveryBatchVersions,deliveryVersionCheckCsv,deliveryBatchCsv} from '../assets/interactive-delivery-history.mjs';

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
 for(const body of [false,true,'abortable']){let observed;const r=await checkDeliveryBatchVersions(batch([row(1)]),{timeoutMs:5,request:async(url,options)=>{observed=options.signal;return body?{ok:true,status:200,json:()=>new Promise((_,reject)=>{if(body==='abortable')options.signal.addEventListener('abort',()=>reject(Error('raw abort must not leak')));})}:new Promise(()=>{});}});assert.equal(r.results[0].state,'unknown');assert.equal(r.results[0].reason,'timeout');assert.equal(r.counts.unavailable,0);assert.equal(observed.aborted,true);}
});

test('cancelar aborta las consultas activas y no empieza los recibos que estaban en cola', {timeout:5000},async()=>{
 const controller=new AbortController(),signals=[];const running=checkDeliveryBatchVersions(batch(Array.from({length:10},(_,i)=>row(i+1))),{signal:controller.signal,request:(url,options)=>{signals.push(options.signal);return new Promise(()=>{});}});assert.equal(signals.length,3);controller.abort();const report=await running;assert.equal(report.cancelled,true);assert.equal(signals.length,3);assert.ok(signals.every(s=>s.aborted));assert.equal(report.counts.available,0);
 const before=signals.length;await checkDeliveryBatchVersions(batch(),{signal:controller.signal,request:()=>{signals.push(null);}});assert.equal(signals.length,before);
});

test('informe CSV exporta la consulta exacta con cuatro estados y motivos distintos, sin repetir peticiones ni incluir datos ajenos',async()=>{
 const b=batch([row(1),row(2),row(3),row(4),row(5,'pending'),row(6,'error')]);b.projectTitle='Catálogo "táctil", café\nBarcelona';b.token='private-token';const before=JSON.stringify(b),original=deliveryBatchCsv(b);let calls=0;
 const report=await checkDeliveryBatchVersions(b,{now:()=> '2026-10-23T01:02:03Z',request:async url=>{calls++;const id=parseInt(url.split('/').at(-1),16);return id===1?response(metadata(1)):id===2?response({},404):id===3?response({},503):response(metadata(1));}}),snapshot=JSON.stringify(report),file=deliveryVersionCheckCsv(b,report);
 assert.equal(calls,4);assert.match(file.filename,/^ainimation-comprobacion-2026-10-23T01-02-03-000Z-v9-batch\.csv$/);assert.notEqual(file.filename,original.filename);assert.equal(file.type,'text/csv;charset=utf-8');assert.ok(file.content.startsWith('\ufeff"Comprobado (UTC)","Proyecto","Versión"'));assert.equal(file.content.match(/2026-10-23T01:02:03.000Z/g).length,6);assert.match(file.content,/"Catálogo ""táctil"", café\nBarcelona"/);
 for(const value of ['"Disponible","Coinciden recibo, proyecto, versión y destino"','"No disponible","Ausencia confirmada (404/410)"','"Sin poder comprobar","Respuesta HTTP 503"','"No disponible","Los datos no coinciden con este lote"','"Sin enlace confirmado","Sin comprobar: no hay enlace confirmado",""'])assert.ok(file.content.includes(value),value);
 assert.equal(file.content.match(/https:\/\/www.admira.store/g).length,4);for(const forbidden of ['private-token','not-for-client','loc=venue-5','loc=venue-6'])assert.ok(!file.content.includes(forbidden));
 const english=deliveryVersionCheckCsv(b,report,'en');assert.match(english.filename,/version-check/);assert.ok(english.content.startsWith('\ufeff"Checked at (UTC)"'));assert.match(english.content,/"Could not be checked"/);assert.equal(calls,4);assert.equal(JSON.stringify(b),before);assert.equal(JSON.stringify(report),snapshot);assert.deepEqual(deliveryBatchCsv(b),original);
});

test('informe de comprobación neutraliza fórmulas, acentos, comillas y controles sin cambiar sus metadatos',async()=>{
 const b=batch([row(1)]),report=await checkDeliveryBatchVersions(b,{request:async()=>response(metadata(1))});
 for(const value of ['=1+1','+SUM(1,2)','-1+2','@SUM(A1)','  =HYPERLINK("https://evil.test")','\t=1+1','\r\n+1','\u200b=1','＝1+1']){
  for(const key of ['projectTitle','locationName','screenName']){const copy=structuredClone(b);if(key==='projectTitle')copy[key]=value;else copy.results[0][key]=value;const csv=deliveryVersionCheckCsv(copy,report);assert.ok(csv.content.includes('"\''+value.replaceAll('"','""')+'"'),key+':'+JSON.stringify(value));}
 }
});

test('informe falla cerrado ante otra consulta, recibo, proyecto, revisión, destino, recuentos o resultados incompletos/cancelados',async()=>{
 const b=batch(),report=await checkDeliveryBatchVersions(b,{request:async url=>response(metadata(parseInt(url.split('/').at(-1),16)))});
 for(const change of [r=>r.batchId='other',r=>r.projectId='other',r=>r.revision=8,r=>r.checkedAt='bad',r=>r.cancelled=true,r=>delete r.cancelled,r=>r.results.pop(),r=>r.results.reverse(),r=>r.results[0].receiptId=receipt(2),r=>r.results[0].locationId='other',r=>r.results[0].screenId='other',r=>r.results[0].state='no_link',r=>r.results[0].reason='not_checked',r=>r.counts.available=4]){const copy=structuredClone(report);change(copy);assert.throws(()=>deliveryVersionCheckCsv(b,copy));}
 const altered=structuredClone(b);altered.results[0].url=altered.results[0].url.replace(receipt(1),receipt(99));assert.throws(()=>deliveryVersionCheckCsv(altered,report));assert.throws(()=>deliveryVersionCheckCsv({...b,revision:10},report));assert.throws(()=>deliveryVersionCheckCsv(b,undefined));
 const pending=batch([row(1,'pending')]),noLink=await checkDeliveryBatchVersions(pending);noLink.results[0].state='available';noLink.results[0].reason='matched';assert.throws(()=>deliveryVersionCheckCsv(pending,noLink));
});

test('motivos controlados distinguen HTTP, conexión y JSON ilegible sin leer errores HTTP ni copiar cuerpos o excepciones',async()=>{
 const b=batch([row(1)]);let bodies=0;
 for(const status of [101,302,401,403,429,500,503,599]){const report=await checkDeliveryBatchVersions(b,{request:async()=>({ok:false,status,json:async()=>{bodies++;throw Error('private body');}})});assert.equal(report.results[0].state,'unknown');assert.equal(report.results[0].reason,'http_error');assert.equal(report.results[0].httpStatus,status);assert.ok(deliveryVersionCheckCsv(b,report).content.includes('Respuesta HTTP '+status));assert.ok(deliveryVersionCheckCsv(b,report,'en').content.includes('HTTP response '+status));}
 assert.equal(bodies,0);
 for(const request of [async()=>{throw Error('credential: private network error');},async()=>{throw new TypeError('redirect blocked: private target');}]){const report=await checkDeliveryBatchVersions(b,{request});assert.equal(report.results[0].reason,'connection_failed');assert.equal(report.results[0].httpStatus,undefined);assert.ok(!JSON.stringify(report).includes('private'));assert.ok(deliveryVersionCheckCsv(b,report).content.includes('Fallo de conexión o consulta'));}
 for(const request of [async()=>({ok:true,status:200,json:async()=>{throw Error('private JSON payload');}}),async()=>({ok:false,status:0}),async()=>({ok:false,status:'503'}),async()=>({ok:false,status:700})]){const report=await checkDeliveryBatchVersions(b,{request});assert.equal(report.results[0].reason,'unreadable_response');assert.equal(report.results[0].httpStatus,undefined);assert.ok(!JSON.stringify(report).includes('private'));assert.ok(deliveryVersionCheckCsv(b,report).content.includes('Datos de respuesta ilegibles'));}
});

test('CSV rechaza códigos HTTP o motivos manipulados y no interpola atributos ajenos',async()=>{
 const b=batch([row(1)]),report=await checkDeliveryBatchVersions(b,{request:async()=>response({},503)});
 for(const status of [0,99,200,299,404,410,600,NaN,Infinity,'503','503 private\n=1',503.5]){const copy=structuredClone(report);copy.results[0].httpStatus=status;assert.throws(()=>deliveryVersionCheckCsv(b,copy));}
 for(const reason of ['private-body','request_failed','not_checked','matched']){const copy=structuredClone(report);copy.results[0].reason=reason;assert.throws(()=>deliveryVersionCheckCsv(b,copy));}
 const copy=structuredClone(report);copy.results[0].message='private-token';copy.results[0].body='private-content';const csv=deliveryVersionCheckCsv(b,copy).content;assert.ok(!csv.includes('private-'));
 copy.results[0].reason='connection_failed';assert.throws(()=>deliveryVersionCheckCsv(b,copy));
});

test('progreso cuenta sólo recibos confirmados y consultas terminadas, esperando al cuerpo y sin confundir resultado con disponibilidad',async()=>{
 const b=batch([row(1),row(2),row(3),row(4,'pending'),row(5,'error')]),pending=[],events=[];let rejectBody;
 const body=new Promise((_,reject)=>rejectBody=reject),running=checkDeliveryBatchVersions(b,{onProgress:event=>events.push(event),request:(url,options)=>new Promise(resolve=>pending.push({resolve,url,options}))});
 assert.deepEqual(events,[{batchId:'batch',completed:0,total:3,withoutLink:2}]);assert.equal(pending.length,3);
 pending[0].resolve(response(metadata(1)));await new Promise(setImmediate);assert.equal(events.at(-1).completed,1);
 pending[1].resolve(response({},404));await new Promise(setImmediate);assert.equal(events.at(-1).completed,2);
 pending[2].resolve({ok:true,status:200,json:()=>body});await new Promise(setImmediate);assert.equal(events.length,3);rejectBody(Error('private body'));const report=await running;
 assert.deepEqual(events.map(e=>e.completed),[0,1,2,3]);assert.ok(events.every(e=>e.total===3&&e.withoutLink===2&&Object.keys(e).sort().join(',')==='batchId,completed,total,withoutLink'));assert.deepEqual(report.counts,{available:1,unavailable:1,unknown:1,no_link:2});assert.equal(pending.length,3);assert.ok(!JSON.stringify(events).includes('private'));
});

test('plazos y errores también terminan consultas; observadores fallidos o modificados no cambian el informe',async()=>{
 for(const request of [()=>new Promise(()=>{}),async()=>({ok:true,status:200,json:()=>new Promise(()=>{})}),async()=>{throw Error('private network');}]){const events=[],report=await checkDeliveryBatchVersions(batch([row(1)]),{request,timeoutMs:5,onProgress:p=>events.push(p.completed)});assert.deepEqual(events,[0,1]);assert.equal(report.counts.unknown,1);}
 let calls=0;const report=await checkDeliveryBatchVersions(batch([row(1)]),{request:async()=>response(metadata(1)),onProgress:p=>{calls++;p.completed=1000;p.total=0;throw Error('private observer');}});assert.equal(calls,2);assert.equal(report.counts.available,1);assert.ok(!JSON.stringify(report).includes('observer'));
 const events=[];await checkDeliveryBatchVersions(batch([row(1,'pending')]),{onProgress:p=>events.push(p),request:()=>{throw Error('must not request');}});assert.deepEqual(events,[{batchId:'batch',completed:0,total:0,withoutLink:1}]);
});

test('cancelar detiene los callbacks y la cola aunque lleguen respuestas después',async()=>{
 const controller=new AbortController(),pending=[],events=[];const running=checkDeliveryBatchVersions(batch(),{signal:controller.signal,onProgress:p=>{events.push(p.completed);if(p.completed===1)controller.abort();},request:(url,options)=>new Promise(resolve=>pending.push({resolve,signal:options.signal}))});
 assert.equal(pending.length,3);pending[0].resolve(response(metadata(1)));const report=await running;assert.equal(report.cancelled,true);assert.deepEqual(events,[0,1]);assert.equal(pending.length,3);assert.ok(pending.slice(1).every(p=>p.signal.aborted));for(const p of pending)p.resolve(response({},404));await new Promise(setImmediate);assert.deepEqual(events,[0,1]);
 const noEvents=[];await checkDeliveryBatchVersions(batch(),{signal:controller.signal,onProgress:p=>noEvents.push(p)});assert.deepEqual(noEvents,[]);
});
