import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createComponentFilter} from '../sites/filter.mjs';
import {createSiteSession} from '../sites/model.mjs';
const html=readFileSync(new URL('../sites/index.html',import.meta.url),'utf8');
const item=(id,type,label,value='')=>({id:'ain-'+id,type,label,value,alt:'',animation:'none',duration:1.2,delay:0});
const items=[item(0,'text','Portada'),item(1,'image','Portada principal','https://media.org/photo.jpg'),item(2,'video','Portada vídeo','https://media.org/clip.mp4'),item(3,'graphic','Logotipo'),item(4,'background','Fondo','https://media.org/bg.jpg')];
function setup(onChange=()=>{}){
  const dom=new JSDOM(html),doc=dom.window.document;doc.getElementById('options-panel').hidden=false;doc.getElementById('project-options').hidden=false;
  Object.defineProperty(dom.window,'localStorage',{get(){throw Error('El filtro no guarda preferencias');}});
  return {dom,doc,filter:createComponentFilter({document:doc,onChange}),search:doc.getElementById('filter'),type:doc.getElementById('component-type'),visibility:doc.getElementById('component-visibility'),status:doc.getElementById('component-results')};
}
test('el selector accesible filtra todos los tipos admitidos y Todos devuelve el orden completo',()=>{
  const {doc,filter,type,status}=setup();
  assert.equal(doc.querySelector('label[for="component-type"]').textContent.startsWith('Tipo de componente'),true);
  assert.deepEqual([...type.options].map(o=>[o.value,o.text]),[['all','Todos'],['text','Texto'],['image','Imagen'],['video','Vídeo'],['graphic','SVG'],['background','Fondo']]);
  for(const [index,kind]of ['text','image','video','graphic','background'].entries()){type.value=kind;assert.deepEqual(filter.apply(items,()=>false),[items[index]]);assert.equal(status.hidden,false);assert.equal(status.textContent,'1 de 5 componentes');}
  type.value='all';assert.deepEqual(filter.apply(items,()=>false),items);assert.equal(status.hidden,true);
});
test('tipo y búsqueda se combinan con nombres, referencias y el estado oculto autorizado',()=>{
  const {filter,search,type}=setup(),media=[...items,{...item(5,'image','Portada secundaria','https://media.org/shared.jpg'),hidden:true},{...item(6,'video','Clip secundario','https://media.org/shared.mp4'),hidden:true}];
  const isHidden=i=>i.id==='ain-5'||i.id==='ain-6';
  type.value='image';search.value='  PORTADA  ';assert.deepEqual(filter.apply(media,isHidden).map(i=>i.id),['ain-1','ain-5']);
  search.value='oculto';assert.deepEqual(filter.apply(media,isHidden).map(i=>i.id),['ain-5']);
  type.value='video';assert.deepEqual(filter.apply(media,isHidden).map(i=>i.id),['ain-6']);
  type.value='all';assert.equal(filter.apply(media,isHidden).length,2);
  search.value='shared.jpg';assert.deepEqual(filter.apply(media,isHidden).map(i=>i.id),['ain-5']);
  search.value='oculto';assert.equal(filter.apply(media,()=>false).length,0);
});
test('buscar normaliza vocales españolas, mayúsculas y Unicode en consulta y contenido sin alterar los datos',()=>{
  const {filter,search,type,visibility}=setup(),media=[item(0,'image','Introducción · pingüino','https://media.org/ÁREA.jpg'),item(1,'image','Introduccio\u0301n · PINGU\u0308INO','https://media.org/clip.jpg'),{...item(2,'video','Clip de cabecera','https://media.org/ÚLTIMO.mp4'),hidden:true}],before=JSON.stringify(media),hidden=i=>i.hidden===true;
  for(const query of ['INTRODUCCION','introducción','introduccio\u0301n','pinguino','PINGÜINO','PINGU\u0308INO']){search.value=query;assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0','ain-1'],query);assert.equal(search.value,query);}
  for(const query of ['video','VÍDEO','VI\u0301DEO']){search.value=query;assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-2']);}
  search.value='area.jpg';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);search.value='ultimo.mp4';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-2']);
  visibility.value='hidden';type.value='video';search.value='VIDEO';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-2']);visibility.value='shown';assert.deepEqual(filter.apply(media,hidden),[]);visibility.value='hidden';search.value='OCULTO';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-2']);
  assert.equal(JSON.stringify(media),before);filter.reset();assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');
});
test('ñ sigue siendo distinta de n en nombres y consultas compuestos o descompuestos',()=>{
  const {filter,search}=setup(),media=[item(0,'image','AÑO'),item(1,'image','ANO'),item(2,'image','AN\u0303O')],before=JSON.stringify(media);
  for(const query of ['año','AÑO','an\u0303o']){search.value=query;assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-0','ain-2']);}
  search.value='ano';assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-1']);assert.equal(JSON.stringify(media),before);
});
test('los cambios se anuncian sin mover el foco y restablecer limpia todos los filtros sin otra acción',()=>{
  let changes=0;const {dom,filter,search,type,visibility,status}=setup(()=>changes++);
  assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');
  type.focus();type.value='video';type.dispatchEvent(new dom.window.Event('change'));search.value='No existe';search.dispatchEvent(new dom.window.Event('input'));visibility.value='hidden';visibility.dispatchEvent(new dom.window.Event('change'));
  assert.equal(changes,3);assert.equal(dom.window.document.activeElement,type);assert.deepEqual(filter.apply(items,()=>false),[]);assert.equal(status.hidden,false);assert.match(status.textContent,/No hay coincidencias/);
  filter.reset();assert.equal(changes,3);assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');assert.deepEqual(filter.apply(items,()=>false),items);assert.equal(status.hidden,true);
});
test('filtrar deja intactos componentes, referencias compartidas y el historial del proyecto',()=>{
  const original={format:'ainimation-imported-site',version:1,title:'PortAventura',url:'https://www.portaventuranext.com/',html:'<main>PortAventura</main>',items,warnings:[],links:[]};
  const session=createSiteSession(original),id=session.addMedia('image','https://media.org/shared.jpg');session.edit(id,{label:'Portada añadida',hidden:true,maxWidth:320});const copy=session.duplicateMedia(id),before=JSON.stringify({original:session.original,draft:session.draft});
  const {filter,type,search,visibility}=setup();for(const kind of ['image','video','all'])for(const state of ['all','shown','hidden']){type.value=kind;visibility.value=state;search.value='oculto';filter.apply(session.draft.items,i=>session.canSetMediaVisibility(i.id)&&i.hidden===true);}
  filter.reset();assert.equal(JSON.stringify({original:session.original,draft:session.draft}),before);session.undo();assert.equal(session.draft.items.some(i=>i.id===copy),false);session.redo();assert.equal(JSON.stringify({original:session.original,draft:session.draft}),before);
});
test('visibilidad usa sólo la ocultación autorizada del editor, sin confundir originales, nombres o CSS',()=>{
  const original={format:'ainimation-imported-site',version:1,title:'PortAventura',url:'https://www.portaventuranext.com/',html:'<style>main{display:none}</style><main>Oculto por CSS</main>',items:items.map(i=>({...i})),warnings:[],links:[]};original.items[1]={...original.items[1],inserted:true,hidden:true};
  const session=createSiteSession(original),photo=session.addMedia('image','https://media.org/photo-added.jpg'),clip=session.addMedia('video','https://media.org/clip-added.mp4'),shown=session.addMedia('image','https://media.org/shown.jpg');session.edit(photo,{hidden:true});session.edit(clip,{hidden:true});session.edit(shown,{label:'Oculto sólo en el nombre'});
  const {doc,filter,visibility,status}=setup(),hidden=i=>session.canSetMediaVisibility(i.id)&&i.hidden===true;
  assert.ok(doc.querySelector('label[for="component-visibility"]').textContent.startsWith('Visibilidad en el editor'));assert.deepEqual([...visibility.options].map(o=>[o.value,o.text]),[['all','Todos'],['shown','Sin ocultar'],['hidden','Ocultos']]);
  visibility.value='hidden';assert.deepEqual(filter.apply(session.draft.items,hidden).map(i=>i.id),[photo,clip]);assert.equal(status.textContent,'2 de 8 componentes');
  visibility.value='shown';assert.deepEqual(filter.apply(session.draft.items,hidden).map(i=>i.id),[...items.map(i=>i.id),shown]);
  visibility.value='all';assert.equal(filter.apply(session.draft.items,hidden).length,8);assert.equal(status.hidden,true);
});
test('visibilidad, tipo y búsqueda se combinan y anuncian también la ausencia de coincidencias',()=>{
  const {filter,type,search,visibility,status}=setup(),media=[...items,{...item(5,'image','Portada oculta','https://media.org/hidden.jpg'),hidden:true},{...item(6,'video','Clip oculto','https://media.org/hidden.mp4'),hidden:true}],hidden=i=>i.hidden===true;
  visibility.value='hidden';type.value='image';search.value='PORTADA';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-5']);assert.equal(status.textContent,'1 de 7 componentes');
  visibility.value='shown';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-1']);
  visibility.value='hidden';search.value='oculto';type.value='video';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-6']);
  type.value='text';assert.deepEqual(filter.apply(media,hidden),[]);assert.equal(status.hidden,false);assert.match(status.textContent,/No hay coincidencias/);
  search.value='';type.value='all';visibility.value='shown';filter.apply(items,()=>false);assert.equal(status.hidden,false);assert.equal(status.textContent,'5 de 5 componentes');
});
test('localizar selección empieza deshabilitado y sólo muestra un icono con nombre accesible y tooltip',()=>{
  const {doc}=setup(),button=doc.getElementById('locate-selection');
  assert.equal(button.disabled,true);assert.equal(button.type,'button');assert.equal(button.textContent.trim(),'');assert.equal(button.querySelectorAll('svg').length,1);assert.equal(button.getAttribute('aria-label'),'Localizar selección en la lista');assert.equal(button.title,button.getAttribute('aria-label'));assert.equal(button.getAttribute('aria-controls'),'components');
});
function layout(selectedTop,selectedBottom,scrollTop=0){
  const ui=setup(),{doc}=ui,list=doc.getElementById('components'),row=doc.createElement('button'),name=doc.createElement('strong');
  row.dataset.item='ain-30';name.textContent='Portada secundaria';row.append(name);list.append(row);
  list.scrollTop=scrollTop;list.scrollLeft=7;list.getBoundingClientRect=()=>({top:200});Object.defineProperty(list,'clientTop',{value:1});Object.defineProperty(list,'clientHeight',{value:340});row.getBoundingClientRect=()=>({top:selectedTop,bottom:selectedBottom});
  doc.getElementById('options-panel').scrollTop=73;doc.documentElement.scrollTop=29;doc.getElementById('draft-frame').srcdoc='<p>Lienzo intacto</p>';
  const control=doc.getElementById('locate-selection');control.disabled=false;control.focus();return {...ui,list,control};
}
test('localizar una fila inferior desplaza sólo la lista y anuncia su nombre sin mover foco ni lienzo',()=>{
  const {doc,filter,list,control,status}=layout(680,732,40),frame=doc.getElementById('draft-frame').srcdoc;
  assert.equal(filter.locate('ain-30'),true);assert.equal(list.scrollTop,231);assert.equal(list.scrollLeft,7);assert.equal(doc.getElementById('options-panel').scrollTop,73);assert.equal(doc.documentElement.scrollTop,29);assert.equal(doc.activeElement,control);assert.equal(doc.getElementById('draft-frame').srcdoc,frame);assert.equal(status.hidden,false);assert.equal(status.textContent,'Selección localizada: Portada secundaria');
});
test('localizar una fila superior la recupera y una fila ya visible no cambia el desplazamiento',()=>{
  const upper=layout(150,202,100);upper.filter.locate('ain-30');assert.equal(upper.list.scrollTop,49);
  const visible=layout(250,302,100);visible.filter.locate('ain-30');assert.equal(visible.list.scrollTop,100);
});
test('una selección ausente no cambia filtros, resultados ni desplazamiento',()=>{
  const {filter,search,type,status,list}=layout(250,302,100);type.value='video';search.value='oculto';status.textContent='Sin resultados';const before=status.outerHTML;
  assert.equal(filter.locate('ain-999'),false);assert.equal(type.value,'video');assert.equal(search.value,'oculto');assert.equal(status.outerHTML,before);assert.equal(list.scrollTop,100);
});
