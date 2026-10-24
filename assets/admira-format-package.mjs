import {portableProject, catalogueVersion} from './admira-roundtrip.mjs';
import {inspectDirector, inspectStructured, checkResources, probeMedia, openPublicationReview} from './admira-preflight.mjs';
import {fetchResourceIndex} from './admira-resource-updates.mjs';

export const FORMATS = Object.freeze([
  {id:'horizontal',label:'Horizontal',w:1920,h:1080},
  {id:'vertical',label:'Vertical',w:1080,h:1920},
  {id:'tactil',label:'Pantalla táctil',w:768,h:1024},
]);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const structured=plan=>plan.format==='ainimation-interactive';
const inspect=(plan,compileScripts)=>structured(plan)?inspectStructured(plan):inspectDirector(plan,{compileScripts});
export function createPackage(source,id=crypto.randomUUID()) {
  if(!/^[a-z0-9-]{8,60}$/i.test(id))throw Error('Identidad de paquete no válida.');
  return {schema:'admira.format-package.v1',id,tag:'paquete-'+id,title:source.title||'Creación de Admira',source:structuredClone(source),createdAt:new Date().toISOString(),variants:FORMATS.map(format=>{
    const plan=structuredClone(source),output=format.id==='tactil'?'interactive':source.admiraOutput==='interactive'||source.interactiveSource||structured(source)?'interactive':'video';
    plan.stage={...plan.stage,w:format.w,h:format.h};plan.admiraOutput=output;if(structured(plan))plan.orientation=format.id==='horizontal'?'landscape':'portrait';
    plan.admiraPackage={id,format:format.id,title:source.title||'Creación de Admira',formats:FORMATS.map(x=>x.id)};
    return {...format,output,plan,state:'pending',receipt:null};
  })};
}
export function packageManifest(record) {
  return {schema:record.schema,id:record.id,title:record.title,tag:record.tag,createdAt:record.createdAt,complete:record.variants.every(v=>v.receipt),versions:record.variants.map(v=>({format:v.id,width:v.w,height:v.h,output:v.output,state:v.state,...(v.receipt?{id:v.receipt.id,url:v.receipt.url,editorProjectUrl:v.receipt.editorProjectUrl,catalogueUrl:catalogueVersion(record.source.admiraEdit,v.receipt)}:{})}))};
}
export function packageStore(db=indexedDB) {
  const connection=new Promise((resolve,reject)=>{const req=db.open('ainimation-admira-format-packages',1);req.onupgradeneeded=()=>req.result.createObjectStore('packages');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('No se puede abrir la recuperación del paquete.'));});
  const read=async key=>{const database=await connection;return new Promise((resolve,reject)=>{const request=database.transaction('packages').objectStore('packages').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});};
  return {get:read,async list(){const database=await connection;return new Promise((resolve,reject)=>{const request=database.transaction('packages').objectStore('packages').getAll();request.onsuccess=()=>resolve(request.result.filter(x=>x?.schema==='admira.format-package.v1'));request.onerror=()=>reject(request.error);});},async load(){const id=await read('_active');return id?read(id):null;},async save(record){const database=await connection;await new Promise((resolve,reject)=>{const tx=database.transaction('packages','readwrite'),table=tx.objectStore('packages');table.put(record,record.id);table.put(record.id,'_active');tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('No se puede guardar la recuperación del paquete. Libera espacio antes de publicar.'));});},async close(){(await connection).close();}};
}
export async function preparePackage(record,{build,capture,compileScripts,probe=probeMedia,signal,onProgress=()=>{}}) {
  const portable=await portableProject(record.source,structured(record.source)?'interactive':'director');
  for(const variant of record.variants){
    if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
    const plan=structuredClone(portable.plan);plan.stage=variant.plan.stage;plan.admiraOutput=variant.output;plan.admiraPackage=variant.plan.admiraPackage;if(structured(plan))plan.orientation=variant.plan.orientation;
    variant.editorProject={...portable,plan};
    const inspection=inspect(plan,compileScripts);
    if(inspection.issues.some(x=>x.level==='error'))throw Error(variant.label+': '+inspection.issues.filter(x=>x.level==='error').map(x=>x.message).join(' '));
    const checked=await checkResources(inspection.resources,probe,{signal});
    if(checked.some(x=>!x.ok))throw Error(variant.label+': falla el recurso '+checked.find(x=>!x.ok).name+'. No se ha publicado ninguna versión.');
    onProgress('Preparando '+variant.label+' · '+variant.w+' × '+variant.h+'…');
    if(variant.output==='interactive'){
      const result=await build(plan);if(!result?.exportedHtml||result.dropped?.length)throw Error('No se han podido conservar todos los recursos de '+variant.label+'.');
      variant.artifact={html:result.exportedHtml,blob:new Blob([result.exportedHtml],{type:'text/html'})};
    }else variant.artifact={blob:await capture(plan,{signal})};
    if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
    if(!variant.artifact.blob?.size)throw Error('La entrega '+variant.label+' está vacía.');
    variant.state='prepared';
  }
  return record;
}
export async function publishPackage(record,{save,send,reconcile,getCurrent,snapshot,onProgress=()=>{}}) {
  for(const variant of record.variants){
    if(variant.receipt)continue;
    if(!same(getCurrent(),snapshot))throw Error('El proyecto ha cambiado. Reabre el paquete y revisa sus entregas.');
    if(variant.state==='sending'){
      const recovered=await reconcile(record,variant);
      if(!recovered)throw Error('No se puede confirmar el envío de '+variant.label+'. Comprueba el catálogo antes de repetirlo. No se reenviará automáticamente.');
      catalogueVersion(record.source.admiraEdit,recovered);variant.receipt=recovered;variant.state='published';await save(record);continue;
    }
    const previousState=variant.state;variant.state='sending';try{await save(record);}catch(error){variant.state=previousState;throw error;}onProgress('Publicando '+variant.label+'…');
    let receipt;try{receipt=await send(record,variant);}catch(error){if(error.confirmedRejected){variant.state='prepared';await save(record);}throw error;}
    catalogueVersion(record.source.admiraEdit,receipt);
    variant.receipt=receipt;variant.state='published';await save(record);
  }
  return packageManifest(record);
}
export async function sendVariant(record,variant,request=fetch) {
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(variant.artifact.blob);});
  const body={type:'animation',motor:'ainimation',title:record.title+' · '+variant.label,prompt:'ainimation.studio · '+record.tag,comment:'Paquete '+record.id+' · '+variant.label+' · '+variant.w+' × '+variant.h,tags:['ainimation',record.tag,variant.id,variant.output],mime:variant.artifact.blob.type,base64,editorProject:variant.editorProject,...(record.source.admiraEdit?.id?{externalRef:record.source.admiraEdit.id}:{})};
  const response=await request('https://api.admira.store/stock/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  const result=await response.json();if(!response.ok||!result.ok){const error=Error(result.error||'Admira no ha confirmado '+variant.label+'.');error.confirmedRejected=response.status>=400&&response.status<500;throw error;}return result;
}
export async function reconcileVariant(record,variant,request=fetch){
  const items=await fetchResourceIndex(request);
  const matches=items.filter(x=>x.tags?.includes(record.tag)&&x.tags.includes(variant.id)&&x.editorProjectUrl);
  if(matches.length!==1)return null;
  return {ok:true,...matches[0]};
}

