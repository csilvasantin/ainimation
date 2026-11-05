import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createComponentFilter} from '../sites/filter.mjs';
import {createSiteSession} from '../sites/model.mjs';
import {createMediaLibrary} from '../sites/media.mjs';
import {savedSiteTooltip} from '../sites/library-label.mjs';
const html=readFileSync(new URL('../sites/index.html',import.meta.url),'utf8');
const item=(id,type,label,value='')=>({id:'ain-'+id,type,label,value,alt:'',animation:'none',duration:1.2,delay:0});
const items=[item(0,'text','Portada'),item(1,'image','Portada principal','https://media.org/photo.jpg'),item(2,'video','Portada vídeo','https://media.org/clip.mp4'),item(3,'graphic','Logotipo'),item(4,'background','Fondo','https://media.org/bg.jpg')];
function setup(onChange=()=>{},getMediaName,isLocked){
  const dom=new JSDOM(html),doc=dom.window.document;doc.getElementById('options-panel').hidden=false;doc.getElementById('project-options').hidden=false;
  Object.defineProperty(dom.window,'localStorage',{get(){throw Error('El filtro no guarda preferencias');}});
  return {dom,doc,filter:createComponentFilter({document:doc,onChange,getMediaName,isLocked}),search:doc.getElementById('filter'),type:doc.getElementById('component-type'),visibility:doc.getElementById('component-visibility'),animation:doc.getElementById('component-animation'),resetButton:doc.getElementById('reset-component-filters'),status:doc.getElementById('component-results')};
}
test('el selector accesible filtra todos los tipos admitidos y Todos devuelve el orden completo',()=>{
  const {doc,filter,type,status}=setup();
  assert.equal(doc.querySelector('label[for="component-type"]').textContent.startsWith('Tipo de componente'),true);
  assert.deepEqual([...type.options].map(o=>[o.value,o.text]),[['all','Todos'],['text','Texto'],['image','Imagen'],['video','Vídeo'],['graphic','SVG'],['background','Fondo']]);
  for(const [index,kind]of ['text','image','video','graphic','background'].entries()){type.value=kind;assert.deepEqual(filter.apply(items,()=>false),[items[index]]);assert.equal(status.hidden,false);assert.equal(status.textContent,'1 de 5 componentes');}
  type.value='all';assert.deepEqual(filter.apply(items,()=>false),items);assert.equal(status.hidden,true);
});
test('restablecer filtros empieza deshabilitado y muestra sólo un icono SVG con nombre accesible y tooltip',()=>{
  const {resetButton}=setup();assert.equal(resetButton.disabled,true);assert.equal(resetButton.type,'button');assert.equal(resetButton.textContent.trim(),'');assert.equal(resetButton.querySelectorAll('svg').length,1);assert.equal(resetButton.getAttribute('aria-label'),'Restablecer filtros');assert.equal(resetButton.title,'Restablecer filtros');assert.equal(resetButton.getAttribute('aria-controls'),'components');assert.equal(resetButton.getAttribute('aria-describedby'),'component-results');
});
test('restablecer limpia sólo cuatro filtros, pinta una vez y anuncia el total sin localizar, mover el lienzo o cambiar otros campos',()=>{
  let ui,changes=0;ui=setup(()=>{changes++;ui.filter.apply(items,()=>false);});const {doc,filter,search,type,visibility,animation,resetButton,status}=ui;
  doc.getElementById('site-url').value='https://example.org/otra';doc.getElementById('site-library').value='new';doc.getElementById('fields').textContent='Inspector intacto';doc.getElementById('draft-frame').srcdoc='<p>Lienzo intacto</p>';doc.getElementById('options-panel').scrollTop=37;doc.documentElement.scrollTop=19;doc.getElementById('components').scrollTop=73;
  const before={fields:doc.getElementById('fields').innerHTML,frame:doc.getElementById('draft-frame').srcdoc};filter.locate=()=>{throw Error('No localizar la selección');};search.value='inexistente';type.value='image';visibility.value='hidden';animation.value='animated';filter.apply(items,()=>false);assert.equal(resetButton.disabled,false);
  resetButton.focus();resetButton.click();assert.equal(changes,1);assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');assert.equal(animation.value,'all');assert.equal(resetButton.disabled,true);assert.equal(status.hidden,false);assert.equal(status.textContent,'Filtros restablecidos. 5 componentes.');
  assert.equal(doc.getElementById('site-url').value,'https://example.org/otra');assert.equal(doc.getElementById('site-library').value,'new');assert.equal(doc.getElementById('fields').innerHTML,before.fields);assert.equal(doc.getElementById('draft-frame').srcdoc,before.frame);assert.equal(doc.getElementById('options-panel').scrollTop,37);assert.equal(doc.documentElement.scrollTop,19);assert.equal(doc.getElementById('components').scrollTop,73);
});
test('los espacios se pueden limpiar y el bloqueo de carga conserva el estado correcto al desbloquear',()=>{
  for(const count of [0,1]){
    let locked=false,changes=0,ui;ui=setup(()=>{changes++;ui.filter.apply(items.slice(0,count),()=>false);},undefined,()=>locked);const {filter,search,resetButton,status}=ui;
    search.value='   ';filter.apply(items.slice(0,count),()=>false);assert.equal(resetButton.disabled,false);locked=true;filter.syncAvailability();assert.equal(resetButton.disabled,true);resetButton.click();assert.equal(changes,0);assert.equal(search.value,'   ');
    locked=false;filter.syncAvailability();assert.equal(resetButton.disabled,false);resetButton.click();assert.equal(changes,1);assert.equal(search.value,'');assert.equal(status.textContent,'Filtros restablecidos. '+count+' '+(count===1?'componente.':'componentes.'));assert.equal(status.hidden,false);filter.syncAvailability();assert.equal(resetButton.disabled,true);
  }
});
test('el selector de animación es accesible, empieza en Todos y comparte el criterio exacto de la biblioteca',()=>{
  const {doc,filter,animation,status}=setup(),valid=['fade','rise','zoom','float'].map((preset,index)=>({...item(index,'image','Con animación'),animation:preset,hidden:true})),invalid=['none','FADE','otra',undefined,null,0,false,{toString(){throw Error('No convertir objetos');}}].map((preset,index)=>({...item(index+4,'text','fade · animation:rise'),animation:preset})),media=[...valid,...invalid],before=JSON.stringify(media);
  assert.ok(doc.querySelector('label[for="component-animation"]').textContent.startsWith('Animación del editor'));assert.equal(animation.getAttribute('aria-controls'),'components');assert.equal(animation.getAttribute('aria-describedby'),'component-results');assert.equal(animation.value,'all');assert.deepEqual([...animation.options].map(o=>[o.value,o.text]),[['all','Todos'],['animated','Con animación'],['unanimated','Sin animación'],['fade','Aparecer'],['rise','Entrada desde abajo'],['zoom','Acercamiento suave'],['float','Flotar en bucle']]);
  assert.deepEqual(filter.apply(media,()=>false),media);animation.value='animated';assert.deepEqual(filter.apply(media,()=>false),valid);assert.equal(status.textContent,'4 de 12 componentes');assert.equal(status.hidden,false);assert.ok(savedSiteTooltip({draft:{title:'Copia',items:media}}).endsWith('\n4 componentes con animación configurada'));
  animation.value='unanimated';assert.deepEqual(filter.apply(media,()=>false),invalid);animation.value='animated';filter.apply(valid,()=>false);assert.equal(status.textContent,'4 de 4 componentes');assert.equal(status.hidden,false);assert.equal(JSON.stringify(media),before);
  filter.reset();assert.equal(animation.value,'all');assert.deepEqual(filter.apply(media,()=>false),media);assert.equal(status.hidden,true);
});
test('cada preset filtra sólo su valor canónico exacto, incluyendo ocultos, sin inferir de nombres o convertir objetos',()=>{
  const {doc,filter,animation,status}=setup(),valid=['fade','rise','zoom','float'].map((preset,index)=>({...item(index,'image','fade rise zoom float'),animation:preset,hidden:true})),invalid=['none','FADE',' fade','otra',undefined,null,0,{toString(){throw Error('No convertir objetos');}}].map((preset,index)=>({...item(index+4,'text','fade rise zoom float'),animation:preset})),media=[...valid,...invalid],before=JSON.stringify(media);
  for(const preset of ['fade','rise','zoom','float']){animation.value=preset;assert.deepEqual(filter.apply(media,()=>true),valid.filter(i=>i.animation===preset));assert.equal(status.textContent,'1 de 12 componentes');assert.equal(status.hidden,false);}
  animation.value='fade';assert.deepEqual(filter.apply(media.slice(1),()=>true),[]);assert.match(status.textContent,/No hay coincidencias/);
  animation.value='animated';assert.deepEqual(filter.apply(media,()=>true),valid);animation.value='unanimated';assert.deepEqual(filter.apply(media,()=>true),invalid);animation.value='all';assert.deepEqual(filter.apply(media,()=>true),media);
  assert.equal(doc.querySelectorAll('#component-animation').length,1);assert.equal(JSON.stringify(media),before);
});
test('preset concreto combina tipo, ocultación autorizada y palabras Unicode por nombre, alt y archivo; reset conserva selección y datos',()=>{
  const ref='ain-local:'+'a'.repeat(64),media=[{...item(0,'image','Introduccio\u0301n año',ref),alt:'Foto del pingüino',animation:'rise',hidden:true},{...item(1,'image','Introducción año',ref),alt:'Foto del pingüino',animation:'zoom',hidden:true},{...item(2,'video','Introducción año',ref),animation:'rise',hidden:true},{...item(3,'image','Introducción año',ref),alt:'Foto del pingüino',animation:'rise',hidden:true}],before=JSON.stringify(media),{doc,filter,type,visibility,animation,search,status,resetButton}=setup(()=>{},()=> 'captura.png'),hidden=i=>i.id==='ain-0'||i.id==='ain-1'||i.id==='ain-2';
  doc.getElementById('selected-title').textContent='Selección fuera de la lista';type.value='image';visibility.value='hidden';animation.value='rise';search.value=' PINGUINO captura INTRODUCCION AN\u0303O ';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);assert.equal(status.textContent,'1 de 4 componentes');assert.equal(resetButton.disabled,false);
  animation.value='zoom';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-1']);animation.value='rise';visibility.value='shown';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-3']);visibility.value='hidden';search.value='pinguino ano';assert.deepEqual(filter.apply(media,hidden),[]);assert.match(status.textContent,/No hay coincidencias/);
  filter.reset();assert.equal(animation.value,'all');assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');assert.equal(resetButton.disabled,true);assert.deepEqual(filter.apply(media,hidden),media);assert.equal(doc.getElementById('selected-title').textContent,'Selección fuera de la lista');assert.equal(JSON.stringify(media),before);
});
test('animación se combina con tipo, ocultación autorizada y búsqueda Unicode por nombre, alt y archivo sin alterar la consulta',()=>{
  const ref='ain-local:'+'a'.repeat(64),media=[{...item(0,'image','Introducción año',ref),alt:'Foto del pingüino',animation:'rise',hidden:true},{...item(1,'image','Introducción año',ref),alt:'Foto del pingüino',hidden:true},{...item(2,'video','Cabecera','https://media.org/video.mp4'),animation:'zoom'},{...item(3,'graphic','SVG fade'),hidden:true}],before=JSON.stringify(media),{filter,type,visibility,animation,search,status}=setup(()=>{},()=> 'captura.png'),hidden=i=>i.id==='ain-0'||i.id==='ain-1';
  type.value='image';visibility.value='hidden';animation.value='animated';search.value='  PINGUINO captura INTRODUCCIO\u0301N AÑO  ';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);assert.equal(search.value,'  PINGUINO captura INTRODUCCIO\u0301N AÑO  ');assert.equal(status.textContent,'1 de 4 componentes');
  animation.value='unanimated';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-1']);visibility.value='shown';assert.deepEqual(filter.apply(media,hidden),[]);assert.match(status.textContent,/No hay coincidencias/);assert.equal(status.hidden,false);
  animation.value='animated';type.value='video';visibility.value='all';search.value='video cabecera';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-2']);
  animation.value='unanimated';type.value='graphic';visibility.value='shown';search.value='fade';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-3']);visibility.value='hidden';assert.deepEqual(filter.apply(media,hidden),[]);assert.equal(JSON.stringify(media),before);
  filter.reset();assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');assert.equal(animation.value,'all');assert.deepEqual(filter.apply(media,hidden),media);
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
test('varias palabras coinciden todas en el mismo componente, sin importar orden o espacios',()=>{
  const {filter,search,type,visibility,status}=setup(),media=[{...item(0,'video','Cabecera hero','https://media.org/promo.mp4'),hidden:true},{...item(1,'video','Pie de página'),hidden:true},item(2,'video','Cabecera visible'),{...item(3,'image','Cabecera imagen'),hidden:true},item(4,'text','video oculto'),item(5,'text','cabecera')],before=JSON.stringify(media),hidden=i=>i.hidden===true;
  for(const query of ['video oculto cabecera','cabecera video oculto','  VIDEO\t oculto\u00a0  cabecera  ']){search.value=query;assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);assert.equal(search.value,query);}
  type.value='video';visibility.value='hidden';search.value='promo.mp4 cabecera';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);visibility.value='shown';assert.deepEqual(filter.apply(media,hidden),[]);
  type.value='all';visibility.value='all';search.value='cabecera inexistente';assert.deepEqual(filter.apply(media,hidden),[]);assert.match(status.textContent,/No hay coincidencias/);
  search.value='cabecera';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0','ain-2','ain-3','ain-5']);search.value=' \t\u00a0 ';assert.deepEqual(filter.apply(media,hidden),media);assert.equal(status.hidden,true);assert.equal(JSON.stringify(media),before);
});
test('las palabras son literales y conservan la comparación Unicode, vocales y ñ',()=>{
  const {filter,search}=setup(),media=[item(0,'image','Introducción pingüino año a+b [demo] .*'),item(1,'image','Introduccio\u0301n PINGU\u0308INO ano'),item(2,'text','Cualquier texto')],before=JSON.stringify(media);
  for(const [query,ids]of [['pinguino introduccion año',['ain-0']],['AN\u0303O INTRODUCCIO\u0301N PINGU\u0308INO',['ain-0']],['introduccion pinguino ano',['ain-1']],['[demo] a+b',['ain-0']],['.* [demo]',['ain-0']],['(a|b)',[]],['OR a+b',[]]]){search.value=query;assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),ids,query);}
  assert.equal(JSON.stringify(media),before);
});
test('la descripción de imágenes se combina con nombre, referencia y filtros sin cambiar sus datos',()=>{
  const {filter,search,type,visibility}=setup(),media=[{...item(0,'image','Portada principal','https://media.org/photo.jpg'),alt:'Foto compartida del pingüino del año',hidden:true},{...item(1,'image','Detalle','https://media.org/detail.jpg'),alt:'Descripcio\u0301n de AN\u0303O'}],before=JSON.stringify(media),hidden=i=>i.hidden===true;
  for(const [query,ids]of [['compartida portada imagen',['ain-0']],['PINGUINO AÑO',['ain-0']],['descripcion año',['ain-1']],['DESCRIPCIO\u0301N AN\u0303O',['ain-1']],['descripcion ano',[]],['photo.jpg compartida',['ain-0']]]){search.value=query;assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),ids,query);assert.equal(search.value,query);}
  type.value='image';visibility.value='hidden';search.value='pinguino compartida oculto';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);visibility.value='shown';assert.deepEqual(filter.apply(media,hidden),[]);
  assert.equal(JSON.stringify(media),before);filter.reset();assert.deepEqual(filter.apply(media,hidden),media);
});
test('sólo se busca alt de imágenes como texto literal y no se deduce de él el estado oculto',()=>{
  const {doc,filter,search,visibility}=setup(),media=[{...item(0,'image','Paisaje'),alt:'Oculto en una anotación <script>alert(1)</script> [demo] a+b'},...['text','video','graphic','background'].map((type,index)=>({...item(index+1,type,'Otro componente'),alt:'Descripción exclusiva'}))],before=JSON.stringify(media),scripts=doc.querySelectorAll('script').length;
  search.value='exclusiva';assert.deepEqual(filter.apply(media,()=>false),[]);
  for(const query of ['[demo] a+b','<script>alert(1)</script>','oculto anotacion']){search.value=query;assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-0']);}
  visibility.value='hidden';assert.deepEqual(filter.apply(media,()=>false),[]);visibility.value='shown';assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-0']);
  assert.equal(doc.querySelectorAll('script').length,scripts);assert.equal(JSON.stringify(media),before);
});
test('el nombre del archivo propio encuentra medios renombrados y referencias compartidas sin leer bytes',()=>{
  const ref=n=>'ain-local:'+String(n).repeat(64),asset=(id,name,type,mime)=>{
    const blob=new Blob(['x'],{type:mime});blob.arrayBuffer=()=>{throw Error('La búsqueda no debe leer bytes');};blob.stream=()=>{throw Error('La búsqueda no debe abrir archivos');};return {id,name,type,mime,size:blob.size,blob};
  };
  const assets=[asset(ref(1),'Año · pingüino.png','image','image/png'),asset(ref(2),'Clip introduccio\u0301n.mp4','video','video/mp4'),asset(ref(3),'Huérfano sin referencia.jpg','image','image/png')],library=createMediaLibrary(assets),media=[item(0,'image','Portada principal',ref(1)),{...item(1,'image','Portada secundaria',ref(1)),hidden:true},item(2,'video','Cabecera',ref(2))],before=JSON.stringify(media),size=library.size;
  const {filter,search,type,visibility}=setup(()=>{},id=>library.records(new Set([id]))[0].name),hidden=i=>i.hidden===true;
  for(const [query,ids]of [['pinguino año',['ain-0','ain-1']],['PINGU\u0308INO AN\u0303O',['ain-0','ain-1']],['cabecera introduccion',['ain-2']],['huerfano',[]],['pinguino introduccion',[]],['portada principal png',['ain-0']]]){search.value=query;assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),ids,query);assert.equal(search.value,query);}
  type.value='image';visibility.value='hidden';search.value='pinguino portada';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-1']);visibility.value='shown';assert.deepEqual(filter.apply(media,hidden).map(i=>i.id),['ain-0']);
  assert.equal(JSON.stringify(media),before);assert.equal(library.size,size);assert.deepEqual(library.records().map(a=>a.name),assets.map(a=>a.name));assert.equal(library.records(new Set([ref(1)]))[0].blob,assets[0].blob);
});
test('sólo referencias locales válidas de imagen o vídeo consultan un nombre y lo tratan como texto literal',()=>{
  const valid='ain-local:'+'a'.repeat(64),missing='ain-local:'+'b'.repeat(64),calls=[],media=[item(0,'image','Portada',valid),item(1,'video','Sin descriptor',missing),...['text','graphic','background'].map((type,index)=>item(index+2,type,'Otro tipo',valid)),item(5,'image','Remota','https://media.org/photo.jpg'),item(6,'video','Referencia inválida','ain-local:no')];
  const {filter,search,visibility}=setup(()=>{},id=>{calls.push(id);return id===valid?'archivo oculto [demo].png':undefined;});
  search.value='[demo] archivo';assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-0']);assert.deepEqual(new Set(calls),new Set([valid,missing]));
  visibility.value='hidden';assert.deepEqual(filter.apply(media,()=>false),[]);visibility.value='shown';assert.deepEqual(filter.apply(media,()=>false).map(i=>i.id),['ain-0']);search.value='undefined';assert.deepEqual(filter.apply(media,()=>false),[]);
  const withoutResolver=setup();withoutResolver.search.value='archivo';assert.deepEqual(withoutResolver.filter.apply(media,()=>false),[]);
});
test('los cambios se anuncian sin mover el foco y restablecer limpia todos los filtros sin otra acción',()=>{
  let changes=0;const {dom,filter,search,type,visibility,animation,status}=setup(()=>changes++);
  assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');
  type.focus();type.value='video';type.dispatchEvent(new dom.window.Event('change'));search.value='No existe';search.dispatchEvent(new dom.window.Event('input'));visibility.value='hidden';visibility.dispatchEvent(new dom.window.Event('change'));animation.value='animated';animation.dispatchEvent(new dom.window.Event('change'));
  assert.equal(changes,4);assert.equal(dom.window.document.activeElement,type);assert.deepEqual(filter.apply(items,()=>false),[]);assert.equal(status.hidden,false);assert.match(status.textContent,/No hay coincidencias/);
  filter.reset();assert.equal(changes,4);assert.equal(search.value,'');assert.equal(type.value,'all');assert.equal(visibility.value,'all');assert.equal(animation.value,'all');assert.deepEqual(filter.apply(items,()=>false),items);assert.equal(status.hidden,true);
});
test('filtrar deja intactos componentes, referencias compartidas y el historial del proyecto',()=>{
  const original={format:'ainimation-imported-site',version:1,title:'PortAventura',url:'https://www.portaventuranext.com/',html:'<main>PortAventura</main>',items,warnings:[],links:[]};
  const session=createSiteSession(original),id=session.addMedia('image','https://media.org/shared.jpg');session.edit(id,{label:'Portada añadida',hidden:true,maxWidth:320,animation:'rise'});const copy=session.duplicateMedia(id),before=JSON.stringify({original:session.original,draft:session.draft});
  const {filter,type,search,visibility,animation}=setup();for(const kind of ['image','video','all'])for(const state of ['all','shown','hidden'])for(const motion of ['all','animated','unanimated','fade','rise','zoom','float']){type.value=kind;visibility.value=state;animation.value=motion;search.value='oculto';filter.apply(session.draft.items,i=>session.canSetMediaVisibility(i.id)&&i.hidden===true);}
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
