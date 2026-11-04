import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const language=source('assets/site-language.js'),interfaceCode=source('assets/interactive-interface.mjs');
function page(name,url,{stored={},blocked=false}={}){
  const dom=new JSDOM(source(name),{url,runScripts:'outside-only'}),win=dom.window;
  if(blocked)Object.defineProperty(win,'localStorage',{get(){throw Error('blocked');}});
  else for(const [key,value] of Object.entries(stored))win.localStorage.setItem(key,value);
  win.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  win.HTMLDialogElement.prototype.close=function(){this.open=false;};
  win.eval(language);return dom;
}
test('Login conserva ES y EN, con preferencia anterior contradictoria o almacenamiento bloqueado',()=>{
  for(const lang of ['es','en'])for(const blocked of [false,true]){
    const home=page('index.html','https://www.ainimation.studio/',{blocked,stored:{ain_lang:lang}});
    home.window.AINLanguage.remember(lang);
    const href=home.window.document.querySelector('a[href*="login=1"]').href;
    assert.equal(new URL(href).searchParams.get('lang'),lang);
    const login=page('interactivos/index.html',href,{blocked,stored:{'ainimation:ui:language':lang==='en'?'es':'en'}});
    login.window.eval(interfaceCode);
    assert.equal(login.window.document.documentElement.lang,lang);
    assert.equal(login.window.document.getElementById('uiLanguage').value,lang);
    assert.equal(login.window.document.getElementById('loginDialog').open,true);
    assert.equal(login.window.document.querySelector('#loginDialog h2').textContent,lang==='en'?'Your AINimation account':'Tu cuenta AINimation');
    login.window.close();home.window.close();
  }
});
test('cambiar idioma en Login actualiza la portada y recargar conserva la última elección',()=>{
  const dom=page('interactivos/index.html','https://www.ainimation.studio/interactivos/?login=1&lang=en');
  const win=dom.window;win.eval(interfaceCode);win.AINLanguage.set('es');
  assert.equal(new URL(win.location.href).searchParams.get('lang'),'es');
  for(const key of ['ain_lang','ainimation:ui:language','ain-lang'])assert.equal(win.localStorage.getItem(key),'es');
  const home=win.document.querySelector('header a.brand');assert.equal(new URL(home.href).searchParams.get('lang'),'es');
  assert.equal(win.document.querySelector('#loginDialog h2').textContent,'Tu cuenta AINimation');
  dom.window.close();
});
