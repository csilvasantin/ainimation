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
  return {dom,doc,filter:createComponentFilter({document:doc,onChange}),search:doc.getElementById('filter'),type:doc.getElementById('component-type'),status:doc.getElementById('component-results')};
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
test('los cambios se anuncian sin mover el foco y restablecer limpia ambos filtros sin otra acción',()=>{
  let changes=0;const {dom,filter,search,type,status}=setup(()=>changes++);
  assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');
  type.focus();type.value='video';type.dispatchEvent(new dom.window.Event('change'));search.value='No existe';search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(changes,2);assert.equal(dom.window.document.activeElement,type);assert.deepEqual(filter.apply(items,()=>false),[]);assert.equal(status.hidden,false);assert.match(status.textContent,/No hay coincidencias/);
  filter.reset();assert.equal(changes,2);assert.equal(search.value,'');assert.equal(type.value,'all');assert.deepEqual(filter.apply(items,()=>false),items);assert.equal(status.hidden,true);
});
test('filtrar deja intactos componentes, referencias compartidas y el historial del proyecto',()=>{
  const original={format:'ainimation-imported-site',version:1,title:'PortAventura',url:'https://www.portaventuranext.com/',html:'<main>PortAventura</main>',items,warnings:[],links:[]};
  const session=createSiteSession(original),id=session.addMedia('image','https://media.org/shared.jpg');session.edit(id,{label:'Portada añadida',hidden:true,maxWidth:320});const copy=session.duplicateMedia(id),before=JSON.stringify({original:session.original,draft:session.draft});
  const {filter,type,search}=setup();for(const kind of ['image','video','all']){type.value=kind;search.value='oculto';filter.apply(session.draft.items,i=>session.canSetMediaVisibility(i.id)&&i.hidden===true);}
  filter.reset();assert.equal(JSON.stringify({original:session.original,draft:session.draft}),before);session.undo();assert.equal(session.draft.items.some(i=>i.id===copy),false);session.redo();assert.equal(JSON.stringify({original:session.original,draft:session.draft}),before);
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
