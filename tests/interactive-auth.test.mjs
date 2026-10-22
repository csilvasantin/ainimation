import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGoogleAuth} from '../assets/interactive-auth.mjs';

class Element extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag;this.children=[];this.dataset={};this.hidden=false;this.disabled=false;this.textContent='';this.open=false;}
 append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this;this.children.push(n);}}
 showModal(){this.open=true;}
}
function fixture({verify=async()=>new Response('{}'),lang='es'}={}){
 const elements=new Map(['googleLogin','loginDialog','loginTarget','cloudStatus','loginExplanation','cloudLogout','cloudSync','cloudPull','cloudProjectSync','entryLogin'].map(id=>[id,new Element()]));
 elements.get('entryLogin').nextElementSibling=new Element();
 const head=new Element('head'),win=new EventTarget(),calls=[],accepted=[];let initialized=0,config,moment;
 const sdk={initialize:c=>{initialized++;config=c;},renderButton:(host,options)=>{const frame=new Element('iframe');host.append(frame);calls.push({host,options,frame});},prompt:fn=>{moment=fn;},cancel(){},disableAutoSelect(){}};
 const doc={documentElement:{lang},head,getElementById:id=>elements.get(id),createElement:tag=>new Element(tag)};
 const auth=mountGoogleAuth({endpoint:'https://api.example/api',doc,win,sdk,request:async url=>url.endsWith('/config')?new Response(JSON.stringify({clientId:'configured-client'})):verify(),onVerified:token=>accepted.push(token)});
 const open=()=>{elements.get('loginDialog').showModal();win.dispatchEvent(new Event('interactive-account-open'));};
 return {auth,elements,head,win,calls,accepted,open,credential:response=>config.callback(response),initialized:()=>initialized,moment:()=>moment};
}

test('biblioteca y cuenta mantienen sus botones Google independientes al abrir y cerrar',async()=>{
 const f=fixture();await f.auth.ready;assert.equal(f.initialized(),1);assert.equal(f.calls.length,1);const first=f.calls[0],parent=first.frame.parent;
 for(let i=0;i<4;i++){f.open();f.elements.get('loginDialog').open=false;}
 assert.equal(f.initialized(),1);assert.equal(f.calls.length,2);assert.equal(first.frame.parent,parent);assert.equal(first.options.state,'library');assert.equal(f.calls[1].options.state,'account');assert.notEqual(first.host.parent,f.calls[1].host.parent);
});
test('sólo la respuesta aceptada por el servidor habilita la sesión',async()=>{
 const failed=fixture({verify:async()=>new Response('{}',{status:401})});await failed.auth.ready;await failed.credential({credential:'test-invalid'});assert.equal(failed.accepted.length,0);assert.equal(failed.elements.get('cloudSync').disabled,true);assert.match(failed.elements.get('cloudStatus').textContent,/no tiene acceso/);
 const ok=fixture();await ok.auth.ready;await ok.credential({credential:'test-verified',select_by:'btn',state:'account'});assert.deepEqual(ok.accepted,['test-verified']);assert.equal(ok.elements.get('cloudSync').disabled,false);assert.equal(ok.elements.get('cloudStatus').dataset.googleSignInMethod,'btn');assert.match(ok.elements.get('cloudStatus').textContent,/Cuenta verificada/);
});
test('salir durante una comprobación impide que una respuesta tardía restaure la sesión',async()=>{
 let finish;const f=fixture({verify:()=>new Promise(r=>{finish=r;})});await f.auth.ready;const pending=f.credential({credential:'test-pending'});f.auth.signOut();finish(new Response('{}'));await pending;assert.equal(f.accepted.length,0);assert.equal(f.elements.get('cloudSync').disabled,true);assert.match(f.elements.get('cloudStatus').textContent,/desconectada/);
 await f.credential({credential:'late-callback'});assert.equal(f.accepted.length,0);
});
test('un aviso tardío de One Tap no sustituye el estado de una cuenta ya verificada',async()=>{
 const f=fixture({lang:'en'});await f.auth.ready;f.open();const inline=f.calls[1].host.parent.children.find(n=>n.tagName==='button');inline.onclick();await f.credential({credential:'test-verified',select_by:'user'});f.moment()({isNotDisplayed:()=>true,getNotDisplayedReason:()=> 'unknown_reason'});assert.match(f.elements.get('cloudStatus').textContent,/Account verified/);assert.equal(f.elements.get('cloudSync').disabled,false);
});
