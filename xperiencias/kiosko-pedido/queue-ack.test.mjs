import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const context=vm.createContext({AbortController,setTimeout,clearTimeout});vm.runInContext(readFileSync(new URL('./queue-ack.js',import.meta.url),'utf8'),context);const ack=context.KioskoQueueAck;
test('401, network rejection, invalid JSON and ok:false cannot acknowledge an order',async()=>{
 for(const fetcher of [async()=>new Response('{}',{status:401}),async()=>{throw Error('offline');},async()=>new Response('bad'),async()=>Response.json({ok:false})])await assert.rejects(ack.request(fetcher,'https://fixture/cola/pedido'));
});
test('valid ACK requires a queue number and matching ID; no local fallback',()=>{
 assert.equal(ack.number({ok:true,id:'original',numero:'A321'},'original'),'A321');for(const data of [{ok:false,numero:'A321'},{ok:true},{ok:true,numero:'A321'},{ok:true,id:'another',numero:'A321'},{ok:true,numero:'local'},{ok:true,numero:'<img>'}])assert.throws(()=>ack.number(data,'original'));
});
test('retry can resend the same stable order ID and preserves supplied scoped payment headers',async()=>{
 const seen=[];const fetcher=async(url,opts)=>{seen.push(JSON.parse(opts.body).id);assert.equal(opts.headers['x-cola-pago'],'dummy-token');return Response.json({ok:true,id:'original',numero:'A321'});};for(let n=0;n<2;n++)assert.equal(ack.number(await ack.request(fetcher,'https://fixture/cola/pagar',{method:'POST',headers:{'x-cola-pago':'dummy-token'},body:JSON.stringify({id:'original'})}),'original'),'A321');assert.deepEqual(seen,['original','original']);
});

test('paid receipts require the exact order and an acknowledged paid queue state',()=>{
 for(const estado of ['recibido','preparando','listo','recogido'])assert.equal(ack.paid({ok:true,id:'original',numero:'A321',estado},'original').estado,estado);
 for(const estado of [undefined,'pendiente','pagado','unknown'])assert.throws(()=>ack.paid({ok:true,id:'original',numero:'A321',estado},'original'));
});
