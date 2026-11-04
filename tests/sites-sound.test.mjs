import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createPreviewSound,previewSoundBridge,SOUND_KEY} from '../sites/sound.mjs';
const base=new JSDOM('<!doctype html>');globalThis.window=base.window;globalThis.DOMParser=base.window.DOMParser;
const {buildDocument}=await import('../sites/preview.mjs');
const state=(type,total,silent,revision=-1,channel='qa')=>({type,total,silent,revision,channel});
function fixture(saved=null){
 const dom=new JSDOM('<button id="sound"></button>'),button=dom.window.document.getElementById('sound'),sent=[],data=new Map(saved===null?[]:[[SOUND_KEY,saved]]);
 let channel='qa',comparison=true;const frames={draft:{postMessage:(message,target)=>sent.push({source:'draft',message,target})},original:{postMessage:(message,target)=>sent.push({source:'original',message,target})}};
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const ui=createPreviewSound({button,storage,getFrames:()=>comparison?frames:{draft:frames.draft},getChannel:()=>channel});
 return {ui,button,sent,data,dom,setChannel:value=>channel=value,setComparison:value=>comparison=value};
}
test('el botón global sólo muestra el icono y tiene nombre accesible y tooltip',()=>{
 const doc=new JSDOM(readFileSync(new URL('../sites/index.html',import.meta.url),'utf8')).window.document,b=doc.getElementById('mute-videos');
 assert.equal(b.textContent.trim(),'');assert.equal(b.querySelectorAll('svg').length,1);assert.equal(b.getAttribute('aria-label'),'Silenciar todos los vídeos');assert.equal(b.title,b.getAttribute('aria-label'));assert.equal(b.getAttribute('aria-pressed'),'false');
});
test('silenciar y reactivar se envía a las dos vistas sin comandos de reproducción',()=>{
 const f=fixture();assert.equal(f.sent.length,0);f.ui.receive('draft',state('sound-ready',2,1));f.ui.receive('original',state('sound-ready',1,0));
 f.button.click();assert.equal(f.button.getAttribute('aria-pressed'),'true');assert.equal(f.button.title,'Activar sonido de los vídeos');assert.equal(f.data.get(SOUND_KEY),'1');
 assert.deepEqual(f.sent.map(s=>s.message),[{channel:'qa',type:'sound-set',muted:true,revision:1},{channel:'qa',type:'sound-set',muted:true,revision:1}]);assert.ok(f.sent.every(s=>s.target==='*'));
 f.ui.receive('draft',state('sound-state',2,2,1));f.ui.receive('original',state('sound-state',1,1,1));f.button.click();assert.equal(f.button.getAttribute('aria-pressed'),'false');assert.equal(f.data.get(SOUND_KEY),'0');assert.ok(f.sent.slice(-2).every(s=>s.message.muted===false&&s.message.revision===2));f.ui.dispose();
});
test('la preferencia se aplica a vistas nuevas y descarta estados o canales antiguos',()=>{
 const f=fixture('1');assert.equal(f.ui.isMuted(),true);f.ui.receive('draft',state('sound-ready',1,0));assert.equal(f.sent.at(-1).message.muted,true);
 const before=f.sent.length;f.ui.receive('foreign',state('sound-ready',1,0));f.ui.receive('original',state('sound-ready',1,0,-1,'viejo'));f.ui.receive('draft',{...state('sound-state',1,1,0),silent:2});assert.equal(f.sent.length,before);assert.equal(f.ui.isMuted(),true);
 f.setChannel('nuevo');f.ui.reset();f.ui.receive('draft',state('sound-ready',2,0,-1,'nuevo'));assert.equal(f.sent.at(-1).message.channel,'nuevo');assert.equal(f.sent.at(-1).message.muted,true);
 f.ui.receive('draft',state('sound-state',2,0,-1,'nuevo'));assert.equal(f.ui.preference,true);f.setComparison(false);f.ui.reset();f.ui.receive('original',state('sound-ready',1,0,-1,'nuevo'));assert.equal(f.sent.at(-1).source,'draft');f.ui.dispose();
});
test('los controles nativos pueden cambiar el silencio sin que el global los fuerce otra vez',()=>{
 const f=fixture();f.button.click();f.ui.receive('draft',state('sound-state',1,1,1));f.ui.receive('original',state('sound-state',1,1,1));assert.equal(f.ui.isMuted(),true);
 f.ui.receive('draft',state('sound-state',1,0,1));assert.equal(f.ui.isMuted(),false);assert.equal(f.ui.preference,null);assert.equal(f.data.has(SOUND_KEY),false);const count=f.sent.length;
 f.ui.reset();f.ui.receive('draft',state('sound-ready',1,0));f.ui.receive('original',state('sound-ready',1,0));assert.equal(f.sent.length,count);assert.equal(f.button.title,'Silenciar todos los vídeos');f.ui.dispose();
});
test('el control también funciona sin almacenamiento local o sin vídeos todavía',()=>{
 const dom=new JSDOM('<button></button>'),button=dom.window.document.querySelector('button'),storage={getItem(){throw Error('bloqueado');},setItem(){throw Error('bloqueado');},removeItem(){throw Error('bloqueado');}};
 const ui=createPreviewSound({button,storage,getFrames:()=>({}),getChannel:()=>''});button.click();assert.equal(ui.isMuted(),true);button.click();assert.equal(ui.isMuted(),false);ui.dispose();
});
function bridgeFixture(){
 const dom=new JSDOM('<!doctype html><video src="https://public.org/clip.mp4" controls></video><video controls></video>',{runScripts:'outside-only'}),win=dom.window,messages=[],parent={postMessage:data=>messages.push(data)};
 Object.defineProperty(win,'parent',{value:parent});for(const video of win.document.querySelectorAll('video')){video.play=()=>{throw Error('No debe reproducir');};video.pause=()=>{throw Error('No debe pausar');};}win.eval(previewSoundBridge('qa'));
 const send=(data,source=parent)=>win.dispatchEvent(new win.MessageEvent('message',{data,source}));return {dom,win,messages,parent,send,videos:[...win.document.querySelectorAll('video')]};
}
test('el puente sólo cambia audio con ventana, canal y revisión válidos; mantiene controles y reproducción',()=>{
 const f=bridgeFixture(),before=f.videos.map(v=>({src:v.getAttribute('src'),controls:v.controls,paused:v.paused,time:v.currentTime,autoplay:v.autoplay,defaultMuted:v.defaultMuted}));
 const command={channel:'qa',type:'sound-set',muted:true,revision:1};f.send(command,{});f.send({...command,channel:'ajeno'});f.send({...command,muted:'true'});f.send({...command,revision:-1});assert.ok(f.videos.every(v=>v.muted===false));
 f.send(command);assert.ok(f.videos.every(v=>v.muted));assert.equal(f.messages.at(-1).silent,2);
 f.send({...command,muted:false,revision:0});assert.ok(f.videos.every(v=>v.muted));f.videos[0].volume=0;f.send({...command,muted:false,revision:2});assert.ok(f.videos.every(v=>!v.muted&&v.volume>0));
 assert.deepEqual(f.videos.map(v=>({src:v.getAttribute('src'),controls:v.controls,paused:v.paused,time:v.currentTime,autoplay:v.autoplay,defaultMuted:v.defaultMuted})),before);
 f.videos[0].muted=true;f.videos[0].dispatchEvent(new f.win.Event('volumechange'));assert.equal(f.messages.at(-1).type,'sound-state');assert.equal(f.messages.at(-1).silent,1);f.dom.window.close();
});
test('el audio de las vistas no cambia proyecto, HTML exportado ni los atributos originales',()=>{
 const p={format:'ainimation-imported-site',version:1,title:'Prueba',url:'https://www.portaventuranext.com/',html:'<!doctype html><html><body><video data-ain-id="ain-0" src="https://public.org/clip.mp4" muted controls></video></body></html>',warnings:[],links:[],items:[{id:'ain-0',type:'video',value:'https://public.org/clip.mp4',label:'Clip',alt:'',animation:'none',duration:1.2,delay:0}]},snapshot=JSON.stringify(p),exported=buildDocument(p);
 for(const options of [{interactive:true,channel:'qa'},{dropChannel:'qa'}]){
  const dom=new JSDOM(buildDocument(p,options),{runScripts:'outside-only'}),win=dom.window,parent={postMessage:()=>{}};Object.defineProperty(win,'parent',{value:parent});
  const script=win.document.querySelector('script');assert.ok(script.nonce);win.eval(script.textContent);win.dispatchEvent(new win.MessageEvent('message',{source:parent,data:{channel:'qa',type:'sound-set',muted:false,revision:1}}));
  assert.equal(win.document.querySelector('video').muted,false);assert.equal(win.document.querySelector('video').defaultMuted,true);assert.equal(JSON.stringify(p),snapshot);assert.equal(buildDocument(p),exported);dom.window.close();
 }
 const doc=new DOMParser().parseFromString(exported,'text/html');assert.equal(doc.querySelectorAll('script').length,0);assert.ok(doc.querySelector('video').hasAttribute('muted'));assert.ok(doc.querySelector('meta[http-equiv]').content.includes("script-src 'none'"));
});
