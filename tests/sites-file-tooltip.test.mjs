import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {localFileTooltip,localMediaName,localMediaSize,localMediaMime,componentTooltip,hasImageDescription,createLocalMediaUsage} from '../sites/file-tooltip.mjs';
import {createMediaLibrary} from '../sites/media.mjs';
const ref=n=>'ain-local:'+n.repeat(64);
const item=(type='image',value=ref('a'))=>({id:'ain-1',type,value,label:'Introducción',alt:'Foto del pingüino'});
function asset(id,name,type,mime){
  const blob=new Blob(['x'],{type:mime});for(const method of ['arrayBuffer','stream','slice'])Object.defineProperty(blob,method,{get(){throw Error('La ayuda no puede leer bytes');}});
  return {id,name,type,mime,size:blob.size,blob};
}
test('el uso cuenta instancias image/video por referencia exacta en toda la copia, con ocultos y duplicados, consultando sólo el descriptor propio',()=>{
  const first=item(),copy={...first,id:'ain-2',hidden:true},sameRefVideo={...item('video'),id:'ain-3'},other=item('video',ref('b')),sameName=item('image',ref('c')),items=[first,copy,sameRefVideo,other,sameName,item('graphic'),item('background'),item('text'),item('image','https://example.org/a.png'),item('video','ain-local:invalida'),null],before=JSON.stringify(items),calls=[],records=new Map(['a','b','c'].map(n=>[ref(n),{id:ref(n)}]));
  for(const record of records.values())for(const key of ['blob','name','mime','size'])Object.defineProperty(record,key,{get(){throw Error('El uso sólo requiere el ID del descriptor propio');}});
  const library={records(ids){calls.push([...ids]);return [...ids].map(id=>records.get(id));}},usage=createLocalMediaUsage(library,items);assert.deepEqual(calls,[]);assert.equal(usage(ref('a')),3);assert.equal(usage(ref('b')),1);assert.equal(usage(ref('c')),1);assert.equal(usage(ref('d')),undefined);assert.equal(usage('https://example.org/a.png'),undefined);assert.equal(usage('ain-local:invalida'),undefined);assert.deepEqual(calls,[[ref('a')],[ref('b')],[ref('c')]]);assert.equal(JSON.stringify(items),before);
  const revised=createLocalMediaUsage(library,items.filter(i=>i!==copy&&i!==sameRefVideo));assert.equal(revised(ref('a')),1);assert.equal(usage(ref('a')),3);
});
test('sin array, descriptor propio o referencia válida no se inventa uso ni se convierten objetos',()=>{
  const noRead={records(){throw Error('No consultar descriptores');}};for(const items of [undefined,null,{},'items',[],[item('graphic')],[item('image','https://example.org/a.png')]])assert.equal(createLocalMediaUsage(noRead,items)(ref('a')),undefined);
  for(const library of [{records:()=>[]},{records:()=>[{id:ref('b')}]},noRead])assert.equal(createLocalMediaUsage(library,[item()])(ref('a')),undefined);
  const object={toString(){throw Error('No convertir referencias');}};assert.equal(createLocalMediaUsage(noRead,[item('image',object)])(object),undefined);
});
test('la ayuda añade uso singular/plural conservando metadatos, texto visible, atributos y datos; otros tipos o usos inválidos mantienen la ayuda',()=>{
  for(const type of ['image','video'])for(const count of [1,5]){
    const media={...item(type),animation:'rise',duration:1.2,delay:0,hidden:true},before=JSON.stringify(media),prior=componentTooltip(media,'Detalle <img src=x>',()=> 'Archivo AN\u0303O',()=>1234,()=>type==='image'?'image/jpeg':'video/mp4'),dom=new JSDOM('<button aria-pressed="true"><strong>Nombre completo</strong><span>Detalle literal</span></button>'),button=dom.window.document.querySelector('button'),visible=button.textContent,calls=[];
    button.title=componentTooltip(media,'Detalle <img src=x>',()=> 'Archivo AN\u0303O',()=>1234,()=>type==='image'?'image/jpeg':'video/mp4',id=>{calls.push(id);return count;});assert.equal(button.title,prior+'\nUso del archivo: '+count+' '+(count===1?'componente':'componentes'));assert.deepEqual(calls,[ref('a')]);assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script').length,0);assert.equal(JSON.stringify(media),before);
  }
  const media=item(),prior=componentTooltip(media,'Imagen',()=> 'captura.png');for(const usage of [undefined,null,0,-1,1.5,Infinity,NaN,'5',true,Number.MAX_SAFE_INTEGER+1,{toString(){throw Error('No convertir uso');}}])assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',undefined,undefined,()=>usage),prior);assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',undefined,undefined,()=>{throw Error('Descriptor ausente');}),prior);
  let calls=0;for(const value of [item('text'),item('graphic'),item('background'),item('image','https://example.org/a.png'),item('video','ain-local:invalida')])assert.equal(componentTooltip(value,'Detalle',()=> 'archivo',undefined,undefined,()=>{calls++;return 5;}),componentTooltip(value,'Detalle',()=> 'archivo'));assert.equal(calls,0);
});
test('el formato usa sólo MIME textual admitido del descriptor propio cargado, sin acceder a blob o convertir objetos',()=>{
  for(const [mime,type]of [['image/png','image'],['image/jpeg','image'],['image/webp','image'],['image/gif','image'],['image/avif','image'],['video/mp4','video'],['video/webm','video']]){
    const record=asset(ref('a'),'Nombre sin extensión',type,mime),library=createMediaLibrary([record]),calls=[],read={records(ids){calls.push([...ids]);return library.records(ids);}};Object.defineProperty(record,'blob',{get(){throw Error('No consultar blob.type o bytes');}});assert.equal(localMediaMime(read,ref('a')),mime);assert.deepEqual(calls,[[ref('a')]]);assert.equal(localMediaMime(read,ref('b')),'');
  }
  for(const mime of [undefined,null,'','IMAGE/PNG','image/svg+xml','text/html','__proto__',0,{toString(){throw Error('No convertir MIME');}}])assert.equal(localMediaMime({records:()=>[{id:ref('a'),mime}]},ref('a')),'');
  assert.equal(localMediaMime({records:()=>[{id:ref('b'),mime:'image/png'}]},ref('a')),'');assert.equal(localMediaMime({records(){throw Error('No consultar remotos');}},'https://example.org/a.png'),'');
});
test('la ayuda muestra los siete formatos coherentes con el componente, conserva toda la información y no infiere de extensiones o texto',()=>{
  for(const [mime,type,label]of [['image/png','image','PNG'],['image/jpeg','image','JPEG'],['image/webp','image','WebP'],['image/gif','image','GIF'],['image/avif','image','AVIF'],['video/mp4','video','MP4'],['video/webm','video','WebM']]){
    const media={...item(type),label:'JPEG MP4 <img src=x>',animation:'rise',duration:1.2,delay:0,hidden:true},before=JSON.stringify(media),prior=componentTooltip(media,'Detalle literal',()=> 'extension-equivocada.txt',()=>1234),calls=[],dom=new JSDOM('<button aria-pressed="true"><strong>Nombre</strong><span>Detalle</span></button>'),button=dom.window.document.querySelector('button'),visible=button.textContent;button.title=componentTooltip(media,'Detalle literal',()=> 'extension-equivocada.txt',()=>1234,id=>{calls.push(id);return mime;});
    assert.equal(button.title,prior+'\nFormato del archivo: '+label);assert.deepEqual(calls,[ref('a')]);assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script').length,0);assert.equal(JSON.stringify(media),before);
  }
});
test('MIME ausente, inválido, incoherente, remoto o de otros componentes mantiene la ayuda anterior y referencias compartidas',()=>{
  const media={...item(),animation:'zoom',duration:1.3,delay:.1},before=componentTooltip(media,'Imagen',()=> 'captura.png',()=>72168);for(const mime of [undefined,null,'','image/PNG','video/mp4','text/html','image/svg+xml',false,{toString(){throw Error('No convertir MIME');}}])assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',()=>72168,()=>mime),before);
  assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',()=>72168,()=>{throw Error('Descriptor ausente');}),before);
  let calls=0;for(const other of [item('image','https://example.org/photo.png'),item('video','ain-local:invalida'),item('text'),item('graphic'),item('background')])assert.equal(componentTooltip(other,'Detalle',()=> 'archivo',()=>1,()=>{calls++;return 'image/png';}),componentTooltip(other,'Detalle',()=> 'archivo',()=>1));assert.equal(calls,0);
  const library=createMediaLibrary([asset(ref('a'),'Compartida.png','image','image/png')]),copy={...media,id:'ain-2',label:'Duplicado'},state=JSON.stringify([media,copy]);for(const value of [media,copy])assert.ok(componentTooltip(value,'Imagen',id=>localMediaName(library,id),id=>localMediaSize(library,id),id=>localMediaMime(library,id)).endsWith('\nFormato del archivo: PNG'));assert.equal(JSON.stringify([media,copy]),state);assert.equal(library.size,1);
});
test('el tamaño procede sólo del descriptor propio cargado, sin tocar blob, bytes ni otras referencias',()=>{
  const records=[asset(ref('a'),'Compartida.png','image','image/png'),asset(ref('b'),'Otro.mp4','video','video/mp4')],library=createMediaLibrary(records),calls=[],read={records(ids){calls.push([...ids]);return library.records(ids);}};for(const record of records)Object.defineProperty(record,'blob',{get(){throw Error('No leer blob ni su tamaño');}});
  assert.equal(localMediaSize(read,ref('a')),1);assert.equal(localMediaName(read,ref('a')),'Compartida.png');assert.deepEqual(calls,[[ref('a')],[ref('a')]]);assert.equal(localMediaSize(read,ref('c')),undefined);assert.equal(library.size,2);
  const wrong={records:()=>[{id:ref('b'),name:'No corresponde',size:2000}]};assert.equal(localMediaSize(wrong,ref('a')),undefined);assert.equal(localMediaName(wrong,ref('a')),'');
  for(const size of [undefined,null,'12',NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1,{valueOf(){throw Error('No convertir tamaño');}}])assert.equal(localMediaSize({records:()=>[{id:ref('a'),size}]},ref('a')),undefined);
  for(const value of [0,999,1000,Number.MAX_SAFE_INTEGER])assert.equal(localMediaSize({records:()=>[{id:ref('a'),size:value}]},ref('a')),value);
});
test('la ayuda conserva los detalles y añade tamaño legible y bytes exactos, con cero y límites de unidades, sin modificar datos o DOM',()=>{
  for(const [size,line]of [[0,'0 B'],[1,'1 B'],[999,'999 B'],[1000,'1 kB (1000 B)'],[1234,'1,23 kB (1234 B)'],[999999,'1 MB (999.999 B)'],[1000000,'1 MB (1.000.000 B)'],[2205463,'2,21 MB (2.205.463 B)'],[1000000000,'1 GB (1.000.000.000 B)']])for(const type of ['image','video']){
    const media={...item(type),animation:'rise',duration:1.2,delay:0,hidden:true},before=JSON.stringify(media),prior=componentTooltip(media,'Detalle <img src=x>',()=> 'captura.png'),dom=new JSDOM('<button aria-pressed="true"><strong>Introducción</strong><span>Detalle</span></button>'),button=dom.window.document.querySelector('button'),visible=button.textContent,calls=[];button.title=componentTooltip(media,'Detalle <img src=x>',()=> 'captura.png',id=>{calls.push(id);return size;});
    assert.equal(button.title,prior+'\nTamaño del archivo: '+line);assert.deepEqual(calls,[ref('a')]);assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script').length,0);assert.equal(JSON.stringify(media),before);
  }
  const largest=componentTooltip(item(),'Imagen',()=> 'captura.png',()=>Number.MAX_SAFE_INTEGER);assert.ok(largest.endsWith('Tamaño del archivo: 9,01 PB (9.007.199.254.740.991 B)'));
});
test('referencias remotas, otros tipos, tamaños inválidos o descriptor ausente conservan la ayuda previa sin consultas adicionales',()=>{
  let calls=0;const getSize=()=>{calls++;throw Error('No consultar tamaños');};for(const media of [item('image','https://example.org/a.png'),item('video','ain-local:invalida'),item('text'),item('graphic'),item('background')])assert.equal(componentTooltip(media,'Detalle',()=> 'captura.png',getSize),componentTooltip(media,'Detalle',()=> 'captura.png'));assert.equal(calls,0);
  const media={...item(),animation:'zoom',duration:1.3,delay:.1},before=componentTooltip(media,'Imagen',()=> 'captura.png');assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',getSize),before);
  for(const size of [undefined,null,'12',NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1,{toString(){throw Error('No convertir');}}])assert.equal(componentTooltip(media,'Imagen',()=> 'captura.png',()=>size),before);
});
test('la ayuda muestra tiempos numéricos válidos de todos los presets y tipos, con cero, décimas y límites, sin cambiar datos o atributos accesibles',()=>{
  for(const type of ['text','image','video','graphic','background'])for(const animation of ['fade','rise','zoom','float'])for(const [duration,delay,line]of [[1.2,0,'Duración: 1,2 s · Retraso: 0 s'],[.2,10,'Duración: 0,2 s · Retraso: 10 s'],[10,.5,'Duración: 10 s · Retraso: 0,5 s']]){
    const value={...item(type,'https://example.org/media'),animation,duration,delay,hidden:true},before=JSON.stringify(value),dom=new JSDOM('<button aria-pressed="true"><strong>Introducción</strong><span>Detalle literal &lt;img src=x&gt;</span></button>'),button=dom.window.document.querySelector('button'),visible=button.textContent;
    button.title=componentTooltip(value,'Detalle literal <img src=x>',()=>{throw Error('No consultar archivos remotos');});assert.ok(button.title.startsWith('Introducción\nDetalle literal <img src=x>'));assert.ok(button.title.endsWith('\n'+line));if(type==='image')assert.ok(button.title.includes('\nDescripción de la imagen: Foto del pingüino\n'));
    assert.equal(button.textContent,visible);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.querySelectorAll('img,script').length,0);assert.equal(JSON.stringify(value),before);
  }
  const precise={...item('text',''),animation:'fade',duration:.20000000000000004,delay:.30000000000000004};assert.ok(componentTooltip(precise,'Texto',()=> '').endsWith('Duración: 0,20000000000000004 s · Retraso: 0,30000000000000004 s'));
});
test('animaciones desconocidas o tiempos inválidos conservan la ayuda anterior sin coerción, valores inventados o consultas de bytes',()=>{
  const getName=()=> 'captura.png',base=item(),beforeTitle=componentTooltip(base,'Imagen',getName),object={toString(){throw Error('No convertir tiempos');},valueOf(){throw Error('No convertir tiempos');}};
  for(const animation of ['none','FADE','otro',undefined,null,object])assert.equal(componentTooltip({...base,animation,duration:1.2,delay:0},'Imagen',getName),beforeTitle);
  for(const duration of [undefined,null,'1.2',NaN,Infinity,-1,.199,10.1,true,object])assert.equal(componentTooltip({...base,animation:'fade',duration,delay:0},'Imagen',getName),beforeTitle);
  for(const delay of [undefined,null,'0',NaN,Infinity,-.1,10.1,true,object])assert.equal(componentTooltip({...base,animation:'fade',duration:1.2,delay},'Imagen',getName),beforeTitle);
  const library=createMediaLibrary([asset(ref('a'),'Compartida.png','image','image/png')]),first={...base,animation:'rise',duration:1.2,delay:0},copy={...first,id:'ain-2'},before=JSON.stringify([first,copy]);for(const value of [first,copy])assert.equal(componentTooltip(value,'Imagen · Añadido · Oculto',id=>localMediaName(library,id)),'Introducción\nImagen · Añadido · Oculto\nArchivo local: Compartida.png\nDescripción de la imagen: Foto del pingüino\nDuración: 1,2 s · Retraso: 0 s');assert.equal(JSON.stringify([first,copy]),before);assert.equal(library.size,1);
});
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
