import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {attachPanelResize} from '../assets/panel-resize.mjs';
import {mountSiteShell} from '../assets/site-shell.mjs';

function fixture(t,edge='right'){
  const dom=new JSDOM('<html lang="es"><body><aside id="panel"></aside><main><input value="Proyecto intacto"><iframe></iframe></main></body></html>',{url:'https://www.ainimation.studio/'});
  const win=dom.window,doc=win.document,panel=doc.querySelector('aside');
  Object.defineProperty(win,'localStorage',{get(){throw Error('Do not persist panel size');}});
  let top=70,defaultWidth=360,defaultHeight=380;
  panel.getBoundingClientRect=()=>{
    const width=parseFloat(panel.style.width)||defaultWidth,height=edge==='top'?(parseFloat(panel.style.height)||defaultHeight):win.innerHeight-top;
    const left=edge==='left'?win.innerWidth-width:0,y=edge==='top'?win.innerHeight-height:top;
    return {left,top:y,right:left+width,bottom:y+height,width,height};
  };
  const ui=attachPanelResize(panel,{edge,name:edge==='top'?'expert':edge==='left'?'advanced':'options',getTop:()=>top});
  const pointer=(target,type,x,y,id=4)=>{const e=new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:id});target.dispatchEvent(e);};
  t.after(()=>{ui.destroy();win.close();});
  return {win,doc,panel,ui,pointer,setTop:value=>top=value,setDefaults:(width,height)=>{defaultWidth=width;defaultHeight=height;},key:(key,shiftKey=false)=>ui.handle.dispatchEvent(new win.KeyboardEvent('keydown',{key,shiftKey,bubbles:true,cancelable:true}))};
}
test('doble clic restaura el CSS de cada panel sin cerrar, modificar el centro ni guardar datos',t=>{
  for(const edge of ['right','left','top']){
    const f=fixture(t,edge),dimension=edge==='top'?'height':'width',before=f.doc.querySelector('main').outerHTML;
    f.key('End');assert.ok(f.panel.style.getPropertyValue(dimension));
    const event=new f.win.MouseEvent('dblclick',{bubbles:true,cancelable:true});f.ui.handle.dispatchEvent(event);
    assert.equal(event.defaultPrevented,true);assert.equal(f.panel.style.getPropertyValue(dimension),'');assert.equal(f.panel.hidden,false);assert.equal(f.doc.querySelector('main').outerHTML,before);
    assert.equal(f.ui.handle.getAttribute('aria-valuenow'),edge==='top'?'380':'360');
    f.win.dispatchEvent(new f.win.Event('resize'));assert.equal(f.panel.style.getPropertyValue(dimension),'');
  }
});
test('Intro restablece el tamaño adaptable actual, no el medido antes del cambio de pantalla',t=>{
  const f=fixture(t);f.key('End');f.setDefaults(280,260);f.key('Enter');
  assert.equal(f.panel.style.width,'');assert.equal(f.ui.handle.getAttribute('aria-valuenow'),'280');
  f.key('ArrowRight');assert.equal(f.panel.style.width,'296px');
});
test('restablecer libera un arrastre pendiente y desmontar elimina también el doble clic',t=>{
  const f=fixture(t);f.pointer(f.ui.handle,'pointerdown',360,100);f.pointer(f.win,'pointermove',460,100);
  f.ui.handle.dispatchEvent(new f.win.MouseEvent('dblclick',{bubbles:true,cancelable:true}));assert.equal(f.doc.documentElement.classList.contains('ain-panel-resizing'),false);assert.equal(f.panel.style.width,'');
  f.pointer(f.win,'pointermove',800,100);assert.equal(f.panel.style.width,'');
  f.ui.destroy();f.panel.style.width='410px';f.ui.handle.dispatchEvent(new f.win.MouseEvent('dblclick',{bubbles:true,cancelable:true}));assert.equal(f.panel.style.width,'410px');
});
test('arrastrar ambos laterales cambia sólo su ancho y conserva el centro',t=>{
  for(const edge of ['right','left']){
    const f=fixture(t,edge),before=f.doc.querySelector('main').outerHTML;
    f.pointer(f.ui.handle,'pointerdown',360,200);f.pointer(f.win,'pointermove',edge==='right'?500:220,200);f.pointer(f.win,'pointerup',500,200);
    assert.equal(f.panel.style.width,'500px');assert.equal(f.doc.querySelector('main').outerHTML,before);
    assert.equal(f.ui.handle.getAttribute('aria-valuenow'),'500');assert.equal(f.doc.documentElement.classList.contains('ain-panel-resizing'),false);
    assert.equal(f.ui.handle.style.position,''); // fixed placement is a shared CSS rule.
  }
});
test('Experto crece hacia arriba y se limita por la cabecera y el viewport',t=>{
  const f=fixture(t,'top');f.pointer(f.ui.handle,'pointerdown',200,388);f.pointer(f.win,'pointermove',200,288);f.pointer(f.win,'pointerup',200,288);
  assert.equal(f.panel.style.height,'480px');assert.equal(f.ui.handle.getAttribute('aria-orientation'),'horizontal');
  f.key('End');assert.equal(f.panel.style.height,'690px');
  Object.defineProperty(f.win,'innerHeight',{value:400,configurable:true});f.win.dispatchEvent(new f.win.Event('resize'));assert.equal(f.panel.style.height,'322px');
});
test('flechas, Shift, Home y End ajustan el tamaño con límites; se adapta a una pantalla estrecha',t=>{
  const f=fixture(t,'left');f.key('ArrowLeft');assert.equal(f.panel.style.width,'376px');f.key('ArrowRight',true);assert.equal(f.panel.style.width,'312px');
  f.key('Home');assert.equal(f.panel.style.width,'220px');f.key('End');assert.equal(f.panel.style.width,'1008px');
  Object.defineProperty(f.win,'innerWidth',{value:200,configurable:true});f.win.dispatchEvent(new f.win.Event('resize'));assert.equal(f.panel.style.width,'184px');assert.equal(f.ui.handle.getAttribute('aria-valuemin'),'184');
});
test('un gesto cancelado o pérdida de foco libera el arrastre; otros punteros no lo alteran',t=>{
  const f=fixture(t);f.pointer(f.ui.handle,'pointerdown',360,100);f.pointer(f.win,'pointermove',800,100,9);assert.equal(f.panel.style.width,'');
  f.pointer(f.win,'pointercancel',360,100);assert.equal(f.doc.documentElement.classList.contains('ain-panel-resizing'),false);
  f.pointer(f.win,'pointermove',500,100);assert.equal(f.panel.style.width,'');
  f.pointer(f.ui.handle,'pointerdown',360,100);f.win.dispatchEvent(new f.win.Event('blur'));assert.equal(f.doc.documentElement.classList.contains('ain-panel-resizing'),false);
});
test('el asa sigue el borde al cambiar la cabecera y ofrece nombre ES/EN',t=>{
  const f=fixture(t);assert.equal(f.ui.handle.style.left,'354px');assert.equal(f.ui.handle.style.top,'70px');assert.equal(f.ui.handle.getAttribute('aria-label'),'Redimensionar Opciones');
  f.setTop(110);f.doc.dispatchEvent(new f.win.Event('scroll'));assert.equal(f.ui.handle.style.top,'110px');
  f.doc.documentElement.lang='en';f.win.dispatchEvent(new f.win.Event('ainimation:language'));assert.equal(f.ui.handle.getAttribute('aria-label'),'Resize Options');assert.equal(f.ui.handle.getAttribute('aria-controls'),'panel');
});
test('instalación idempotente, cierre conserva el tamaño y desmontar restaura el estilo',t=>{
  const f=fixture(t);assert.equal(attachPanelResize(f.panel,{edge:'right',name:'options'}),f.ui);
  f.key('ArrowRight');f.panel.hidden=true;f.panel.hidden=false;assert.equal(f.panel.style.width,'376px');
  f.ui.destroy();assert.equal(f.panel.style.width,'');assert.equal(f.panel.querySelector('[role=separator]'),null);f.key('ArrowRight');assert.equal(f.panel.style.width,'');
});
test('los tres paneles comparten redimensionado en portada, Interactivos, Presentaciones, Sites y Produce',()=>{
  for(const path of ['index.html','interactivos/index.html','presentaciones/editor/index.html','sites/index.html','studio-live.html']){
    const dom=new JSDOM(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{url:'https://www.ainimation.studio/'+path});
    mountSiteShell(dom.window.document,dom.window);mountSiteShell(dom.window.document,dom.window);
    const handles=dom.window.document.querySelectorAll('[role=separator][data-panel-resize]');assert.equal(handles.length,3,path);
    assert.deepEqual(Array.from(handles,h=>h.dataset.panelResize),['options','advanced','expert'],path);
    dom.window.close();
  }
});