// The recorder runs in an isolated copy of Studio, with its own in-memory storage.
// No format change, timeline movement or persistence reaches the author's project.
export async function captureVariant(plan,{signal}={}) {
  const response=await fetch(new URL('studio.html',location.href),{signal});if(!response.ok)throw Error('No se puede abrir el grabador de formatos.');
  const html=await response.text(),frame=document.createElement('iframe');frame.title='Grabación de la versión';frame.inert=true;frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-20000px;top:0;width:1440px;height:1000px;border:0;';
  const seed={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);seed[key]=localStorage.getItem(key);}seed['ainimation-film-plan']=JSON.stringify(plan);seed['ainimation-timeline-markers']=JSON.stringify(plan.markers||[]);
  const isolation='<base href="'+new URL('.',location.href).href+'"><script>Object.defineProperty(window,"localStorage",{value:(()=>{const data='+JSON.stringify(seed).replace(/</g,'\\u003c')+';return{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k],clear:()=>Object.keys(data).forEach(k=>delete data[k]),key:i=>Object.keys(data)[i]??null,get length(){return Object.keys(data).length}}})()});<\/script>';
  let abort;try{
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('El grabador no responde.')),30000);const finish=fn=>value=>{clearTimeout(timeout);fn(value);};abort=finish(()=>reject(new DOMException('Cancelado','AbortError')));signal?.addEventListener('abort',abort,{once:true});frame.onload=finish(resolve);frame.onerror=finish(()=>reject(Error('No se puede cargar el grabador.')));frame.srcdoc=html.replace(/<head[^>]*>/i,match=>match+isolation);document.body.append(frame);if(signal?.aborted)abort();});
    const studio=frame.contentWindow;if(!studio.getStageAnimationCapture)throw Error('El grabador no está disponible.');
    studio.ainStageSize.set(plan.stage.w,plan.stage.h);studio.renderFilmPlan(studio.currentPlan());
    const fps=studio.document.querySelector('[data-score-fps]');if(fps)fps.dataset.value=String(plan.packageFps||24);
    await Promise.all([...studio.document.querySelectorAll('.stage-imported-member img,.stage-imported-member video')].map(media=>new Promise((resolve,reject)=>{if(media.tagName==='IMG'?media.complete&&media.naturalWidth:media.readyState>=2){resolve();return;}const timer=setTimeout(()=>reject(Error('No se ha cargado un recurso en el grabador.')),10000);media.addEventListener(media.tagName==='IMG'?'load':'loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});media.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Falla un recurso en el grabador.'));},{once:true});})));
    return await studio.getStageAnimationCapture(undefined,signal);
  }finally{signal?.removeEventListener('abort',abort);frame.remove();}
}

