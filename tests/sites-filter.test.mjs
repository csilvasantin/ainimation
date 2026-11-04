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
