import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {savedSiteLabel,savedSiteTooltip,updateSavedSiteOption,refreshLibraryTitle,orderSavedSiteOptions} from '../sites/library-label.mjs';
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
function libraryUI(records){
  const dom=new JSDOM('<label for="sites">Seleccionar site</label><select id="sites"><option value="preset">PortAventura NeXT · empezar aquí</option><option value="new">Otra URL…</option></select>'),select=dom.window.document.querySelector('select');
  for(const r of records)updateSavedSiteOption(select,r);return {dom,select};
}
test('las copias se ordenan por guardado válido, con importación alternativa y sin fecha al final, sin cambiar los registros',()=>{
  const records=[record('sin-fecha',null,'inválida'),record('anterior',100,900),record('epoca',0,950),record('reciente','2026-11-05T10:00:00Z',10),record('antes-de-epoca',-100),record('importada','inválida',500)];
  for(const r of records){Object.freeze(r.draft);Object.freeze(r);}Object.freeze(records);
  const {select}=libraryUI(records),saved=new Map(records.map(r=>[r.id,r])),before=JSON.stringify([...saved]);select.value='anterior';orderSavedSiteOptions(select,saved.values());
  assert.deepEqual([...select.options].map(o=>o.value),['preset','new','reciente','importada','anterior','epoca','antes-de-epoca','sin-fecha']);
  assert.equal(select.value,'anterior');assert.equal(JSON.stringify([...saved]),before);assert.deepEqual([...saved.values()],records);assert.equal(select.title,select.selectedOptions[0].textContent);
});
test('los empates mantienen el orden visible y reordenar conserva nodos, selección, foco y opciones de importación',()=>{
  const a=record('A',200),b=record('B',200),c=record('C',300),missing=record('sin-fecha'),otherMissing=record('otra-sin-fecha','inválida');
  const {dom,select}=libraryUI([a,b,c,missing,otherMissing]),nodes=new Map([...select.options].map(o=>[o.value,o]));select.value='B';select.focus();let changes=0;select.addEventListener('change',()=>changes++);
  orderSavedSiteOptions(select,[b,a,otherMissing,c,missing]);assert.deepEqual([...select.options].map(o=>o.value),['preset','new','C','A','B','sin-fecha','otra-sin-fecha']);
  assert.equal(select.selectedOptions[0],nodes.get('B'));assert.equal(dom.window.document.activeElement,select);assert.equal(changes,0);for(const option of select.options)assert.equal(option,nodes.get(option.value));
  select.value='new';orderSavedSiteOptions(select,[a,b,c,missing,otherMissing]);assert.equal(select.value,'new');assert.equal(select.title,'Otra URL…');
  select.selectedIndex=-1;orderSavedSiteOptions(select,[record('A',400),b,c,missing,otherMissing]);assert.equal(select.selectedIndex,-1);assert.equal(select.title,'');assert.equal(changes,0);
});
test('tras actualizar una etiqueta la copia recién guardada sube sin cambiar la copia abierta ni duplicar opciones o archivos',()=>{
  const a=record('A',300),b=record('B',200),asset=Object.freeze({id:'local',name:'compartido.png'});a.assets=b.assets=Object.freeze([asset]);
  const saved=new Map([['A',a],['B',b]]),{select}=libraryUI(saved.values()),nodes=new Map([...select.options].map(o=>[o.value,o]));select.value='A';orderSavedSiteOptions(select,saved.values());
  const updated={...b,updatedAt:400};saved.set('B',updated);updateSavedSiteOption(select,updated);const before=JSON.stringify([...saved]);orderSavedSiteOptions(select,saved.values());
  assert.deepEqual([...select.options].map(o=>o.value),['preset','new','B','A']);assert.equal(select.value,'A');assert.equal(select.title,savedSiteLabel(a));assert.equal(nodes.get('B').title,savedSiteLabel(updated));assert.equal(select.options.length,4);
  for(const option of select.options)assert.equal(option,nodes.get(option.value));assert.equal(JSON.stringify([...saved]),before);assert.deepEqual([...saved.keys()],['A','B']);assert.equal(saved.get('A').assets,saved.get('B').assets);assert.equal(saved.get('B').assets[0],asset);
});
test('el tooltip añade sólo una URL HTTPS válida como texto literal y conserva la etiqueta y los datos originales',()=>{
  const url='HTTPS://Example.org/página?texto=<img src=x onerror=alert(1)>#capítulo',r=Object.freeze({id:'A',updatedAt:1790000000000,draft:Object.freeze({title:'Portada',url})}),before=JSON.stringify(r);
  assert.equal(savedSiteTooltip(r),savedSiteLabel(r)+'\n'+url);assert.equal(JSON.stringify(r),before);
  const {select}=libraryUI([r]),option=select.options[2];assert.equal(option.childElementCount,0);assert.equal(option.textContent,savedSiteLabel(r));assert.equal(option.title,savedSiteTooltip(r));
  for(const value of [undefined,null,'','/ruta','no es una URL','https://exa mple.org/','http://example.org/','javascript:alert(1)','data:text/html,<b>hola</b>','file:///tmp/site.html','https://persona:clave@example.org/',{toString(){throw Error('No convertir objetos');}}]){
    const invalid={...r,draft:{...r.draft,url:value}};assert.equal(savedSiteTooltip(invalid),savedSiteLabel(invalid));
  }
});
test('el tooltip de la selección conserva su URL al actualizar y ordenar copias, sin cambios de nombre, valor o foco',()=>{
  const a={...record('A',300),draft:{title:'Mismo título',url:'https://example.org/uno'}},b={...record('B',200),draft:{title:'Mismo título',url:'https://example.org/dos?x=1&y=2'}};
  const {dom,select}=libraryUI([a,b]),before=JSON.stringify([a,b]),options=[...select.options];select.value='B';select.focus();refreshLibraryTitle(select);assert.equal(select.title,savedSiteTooltip(b));
  const updated={...a,updatedAt:400};updateSavedSiteOption(select,updated);orderSavedSiteOptions(select,[updated,b]);assert.equal(select.value,'B');assert.equal(select.selectedOptions[0],options[3]);assert.equal(select.title,savedSiteTooltip(b));assert.equal(dom.window.document.activeElement,select);
  select.value='A';refreshLibraryTitle(select);assert.equal(select.title,savedSiteTooltip(updated));select.value='new';refreshLibraryTitle(select);assert.equal(select.title,'Otra URL…');assert.equal(JSON.stringify([a,b]),before);
});
test('la ayuda cuenta todos los componentes cargados, incluidos ocultos, con singular y plural y sin cambiar los registros',()=>{
  for(const [count,text]of [[0,'0 componentes'],[1,'1 componente'],[29,'29 componentes']]){
    const items=Object.freeze(Array.from({length:count},(_,index)=>Object.freeze({id:'ain-'+index,hidden:index%2===0}))),r=Object.freeze({id:'A',updatedAt:1790000000000,draft:Object.freeze({title:'Portada',url:'https://example.org/',items})}),before=JSON.stringify(r);
    assert.equal(savedSiteTooltip(r),savedSiteLabel(r)+'\nhttps://example.org/\n'+text);assert.equal(JSON.stringify(r),before);assert.equal(r.draft.items,items);
    const withoutURL={...r,draft:{...r.draft,url:'no válida'}};assert.equal(savedSiteTooltip(withoutURL),savedSiteLabel(withoutURL)+'\n'+text);
  }
  for(const items of [undefined,null,'29',29,{length:29},new Set([1,2])]){
    const r={...record('A',1790000000000),draft:{title:'Portada',url:'https://example.org/',items}};assert.equal(savedSiteTooltip(r),savedSiteLabel(r)+'\nhttps://example.org/');
  }
});
test('el recuento se sincroniza al actualizar y ordenar opciones sin cambiar texto visible, selección o archivos compartidos',()=>{
  const asset=Object.freeze({id:'local',name:'compartido.png'}),a={...record('A',300),draft:{title:'Copia A',url:'https://example.org/a',items:[{id:'ain-0',hidden:true}]}},b={...record('B',200),draft:{title:'Copia B',url:'https://example.org/b',items:[]}};a.assets=b.assets=Object.freeze([asset]);
  const {dom,select}=libraryUI([a,b]),nodes=[...select.options],before=JSON.stringify([a,b]);select.value='A';select.focus();refreshLibraryTitle(select);assert.ok(select.title.endsWith('\n1 componente'));
  const updated={...a,draft:{...a.draft,items:[...a.draft.items,{id:'ain-1'}]}};updateSavedSiteOption(select,updated);orderSavedSiteOptions(select,[updated,b]);assert.ok(select.title.endsWith('\n2 componentes'));assert.equal(select.value,'A');assert.equal(select.selectedOptions[0],nodes[2]);assert.equal(nodes[2].textContent,savedSiteLabel(a));assert.equal(dom.window.document.activeElement,select);
  select.value='B';refreshLibraryTitle(select);assert.ok(select.title.endsWith('\n0 componentes'));assert.equal(JSON.stringify([a,b]),before);assert.equal(a.assets,b.assets);assert.equal(a.assets[0],asset);
});
