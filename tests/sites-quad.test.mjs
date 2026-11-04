import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createQuadraticUI} from '../sites/quad.mjs';
import {parseExpertCommand} from '../sites/expert.mjs';
const html=readFileSync(new URL('../sites/index.html',import.meta.url),'utf8');
test('los toggles cuadráticos sólo muestran iconos y llevan nombre accesible y tooltip',()=>{
 const doc=new JSDOM(html).window.document;
 for(const [id,label]of [['options','Opciones'],['advanced','Avanzado'],['expert','Experto']]){
  const button=doc.getElementById(id+'-toggle');assert.equal(button.textContent.trim(),'');assert.equal(button.querySelectorAll('svg').length,1);assert.equal(button.getAttribute('aria-label'),label);assert.equal(button.title,label);
 }
});
test('la retirada de medios empieza oculta y muestra sólo un icono con nombre accesible y tooltip',()=>{
 const doc=new JSDOM(html).window.document,button=doc.getElementById('remove-added-media');
 assert.equal(button.hidden,true);assert.equal(button.type,'button');assert.equal(button.textContent.trim(),'');assert.equal(button.querySelectorAll('svg').length,1);assert.equal(button.getAttribute('aria-label'),'Retirar medio añadido de la copia');assert.equal(button.title,button.getAttribute('aria-label'));assert.ok(doc.getElementById('advanced-panel').contains(button));
});
test('los tres paneles se cargan cerrados y se abren de forma independiente',()=>{
 const dom=new JSDOM(html),doc=dom.window.document;let reads=0,writes=0;
 Object.defineProperty(dom.window,'localStorage',{value:{getItem(){reads++;},setItem(){writes++;}}});
 const ui=createQuadraticUI(doc);
 for(const name of ['options','advanced','expert'])assert.equal(ui.isOpen(name),false);
 doc.getElementById('options-toggle').click();doc.getElementById('advanced-toggle').click();doc.getElementById('expert-toggle').click();
 for(const name of ['options','advanced','expert'])assert.equal(ui.isOpen(name),true);
 doc.querySelector('#advanced-panel [data-panel-close]').click();assert.equal(ui.isOpen('advanced'),false);assert.equal(ui.isOpen('options'),true);assert.equal(ui.isOpen('expert'),true);
 assert.equal(reads+writes,0);assert.equal(doc.activeElement.id,'advanced-toggle');
});
test('Escape dentro de un panel lo cierra y devuelve el foco sin tocar los otros',()=>{
 const dom=new JSDOM(html),doc=dom.window.document,ui=createQuadraticUI(doc);
 ui.show('options');ui.show('advanced');ui.show('expert');const input=doc.getElementById('expert-command');input.focus();
 input.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(ui.isOpen('expert'),false);assert.equal(ui.isOpen('advanced'),true);assert.equal(doc.activeElement.id,'expert-toggle');
});
test('la cuadratura no reestructura ni modifica el contenido al alternar paneles',()=>{
 const dom=new JSDOM(html),doc=dom.window.document,ui=createQuadraticUI(doc),center=doc.getElementById('content');
 const before=center.outerHTML;
 for(const name of ['options','advanced','expert']){ui.show(name);assert.equal(center.outerHTML,before);ui.hide(name);}
 const css=readFileSync(new URL('../sites/sites.css',import.meta.url),'utf8');
 assert.ok(!/body\[[^\]]*(?:open|mode)|:has\(|--(?:options|advanced|expert)-(?:width|height)/.test(css));
 assert.ok(css.includes('.quad-panel{position:fixed'));
});
test('Experto convierte sólo órdenes permitidas en acciones tipadas',()=>{
 assert.deepEqual(parseExpertCommand('/texto Nueva portada'),{type:'text',value:'Nueva portada'});
 assert.deepEqual(parseExpertCommand('/animar rise 1.8'),{type:'animate',animation:'rise',duration:1.8});
 assert.deepEqual(parseExpertCommand('/seleccionar ain-22'),{type:'select',id:'ain-22'});
 assert.deepEqual(parseExpertCommand('/importar www.portaventuranext.com'),{type:'import',url:'https://www.portaventuranext.com/'});
 assert.deepEqual(parseExpertCommand('/descargar html'),{type:'download',format:'html'});
});
test('Experto rechaza código, órdenes ambiguas, animaciones y valores inválidos',()=>{
 for(const command of ['alert(1)','/js alert(1)','/eval document.cookie','/estado extra','/animar unknown','/animar rise -1','/animar rise Infinity','/animar rise 1 extra','/seleccionar __proto__','/importar javascript:alert(1)','/texto','/descargar todo'])assert.throws(()=>parseExpertCommand(command),command);
});