export async function openFormatPackage({getPlan,build,compileScripts,capture=captureVariant,storage=packageStore(),send=sendVariant,reconcile=reconcileVariant}){
  if(document.querySelector('.admira-format-package'))return;
  const snapshot=structuredClone(getPlan()),dialog=document.createElement('dialog');dialog.className='admira-format-package';dialog.style.cssText='width:min(880px,94vw);max-height:90svh;overflow:auto;padding:24px;background:#101923;color:#edf4f8;border:1px solid #658175;border-radius:12px;font:15px system-ui';
  const css=document.createElement('style');css.textContent='.admira-format-package h2{margin:0 0 12px;font:700 24px/1.2 system-ui;letter-spacing:0}.admira-format-package button,.admira-format-package select{font:14px system-ui;padding:10px 14px;border:1px solid #658175;border-radius:6px;background:#1b2b38;color:#edf4f8;cursor:pointer}.admira-format-package button:disabled{opacity:.5;cursor:default}.admira-format-package a{color:#b8ee77;text-decoration:underline}.admira-format-package p{line-height:1.5;overflow-wrap:anywhere}.admira-format-package details{margin:14px 0}.admira-format-package details select{max-width:100%;margin:10px 8px 10px 0}';dialog.append(css);
  const title=document.createElement('h2');title.textContent='Paquete para Admira';
  const explanation=document.createElement('p');explanation.textContent='Tres entregas de la misma creación. Las posiciones y duraciones se mantienen en proporción al formato; revisa el encuadre y las acciones de cada una. La versión táctil siempre será interactiva.';
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=document.createElement('ul'),prepare=document.createElement('button'),publish=document.createElement('button'),download=document.createElement('button'),close=document.createElement('button');prepare.textContent='Preparar las tres versiones';publish.textContent='Publicar paquete en Admira';download.textContent='Descargar manifiesto del paquete';close.textContent='Volver al editor';publish.disabled=true;download.disabled=true;
  const history=document.createElement('details'),historyTitle=document.createElement('summary'),historySelect=document.createElement('select'),recover=document.createElement('button');historyTitle.textContent='Paquetes guardados en este navegador';historySelect.setAttribute('aria-label','Paquete guardado');recover.textContent='Recuperar paquete elegido';history.append(historyTitle,historySelect,recover);history.hidden=true;
  const controls=document.createElement('footer');controls.style.cssText='display:flex;gap:12px;flex-wrap:wrap';controls.append(prepare,publish,download,close);dialog.append(title,explanation,status,history,list,controls);document.body.append(dialog);dialog.showModal();
  const controller=new AbortController(),reviewed=new Set();let record=null,busy=false,storageUnavailable=false,preparing=false;
  const setStatus=message=>status.textContent=message;
  const unchanged=()=>same(getPlan(),snapshot);
  const refresh=()=>{
    list.replaceChildren();
    for(const variant of record?.variants||FORMATS){const row=document.createElement('li');row.style.margin='16px 0';row.textContent=variant.label+' · '+variant.w+' × '+variant.h+(variant.output?' · '+(variant.output==='video'?'Vídeo':'Interactivo'):'');
      if(variant.receipt){const link=document.createElement('a');link.href=catalogueVersion(record.source.admiraEdit,variant.receipt);link.textContent='Ver en Admira';link.style.marginLeft='12px';row.append(' · Guardada ',link);}else if(variant.artifact){const button=document.createElement('button');button.textContent=reviewed.has(variant.id)?'Revisar de nuevo':'Revisar '+variant.label;button.disabled=busy;button.style.marginLeft='12px';button.onclick=async()=>{busy=true;refresh();try{const inspection=inspect(variant.editorProject.plan,compileScripts);const review=await openPublicationReview({snapshot,getCurrent:getPlan,inspection,kind:variant.output,formats:[[variant.label,variant.w,variant.h]],heading:'Revisar '+variant.label,confirmLabel:'Aprobar esta versión',makePreview:async()=>variant.artifact});if(review){reviewed.add(variant.id);review.close();}}catch(error){setStatus(error.message);}finally{busy=false;refresh();}};row.append(' · '+(reviewed.has(variant.id)?'Revisada':'Pendiente de revisión')+' ',button);}list.append(row);}
    const complete=record?.variants.every(v=>v.receipt);publish.disabled=busy||!record||complete||!unchanged()||!record.variants.every(v=>v.receipt||reviewed.has(v.id));prepare.disabled=storageUnavailable||busy;recover.disabled=busy;close.disabled=busy&&!preparing;close.textContent=preparing?'Cancelar preparación':'Volver al editor';download.disabled=!record;publish.textContent=record?.variants.some(v=>v.receipt)?'Continuar publicación del paquete':'Publicar paquete en Admira';if(complete)setStatus('Paquete completo: las tres versiones están guardadas en Admira.');
  };
  const dispose=()=>{if(busy)return;controller.abort();dialog.remove();storage.close?.();};const cancel=()=>{if(preparing){controller.abort();setStatus('Cancelando la preparación…');}else dispose();};close.onclick=cancel;dialog.oncancel=event=>{event.preventDefault();cancel();};
  const loadHistory=async()=>{if(!storage.list)return;const records=await storage.list();historySelect.replaceChildren(...records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>{const option=document.createElement('option');option.value=r.id;option.textContent=r.title+' · '+new Date(r.createdAt).toLocaleString()+' · '+r.variants.filter(v=>v.receipt).length+'/3 guardadas';return option;}));history.hidden=!records.length;};
  recover.onclick=async()=>{if(busy)return;busy=true;refresh();try{record=await storage.get(historySelect.value);if(!record)throw Error('No se encuentra ese paquete en este navegador.');reviewed.clear();setStatus('Paquete recuperado de «'+record.title+'». Revisa las entregas pendientes antes de continuar.');}catch(error){setStatus(error.message);}finally{busy=false;refresh();}};
  const runPrepare=async()=>{busy=true;preparing=true;refresh();try{const candidate=createPackage(snapshot);await preparePackage(candidate,{build,capture,compileScripts,signal:controller.signal,onProgress:setStatus});if(!unchanged())throw Error('El proyecto ha cambiado. Vuelve a abrir el paquete.');await storage.save(candidate);record=candidate;await loadHistory();setStatus('Tres versiones preparadas. Revisa y aprueba cada entrega antes de publicar.');}catch(error){setStatus('No se ha preparado el paquete: '+error.message);}finally{busy=false;preparing=false;if(controller.signal.aborted)dispose();else refresh();}};prepare.onclick=()=>{record=null;reviewed.clear();void runPrepare();};
  publish.onclick=async()=>{if(publish.disabled)return;busy=true;refresh();try{if(!navigator.locks)throw Error('Este navegador no permite proteger el envío entre pestañas. Usa una versión reciente de Chrome, Safari o Firefox.');await navigator.locks.request('admira-format-package:'+record.id,{ifAvailable:true},async lock=>{if(!lock)throw Error('Este paquete se está publicando en otra pestaña.');const latest=storage.get?await storage.get(record.id):await storage.load();if(latest?.id===record.id)record=latest;await publishPackage(record,{save:value=>storage.save(value),send,reconcile,getCurrent:getPlan,snapshot,onProgress:setStatus});});}catch(error){setStatus('Publicación detenida: '+error.message+' Las versiones confirmadas se conservan. Puedes cerrar y recuperar este paquete.');}finally{busy=false;refresh();await loadHistory();}};
  download.onclick=()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(packageManifest(record),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=record.tag+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  try{const previous=await storage.load();if(previous&&!previous.variants.every(v=>v.receipt)){prepare.textContent='Preparar paquete nuevo';if(!storage.list){prepare.textContent='Recuperar paquete pendiente: '+previous.title;prepare.onclick=()=>{record=previous;setStatus('Paquete recuperado de «'+record.title+'». Revisa las entregas pendientes antes de continuar.');refresh();};}setStatus('Hay un paquete pendiente guardado en este navegador. Se conservan sus archivos y versiones confirmadas.');}else{if(previous){record=previous;prepare.textContent='Preparar otro paquete';}setStatus('Prepara horizontal, vertical y táctil sin modificar la creación abierta.');}}catch(error){setStatus(error.message);storageUnavailable=true;}
  if(!storageUnavailable)await loadHistory();
  dialog.addEventListener('focusin',()=>{if(!unchanged()){publish.disabled=true;setStatus('El proyecto ha cambiado. Cierra y vuelve a abrir el paquete.');}});refresh();
}
