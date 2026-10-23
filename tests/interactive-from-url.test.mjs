import test from 'node:test';import assert from 'node:assert/strict';
import {projectFromStructure,sectionsFrom} from '../assets/interactive-from-url.mjs';
import {validate,playerHtml} from '../assets/interactive-project.mjs';
const carta={url:'https://ej.es/carta',host:'ej.es',title:'Café Ejemplo',description:'Carta',sections:[
 {heading:'Cafés',items:['Espresso 1,70€','Cortado 2,00€','Café con leche 2,40€']},
 {heading:'Tostadas',items:['Tomate 2,50€','York 2,90€']},
 {heading:'Contacto',items:['640 199 796','info@ej.es']},
 ...Array.from({length:8},(_,i)=>({heading:'Sección '+i,items:['A 1,00€','B 2,00€']}))]};
test('descarta secciones sin precio cuando hay carta',()=>{assert.ok(!sectionsFrom(carta).some(s=>s.heading==='Contacto'));assert.equal(sectionsFrom(carta).length,10);});
test('genera un proyecto válido, paginado y reproducible',()=>{for(const orientation of ['portrait','landscape']){const p=validate(projectFromStructure(carta,{orientation}));assert.equal(p.orientation,orientation);assert.ok(p.scenes.every(s=>s.buttons.length<=6));assert.ok(p.scenes.some(s=>s.id==='carta-2'));assert.equal(p.source.url,'https://ej.es/carta');assert.match(playerHtml(p),/Espresso 1,70€/);}});
test('página sin secciones → inicio y final',()=>{const p=validate(projectFromStructure({title:'X',sections:[]}));assert.deepEqual(p.scenes.map(s=>s.id),['inicio','final']);});
test('descarta imágenes demasiado grandes',()=>{const p=projectFromStructure(carta,{image:'data:image/jpeg;base64,'+'A'.repeat(900000)});assert.equal(p.scenes[0].image,undefined);});
