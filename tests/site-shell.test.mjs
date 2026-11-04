import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountQuadraticHeader,mountSiteShell} from '../assets/site-shell.mjs';
import {mountSessionNavigation} from '../assets/site-session.mjs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const pages=['index.html','interactivos/index.html','presentaciones/index.html','presentaciones/editor/index.html','presentaciones/reproductor/index.html','sites/index.html','capsulas/index.html','studio.html','studio-live.html','xperiencias/index.html','404.html'];

test('la navegación pública y Opciones conservan sólo las cinco secciones acordadas, también con sesión',()=>{
  const expected=['/xperiencias/','/interactivos/','/presentaciones/','/capsulas/','/interactivos/?login=1'];
  const routes=nav=>Array.from(nav.querySelectorAll('a')).map(a=>new URL(a.href).pathname+new URL(a.href).search.replace(/([?&])lang=(es|en)(&|$)/,(_m,start,_lang,end)=>end?start:''));
  for(const file of ['index.html','xperiencias/index.html','interactivos/index.html','studio.html','studio-live.html','404.html'])for(const signedIn of [false,true]){
    const dom=new JSDOM(source(file),{url:'https://www.ainimation.studio/'+file}),doc=dom.window.document;
    if(signedIn)dom.window.sessionStorage.setItem('ainimation:site-session',JSON.stringify({expiresAt:Date.now()+600000}));
    mountSessionNavigation(doc,dom.window);
    const nav=doc.querySelector('header nav');
    if(nav)assert.deepEqual(routes(nav),expected,file+' signedIn='+signedIn);
    dom.window.close();
  }
  for(const lang of ['es','en']){
    const dom=new JSDOM(source('index.html'),{url:'https://www.ainimation.studio/'}),doc=dom.window.document;doc.documentElement.lang=lang;
    const ui=mountQuadraticHeader(doc.querySelector('header'));
    assert.deepEqual(routes(ui.panels.options.querySelector('nav')),expected);
    assert.deepEqual(Array.from(ui.panels.options.querySelectorAll('nav a')).map(a=>a.textContent),lang==='es'?['Xperiencias','Interactivos','Presentaciones','Cápsulas','Login']:['Xperiencias','Interactivos','Presentations','Capsules','Login']);
    ui.destroy();dom.window.close();
  }
});

test('todas las cabeceras de la aplicación adoptan cuadratura sin duplicar los controles nativos',()=>{
  for(const path of pages){
    const dom=new JSDOM(source(path),{url:'https://www.ainimation.studio/'+path});
    const doc=dom.window.document,header=doc.querySelector('[data-ain-shell]');assert.ok(header,path);
    assert.ok(doc.querySelector('script[src*="site-language.js"]'),path);
    mountSiteShell(doc,dom.window);mountSiteShell(doc,dom.window);
    if(header.dataset.ainShell!=='native'){
      for(const name of ['options','advanced','expert'])assert.equal(header.querySelectorAll('[data-ain-quad-toggle="'+name+'"]').length,1,path+' '+name);
      header.ainQuadraticUI.destroy();
    }else if(path==='sites/index.html')for(const name of ['options','advanced','expert'])assert.ok(doc.getElementById(name+'-toggle'));
    dom.window.close();
  }
});
test('los paneles abren independientes, no escriben preferencias ni alteran el centro y Escape devuelve el foco',()=>{
  const dom=new JSDOM('<header><a href="/">AINimation</a></header><main><h1>Centro intacto</h1></main>',{url:'https://www.ainimation.studio/'}),win=dom.window,doc=win.document;
  Object.defineProperty(win,'localStorage',{get(){throw Error('Do not persist panel state');}});
  const ui=mountQuadraticHeader(doc.querySelector('header'));
  const center=doc.querySelector('main').outerHTML;
  for(const name of ['options','advanced','expert']){
    assert.equal(ui.isOpen(name),false);ui.buttons[name].click();assert.equal(ui.isOpen(name),true);
    assert.equal(ui.buttons[name].textContent,'');assert.equal(ui.buttons[name].querySelectorAll('svg').length,1);
    assert.equal(doc.querySelector('main').outerHTML,center);
  }
  const input=ui.panels.expert.querySelector('input');input.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(ui.isOpen('expert'),false);assert.equal(ui.isOpen('advanced'),true);assert.equal(doc.activeElement,ui.buttons.expert);
  ui.destroy();dom.window.close();
});
test('los controles reales de Interactivos y Presentaciones siguen presentes en sus paneles',()=>{
  const interactive=new JSDOM(source('interactivos/index.html'),{url:'https://www.ainimation.studio/interactivos/'}),doc=interactive.window.document;
  const color=doc.getElementById('color'),command=doc.getElementById('expertCommand');
  mountSiteShell(doc,interactive.window);const ui=doc.querySelector('[data-ain-shell]').ainQuadraticUI;
  assert.ok(ui.panels.advanced.contains(color));assert.ok(ui.panels.expert.contains(command));assert.equal(doc.getElementById('color'),color);
  const presentation=new JSDOM(source('presentaciones/editor/index.html'),{url:'https://www.ainimation.studio/presentaciones/editor/'}),pd=presentation.window.document,fields=pd.getElementById('fields');
  mountSiteShell(pd,presentation.window);const pu=pd.querySelector('[data-ain-shell]').ainQuadraticUI;
  assert.ok(pu.panels.advanced.contains(fields));assert.ok(pu.panels.options.contains(pd.getElementById('components')));
  ui.destroy();pu.destroy();interactive.window.close();presentation.window.close();
});
test('la consola admite navegación explícita y rechaza ejecutar código',()=>{
  const dom=new JSDOM('<header></header>',{url:'https://www.ainimation.studio/'}),win=dom.window;let destination;
  const ui=mountQuadraticHeader(win.document.querySelector('header'),{navigate:href=>destination=href}),form=ui.panels.expert.querySelector('form'),input=form.querySelector('input');
  input.value='/js alert(1)';form.dispatchEvent(new win.Event('submit',{cancelable:true}));assert.equal(destination,undefined);assert.match(ui.panels.expert.textContent,/no reconocido/);
  input.value='/abrir login';form.dispatchEvent(new win.Event('submit',{cancelable:true}));assert.equal(new URL(destination).pathname,'/interactivos/');assert.equal(new URL(destination).searchParams.get('login'),'1');
  ui.destroy();win.close();
});
test('Produce ya no guarda paneles abiertos ni cambia las columnas al alternarlos',()=>{
  const html=source('studio-live.html');
  assert.match(html,/<body class="pf-left-off pf-right-off pf-bottom-off">/);
  assert.doesNotMatch(html,/localStorage\.(?:getItem|setItem)\('ain_rail_/);
  assert.doesNotMatch(html,/body\.pf-(?:left|right|bottom)-off[^\{]+\.frame/);
  const css=source('assets/site-shell.css');assert.match(css,/\.ain-quad-panel\{display:block!important;position:fixed!important/);
  assert.doesNotMatch(css,/:has\(|body\[[^\]]*(?:open|mode)/);
});
