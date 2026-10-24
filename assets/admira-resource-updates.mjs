import {resource} from './admira-resource-batch.mjs';
import {checkResources,probeMedia} from './admira-preflight.mjs';
export const UPDATE_BACKUP='ainimation:before-admira-resource-update';
const ID=/^[A-Za-z0-9-]{1,160}$/;
const kind=value=>value==='animation'?'video':['music','locucion'].includes(value)?'audio':value;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function urlId(value){try{const u=new URL(value);if(!['api.admira.store','stock.admira.store'].includes(u.hostname)||u.protocol!=='https:')return null;return u.pathname.match(/^\/stock\/asset\/([A-Za-z0-9-]+)$/)?.[1]||u.pathname.match(/^\/stock\/([A-Za-z0-9-]+)\/asset\.[a-z0-9]+$/i)?.[1]||null;}catch{return null;}}
function sameUrl(a,b){try{const x=new URL(a),y=new URL(b);x.hash=y.hash='';x.search=y.search='';return x.href===y.href;}catch{return false;}}
export function memberStockId(member,plan,items){
 const src=member.src||member.sourceUrl;if(!src)return null;
 const embedded=urlId(src);if(embedded)return embedded;
 const matches=items.filter(item=>item&&sameUrl(item.url,src)),known=matches.length===1?matches[0]:null;
 if(ID.test(member.stockId||'')&&(known?.id===member.stockId||sameUrl(items.find(i=>i?.id===member.stockId)?.url,src)))return member.stockId;
 if(known&&ID.test(known.id))return known.id;
 const provenance=(plan.admiraSources||[]).find(item=>sameUrl(item.url,src));return ID.test(provenance?.id||'')?provenance.id:null;
}
function lineage(id,index){const ids=new Set();let current=id;while(ID.test(current||'')&&!ids.has(current)){ids.add(current);const item=index.get(current);if(ID.test(item?.versionRoot||''))ids.add(item.versionRoot);if(!item?.externalRef||item.externalRef===current)break;current=item.externalRef;}return ids;}
function isFamily(a,b,index){const left=lineage(a,index),right=lineage(b,index);return [...left].some(id=>right.has(id));}
export function findResourceUpdates(plan,items){
 if(!Array.isArray(items))throw Error('El índice de Admira no es válido.');
 const index=new Map(items.filter(i=>ID.test(i?.id||'')).map(item=>[item.id,item])),groups=new Map(),unlinked=[];
 (plan.cast||[]).forEach((member,castIndex)=>{if(!member.src)return;const id=memberStockId(member,plan,items);if(!id){if(member.stock||member.stockId)unlinked.push({castIndex,name:member.name||'Recurso',reason:'No se puede verificar su vínculo con Stock.'});return;}if(!groups.has(id))groups.set(id,{id,name:member.name||id,current:index.get(id)||{id,url:member.src,title:member.name,type:member.mediaType},uses:[],candidates:[],incompatible:0});groups.get(id).uses.push(castIndex);});
 for(const group of groups.values()){
  const types=new Set(group.uses.map(i=>kind(plan.cast[i].mediaType)));
  for(const item of items){if(!item||item.id===group.id||item.oculto||!isFamily(group.id,item.id,index)||lineage(group.id,index).has(item.id))continue;const currentTime=Date.parse(group.current.createdAt),nextTime=Date.parse(item.createdAt);if(Number.isFinite(currentTime)&&Number.isFinite(nextTime)&&nextTime<=currentTime)continue;try{const candidate=resource(item);if(types.size!==1||!types.has(candidate.type)){group.incompatible++;continue;}group.candidates.push({...item,...candidate});}catch{group.incompatible++;}}
  group.candidates.sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)||a.id.localeCompare(b.id));
 }
 return{groups:[...groups.values()],unlinked};
}
export function replaceResourceVersions(plan,items,selections){
 const snapshot=structuredClone(plan),{groups}=findResourceUpdates(snapshot,items);let changed=0;const replacements=new Map();
 for(const [oldId,newId]of Object.entries(selections)){
  if(!newId)continue;const group=groups.find(g=>g.id===oldId),candidate=group?.candidates.find(x=>x.id===newId);
  if(!group||!candidate)throw Error('La versión elegida ya no corresponde a este recurso. Revisa la selección.');
  for(const i of group.uses){const old=snapshot.cast[i];snapshot.cast[i]={...old,src:candidate.url,sourceUrl:candidate.url,stockId:candidate.id,sourceWidth:candidate.width,sourceHeight:candidate.height,sourceDuration:candidate.duration,aspectRatio:candidate.width&&candidate.height?candidate.width/candidate.height:null,aspectPending:false,durationPending:false,thumbnail:'',poster:null,stockVersionTitle:candidate.title};}
  replacements.set(oldId,candidate);changed++;
 }
 if(!changed)throw Error('Elige al menos una versión para sustituir.');
 const sources=(snapshot.admiraSources||[]).map(source=>{const next=replacements.get(source.id);return next?{...source,id:next.id,url:next.url}:source;});
 for(const candidate of replacements.values())if(!sources.some(x=>x.id===candidate.id))sources.push({id:candidate.id,url:candidate.url});
 snapshot.admiraSources=[...new Map(sources.map(source=>[source.id,source])).values()];
 return snapshot;
}
export async function fetchResourceIndex(request=fetch,signal){
 let response;try{response=await request('https://stock.admira.store/stock/index.json?resourceUpdates='+Date.now(),{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});}catch(error){if(signal?.aborted)throw error;throw Error('El catálogo de Admira no responde. Reintenta sin cerrar el proyecto.');}
 if(!response.ok)throw Error('No se puede consultar el catálogo de Admira. Reintenta sin cerrar el proyecto.');
 const text=await response.text();if(text.length>32*1024*1024)throw Error('El índice es demasiado grande para revisarlo en esta sesión.');
 let data;try{data=JSON.parse(text);}catch{throw Error('El índice de Admira no se ha podido leer.');}
 const items=Array.isArray(data)?data:data.items;if(!Array.isArray(items))throw Error('El índice de Admira no contiene recursos válidos.');return items;
}
export async function applyResourceUpdates({snapshot,items,selections,getPlan,savePlan,storage,probe=probeMedia,signal}){
 if(!equal(getPlan(),snapshot))throw Error('El proyecto ha cambiado. Abre una comparación nueva antes de sustituir.');
 const next=replaceResourceVersions(snapshot,items,selections),selectedIds=new Set(Object.values(selections).filter(Boolean));
 const candidates=findResourceUpdates(snapshot,items).groups.flatMap(g=>g.candidates).filter(c=>selectedIds.has(c.id));
 const results=await checkResources(candidates.map(c=>({name:c.title,src:c.url,type:c.type})),probe,{signal});
 if(results.some(r=>!r.ok))throw Error('No se ha sustituido ningún recurso: '+results.filter(r=>!r.ok).map(r=>r.name+' · '+r.error).join('; '));
 if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
 if(!equal(getPlan(),snapshot))throw Error('El proyecto ha cambiado durante la comprobación. Conserva los cambios y vuelve a comparar.');
 const previous=storage.getItem(UPDATE_BACKUP),record=JSON.stringify({version:1,before:snapshot,after:next});
 try{storage.setItem(UPDATE_BACKUP,record);}catch{throw Error('No hay espacio para guardar la copia anterior. Exporta el proyecto o libera espacio antes de sustituir.');}
 try{savePlan(next);if(!equal(getPlan(),next))throw Error('El proyecto no ha confirmado el guardado de la sustitución.');}
 catch(error){if(previous===null)storage.removeItem(UPDATE_BACKUP);else storage.setItem(UPDATE_BACKUP,previous);savePlan(snapshot);throw error;}
 return next;
}
export function undoResourceUpdate({getPlan,savePlan,storage}){
 let record;try{record=JSON.parse(storage.getItem(UPDATE_BACKUP));}catch{}
 if(record?.version!==1||!record.before||!record.after)throw Error('No hay una sustitución guardada para deshacer.');
 if(!equal(getPlan(),record.after))throw Error('El proyecto ha cambiado desde la sustitución. Usa el historial de edición para deshacer esos cambios sin perderlos.');
 savePlan(record.before);storage.removeItem(UPDATE_BACKUP);return record.before;
}

