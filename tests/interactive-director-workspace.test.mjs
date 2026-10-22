import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDirectorWorkspace} from '../assets/interactive-director-workspace.mjs';

class Element extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.style={};this.attrs={};if(tag==='iframe')this.contentWindow={messages:[],postMessage(data,origin){this.messages.push({data,origin});}};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(name,value){this.attrs[name]=value;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 remove(){this.removed=true;}
 focus(){this.focused=true;}
}
function setup({reject=false}={}){
 const win=new EventTarget();win.location={origin:'https://www.ainimation.studio',href:'https://www.ainimation.studio/interactivos/'};win.crypto={randomUUID:()=> 'channel-'+(++sequence)};let sequence=0;
 const body=new Element('body'),button=new Element('button'),doc={body,documentElement:{lang:'es'},createElement:tag=>new Element(tag)},returned=[],cancelled=[],errors=[];
 // This session object represents Creator's existing authenticated closure.
 const session={token:'only-in-parent-memory',verified:true};
 const workspace=mountDirectorWorkspace({button,doc,win,prepare:()=>({interactiveSource:{id:'project-1',revision:6}}),onReturn:data=>{if(reject)throw Error('Concurrent revision');returned.push(data);},onCancel:p=>cancelled.push(p),onError:e=>errors.push(e.message)});
 const current=()=>{const dialog=body.children.at(-1);return {dialog,frame:dialog.children[1]};};
 const message=(data,overrides={})=>{const {frame}=current(),event=new Event('message');Object.assign(event,{origin:win.location.origin,source:frame.contentWindow,data,...overrides});win.dispatchEvent(event);};
 const ready=()=>{const {frame}=current(),u=new URL(frame.src);message({type:'ainimation:director:ready',id:'project-1',channel:u.searchParams.get('channel')});};
 const finish=(overrides={})=>{const {frame}=current(),u=new URL(frame.src);message({type:'ainimation:director:return',id:'project-1',channel:u.searchParams.get('channel'),revision:7,...overrides});};
 return {win,body,button,workspace,current,message,ready,finish,returned,cancelled,errors,session};
}
test('Director returns the saved revision without navigating or replacing the verified Creator',()=>{
 const f=setup(),session=f.session,url=f.win.location.href;f.button.onclick();const {dialog,frame}=f.current();assert.equal(dialog.open,true);assert.match(frame.src,/host=creator/);assert.equal(new URL(frame.src).searchParams.has('token'),false);
 f.ready();f.finish();assert.deepEqual(f.returned,[{id:'project-1',revision:7}]);assert.equal(f.win.location.href,url);assert.equal(f.session,session);assert.equal(f.session.verified,true);assert.equal(dialog.removed,true);assert.equal(f.button.focused,true);assert.equal(f.workspace.isOpen(),false);
});
test('messages from another origin, window, project or opening cannot refresh Creator',()=>{
 const f=setup();f.button.onclick();const u=new URL(f.current().frame.src),valid={type:'ainimation:director:return',id:'project-1',channel:u.searchParams.get('channel'),revision:7};
 for(const overrides of [{origin:'https://other.example'},{source:{}},{data:{...valid,id:'other'}},{data:{...valid,channel:'old-channel'}},{data:{...valid,revision:0}},{data:{...valid,revision:7.5}}])f.message(valid,overrides);
 assert.equal(f.returned.length,0);assert.equal(f.workspace.isOpen(),true);f.finish();assert.equal(f.returned.length,1);
});
test('Escape asks the loaded Director to save and return; closing during load restores its previous workspace',()=>{
 const f=setup();f.button.onclick();let e=new Event('cancel',{cancelable:true});f.current().dialog.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.cancelled.length,1);assert.equal(f.workspace.isOpen(),false);
 f.button.onclick();f.ready();e=new Event('cancel',{cancelable:true});f.current().dialog.dispatchEvent(e);assert.equal(f.workspace.isOpen(),true);assert.equal(f.current().frame.contentWindow.messages[0].data.type,'ainimation:director:request-return');assert.equal(f.current().frame.contentWindow.messages[0].origin,f.win.location.origin);f.finish();assert.equal(f.workspace.isOpen(),false);
});
test('reopening uses a new channel and ignores a delayed return from the previous editor',()=>{
 const f=setup();f.button.onclick();const old=f.current().frame,oldChannel=new URL(old.src).searchParams.get('channel');f.finish();f.button.onclick();assert.notEqual(new URL(f.current().frame.src).searchParams.get('channel'),oldChannel);f.message({type:'ainimation:director:return',id:'project-1',channel:oldChannel,revision:7},{source:old.contentWindow});assert.equal(f.returned.length,1);assert.equal(f.workspace.isOpen(),true);f.finish({revision:8});assert.equal(f.returned.length,2);
});
test('a rejected project refresh reports the conflict without trapping the editor or changing the session',()=>{
 const f=setup({reject:true});f.button.onclick();f.finish();assert.deepEqual(f.errors,['Concurrent revision']);assert.equal(f.returned.length,0);assert.equal(f.workspace.isOpen(),false);assert.equal(f.session.verified,true);
});
test('late storage events from this editor are recognized, while other tabs keep conflict detection',()=>{
 const f=setup();f.button.onclick();const url=f.current().frame.src;assert.equal(f.workspace.ownsStorageEvent({url}),true);f.finish();assert.equal(f.workspace.ownsStorageEvent({url}),true);assert.equal(f.workspace.ownsStorageEvent({url:'https://www.ainimation.studio/interactivos/'}),false);assert.equal(f.workspace.ownsStorageEvent({url:url.replace('channel-1','other')}),false);
});
