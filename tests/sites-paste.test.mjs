import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createImagePaste,imagePasteBridge} from '../sites/paste.mjs';
const base=new JSDOM('<!doctype html>');globalThis.window=base.window;globalThis.DOMParser=base.window.DOMParser;
const {buildDocument}=await import('../sites/preview.mjs');
function paste(win,target,data,prevent=false){
  const event=new win.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:data});
  if(prevent)event.preventDefault();target.dispatchEvent(event);return event;
}
function fixture(){
  const dom=new JSDOM('<!doctype html><body><main>Canvas</main><input><textarea></textarea><select></select><div role="textbox"><span>Text</span></div><div contenteditable><b>Text</b></div><div contenteditable="plaintext-only"><span>Plain</span></div>'),received=[];
  const ui=createImagePaste({document:dom.window.document,onFiles:files=>received.push(files)});
  return {dom,win:dom.window,doc:dom.window.document,received,ui};
}
const strings={kind:'string',getAsString(){throw Error('No debe leer texto');}};
const dataFor=files=>({items:[strings,...files.map(file=>({kind:'file',getAsFile:()=>file}))],getData(){throw Error('No debe leer texto ni HTML');}});
test('pegar imágenes copia el lote del evento y no lee sus representaciones de texto o HTML',()=>{
  const f=fixture(),image=new f.win.File(['png'],'captura.png',{type:'image/png'}),second=new f.win.File(['jpg'],'foto.jpg',{type:'image/jpeg'}),data=dataFor([image,second]);
  const event=paste(f.win,f.doc.querySelector('main'),data);data.items.length=0;
  assert.equal(event.defaultPrevented,true);assert.deepEqual(f.received,[[image,second]]);f.ui.dispose();f.dom.window.close();
});
test('campos y editores conservan el pegado sin acceder al portapapeles del evento',()=>{
  const f=fixture();for(const target of f.doc.querySelectorAll('input,textarea,select,[role="textbox"] span,[contenteditable] b,[contenteditable] span')){
    const event=new f.win.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{get(){throw Error('No debe acceder en un campo');}});
    target.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
  }
  assert.equal(f.received.length,0);f.ui.dispose();f.dom.window.close();
});
test('texto, HTML, URLs, vídeos y lotes mixtos no se consumen ni se importan',()=>{
  const f=fixture(),image=new f.win.File(['png'],'foto.png',{type:'image/png'}),video=new f.win.File(['mp4'],'clip.mp4',{type:'video/mp4'});
  for(const data of [null,{items:[strings],files:[],getData(){throw Error('No leer');}},dataFor([video]),dataFor([image,video]),dataFor([null])]){
    assert.equal(paste(f.win,f.doc.body,data).defaultPrevented,false);
  }
  assert.equal(f.received.length,0);f.ui.dispose();f.dom.window.close();
});
test('admite FileList sin items y respeta eventos ya gestionados o lectores de archivo fallidos',()=>{
  const f=fixture(),image=new f.win.File(['png'],'foto.png',{type:'image/png'}),data={files:[image]};
  assert.equal(paste(f.win,f.doc.body,data,true).defaultPrevented,true);assert.equal(f.received.length,0);
  assert.equal(paste(f.win,f.doc.body,{items:[{kind:'file',getAsFile(){throw Error('No disponible');}}]}).defaultPrevented,false);
  assert.equal(paste(f.win,f.doc.body,data).defaultPrevented,true);data.files.length=0;assert.deepEqual(f.received,[[image]]);
  f.ui.dispose();assert.equal(paste(f.win,f.doc.body,dataFor([image])).defaultPrevented,false);assert.equal(f.received.length,1);f.dom.window.close();
});
test('el puente aislado envía sólo archivos y canal; no envía un destino de sustitución',()=>{
  const dom=new JSDOM('<!doctype html><img data-ain-id="ain-1" data-ain-selected><textarea></textarea>',{runScripts:'outside-only'}),win=dom.window,messages=[];
  Object.defineProperty(win,'parent',{value:{postMessage:(data,target)=>messages.push({data,target})}});win.eval(imagePasteBridge('canal-actual'));
  const image=new win.File(['png'],'captura.png',{type:'image/png'}),data=dataFor([image]);
  assert.equal(paste(win,win.document.querySelector('textarea'),data).defaultPrevented,false);assert.equal(messages.length,0);
  assert.equal(paste(win,win.document.querySelector('img'),data).defaultPrevented,true);assert.equal(messages.length,1);
  assert.deepEqual(Object.keys(messages[0].data).sort(),['channel','files','type']);assert.equal(messages[0].data.channel,'canal-actual');assert.equal(messages[0].data.type,'image-paste');assert.equal(messages[0].data.files[0],image);assert.equal(messages[0].target,'*');dom.window.close();
});
test('ambas vistas autorizan el pegado con su nonce y el HTML exportado sigue sin puentes',()=>{
  const p={format:'ainimation-imported-site',version:1,title:'Prueba',url:'https://www.portaventuranext.com/',html:'<!doctype html><html><body><p data-ain-id="ain-0">Texto</p></body></html>',warnings:[],links:[],items:[{id:'ain-0',type:'text',value:'Texto',label:'Texto',alt:'',animation:'none',duration:1.2,delay:0}]},snapshot=JSON.stringify(p);
  for(const options of [{interactive:true,channel:'actual'},{dropChannel:'actual'}]){
    const dom=new JSDOM(buildDocument(p,options),{runScripts:'outside-only'}),win=dom.window,messages=[];Object.defineProperty(win,'parent',{value:{postMessage:data=>messages.push(data)}});
    const script=win.document.querySelector('script');assert.equal(win.document.querySelectorAll('script').length,1);assert.ok(script.nonce);assert.ok(win.document.querySelector('meta[http-equiv]').content.includes("'nonce-"+script.nonce+"'"));win.eval(script.textContent);
    paste(win,win.document.body,dataFor([new win.File(['png'],'foto.png',{type:'image/png'})]));assert.equal(messages.at(-1).type,'image-paste');assert.equal(messages.at(-1).channel,'actual');dom.window.close();
  }
  assert.equal(JSON.stringify(p),snapshot);const exported=new DOMParser().parseFromString(buildDocument(p),'text/html');assert.equal(exported.querySelectorAll('script').length,0);assert.ok(exported.querySelector('meta[http-equiv]').content.includes("script-src 'none'"));
});