export async function openResourceUpdates({getPlan,savePlan,refreshPlan=()=>{},storage=localStorage,request=fetch,probe=probeMedia}){
 if(document.querySelector('.admira-resource-updates'))throw Error('Ya hay una comparación de recursos abierta.');
 const snapshot=structuredClone(getPlan()),previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='admira-resource-updates';dialog.setAttribute('aria-labelledby','resource-updates-title');
 const style=document.createElement('style');style.textContent='.admira-resource-updates{width:min(1040px,96vw);max-height:94svh;overflow:auto;padding:20px;background:#101923;color:#eef5fa;border:1px solid #658175;border-radius:12px;font:14px system-ui}.admira-resource-updates::backdrop{background:#000b}.admira-resource-updates h2{font:700 24px/1.2 system-ui;margin:0}.admira-resource-updates header,.admira-resource-updates footer{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.admira-resource-updates header h2{flex:1}.admira-resource-updates button{padding:10px 14px;cursor:pointer}.admira-resource-updates section{margin:16px 0;padding:14px;border:1px solid #52667a;border-radius:8px}.resource-update-list{max-height:60svh;overflow:auto;margin:8px 0}.admira-resource-updates footer{padding-top:12px}.admira-resource-updates h3{font:700 16px/1.3 system-ui;margin:0 0 12px}.admira-resource-updates select{display:block;width:100%;padding:8px;margin:8px 0}.resource-update-compare{display:grid;grid-template-columns:1fr 1fr;gap:16px}.resource-update-compare figure{min-width:0;margin:0}.resource-update-compare img,.resource-update-compare video{display:block;width:100%;height:180px;object-fit:contain;background:#05090d}.resource-update-compare audio{width:100%}.admira-resource-updates [data-warning]{color:#ffe19b}.admira-resource-updates [role=status]{font-weight:700}@media(max-width:600px){.resource-update-compare{grid-template-columns:1fr}}';
 const header=document.createElement('header'),heading=document.createElement('h2'),cancel=document.createElement('button');heading.id='resource-updates-title';heading.textContent='Comparar versiones de recursos de Admira';cancel.type='button';cancel.textContent='Volver al editor';header.append(heading,cancel);
 const intro=document.createElement('p');intro.textContent='Elige qué versiones sustituir. Se conservan posición, tamaño, fotogramas, keyframes, nombres de sprites y acciones. Los recursos del catálogo no se modifican.';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Buscando versiones vinculadas en el catálogo…';const body=document.createElement('div'),apply=document.createElement('button');body.className='resource-update-list';apply.type='button';apply.textContent='Sustituir recursos elegidos';apply.disabled=true;const footer=document.createElement('footer');footer.append(apply);dialog.append(style,header,intro,status,body,footer);document.body.append(dialog);dialog.showModal();
 const controller=new AbortController();let checking=false,items=[],selections={};
 const close=()=>{if(checking)return;controller.abort();dialog.querySelectorAll('audio,video').forEach(m=>{m.pause();m.removeAttribute('src');m.load();});dialog.remove();previous?.focus?.({preventScroll:true});};cancel.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 const update=()=>{const count=Object.values(selections).filter(Boolean).length;apply.textContent=count?`Sustituir ${count} recurso${count===1?'':'s'}`:'Sustituir recursos elegidos';apply.disabled=checking||!count||!equal(getPlan(),snapshot);if(!checking&&!equal(getPlan(),snapshot))status.textContent='El proyecto ha cambiado. Vuelve al editor y abre una comparación nueva.';};
 function preview(parent,item,type){parent.replaceChildren();if(!item){const p=document.createElement('p');p.textContent='Elige una versión para compararla.';parent.append(p);return;}
  const title=document.createElement('figcaption');title.textContent=String(item.title||item.id||'Recurso');const media=document.createElement(type==='image'?'img':type);media.crossOrigin='anonymous';if(type!=='image'){media.controls=true;media.preload='metadata';media.muted=type==='video';}else{media.alt=title.textContent;media.loading='lazy';}media.src=item.url;const info=document.createElement('p');info.textContent=[item.id,item.width&&item.height?item.width+' × '+item.height:'',type!=='image'&&item.duration?item.duration+' s':''].filter(Boolean).join(' · ');const error=document.createElement('p');error.dataset.warning='';media.onerror=()=>{error.textContent='No se puede cargar esta vista. La sustitución volverá a comprobar el recurso elegido.';};parent.append(title,media,info,error);
 }
 try{
  items=await fetchResourceIndex(request,controller.signal);if(controller.signal.aborted)return dialog;const{groups,unlinked}=findResourceUpdates(snapshot,items);
  let count=0;
  for(const group of groups){
   const section=document.createElement('section');section.dataset.resourceId=group.id;const h=document.createElement('h3');h.textContent=group.name+' · '+group.uses.length+' uso'+(group.uses.length===1?'':'s');section.append(h);const currentLabel=document.createElement('p');currentLabel.textContent='Actual: '+(group.current.title||group.name)+' · '+group.id;section.append(currentLabel);
   if(!group.candidates.length){const p=document.createElement('p');p.textContent=group.incompatible?'Las versiones vinculadas encontradas no son compatibles con el tipo de este recurso.':'No hay otras versiones vinculadas disponibles para sustituirlo.';section.append(p);body.append(section);continue;}
   count++;const label=document.createElement('label');label.textContent='Versión para '+group.name;const select=document.createElement('select');select.dataset.sourceId=group.id;const keep=document.createElement('option');keep.value='';keep.textContent='Mantener el recurso actual';select.append(keep);for(const candidate of group.candidates){const option=document.createElement('option');option.value=candidate.id;const date=Date.parse(candidate.createdAt);option.textContent=candidate.title+' · '+(Number.isFinite(date)?new Date(date).toLocaleString('es-ES'):'fecha no informada')+' · '+candidate.id;select.append(option);}label.append(select);section.append(label);
   const comparison=document.createElement('div');comparison.className='resource-update-compare';const current=document.createElement('figure'),next=document.createElement('figure');current.setAttribute('aria-label','Recurso actual');next.setAttribute('aria-label','Nueva versión');comparison.append(current,next);section.append(comparison);const oldMember=snapshot.cast[group.uses[0]],type=kind(oldMember.mediaType);preview(current,{...group.current,url:oldMember.src},type);preview(next,null,type);
   const montage=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Montaje que se conservará';montage.append(summary);for(const i of group.uses){const member=snapshot.cast[i],p=document.createElement('p');p.textContent=`${member.name||'Uso '+(i+1)} · inicio ${member.startFrame||1} · duración ${member.durationFrames||24} fotogramas · posición ${member.stageX??member.x??'actual'}, ${member.stageY??member.y??'actual'} · ${member.keyframes?.length||0} keyframes`;montage.append(p);}section.append(montage);const note=document.createElement('p');note.dataset.warning='';section.append(note);
   select.onchange=()=>{selections[group.id]=select.value;const candidate=group.candidates.find(c=>c.id===select.value);preview(next,candidate,type);const shorter=type!=='image'&&candidate?.duration&&group.uses.some(i=>snapshot.cast[i].durationFrames/24>candidate.duration);note.textContent=shorter?'El nuevo clip es más corto que algún tramo utilizado. Se conserva su duración en el montaje; revisa la reproducción antes de publicar.':'';update();};body.append(section);
  }
  for(const entry of unlinked){const p=document.createElement('p');p.textContent=entry.name+' · '+entry.reason;body.append(p);}
  status.textContent=groups.length?`${count} recurso${count===1?'':'s'} con versiones compatibles. No se sustituye nada hasta que lo elijas y apliques.`:'Este proyecto no tiene recursos vinculados verificables de Admira. Importa sus materiales desde el catálogo para poder comparar versiones.';
 }catch(error){if(!controller.signal.aborted)status.textContent=error.message;}
 apply.onclick=async()=>{update();if(apply.disabled)return;checking=true;apply.disabled=true;cancel.disabled=true;dialog.querySelectorAll('select').forEach(s=>s.disabled=true);status.textContent='Comprobando los archivos nuevos antes de sustituir…';
  try{const next=await applyResourceUpdates({snapshot,items,selections,getPlan,savePlan,storage,probe,signal:controller.signal});checking=false;close();refreshPlan(next,{type:'applied',count:Object.values(selections).filter(Boolean).length});return next;}catch(error){status.textContent=error.message;checking=false;cancel.disabled=false;dialog.querySelectorAll('select').forEach(s=>s.disabled=false);update();}
 };
 return dialog;
}
