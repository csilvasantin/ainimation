import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {savedSiteLabel,updateSavedSiteOption,refreshLibraryTitle} from '../sites/library-label.mjs';
const record=(id,updatedAt,importedAt)=>({id,updatedAt,draft:{title:'PortAventura NeXT',importedAt}});
test('la fecha guardada se muestra con año y segundos en la zona local, incluso al cambiar de día',()=>{
  const url=new URL('../sites/library-label.mjs',import.meta.url).href;
  const code=`import {savedSiteLabel} from ${JSON.stringify(url)};console.log(savedSiteLabel({updatedAt:Date.parse('2026-11-04T23:30:15Z'),draft:{title:'PortAventura',importedAt:'2026-10-01T10:00:00Z'}}));`;
  for(const [TZ,date,time]of [['Europe/Madrid','05/11/2026','00:30:15'],['America/New_York','04/11/2026','18:30:15']]){
    const label=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ},encoding:'utf8'}).trim();
    assert.ok(label.startsWith('PortAventura · copia · '));assert.ok(label.includes(date));assert.ok(label.includes(time));
  }
});
test('sin fecha guardada válida se usa la importación válida, o se omite la fecha sin inventarla',()=>{
  const importedAt='2026-10-04T12:34:56Z',fallback=savedSiteLabel(record('A',undefined,importedAt));
  for(const value of [undefined,null,'','   ','inválida',NaN,Infinity,true,{},[]])assert.equal(savedSiteLabel(record('A',value,importedAt)),fallback);
  for(const value of [undefined,null,'','inválida',NaN,true])assert.equal(savedSiteLabel(record('A',value,value)),'PortAventura NeXT · copia');
  assert.notEqual(savedSiteLabel(record('A',0,importedAt)),fallback);assert.equal(savedSiteLabel(record('A',Date.parse(importedAt),'no válida')),fallback);
});
test('actualizar etiquetas conserva IDs, orden, selección y las opciones para importar',()=>{
  const dom=new JSDOM('<label for="sites">Seleccionar site</label><select id="sites"><option value="preset">PortAventura NeXT · empezar aquí</option><option value="new">Otra URL…</option></select>'),select=dom.window.document.querySelector('select');
  const a=record('A',1770000000000),b=record('B',1780000000000);updateSavedSiteOption(select,a);updateSavedSiteOption(select,b);select.value='B';refreshLibraryTitle(select);
  const options=[...select.options],selected=select.selectedOptions[0],before=JSON.stringify([a,b]);
  updateSavedSiteOption(select,{...a,updatedAt:1790000000000});assert.equal(select.value,'B');assert.equal(select.selectedOptions[0],selected);assert.deepEqual([...select.options],options);assert.equal(select.title,selected.textContent);
  assert.deepEqual([...select.options].map(o=>o.value),['preset','new','A','B']);assert.equal(select.options[0].textContent,'PortAventura NeXT · empezar aquí');assert.equal(select.options[1].textContent,'Otra URL…');assert.equal(JSON.stringify([a,b]),before);
  select.value='new';refreshLibraryTitle(select);assert.equal(select.title,'Otra URL…');
});
test('los títulos son texto literal y el nombre completo con fecha queda disponible en la opción y tooltip',()=>{
  const dom=new JSDOM('<select></select>'),select=dom.window.document.querySelector('select'),r=Object.freeze({id:'A',updatedAt:1790000000000,draft:Object.freeze({title:'Vídeo <img src=x onerror=alert(1)> · título largo',importedAt:'2026-01-01'})});
  const before=JSON.stringify(r),option=updateSavedSiteOption(select,r);assert.equal(option.childElementCount,0);assert.equal(option.textContent,savedSiteLabel(r));assert.equal(option.title,option.textContent);assert.equal(select.title,option.textContent);assert.equal(JSON.stringify(r),before);
});
