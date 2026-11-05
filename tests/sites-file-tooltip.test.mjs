import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {localFileTooltip,localMediaName,componentTooltip,hasImageDescription} from '../sites/file-tooltip.mjs';
import {createMediaLibrary} from '../sites/media.mjs';
const ref=n=>'ain-local:'+n.repeat(64);
const item=(type='image',value=ref('a'))=>({id:'ain-1',type,value,label:'Introducción',alt:'Foto del pingüino'});
function asset(id,name,type,mime){
  const blob=new Blob(['x'],{type:mime});for(const method of ['arrayBuffer','stream','slice'])Object.defineProperty(blob,method,{get(){throw Error('La ayuda no puede leer bytes');}});
  return {id,name,type,mime,size:blob.size,blob};
}
test('el criterio compartido de descripción reconoce texto Unicode y vacío sin convertir objetos ni cambiar alt',()=>{
  for(const alt of ['Foto','  Descripcio\u0301n del AN\u0303O · pingüino  ']){const photo={...item(),alt},before=JSON.stringify(photo);assert.equal(hasImageDescription(photo),true);assert.ok(componentTooltip(photo,'Imagen',()=> 'captura.png').endsWith('Descripción de la imagen: '+alt));assert.equal(JSON.stringify(photo),before);}
  for(const alt of [undefined,null,0,false,'',' \t\n\u00a0 ',{toString(){throw Error('No convertir alt');}}])assert.equal(hasImageDescription({...item(),alt}),false);
  for(const type of ['video','graphic','background','text'])assert.equal(hasImageDescription({...item(type),alt:'Texto disponible'}),false);assert.equal(hasImageDescription(null),false);
});
test('usa sólo el descriptor referenciado y conserva nombres Unicode y archivos compartidos sin leer bytes',()=>{
  const records=[asset(ref('a'),'Captura · AN\u0303O.png','image','image/png'),asset(ref('b'),'Cabecera.mp4','video','video/mp4'),asset(ref('c'),'Otro archivo.png','image','image/png')],library=createMediaLibrary(records),calls=[],getName=id=>{calls.push(id);return localMediaName(library,id);},first=item(),copy={...first,id:'ain-2',label:'Duplicado'},video=item('video',ref('b')),before=JSON.stringify([first,copy,video]);
  assert.equal(localFileTooltip(first,'Imagen · Añadido · Oculto · Entrada desde abajo',getName),'Introducción\nImagen · Añadido · Oculto · Entrada desde abajo\nArchivo local: Captura · AN\u0303O.png');
  assert.equal(localFileTooltip(copy,'Imagen · Añadido',getName),'Duplicado\nImagen · Añadido\nArchivo local: Captura · AN\u0303O.png');assert.ok(localFileTooltip(video,'Vídeo · Añadido',getName).endsWith('Archivo local: Cabecera.mp4'));assert.deepEqual(calls,[ref('a'),ref('a'),ref('b')]);assert.equal(JSON.stringify([first,copy,video]),before);assert.equal(library.size,3);
});
test('otros tipos, URLs remotas y referencias inválidas no consultan descriptores',()=>{
  let calls=0;const getName=()=>{calls++;throw Error('No debe consultar archivos');};for(const value of [item('text'),item('graphic'),item('background'),item('image','https://example.org/a.png'),item('video','ain-local:invalida'),item('image',null),null])assert.equal(localFileTooltip(value,'Detalle',getName),'');assert.equal(localMediaName({records:getName},'https://example.org/a.png'),'');assert.equal(calls,0);
});
test('ausencia de descriptor o nombre inválido no inventa ayuda ni convierte objetos',()=>{
  const library=createMediaLibrary();assert.equal(localFileTooltip(item(),'Imagen',id=>library.records(new Set([id]))[0].name),'');assert.equal(localMediaName(library,ref('a')),'');assert.equal(localFileTooltip(item(),'Imagen',id=>localMediaName(library,id)),'');
  for(const name of [undefined,null,0,{toString(){throw Error('No convertir');}},'', '   ','x'.repeat(201)])assert.equal(localFileTooltip(item(),'Imagen',()=>name),'');
});
test('title trata el nombre como texto literal y deja texto visible, nombre accesible y alt intactos',()=>{
  const dom=new JSDOM('<button aria-pressed="true"><strong>Introducción</strong><span>Imagen · Añadido</span></button>'),button=dom.window.document.querySelector('button'),photo=item(),before=JSON.stringify(photo),visible=button.textContent,name='<img src=x onerror="alert(1)"> & pingüino.png';button.title=localFileTooltip(photo,'Imagen · Añadido',()=>name);
  assert.equal(button.title,'Introducción\nImagen · Añadido\nArchivo local: '+name);assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script').length,0);assert.equal(JSON.stringify(photo),before);
});
test('la ayuda de imagen añade su alt literal, local o remoto, sin cargar archivos ni normalizar Unicode',()=>{
  const remote={...item('image','https://example.org/photo.jpg'),alt:'  Descripcio\u0301n del AN\u0303O · pingüino  '};let calls=0;const getName=()=>{calls++;return 'captura.png';},local={...remote,value:ref('a')},copy={...local,id:'ain-2',label:'Otra imagen',alt:'Otra descripción'},before=JSON.stringify([remote,local,copy]);
  assert.equal(componentTooltip(remote,'Imagen · Importado',getName),'Introducción\nImagen · Importado\nDescripción de la imagen: '+remote.alt);assert.equal(calls,0);
  assert.equal(componentTooltip(local,'Imagen · Añadido · Oculto',getName),'Introducción\nImagen · Añadido · Oculto\nArchivo local: captura.png\nDescripción de la imagen: '+local.alt);assert.ok(componentTooltip(copy,'Imagen · Añadido',getName).endsWith('Archivo local: captura.png\nDescripción de la imagen: Otra descripción'));assert.equal(calls,2);assert.equal(JSON.stringify([remote,local,copy]),before);
});
test('alt ausente, vacío o no textual conserva la ayuda y otros tipos nunca usan su alt',()=>{
  const getName=()=> 'archivo.png';for(const alt of [undefined,null,0,false,'','  \t\n ',{toString(){throw Error('No convertir objetos');}}])for(const value of [ref('a'),'https://example.org/photo.jpg']){const photo={...item('image',value),alt};assert.equal(componentTooltip(photo,'Imagen',getName),localFileTooltip(photo,'Imagen',getName));}
  for(const type of ['video','text','graphic','background']){const other={...item(type),alt:'Descripción que sólo debe usar una imagen'};assert.equal(componentTooltip(other,'Detalle',getName),localFileTooltip(other,'Detalle',getName));}
});
test('descripción larga con apariencia de HTML permanece literal y no cambia DOM, nombre, selección o alt',()=>{
  const dom=new JSDOM('<button aria-pressed="true"><strong>Introducción</strong><span>Imagen · Añadido</span></button>'),button=dom.window.document.querySelector('button'),alt=('<img src=x onerror="alert(1)"> & Oculto · pingüino '.repeat(30)).slice(0,1000),photo={...item(),alt},before=JSON.stringify(photo),visible=button.textContent;button.title=componentTooltip(photo,'Imagen · Añadido',()=> 'captura.png');
  assert.ok(button.title.endsWith('Descripción de la imagen: '+alt));assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script,a').length,0);assert.equal(JSON.stringify(photo),before);
});
