import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createFileDrop,fileDropBridge,hasFileDrag,previewMessageSource} from '../sites/drop.mjs';
const base=new JSDOM('<!doctype html>');globalThis.window=base.window;globalThis.DOMParser=base.window.DOMParser;
const {buildDocument}=await import('../sites/preview.mjs');
function drag(win,target,type,transfer,relatedTarget){const event=new win.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{dataTransfer:{value:transfer},relatedTarget:{value:relatedTarget}});target.dispatchEvent(event);return event;}
function fixture(){
 const dom=new JSDOM('<!doctype html><body><main><span>Site</span></main><div id="overlay" hidden><strong></strong></div>'),doc=dom.window.document,files=[],errors=[],overlay=doc.getElementById('overlay');
 const ui=createFileDrop({document:doc,overlay,onFiles:f=>files.push(f),onError:m=>errors.push(m),getMessage:()=> 'Suelta tus medios'});
 return {dom,doc,files,errors,overlay,ui};
}
test('soltar archivos evita la navegación y entrega una copia del lote a la carga existente',()=>{
 const f=fixture(),file=new f.dom.window.File(['png'],'foto.png'),transfer={types:['Files'],files:[file],items:[]};
 assert.equal(drag(f.dom.window,f.doc.body,'dragover',transfer).defaultPrevented,true);assert.equal(transfer.dropEffect,'copy');assert.equal(f.overlay.hidden,false);assert.equal(f.overlay.querySelector('strong').textContent,'Suelta tus medios');assert.equal(f.files.length,0);
 const event=drag(f.dom.window,f.doc.body,'drop',transfer);transfer.files.length=0;
 assert.equal(event.defaultPrevented,true);assert.deepEqual(f.files,[[file]]);assert.equal(f.overlay.hidden,true);f.ui.dispose();
});
test('arrastrar texto o una URL no activa la carga de archivos ni se cancela',()=>{
 const f=fixture(),transfer={types:['text/uri-list','text/plain'],files:[]};
 for(const type of ['dragenter','dragover','drop'])assert.equal(drag(f.dom.window,f.doc.body,type,transfer).defaultPrevented,false);
 assert.equal(f.overlay.hidden,true);assert.deepEqual(f.files,[]);assert.equal(hasFileDrag(null),false);f.ui.dispose();
});
test('el aviso no desaparece al pasar entre hijos y se cierra al salir, cancelar o perder el foco',()=>{
 const f=fixture(),transfer={types:['Files'],files:[]},win=f.dom.window;
 drag(win,f.doc.body,'dragenter',transfer);drag(win,f.doc.querySelector('span'),'dragleave',transfer,f.doc.body);assert.equal(f.overlay.hidden,false);
 drag(win,f.doc.documentElement,'dragleave',transfer,null);assert.equal(f.overlay.hidden,true);
 f.ui.show();f.doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(f.overlay.hidden,true);
 f.ui.show();win.dispatchEvent(new win.Event('blur'));assert.equal(f.overlay.hidden,true);f.ui.dispose();
});
test('una carpeta se rechaza entera sin enviar sus archivos al editor',()=>{
 const f=fixture(),transfer={types:['Files'],files:[new f.dom.window.File(['x'],'carpeta')],items:[{kind:'file',webkitGetAsEntry:()=>({isDirectory:true})}]};
 assert.equal(drag(f.dom.window,f.doc.body,'drop',transfer).defaultPrevented,true);assert.equal(f.files.length,0);assert.match(f.errors[0],/sin carpetas/);assert.equal(f.overlay.hidden,true);f.ui.dispose();
});
test('los puentes de las vistas transfieren archivos y canal, sin interceptar texto o URL',()=>{
 const dom=new JSDOM('<!doctype html><p>Prueba</p>',{runScripts:'outside-only'}),messages=[],win=dom.window;
 Object.defineProperty(win,'parent',{value:{postMessage:(data,target)=>messages.push({data,target})}});win.eval(fileDropBridge('canal-de-prueba'));
 const file=new win.File(['video'],'clip.mp4');
 drag(win,win.document.body,'drop',{types:['text/plain'],files:[]});assert.equal(messages.length,0);
 drag(win,win.document.body,'dragover',{types:['Files'],files:[]});assert.equal(messages[0].data.type,'file-drag');
 const event=drag(win,win.document.body,'drop',{types:['Files'],files:[file],items:[]});
 assert.equal(event.defaultPrevented,true);assert.equal(messages[1].data.channel,'canal-de-prueba');assert.equal(messages[1].data.type,'file-drop');assert.equal(messages[1].data.files[0],file);assert.equal(messages[1].target,'*');
 drag(win,win.document.body,'drop',{types:['Files'],files:[],items:[{kind:'file',webkitGetAsEntry:()=>({isDirectory:true})}]});assert.equal(messages[2].data.type,'file-folder');dom.window.close();
});
test('un mensaje sólo se acepta desde la vista autorizada con el canal actual',()=>{
 const draft={},original={},foreign={},event={source:draft,data:{channel:'actual'}};
 assert.equal(previewMessageSource(event,'actual',draft,original),'draft');assert.equal(previewMessageSource({...event,source:original},'actual',draft,original),'original');
 assert.equal(previewMessageSource({...event,source:foreign},'actual',draft,original),'');assert.equal(previewMessageSource(event,'viejo',draft,original),'');assert.equal(previewMessageSource({...event,source:original},'actual',draft,null),'');assert.equal(previewMessageSource({source:draft,data:{channel:''}},'',draft,original),'');
});
test('la comparación recibe sólo el puente de archivos y el HTML exportado sigue sin scripts',()=>{
 const p={format:'ainimation-imported-site',version:1,title:'Prueba',url:'https://www.portaventuranext.com/',html:'<!doctype html><html><body><p data-ain-id="ain-0">Texto</p><script>window.originalScript=true</script></body></html>',warnings:[],links:[],items:[{id:'ain-0',type:'text',value:'Texto',label:'Texto',alt:'',animation:'none',duration:1.2,delay:0}]};
 const html=buildDocument(p,{dropChannel:'comparacion'}),dom=new JSDOM(html,{runScripts:'outside-only'}),win=dom.window,messages=[];
 Object.defineProperty(win,'parent',{value:{postMessage:data=>messages.push(data)}});
 const script=win.document.querySelector('script');assert.ok(script.nonce);assert.equal(win.document.querySelectorAll('script').length,1);assert.ok(win.document.querySelector('meta[http-equiv]').content.includes("'nonce-"+script.nonce+"'"));win.eval(script.textContent);
 win.document.querySelector('p').click();assert.equal(messages.length,0);assert.equal(win.originalScript,undefined);
 drag(win,win.document.body,'drop',{types:['Files'],files:[new win.File(['x'],'foto.png')],items:[]});assert.equal(messages[0].channel,'comparacion');assert.equal(messages[0].type,'file-drop');
 const exported=new DOMParser().parseFromString(buildDocument(p),'text/html');assert.equal(exported.querySelectorAll('script').length,0);assert.ok(exported.querySelector('meta[http-equiv]').content.includes("script-src 'none'"));dom.window.close();
});
