import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('paid order messages remain cloneable when queue creation stores a Promise',()=>{
 const html=fs.readFileSync('xperiencias/kiosko-pedido/index.html','utf8');const start=html.indexOf('function host(event,extra)');const end=html.indexOf('// «say»',start);let sent;
 let to;const context={order:{id:'test-order',number:'A003',customerName:'Codex',status:'paid-simulated',_colaP:Promise.resolve(),_espera:1},location:{ancestorOrigins:['https://www.admira.store']},window:{parent:{postMessage:(msg,o)=>{sent=structuredClone(msg);to=o;}}}};
 vm.createContext(context);vm.runInContext(html.slice(start,end)+';host("order",{status:order.status});',context);
 assert.equal(to,'https://www.admira.store','origen explícito del gemelo, nunca "*"');assert.equal(sent.order.customerName,'Codex');assert.equal(sent.order.number,'A003');assert.equal(sent.order._colaP,undefined);assert.equal(sent.event,'order');
});
test('el pedido no sale hacia un anfitrión que no está en la lista',()=>{
 const html=fs.readFileSync('xperiencias/kiosko-pedido/index.html','utf8');const start=html.indexOf('function host(event,extra)');const end=html.indexOf('// «say»',start);let sent=null;
 const context={order:{id:'x',customerName:'Ana'},location:{ancestorOrigins:['https://evil.example']},document:{referrer:''},window:{parent:{postMessage:msg=>{sent=msg;}}}};
 vm.createContext(context);vm.runInContext(html.slice(start,end)+';host("order",{status:"paid-simulated"});',context);
 assert.equal(sent,null);assert.equal(context.window.__kioskEvents.length,1,'queda el rastro local');
});
