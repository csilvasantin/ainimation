import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {attachPanelResize} from '../assets/panel-resize.mjs';
import {mountSiteShell} from '../assets/site-shell.mjs';

function storage(values=new Map()){
  const calls=[];
  return {values,calls,getItem:key=>values.get(key)??null,setItem:(key,value)=>{calls.push(['set',key]);values.set(key,value);},removeItem:key=>{calls.push(['remove',key]);values.delete(key);}};
}
function fixture(t,{store=storage(),path='/',scope='home',name='options',edge='right',blocked=false}={}){
  const dom=new JSDOM('<html><body><aside id="panel" hidden></aside><main>Proyecto intacto</main></body></html>',{url:'https://www.ainimation.studio'+path}),win=dom.window,panel=win.document.querySelector('aside');
  Object.defineProperty(win,'localStorage',blocked?{get(){throw Error('blocked');}}:{value:store});
  panel.getBoundingClientRect=()=>{const width=parseFloat(panel.style.width)||360,height=parseFloat(panel.style.height)||380;return {left:0,right:width,top:70,bottom:70+height,width,height};};
  const ui=attachPanelResize(panel,{edge,name,scope,win,getTop:()=>70});
  t.after(()=>{ui.destroy();win.close();});
  const key=key=>ui.handle.dispatchEvent(new win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  return {win,panel,ui,store,key};
}
test('recupera tamaños por panel tras otra carga y no guarda apertura ni datos del proyecto',t=>{
  const store=storage(new Map([['proyecto','datos conservados']]));
  for(const [name,edge,key] of [['options','right','ArrowRight'],['advanced','left','ArrowLeft'],['expert','top','ArrowUp']])fixture(t,{store,name,edge}).key(key);
  assert.equal(store.values.size,4);
  for(const [name,edge,dimension,size] of [['options','right','width',376],['advanced','left','width',376],['expert','top','height',396]]){
    const f=fixture(t,{store,name,edge});assert.equal(f.panel.style[dimension],size+'px');assert.equal(f.panel.hidden,true);
  }
  assert.equal(store.values.get('proyecto'),'datos conservados');
  for(const [key,value] of store.values)if(key!=='proyecto')assert.deepEqual(Object.keys(JSON.parse(value)),['version','size']);
});
test('cada sección y el editor de cápsulas tienen medidas independientes; idioma y query no fragmentan preferencias',t=>{
  const store=storage();fixture(t,{store,path:'/index.html?lang=es'}).key('ArrowRight');
  const home=fixture(t,{store,path:'/?lang=en&ain-version=otra'});assert.equal(home.panel.style.width,'376px');
  assert.equal(fixture(t,{store,path:'/presentaciones/',scope:'hub'}).panel.style.width,'');
  assert.equal(fixture(t,{store,scope:'capsule-editor'}).panel.style.width,'');
  fixture(t,{store,path:'/presentaciones/index.html',scope:'hub'}).key('ArrowRight');
  assert.equal(fixture(t,{store,path:'/presentaciones/?lang=en',scope:'hub'}).panel.style.width,'376px');
});
test('la medida preferida sobrevive a un viewport pequeño sin reescribirse al cerrar o sincronizar',t=>{
  const store=storage(),first=fixture(t,{store});first.key('End');const writes=store.calls.length;
  const restored=fixture(t,{store});Object.defineProperty(restored.win,'innerWidth',{configurable:true,value:320});restored.win.dispatchEvent(new restored.win.Event('resize'));assert.equal(restored.panel.style.width,'304px');
  restored.panel.hidden=false;restored.panel.hidden=true;restored.ui.sync();assert.equal(store.calls.length,writes);
  Object.defineProperty(restored.win,'innerWidth',{configurable:true,value:1024});restored.win.dispatchEvent(new restored.win.Event('resize'));assert.equal(restored.panel.style.width,'1008px');assert.equal(store.calls.length,writes);
});
test('doble clic e Intro eliminan sólo la preferencia de ese panel y no reaparece al volver',t=>{
  const store=storage();const f=fixture(t,{store}),other=fixture(t,{store,name:'advanced',edge:'left'});f.key('ArrowRight');other.key('ArrowLeft');
  f.ui.handle.dispatchEvent(new f.win.MouseEvent('dblclick',{bubbles:true,cancelable:true}));assert.equal(f.panel.style.width,'');assert.equal(store.values.size,1);assert.equal(fixture(t,{store}).panel.style.width,'');
  other.key('Enter');assert.equal(store.values.size,0);
});
test('almacenamiento bloqueado, lleno o datos corruptos no interrumpen los controles',t=>{
  const blocked=fixture(t,{blocked:true});assert.doesNotThrow(()=>blocked.key('ArrowRight'));assert.equal(blocked.panel.style.width,'376px');assert.doesNotThrow(()=>blocked.key('Enter'));
  const store=storage(),f=fixture(t,{store});f.key('ArrowRight');const key=[...store.values.keys()][0];
  for(const value of ['{bad','null','[]','{"version":2,"size":500}','{"version":1,"size":"500"}','{"version":1,"size":0}','{"version":1,"size":999999}']){
    store.values.set(key,value);assert.equal(fixture(t,{store}).panel.style.width,'');
  }
  store.values.clear();store.setItem=()=>{throw Error('quota');};const full=fixture(t,{store});assert.doesNotThrow(()=>full.key('ArrowRight'));assert.equal(full.panel.style.width,'376px');
});
test('un arrastre guarda una sola vez al terminar, no en cada movimiento',t=>{
  const f=fixture(t);f.panel.hidden=false;
  const pointer=(target,type,x)=>{const event=new f.win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x});Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event);};
  pointer(f.ui.handle,'pointerdown',360);for(const x of [380,400,420,440])pointer(f.win,'pointermove',x);assert.equal(f.store.calls.length,0);
  pointer(f.win,'pointerup',440);assert.equal(f.store.calls.length,1);assert.equal(fixture(t,{store:f.store}).panel.style.width,'440px');
});
test('el shell completo restaura las medidas, con los tres paneles cerrados y botones contraídos',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),store=storage();
  for(let load=0;load<2;load++){
    const dom=new JSDOM(html,{url:'https://www.ainimation.studio/'}),win=dom.window;Object.defineProperty(win,'localStorage',{value:store});mountSiteShell(win.document,win);const ui=win.document.querySelector('header').ainQuadraticUI;
    if(load===0)for(const name of ['options','advanced','expert']){ui.show(name);ui.panels[name].querySelector('[role=separator]').dispatchEvent(new win.KeyboardEvent('keydown',{key:name==='options'?'ArrowRight':name==='advanced'?'ArrowLeft':'ArrowUp',bubbles:true}));}
    else for(const name of ['options','advanced','expert']){assert.equal(ui.panels[name].hidden,true);assert.equal(ui.buttons[name].getAttribute('aria-expanded'),'false');assert.ok(ui.panels[name].style[name==='expert'?'height':'width']);}
    ui.destroy();win.close();
  }
});
