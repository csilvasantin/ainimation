export const MiB=1024*1024;
export const MAX_IMAGE=10*MiB,MAX_VIDEO=50*MiB,MAX_LIBRARY=100*MiB,MAX_PACKAGE=145*MiB;
export const LOCAL_REF=/^ain-local:[a-f0-9]{64}$/;
export const IMAGE_ACCEPT='.png,.jpg,.jpeg,.webp,.gif,.avif';
export const VIDEO_ACCEPT='.mp4,.webm';
export const FILE_ACCEPT=IMAGE_ACCEPT+','+VIDEO_ACCEPT;
const types={'image/png':'image','image/jpeg':'image','image/webp':'image','image/gif':'image','image/avif':'image','video/mp4':'video','video/webm':'video'};
export function sniffMedia(bytes){
  const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
  if(bytes[0]===137&&ascii(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(['GIF87a','GIF89a'].includes(ascii(0,6)))return 'image/gif';
  if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
  if(bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163&&ascii(0,64).includes('webm'))return 'video/webm';
  if(ascii(4,8)==='ftyp'){
    const brands=[];for(let i=8;i+4<=bytes.length;i+=4)if(i!==12)brands.push(ascii(i,i+4));
    if(brands.some(b=>['avif','avis'].includes(b)))return 'image/avif';
    if(brands.some(b=>['isom','iso2','iso4','iso5','iso6','mp41','mp42','avc1','M4V ','dash'].includes(b)))return 'video/mp4';
  }
  throw Error('Formato no compatible. Usa PNG, JPG, WebP, GIF o AVIF para imágenes, y MP4 o WebM para vídeos.');
}
export const mediaType=mime=>types[mime];
export function localReference(value){return typeof value==='string'&&LOCAL_REF.test(value);}
async function digest(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function inspectBrowserMedia(blob,type){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),el=document.createElement(type==='image'?'img':'video');
    let timer;const finish=error=>{clearTimeout(timer);el.onload=el.onerror=el.onloadedmetadata=null;if(type==='video'){el.removeAttribute('src');el.load();}URL.revokeObjectURL(url);error?reject(error):resolve();};
    timer=setTimeout(()=>finish(Error('El archivo tarda demasiado en abrirse. Prueba otro formato.')),15000);
    el.onerror=()=>finish(Error('El navegador no puede abrir este archivo. Prueba una imagen compatible o un vídeo MP4 H.264 / WebM.'));
    if(type==='image')el.onload=()=>finish(el.naturalWidth&&el.naturalHeight?null:Error('La imagen no tiene dimensiones válidas.'));
    else{el.preload='metadata';el.onloadedmetadata=()=>finish(el.videoWidth&&el.videoHeight?null:Error('El archivo no contiene un vídeo reproducible.'));}
    el.src=url;
  });
}
export async function prepareLocalFile(file,{expected,inspect=inspectBrowserMedia}={}){
  if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<=0)throw Error('El archivo está vacío o no se puede leer.');
  if(file.size>MAX_VIDEO)throw Error('El archivo supera 50 MB.');
  const mime=sniffMedia(new Uint8Array(await file.slice(0,64).arrayBuffer())),type=mediaType(mime);
  if(expected&&expected!==type)throw Error(expected==='image'?'Selecciona un archivo de imagen para este componente.':'Selecciona un archivo de vídeo para este componente.');
  if(type==='image'&&file.size>MAX_IMAGE)throw Error('La imagen supera 10 MB.');
  const blob=new Blob([file],{type:mime});await inspect(blob,type);
  return {id:'ain-local:'+await digest(blob),name:String(file.name||'Archivo local').slice(0,200),mime,type,size:blob.size,blob};
}
function descriptor(asset){
  if(!asset||!localReference(asset.id)||!types[asset.mime]||asset.type!==types[asset.mime]||typeof asset.name!=='string'||asset.name.length>200||
    !Number.isInteger(asset.size)||asset.size<1||asset.size>(asset.type==='image'?MAX_IMAGE:MAX_VIDEO)||!(asset.blob instanceof Blob)||asset.blob.size!==asset.size||asset.blob.type!==asset.mime)throw Error('El proyecto contiene un archivo local incompatible.');
}
export function referencedMedia(...projects){return new Set(projects.flatMap(p=>p.items.filter(i=>localReference(i.value)).map(i=>i.value)));}
export function createMediaLibrary(records=[]){
  const assets=new Map();
  function add(records){
    const next=new Map(assets);for(const asset of records){descriptor(asset);next.set(asset.id,asset);}
    if([...next.values()].reduce((n,a)=>n+a.size,0)>MAX_LIBRARY)throw Error('Los archivos locales de esta copia superan 100 MB.');
    for(const asset of records)assets.set(asset.id,asset);
  }
  add(records);
  return {add,get size(){return [...assets.values()].reduce((n,a)=>n+a.size,0);},
    records(refs=new Set(assets.keys())){return [...refs].map(id=>{const a=assets.get(id);if(!a)throw Error('Falta un archivo local del proyecto.');return a;});},
    previewMedia(project){return new Map(this.records(referencedMedia(project)).map(a=>[a.id,{blob:a.blob,type:a.type}]));},
    dispose(){assets.clear();}
  };
}
export async function verifyMediaRecords(records,{inspect=inspectBrowserMedia}={}){
  if(!Array.isArray(records)||records.length>500)throw Error('Lista de archivos incompatible.');
  const library=createMediaLibrary(records);
  if(new Set(records.map(a=>a.id)).size!==records.length)throw Error('El proyecto repite un archivo local.');
  for(const a of records){
    if(sniffMedia(new Uint8Array(await a.blob.slice(0,64).arrayBuffer()))!==a.mime||a.id!=='ain-local:'+await digest(a.blob))throw Error('El archivo local está dañado o no coincide con el proyecto.');
    await inspect(a.blob,a.type);
  }
  return library;
}
export function toDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se ha podido empaquetar el archivo local.'));reader.readAsDataURL(blob);});}
export async function exportMedia(library,refs){
  return Promise.all(library.records(refs).map(async a=>({id:a.id,name:a.name,mime:a.mime,type:a.type,size:a.size,data:await toDataURL(a.blob)})));
}
export async function importMedia(records,options){
  if(!Array.isArray(records)||records.length>500)throw Error('Lista de archivos incompatible.');
  let total=0;const assets=[];
  for(const a of records){
    if(!types[a?.mime]||a.type!==types[a.mime]||!Number.isInteger(a.size)||a.size<1||a.size>(a.type==='image'?MAX_IMAGE:MAX_VIDEO))throw Error('Tamaño o tipo de archivo local incompatible.');
    total+=a.size;if(total>MAX_LIBRARY)throw Error('Los archivos locales superan 100 MB.');
    const prefix='data:'+a.mime+';base64,';
    if(typeof a.data!=='string'||!a.data.startsWith(prefix))throw Error('Archivo local incompatible.');
    const base64=a.data.slice(prefix.length);
    if(base64.length!==4*Math.ceil(a.size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('El archivo local está dañado.');
    const binary=atob(base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes.length!==a.size)throw Error('El archivo local está incompleto.');
    const {data,...meta}=a;assets.push({...meta,blob:new Blob([bytes],{type:a.mime})});
  }
  return verifyMediaRecords(assets,options);
}
export async function exportMediaURLs(library,project){
  const records=await exportMedia(library,referencedMedia(project));return new Map(records.map(a=>[a.id,{url:a.data,type:a.type}]));
}
