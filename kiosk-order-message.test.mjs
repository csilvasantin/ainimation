import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('paid order messages remain cloneable when queue creation stores a Promise',()=>{
 const html=fs.readFileSync('xperiencias/kiosko-pedido/index.html','utf8');const start=html.indexOf('function host(event,extra)');const end=html.indexOf('// «say»',start);let sent;
 const context={order:{id:'test-order',number:'A003',customerName:'Codex',status:'paid-simulated',_colaP:Promise.resolve(),_espera:1},window:{parent:{postMessage:msg=>{sent=structuredClone(msg);}}}};
 vm.createContext(context);vm.runInContext(html.slice(start,end)+';host("order",{status:order.status});',context);
 assert.equal(sent.order.customerName,'Codex');assert.equal(sent.order.number,'A003');assert.equal(sent.order._colaP,undefined);assert.equal(sent.event,'order');
});
