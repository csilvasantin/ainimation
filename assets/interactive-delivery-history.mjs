// Local delivery metadata only. Project contents and credentials never enter this store.
export const DELIVERY_HISTORY_KEY='ainimation:interactive:delivery-history:v1';
const MAX_BATCHES=30,MAX_RESULTS=100;
const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('invalid_history');return value;};
const date=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('invalid_history');return new Date(value).toISOString();};
export function deliveryHistoryUrl(value,locationId,screenId){
 const u=new URL(value);if(u.origin!=='https://www.admira.store'||u.username||u.password||u.hash||!['/admira-xp/','/xpacios/pantalla/'].includes(u.pathname)||u.searchParams.get('loc')!==locationId||!/^[a-f0-9]{64}$/.test(u.searchParams.get('ainimation')||''))throw Error('invalid_history_url');
 if(u.pathname==='/xpacios/pantalla/'&&u.searchParams.get('screen')!==screenId)throw Error('invalid_history_url');
 if(u.pathname==='/admira-xp/'&&(locationId!=='alsea-sbux-021'||!['starbucks-avatar-wall','starbucks-ipad-01'].includes(screenId)))throw Error('invalid_history_url');
 for(const key of u.searchParams.keys())if(!['loc','screen','ainimation','lang','project','circuit','quality'].includes(key)||u.searchParams.getAll(key).length!==1)throw Error('invalid_history_url');
 return u.href;
}
function cleanBatch(input){
 const id=text(input.id,80),projectId=text(input.projectId,80),projectTitle=text(input.projectTitle,80),revision=input.revision;
 if(!/^[a-zA-Z0-9-]+$/.test(id)||!Number.isSafeInteger(revision)||revision<1||!Array.isArray(input.results)||!input.results.length||input.results.length>MAX_RESULTS)throw Error('invalid_history');
 const seen=new Set(),results=input.results.map(r=>{
  const locationId=text(r.locationId,160),screenId=text(r.screenId,160),key=JSON.stringify([locationId,screenId]);if(seen.has(key)||!['pending','sending','success','error'].includes(r.status))throw Error('invalid_history');seen.add(key);
  return{locationId,locationName:text(r.locationName,200),screenId,screenName:text(r.screenName,200),status:r.status,...(r.status==='success'?{url:deliveryHistoryUrl(text(r.url,2000),locationId,screenId)}:{})};
 });
 return{id,projectId,projectTitle,revision,createdAt:date(input.createdAt),updatedAt:date(input.updatedAt),results};
}
export function readDeliveryHistory(storage){
 try{
  if(!storage)throw Error('storage_unavailable');const raw=storage.getItem(DELIVERY_HISTORY_KEY);if(raw===null)return{ok:true,data:[]};if(raw.length>1000000)throw Error('invalid_history');const data=JSON.parse(raw);
  if(data?.version!==1||!Array.isArray(data.batches)||data.batches.length>MAX_BATCHES)throw Error('invalid_history');
  const batches=data.batches.map(cleanBatch);if(new Set(batches.map(b=>b.id)).size!==batches.length)throw Error('invalid_history');return{ok:true,data:batches.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};
 }catch{return{ok:false,error:'history_unavailable'};}
}
export function deliveryHistoryBackup(storage,exportedAt=new Date().toISOString()){
 const saved=readDeliveryHistory(storage);if(!saved.ok)throw Error('history_unavailable');if(!saved.data.length)throw Error('empty_history');
 const snapshot={format:'ainimation-delivery-history',version:1,exportedAt:date(exportedAt),batches:saved.data};
 return{filename:'ainimation-historial-'+snapshot.exportedAt.replace(/[:.]/g,'-')+'.json',type:'application/json;charset=utf-8',content:JSON.stringify(snapshot,null,2)+'\n',batches:snapshot.batches.length,destinations:snapshot.batches.reduce((count,b)=>count+b.results.length,0)};
}
const MAX_BACKUP_BYTES=3000000,restorePlans=new WeakMap();
function parseHistoryBackup(source){
 try{if(typeof source!=='string'||source.length>MAX_BACKUP_BYTES||new TextEncoder().encode(source).length>MAX_BACKUP_BYTES)throw Error();const data=JSON.parse(source);
  if(data?.format!=='ainimation-delivery-history'||data.version!==1||!Array.isArray(data.batches)||!data.batches.length||data.batches.length>MAX_BATCHES)throw Error();
  const exportedAt=date(data.exportedAt),batches=data.batches.map(cleanBatch);if(exportedAt!==data.exportedAt||new Set(batches.map(b=>b.id)).size!==batches.length||batches.some(b=>b.createdAt>b.updatedAt))throw Error();return{exportedAt,batches};
 }catch{throw Error('invalid_backup');}
}
function restoreHistorySnapshot(storage){
 try{const raw=storage.getItem(DELIVERY_HISTORY_KEY),saved=readDeliveryHistory({getItem:()=>raw});if(!saved.ok)throw Error();return{raw,batches:saved.data};}catch{throw Error('history_unavailable');}
}
export function previewDeliveryHistoryRestore(storage,source){
 const incoming=parseHistoryBackup(source),current=restoreHistorySnapshot(storage),existing=new Map(current.batches.map(b=>[b.id,b])),additions=[];
 for(const b of incoming.batches){const previous=existing.get(b.id);if(previous){if(JSON.stringify(previous)!==JSON.stringify(b))throw Error('history_conflict');}else additions.push(b);}
 const merged=[...current.batches,...additions].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),serialized=JSON.stringify({version:1,batches:merged});if(merged.length>MAX_BATCHES||serialized.length>1000000)throw Error('history_full');
 const plan={exportedAt:incoming.exportedAt,batches:incoming.batches.map(b=>({...b,existing:existing.has(b.id)})),newCount:additions.length,existingCount:incoming.batches.length-additions.length,destinations:incoming.batches.reduce((n,b)=>n+b.results.length,0)};
 restorePlans.set(plan,{storage,raw:current.raw,serialized,newCount:additions.length});return plan;
}
export function restoreDeliveryHistory(storage,plan){
 const pending=restorePlans.get(plan);if(!pending||pending.storage!==storage)throw Error('history_changed');restorePlans.delete(plan);const current=restoreHistorySnapshot(storage);if(current.raw!==pending.raw)throw Error('history_changed');if(!pending.newCount)return{restored:0};
 try{storage.setItem(DELIVERY_HISTORY_KEY,pending.serialized);}catch{throw Error('history_not_saved');}return{restored:pending.newCount};
}
export function saveDeliveryBatch(storage,input){
 try{
  const batch=cleanBatch(input),existing=readDeliveryHistory(storage);if(!existing.ok)throw Error('history_unavailable');const before=existing.data.find(b=>b.id===batch.id);
  if(before){if(before.projectId!==batch.projectId||before.revision!==batch.revision)throw Error('history_conflict');const results=new Map(before.results.map(r=>[JSON.stringify([r.locationId,r.screenId]),r]));for(const r of batch.results){const key=JSON.stringify([r.locationId,r.screenId]);if(results.get(key)?.status!=='success')results.set(key,r);}batch.results=[...results.values()];if(batch.results.length>MAX_RESULTS)throw Error('history_full');batch.createdAt=before.createdAt;if(batch.updatedAt<before.updatedAt)batch.updatedAt=before.updatedAt;}
  const batches=[batch,...existing.data.filter(b=>b.id!==batch.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,MAX_BATCHES);storage.setItem(DELIVERY_HISTORY_KEY,JSON.stringify({version:1,batches}));return{ok:true,data:batches};
 }catch{return{ok:false,error:'history_not_saved'};}
}
const csvQuote=value=>{let text=String(value);if(/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
// CSV is built from the same validated, metadata-only snapshot shown in History.
export function deliveryBatchCsv(input,language='es'){
 const b=cleanBatch(input),en=language==='en';
 const headers=en?['Date (UTC)','Project','Version','Xpace','Xpace ID','Screen','Screen ID','Result','Link']:['Fecha (UTC)','Proyecto','Versión','Xpacio','ID Xpacio','Pantalla','ID pantalla','Resultado','Enlace'];
 const rows=b.results.map(r=>[b.createdAt,b.projectTitle,b.revision,r.locationName,r.locationId,r.screenName,r.screenId,r.status==='success'?(en?'Prepared':'Preparado'):r.status==='error'?(en?'Not prepared':'No preparado'):(en?'Unconfirmed':'Sin confirmación'),r.status==='success'?r.url:'']);
 return{filename:'ainimation-'+(en?'deliveries':'envios')+'-'+b.createdAt.slice(0,10)+'-v'+b.revision+'-'+b.id+'.csv',type:'text/csv;charset=utf-8',content:'\ufeff'+[headers,...rows].map(row=>row.map(csvQuote).join(',')).join('\r\n')+'\r\n'};
}
const failedHttpStatus=status=>Number.isInteger(status)&&status>=100&&status<=599&&!(status>=200&&status<300)&&status!==404&&status!==410;
function versionCheckReason(result,language='es'){
 const en=language==='en',reasons=en?{matched:'Receipt, project, version and destination match',not_found:'Confirmed absence (404/410)',mismatch:'Metadata does not match this batch',timeout:'Time limit exceeded',unreadable_response:'Unreadable response data',connection_failed:'Connection or request failed',no_link:'Not checked: no confirmed link'}:{matched:'Coinciden recibo, proyecto, versión y destino',not_found:'Ausencia confirmada (404/410)',mismatch:'Los datos no coinciden con este lote',timeout:'Tiempo de espera agotado',unreadable_response:'Datos de respuesta ilegibles',connection_failed:'Fallo de conexión o consulta',no_link:'Sin comprobar: no hay enlace confirmado'};
 if(result.reason==='http_error'&&failedHttpStatus(result.httpStatus))return(en?'HTTP response ':'Respuesta HTTP ')+result.httpStatus;
 return reasons[result.reason]||(en?'Request could not be verified':'No se pudo verificar la consulta');
}
function versionCheckRows(input,report,language='es'){
 const b=cleanBatch(input),en=language==='en';
 if(!report||report.cancelled!==false||report.batchId!==b.id||report.projectId!==b.projectId||report.revision!==b.revision||!Array.isArray(report.results)||report.results.length!==b.results.length)throw Error('invalid_version_check');
 const checkedAt=date(report.checkedAt),counts={available:0,unavailable:0,unknown:0,no_link:0};
 const states=en?{available:'Available',unavailable:'Unavailable',unknown:'Could not be checked',no_link:'No confirmed link'}:{available:'Disponible',unavailable:'No disponible',unknown:'Sin poder comprobar',no_link:'Sin enlace confirmado'};
 const rows=b.results.map((r,i)=>{
  const v=report.results[i],id=r.url?new URL(r.url).searchParams.get('ainimation'):undefined;
  if(!v||v.locationId!==r.locationId||v.screenId!==r.screenId||v.receiptId!==id||(v.reason==='http_error'?!failedHttpStatus(v.httpStatus):v.httpStatus!==undefined)||!(r.status==='success'?(v.state==='available'&&v.reason==='matched')||(v.state==='unavailable'&&['not_found','mismatch'].includes(v.reason))||(v.state==='unknown'&&['timeout','http_error','unreadable_response','connection_failed'].includes(v.reason)):v.state==='no_link'&&v.reason==='no_link'))throw Error('invalid_version_check');
  counts[v.state]++;return[checkedAt,b.projectTitle,b.revision,r.locationName,r.locationId,r.screenName,r.screenId,states[v.state],versionCheckReason(v,language),r.url||''];
 });
 if(!report.counts||Object.keys(counts).some(key=>report.counts[key]!==counts[key]))throw Error('invalid_version_check');
 return{b,checkedAt,rows};
}
export function deliveryVersionCheckCsv(input,report,language='es'){
 const {b,checkedAt,rows}=versionCheckRows(input,report,language),en=language==='en';
 const headers=en?['Checked at (UTC)','Project','Version','Xpace','Xpace ID','Screen','Screen ID','Version check','Reason','Confirmed link']:['Comprobado (UTC)','Proyecto','Versión','Xpacio','ID Xpacio','Pantalla','ID pantalla','Comprobación de versión','Motivo','Enlace confirmado'];
 return{filename:'ainimation-'+(en?'version-check':'comprobacion')+'-'+checkedAt.replace(/[:.]/g,'-')+'-v'+b.revision+'-'+b.id+'.csv',type:'text/csv;charset=utf-8',content:'\ufeff'+[headers,...rows].map(row=>row.map(csvQuote).join(',')).join('\r\n')+'\r\n'};
}
const singleLine=value=>value.replace(/[\p{Cc}\p{Cf}]+/gu,' ').replace(/\s+/g,' ').trim();
export function deliveryVersionCheckIncidents(input,report,language='es'){
 const {b,checkedAt,rows}=versionCheckRows(input,report,language),en=language==='en',issues=rows.filter((_,i)=>report.results[i].state!=='available'),count=issues.length;
 const text=count?[singleLine(b.projectTitle)+' · '+(en?'Version ':'Versión ')+b.revision,(en?'Checked at (UTC): ':'Comprobado (UTC): ')+checkedAt,count+' '+(en?(count===1?'issue':'issues'):(count===1?'incidencia':'incidencias')),...issues.map(r=>singleLine(r[3])+' · '+singleLine(r[5])+'\n'+r[7]+' · '+r[8]+(r[9]?'\n'+r[9]:'')),en?'Prepared version check; does not confirm physical playback or 3D scene status.':'Comprobación de versiones preparadas; no acredita reproducción física ni estado de escenas 3D.'].join('\n\n'):'';
 return{text,count,checkedAt};
}
export function deliveryBatchLinks(input,language='es'){
 const b=cleanBatch(input),en=language==='en',confirmed=b.results.filter(r=>r.status==='success'),missing=b.results.length-confirmed.length;
 const line=singleLine;
 const count=confirmed.length,summary=count+' '+(en?(count===1?'confirmed link':'confirmed links'):(count===1?'enlace confirmado':'enlaces confirmados'))+' · '+missing+' '+(en?(missing===1?'target without a link':'targets without a link'):(missing===1?'destino sin enlace':'destinos sin enlace'));
 const text=[line(b.projectTitle)+' · '+(en?'Version ':'Versión ')+b.revision,summary,...confirmed.map(r=>line(r.locationName)+' · '+line(r.screenName)+'\n'+r.url)].join('\n\n');
 return{text,count,missing,summary};
}
const VERSION_METADATA_URL='https://ainimation-interactive-library-preview.csilvasantin.workers.dev/api/deliveries/';
// Read public metadata only. Never send credentials or follow a receipt redirect.
export async function checkDeliveryBatchVersions(input,{request=fetch,signal,timeoutMs=10000,now=()=>new Date().toISOString(),onProgress}={}){
 const b=cleanBatch(input),waiting=[],results=b.results.map((r,i)=>{if(r.status==='success')waiting.push(i);return{locationId:r.locationId,screenId:r.screenId,...(r.url?{receiptId:new URL(r.url).searchParams.get('ainimation')}:{}),state:r.status==='success'?'unknown':'no_link',reason:r.status==='success'?'not_checked':'no_link'};});
 const limit=Math.max(1,Math.min(Number.isFinite(timeoutMs)?timeoutMs:10000,15000));let next=0,completed=0;
 const progress=()=>{if(signal?.aborted)return;try{onProgress?.({batchId:b.id,completed,total:waiting.length,withoutLink:b.results.length-waiting.length});}catch{/* A presentation observer cannot change a check result. */}};
 progress();
 const inspect=async r=>{
  const id=new URL(r.url).searchParams.get('ainimation'),controller=new AbortController();let timer,cancel,timedOut=false;
  const deadline=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(Error('cancelled'));};timer=setTimeout(()=>{timedOut=true;controller.abort();reject(Error('timeout'));},limit);signal?.addEventListener('abort',cancel,{once:true});});
  const read=async()=>{
   const response=await request(VERSION_METADATA_URL+id,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   if(response.status===404||response.status===410)return{state:'unavailable',reason:'not_found'};
   if(!response.ok)return failedHttpStatus(response.status)?{state:'unknown',reason:'http_error',httpStatus:response.status}:{state:'unknown',reason:'unreadable_response'};
   let data;try{data=await response.json();}catch{return{state:'unknown',reason:'unreadable_response'};}
   const matches=data?.id===id&&data.projectId===b.projectId&&data.sourceRevision===b.revision&&data.destination?.id===r.locationId&&data.destination.screen?.id===r.screenId&&data.destination.screen.touch===true;
   return matches?{state:'available',reason:'matched'}:{state:'unavailable',reason:'mismatch'};
  };
  try{const result=await Promise.race([read(),deadline]);return timedOut?{state:'unknown',reason:'timeout'}:result;}catch{return{state:'unknown',reason:timedOut?'timeout':'connection_failed'};}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 };
 const work=async()=>{while(next<waiting.length&&!signal?.aborted){const i=waiting[next++],result=await inspect(b.results[i]);if(signal?.aborted)return;results[i]={...results[i],...result};completed++;progress();}};
 await Promise.all(Array.from({length:Math.min(3,waiting.length)},work));
 const counts={available:0,unavailable:0,unknown:0,no_link:0};for(const r of results)counts[r.state]++;
 return{batchId:b.id,projectId:b.projectId,revision:b.revision,checkedAt:date(now()),cancelled:signal?.aborted===true,counts,results};
}
// An interrupted batch is never called complete, even if some targets succeeded.
export function deliveryBatchOutcome(batch){
 if(batch.results.some(r=>r.status==='pending'||r.status==='sending'))return'unconfirmed';
 return batch.results.every(r=>r.status==='success')?'complete':'error';
}
const searchable=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
export function filterDeliveryHistory(batches,{query='',projectId='',outcome=''}={}){
 const normalized=searchable(query),versionPattern=/(?:^|\s)(?:version|v)\s*(\d+)(?=\s|$)/g;
 const versions=[...normalized.matchAll(versionPattern)].map(match=>Number(match[1])),words=normalized.replace(versionPattern,' ').split(/\s+/).filter(Boolean);
 return batches.filter(b=>{
  if((projectId&&b.projectId!==projectId)||(outcome&&deliveryBatchOutcome(b)!==outcome)||versions.some(version=>b.revision!==version))return false;
  const index=searchable([b.projectTitle,b.projectId,'version '+b.revision,'v'+b.revision,...b.results.flatMap(r=>[r.locationName,r.locationId,r.screenName,r.screenId])].join(' '));
  return words.every(word=>index.includes(word));
 });
}
export function compareDeliveryBatchTargets(first,second){
 const a=cleanBatch(first),b=cleanBatch(second);if(a.id===b.id)throw Error('distinct_batches_required');
 const key=r=>JSON.stringify([r.locationId,r.screenId]),left=new Map(a.results.map(r=>[key(r),r])),right=new Map(b.results.map(r=>[key(r),r]));
 return{first:a,second:b,common:a.results.filter(r=>right.has(key(r))).map(r=>({first:r,second:right.get(key(r))})),onlyFirst:a.results.filter(r=>!right.has(key(r))),onlySecond:b.results.filter(r=>!left.has(key(r)))};
}
export function mountDeliveryHistory({button,storage,doc=document,download,onReuse,writeClipboard,versionRequest=fetch,versionTimeoutMs=10000}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es,make=(tag,value)=>{const n=doc.createElement(tag);if(value)n.textContent=value;return n;};
 const word=(n,esOne,esMany,enOne,enMany)=>t(n===1?esOne:esMany,n===1?enOne:enMany);
 const downloadFile=file=>{if(download)return download(file);const url=URL.createObjectURL(new Blob([file.content],{type:file.type})),a=doc.createElement('a');a.href=url;a.download=file.filename;try{a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}};
 let viewVersion=0,resetComparison=()=>{};const checks=new Set(),viewCleanups=new Set(),cancelChecks=()=>{resetComparison();viewVersion++;for(const controller of checks)controller.abort();checks.clear();for(const cleanup of viewCleanups)cleanup();viewCleanups.clear();};
 const dialog=make('dialog');dialog.className='delivery-history-dialog';dialog.setAttribute('aria-label',t('Historial de envíos','Delivery history'));
 const title=make('h2',t('Historial de envíos','Delivery history')),hint=make('p',t('Últimos 30 lotes guardados en este navegador. Los enlaces conservan su versión; abrirlos no asigna el interactivo automáticamente.','Last 30 batches saved in this browser. Links preserve their version; opening them does not automatically assign the interactive.')),status=make('p'),list=make('div'),close=make('button',t('Cerrar historial','Close history'));status.setAttribute('role','status');list.className='history-batches';close.type='button';close.onclick=()=>{cancelChecks();dialog.close();};dialog.addEventListener('cancel',event=>{event.preventDefault();cancelChecks();dialog.close();});dialog.addEventListener('close',cancelChecks);
 const guide=make('details'),guideSummary=make('summary',t('Cómo usar el historial','How to use history')),guideSteps=make('ol');guide.className='history-guide';guide.open=false;
 for(const [es,en] of [
  ['Buscar y filtrar sólo cambia lo que ves. Comparar dos lotes muestra sus destinos guardados comunes y exclusivos, sin comprobar disponibilidad. Copiar enlaces y descargar CSV o la copia completa guarda información; no asigna el interactivo.','Search and filters only change what you see. Comparing two batches shows shared and exclusive saved targets without checking availability. Copying links and downloading CSV or the complete copy preserves information; it does not assign the interactive.'],
  ['Comprobar versiones revisa la versión preparada y sus datos. No confirma la reproducción física ni el estado de la escena 3D.','Check versions reviews the prepared version and its details. It does not confirm physical playback or the state of the 3D scene.'],
  ['Abrir copia del historial recupera sólo los registros y enlaces guardados. Revisa la vista previa y confirma los lotes nuevos; no recupera proyectos ni restaura una pantalla 3D.','Open history copy recovers saved records and links only. Review the preview and confirm new batches; it does not recover projects or restore a 3D screen.'],
  ['Usar estas pantallas selecciona destinos para la versión actual del Creador. Se vuelven a comprobar los destinos, el acceso y la revisión antes de confirmar Preparar. Abrir la selección no crea envíos.','Use these screens selects targets for the current Creator version. Targets, sign-in and review are checked again before confirming Prepare. Opening the selection does not create deliveries.'],
  ['Asignar o restaurar un interactivo en su escena 3D es una acción distinta de recuperar el historial.','Assigning or restoring an interactive in its 3D scene is a separate action from recovering history.']
 ])guideSteps.append(make('li',t(es,en)));guide.append(guideSummary,guideSteps);
 const backupActions=make('div'),backup=make('button',t('Descargar copia del historial completo','Download complete history copy')),backupHint=make('p'),backupStatus=make('p');let backupAttempt=0;status.className='history-filter-status';backupActions.className='history-backup-actions';backup.className='history-backup';backup.type='button';backup.disabled=true;backupHint.className='history-backup-scope';backupStatus.className='history-backup-status';backupStatus.setAttribute('role','status');backupActions.append(backup,backupHint);
 backup.onclick=async()=>{if(backup.disabled||!dialog.open)return;const attempt=++backupAttempt,current=()=>attempt===backupAttempt&&dialog.open;backup.disabled=true;backupStatus.textContent='';let file;try{file=deliveryHistoryBackup(storage);}catch(error){if(current()){backupStatus.textContent=error.message==='empty_history'?t('No hay lotes guardados para descargar.','There are no saved batches to download.'):t('No se puede leer el historial. La copia no se ha creado y los datos se conservan sin modificar.','History cannot be read. No copy was created and the data is preserved unchanged.');backup.disabled=false;}return;}try{await downloadFile(file);if(current())backupStatus.textContent=t('Copia del historial completo preparada: ','Complete history copy prepared: ')+file.batches+' '+word(file.batches,'lote','lotes','batch','batches')+' · '+file.destinations+' '+word(file.destinations,'destino.','destinos.','target.','targets.');}catch{if(current())backupStatus.textContent=t('No se pudo preparar la descarga. El historial se conserva; vuelve a intentarlo.','The download could not be prepared. History is preserved; try again.');}finally{if(current())backup.disabled=false;}};
 const restoreOpen=make('button',t('Abrir copia del historial','Open history copy')),restoreFile=make('input'),restoreReview=make('section'),restoreSummary=make('p'),restoreList=make('div'),restoreConfirm=make('button'),restoreCancel=make('button',t('Cancelar revisión','Cancel review')),restoreStatus=make('p');let restoreReadVersion=0,restorePlan;
 restoreOpen.type='button';restoreOpen.className='history-restore-open';restoreFile.type='file';restoreFile.accept='.json,application/json';restoreFile.hidden=true;restoreFile.className='history-restore-file';restoreReview.className='history-restore-review';restoreReview.hidden=true;restoreReview.setAttribute('aria-label',t('Revisar copia del historial','Review history copy'));restoreSummary.className='history-restore-summary';restoreSummary.setAttribute('role','status');restoreList.className='history-restore-list';restoreConfirm.type='button';restoreConfirm.className='history-restore-confirm';restoreConfirm.hidden=true;restoreConfirm.disabled=true;restoreCancel.type='button';restoreCancel.className='history-restore-cancel';restoreStatus.className='history-restore-status';restoreStatus.setAttribute('role','status');restoreReview.append(make('h3',t('Revisar copia del historial','Review history copy')),restoreSummary,restoreList,restoreConfirm,restoreCancel);backupActions.append(restoreOpen,restoreFile);
 const resetRestore=()=>{restoreReadVersion++;restorePlan=undefined;restoreReview.hidden=true;restoreConfirm.hidden=true;restoreConfirm.disabled=true;restoreSummary.textContent='';restoreList.replaceChildren();restoreStatus.textContent='';restoreFile.value='';};
 const restoreMessage=error=>{const code=error?.message;return code==='history_conflict'?t('La copia contiene un ID de lote que ya existe con datos distintos. No se ha cambiado el historial.','The copy contains a batch ID that already exists with different data. History is unchanged.'):code==='history_full'?t('La combinación supera la capacidad del historial. No se ha truncado ni cambiado ningún lote.','The combined history exceeds capacity. No batch was truncated or changed.'):code==='history_unavailable'?t('No se puede leer el historial guardado. Se conserva sin modificar; no se permite restaurar.','Saved history cannot be read. It is preserved unchanged; restore is blocked.'):code==='history_changed'?t('El historial ha cambiado. Abre la copia otra vez y revisa antes de confirmar.','History changed. Open the copy again and review it before confirming.'):code==='history_not_saved'?t('No se pudo guardar la restauración. El historial anterior se conserva; abre la copia otra vez.','The restore could not be saved. Previous history is preserved; open the copy again.'):t('La copia no es válida o supera los límites permitidos. No se ha cambiado el historial.','The copy is invalid or exceeds the allowed limits. History is unchanged.');};
 restoreOpen.onclick=()=>{resetRestore();restoreFile.click();};restoreCancel.onclick=()=>{resetRestore();restoreOpen.focus();};const originalClose=close.onclick;close.onclick=()=>{resetRestore();originalClose();};dialog.addEventListener('cancel',resetRestore);dialog.addEventListener('close',resetRestore);
 restoreFile.onchange=async()=>{const file=restoreFile.files?.[0];resetRestore();if(!file)return;const turn=restoreReadVersion,current=()=>turn===restoreReadVersion&&dialog.open;restoreStatus.textContent=t('Leyendo copia para revisar…','Reading copy for review…');try{if(!Number.isSafeInteger(file.size)||file.size<1||file.size>MAX_BACKUP_BYTES)throw Error('invalid_backup');const source=await file.text();if(!current())return;const plan=previewDeliveryHistoryRestore(storage,source);restorePlan=plan;restoreStatus.textContent='';restoreReview.hidden=false;restoreSummary.textContent=plan.batches.length+' '+word(plan.batches.length,'lote','lotes','batch','batches')+' · '+plan.destinations+' '+word(plan.destinations,'destino','destinos','target','targets')+' · '+plan.newCount+' '+t(plan.newCount===1?'nuevo':'nuevos','new')+' · '+plan.existingCount+' '+t(plan.existingCount===1?'ya existente idéntico.':'ya existentes idénticos.','already identical.')+' '+t('Copia del ','Copy from ')+plan.exportedAt+(plan.newCount?'':' '+t('Todos los lotes ya están guardados; no hay nada que restaurar.','All batches are already saved; there is nothing to restore.'));
   for(const b of plan.batches){const entry=make('details'),summary=make('summary',b.projectTitle+' · '+t('Versión ','Version ')+b.revision+' · '+(b.existing?t('Ya existe idéntico','Already identical'):t('Nuevo','New'))+' · '+b.results.length+' '+t(b.results.length===1?'destino':'destinos',b.results.length===1?'target':'targets')),targets=make('ul');entry.dataset.batchId=b.id;entry.dataset.existing=String(b.existing);entry.append(summary,make('p',b.createdAt+' · '+b.updatedAt));for(const r of b.results){const li=make('li',r.locationName+' · '+r.screenName+' · '+(r.status==='success'?t('Preparado','Prepared'):r.status==='error'?t('No preparado','Not prepared'):t('Sin confirmación','Unconfirmed')));li.dataset.locationId=r.locationId;li.dataset.screenId=r.screenId;if(r.url){const url=make('p',r.url);url.dataset.receiptUrl=r.url;li.append(url);}targets.append(li);}entry.append(targets);restoreList.append(entry);}
   restoreConfirm.textContent=t('Restaurar ','Restore ')+plan.newCount+' '+t(plan.newCount===1?'lote nuevo':'lotes nuevos',plan.newCount===1?'new batch':'new batches');restoreConfirm.hidden=!plan.newCount;restoreConfirm.disabled=!plan.newCount;
  }catch(error){if(current()){restorePlan=undefined;restoreStatus.textContent=restoreMessage(error);}}};
 restoreConfirm.onclick=()=>{if(restoreConfirm.disabled||!restorePlan||!dialog.open)return;const plan=restorePlan;restoreConfirm.disabled=true;try{const result=restoreDeliveryHistory(storage,plan);resetRestore();refreshHistory(false);restoreStatus.textContent=t('Restauración completada: ','Restore completed: ')+result.restored+' '+t(result.restored===1?'lote nuevo. Los lotes anteriores se conservan.':'lotes nuevos. Los lotes anteriores se conservan.',result.restored===1?'new batch. Previous batches are preserved.':'new batches. Previous batches are preserved.');}catch(error){resetRestore();restoreStatus.textContent=restoreMessage(error);}};
 const filters=make('div'),searchLabel=make('label',t('Buscar lotes','Search batches')),query=make('input'),projectLabel=make('label',t('Proyecto del lote','Batch project')),project=make('select'),outcomeLabel=make('label',t('Resultado del lote','Batch result')),outcome=make('select'),clear=make('button',t('Quitar filtros','Clear filters'));
 filters.className='history-filters';searchLabel.className='history-search';query.className='history-query';query.type='search';query.placeholder=t('Proyecto, versión, Xpacio o pantalla','Project, version, Xpace or screen');query.maxLength=300;project.className='history-project';outcome.className='history-outcome';clear.className='history-clear';clear.type='button';
 const option=(value,label)=>{const n=make('option',label);n.value=value;return n;};
 const outcomeText=value=>value==='complete'?t('Completo','Complete'):value==='error'?t('Con errores','With errors'):t('Sin confirmación','Unconfirmed');
 outcome.append(option('',t('Todos los resultados','All results')),...['complete','error','unconfirmed'].map(value=>option(value,outcomeText(value))));
 const comparison=make('details'),compareControls=make('div'),firstLabel=make('label',t('Primer lote','First batch')),secondLabel=make('label',t('Segundo lote','Second batch')),firstSelect=make('select'),secondSelect=make('select'),compareButton=make('button',t('Comparar','Compare')),compareStatus=make('p'),compareResults=make('div');
 comparison.className='history-compare';comparison.open=false;compareControls.className='history-compare-controls';firstSelect.className='history-compare-first';secondSelect.className='history-compare-second';compareButton.className='history-compare-button';compareButton.type='button';compareStatus.className='history-compare-status';compareStatus.setAttribute('role','status');compareResults.className='history-compare-results';compareResults.hidden=true;firstLabel.append(firstSelect);secondLabel.append(secondSelect);compareControls.append(firstLabel,secondLabel,compareButton);comparison.append(make('summary',t('Comparar pantallas de dos lotes','Compare screens in two batches')),make('p',t('Elige dos lotes de todo el historial. Compara sus destinos guardados; no revisa contenido, disponibilidad actual ni reproducción física.','Choose two batches from all history. Compares saved targets; it does not review content, current availability or physical playback.')),compareControls,compareStatus,compareResults);
 searchLabel.append(query);projectLabel.append(project);outcomeLabel.append(outcome);filters.append(searchLabel,projectLabel,outcomeLabel,clear);dialog.append(title,hint,guide,comparison,backupActions,backupStatus,restoreStatus,restoreReview,filters,status,list,close);doc.body.append(dialog);
 let batches=[],comparisonSnapshot='';
 const clearComparisonResult=()=>{compareResults.replaceChildren();compareResults.hidden=true;delete compareResults.dataset.firstBatchId;delete compareResults.dataset.secondBatchId;compareStatus.textContent=batches.length<2?t('Se necesitan al menos dos lotes legibles para comparar.','At least two readable batches are needed to compare.'):t('Selecciona dos lotes distintos y pulsa Comparar.','Select two different batches and press Compare.');};
 resetComparison=()=>{firstSelect.value='';secondSelect.value='';comparison.open=false;clearComparisonResult();};
 const firstSelection=make('p'),secondSelection=make('p');firstLabel.append(firstSelection);secondLabel.append(secondSelection);
 const clearPair=resetComparison;resetComparison=()=>{clearPair();firstSelection.textContent='';secondSelection.textContent='';};
 firstSelect.onchange=secondSelect.onchange=()=>{clearComparisonResult();firstSelection.textContent=batches.find(b=>b.id===firstSelect.value)?batchLabel(batches.find(b=>b.id===firstSelect.value)):'';secondSelection.textContent=batches.find(b=>b.id===secondSelect.value)?batchLabel(batches.find(b=>b.id===secondSelect.value)):'';};
 const batchLabel=b=>b.projectTitle+' · '+t('Versión ','Version ')+b.revision+' · '+b.createdAt+' · '+b.id;
 const targetStatus=r=>({success:t('Preparado','Prepared'),error:t('No preparado','Not prepared'),pending:t('Pendiente de confirmación','Awaiting confirmation'),sending:t('Envío sin confirmar','Delivery unconfirmed')})[r.status];
 const comparisonTarget=(r,side)=>{const item=make('p',side+': '+r.locationName+' · '+r.screenName+' · '+targetStatus(r));item.dataset.locationId=r.locationId;item.dataset.screenId=r.screenId;item.dataset.state=r.status;item.append(make('span',t('IDs: ','IDs: ')+r.locationId+' / '+r.screenId));return item;};
 compareButton.onclick=()=>{
  if(compareButton.disabled||!dialog.open)return;clearComparisonResult();const saved=readDeliveryHistory(storage);
  if(!saved.ok||JSON.stringify(saved.data)!==comparisonSnapshot){resetComparison();compareStatus.textContent=t('El historial ha cambiado o no se puede leer. Cierra y vuelve a abrir el historial para revisar otra vez.','History changed or cannot be read. Close and reopen History to review it again.');return;}
  const a=saved.data.find(b=>b.id===firstSelect.value),b=saved.data.find(b=>b.id===secondSelect.value);
  if(!a||!b||a.id===b.id){compareStatus.textContent=t('Elige dos lotes distintos guardados en el historial.','Choose two different batches saved in History.');return;}
  const result=compareDeliveryBatchTargets(a,b);compareResults.hidden=false;compareResults.dataset.firstBatchId=a.id;compareResults.dataset.secondBatchId=b.id;
  compareResults.append(make('p',t('Primer lote: ','First batch: ')+batchLabel(a)),make('p',t('Segundo lote: ','Second batch: ')+batchLabel(b)));
  for(const [kind,rows,label] of [['common',result.common,t('Pantallas comunes','Shared screens')],['only-first',result.onlyFirst,t('Sólo en el primer lote','Only in the first batch')],['only-second',result.onlySecond,t('Sólo en el segundo lote','Only in the second batch')]]){
   const section=make('section'),items=make('ul');section.dataset.comparisonGroup=kind;section.dataset.count=String(rows.length);section.append(make('h3',label+' · '+rows.length));
   for(const row of rows){const li=make('li');if(kind==='common')li.append(comparisonTarget(row.first,t('Primer lote','First batch')),comparisonTarget(row.second,t('Segundo lote','Second batch')));else li.append(comparisonTarget(row,kind==='only-first'?t('Primer lote','First batch'):t('Segundo lote','Second batch')));items.append(li);}section.append(items);compareResults.append(section);
  }
  compareStatus.textContent=t('En común: ','Shared: ')+result.common.length+' · '+t('Sólo en el primer lote: ','Only in the first batch: ')+result.onlyFirst.length+' · '+t('Sólo en el segundo lote: ','Only in the second batch: ')+result.onlySecond.length+'.';
 };
 const render=()=>{
  cancelChecks();
  const shown=filterDeliveryHistory(batches,{query:query.value,projectId:project.value,outcome:outcome.value});list.replaceChildren();
  clear.disabled=!query.value&&!project.value&&!outcome.value;
  status.textContent=shown.length+' '+t('de','of')+' '+batches.length+' '+word(batches.length,'lote.','lotes.','batch.','batches.')+(!shown.length?' '+t('No hay lotes que coincidan. Quita los filtros para ver todos.','No matching batches. Clear filters to see all batches.'):'');
  for(const [i,b] of shown.entries()){
   const details=make('details'),summary=make('summary'),ul=make('ul'),actions=make('div'),versionRows=[],targetRows=[];details.open=i===0;details.dataset.batchId=b.id;ul.className='delivery-results';actions.className='history-batch-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label',t('Acciones del lote','Batch actions'));
   const successful=b.results.filter(r=>r.status==='success').length;summary.textContent=b.projectTitle+' · '+t('Versión ','Version ')+b.revision+' · '+new Date(b.createdAt).toLocaleString(doc.documentElement.lang==='en'?'en-GB':'es-ES')+' · '+successful+'/'+b.results.length+' '+word(b.results.length,'preparado','preparados','prepared','prepared')+' · '+outcomeText(deliveryBatchOutcome(b));details.append(summary);
   for(const r of b.results){const li=make('li'),name=make('strong',r.locationName+' · '+r.screenName),label=make('span',r.status==='success'?t('Versión preparada','Version prepared'):r.status==='error'?t('No preparado','Not prepared'):t('Sin confirmación · el lote se interrumpió','Unconfirmed · the batch was interrupted'));li.dataset.state=r.status;li.append(name,label);
    if(r.url){const a=make('a',t('Abrir en admira.store','Open in admira.store'));a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',t('Abrir ','Open ')+r.locationName+' · '+r.screenName);li.append(a);}const version=make('span');version.className='history-version-state';version.hidden=true;versionRows.push(version);targetRows.push(li);li.append(version);ul.append(li);
   }const exportButton=make('button',t('Descargar CSV','Download CSV'));exportButton.type='button';exportButton.className='history-csv';exportButton.setAttribute('aria-label',t('Descargar CSV de ','Download CSV for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);
   exportButton.onclick=()=>{try{downloadFile(deliveryBatchCsv(b,doc.documentElement.lang));status.textContent=t('Informe CSV preparado: ','CSV report prepared: ')+b.results.length+' '+word(b.results.length,'pantalla.','pantallas.','screen.','screens.');}catch{status.textContent=t('No se pudo preparar el CSV. El historial se conserva; vuelve a intentarlo.','The CSV could not be prepared. History is preserved; try again.');}};
   actions.append(exportButton);
   const links=deliveryBatchLinks(b,doc.documentElement.lang),copy=make('button',t('Copiar enlaces','Copy links')),copyStatus=make('p'),fallback=make('label',t('Enlaces del lote para copiar','Batch links to copy')),copyText=make('textarea');
   copy.type='button';copy.className='history-copy';copy.disabled=!links.count;copy.setAttribute('aria-label',t('Copiar enlaces de ','Copy links for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);copyStatus.className='history-copy-status';copyStatus.setAttribute('role','status');fallback.className='history-copy-fallback';fallback.hidden=true;copyText.readOnly=true;copyText.rows=8;fallback.append(copyText);
   if(!links.count)copyStatus.textContent=links.summary+'. '+t('No hay enlaces confirmados para copiar.','There are no confirmed links to copy.');
   copy.onclick=async()=>{
    if(copy.disabled)return;copy.disabled=true;fallback.hidden=true;copyStatus.textContent=t('Copiando enlaces…','Copying links…');
    try{
     if(writeClipboard)await writeClipboard(links.text);else{const clipboard=doc.defaultView?.navigator?.clipboard;if(!clipboard?.writeText)throw Error('clipboard_unavailable');await clipboard.writeText(links.text);}
     copyStatus.textContent=links.count+' '+t(links.count===1?'enlace copiado':'enlaces copiados',links.count===1?'link copied':'links copied')+' · '+links.missing+' '+t(links.missing===1?'destino sin enlace.':'destinos sin enlace.',links.missing===1?'target without a link.':'targets without a link.');
    }catch{
     copyText.value=links.text;fallback.hidden=false;copyStatus.textContent=t('El navegador no ha permitido copiar. Selecciona el texto de abajo: ','The browser did not allow copying. Select the text below: ')+links.summary+'.';copyText.focus();copyText.select();
    }finally{copy.disabled=!links.count;}
   };actions.append(copy);
   if(onReuse){const reuse=make('button',t('Usar estas pantallas','Use these screens'));reuse.type='button';reuse.className='history-reuse';reuse.setAttribute('aria-label',t('Usar pantallas de ','Use screens from ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);reuse.onclick=()=>{cancelChecks();dialog.close();return onReuse(b.results.map(r=>({locationId:r.locationId,locationName:r.locationName,screenId:r.screenId,screenName:r.screenName})));};actions.append(reuse);}
   const check=make('button',t('Comprobar versiones','Check versions')),checkStatus=make('p');check.type='button';check.className='history-check';check.disabled=!successful;check.setAttribute('aria-label',t('Comprobar versiones de ','Check versions for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);checkStatus.className='history-version-summary';checkStatus.setAttribute('role','status');
   const versionLabel=result=>result.state==='available'?t('Versión disponible','Version available'):result.state==='no_link'?t('Sin enlace confirmado · sin comprobar','No confirmed link · not checked'):result.reason==='mismatch'?t('Los datos no coinciden con este lote','Metadata does not match this batch'):result.state==='unavailable'?t('Versión no disponible','Version unavailable'):t('No se pudo comprobar la versión','Could not check the version')+' · '+versionCheckReason(result,doc.documentElement.lang);
   const clearProgress=()=>{delete checkStatus.dataset.completed;delete checkStatus.dataset.total;delete checkStatus.dataset.withoutLink;};
   let completedReport,completedTurn,activeCheck;const checkExport=make('button',t('Descargar comprobación CSV','Download check CSV'));checkExport.type='button';checkExport.className='history-version-csv';checkExport.hidden=true;checkExport.disabled=true;
   const resultView=make('div'),incidents=make('button'),matches=make('p'),reportScope=make('p',t('El CSV de comprobación incluye todas las pantallas, también al ver sólo incidencias.','The check CSV includes all screens, including when viewing issues only.'));let issuesOnly=false;
   resultView.className='history-version-view';resultView.hidden=true;incidents.type='button';incidents.className='history-version-incidents';incidents.disabled=true;matches.className='history-version-matches';matches.setAttribute('role','status');reportScope.className='history-version-scope';reportScope.hidden=true;resultView.append(incidents,matches);
   const copyIssues=make('button',t('Copiar resumen de incidencias','Copy issue summary')),issuesStatus=make('p'),issuesFallback=make('label',t('Resumen de incidencias para copiar','Issue summary to copy')),issuesText=make('textarea');let copyAttempt=0;
   copyIssues.type='button';copyIssues.className='history-incidents-copy';copyIssues.hidden=true;copyIssues.disabled=true;issuesStatus.className='history-incidents-status';issuesStatus.setAttribute('role','status');issuesFallback.className='history-incidents-fallback';issuesFallback.hidden=true;issuesText.readOnly=true;issuesText.rows=8;issuesFallback.append(issuesText);resultView.append(copyIssues);
   const resetIssueCopy=()=>{copyAttempt++;copyIssues.hidden=true;copyIssues.disabled=true;issuesStatus.textContent='';issuesFallback.hidden=true;issuesText.value='';};viewCleanups.add(resetIssueCopy);
   const resetResultView=()=>{resetIssueCopy();issuesOnly=false;resultView.hidden=true;incidents.disabled=true;incidents.setAttribute('aria-pressed','false');matches.textContent='';reportScope.hidden=true;targetRows.forEach(row=>{row.hidden=false;});};
   const updateResultView=()=>{let count=0;targetRows.forEach((row,i)=>{row.hidden=issuesOnly&&completedReport.results[i].state==='available';if(!row.hidden)count++;});incidents.textContent=issuesOnly?t('Ver todas las pantallas','View all screens'):t('Ver sólo incidencias','View issues only');incidents.setAttribute('aria-pressed',String(issuesOnly));matches.textContent=count+' '+t('de','of')+' '+targetRows.length+' '+word(targetRows.length,'pantalla.','pantallas.','screen.','screens.')+(issuesOnly&&!count?' '+t('No hay incidencias en esta comprobación.','There are no issues in this check.'):'');};
   incidents.onclick=()=>{if(incidents.disabled||!completedReport||completedTurn!==viewVersion||activeCheck||!dialog.open)return;issuesOnly=!issuesOnly;updateResultView();};resetResultView();
   copyIssues.onclick=async()=>{
    if(copyIssues.disabled||!completedReport||completedTurn!==viewVersion||activeCheck||!dialog.open)return;
    const report=completedReport,turn=completedTurn,attempt=++copyAttempt,current=()=>completedReport===report&&completedTurn===turn&&viewVersion===turn&&attempt===copyAttempt&&!activeCheck&&dialog.open;let summary;
    try{summary=deliveryVersionCheckIncidents(b,report,doc.documentElement.lang);}catch{issuesStatus.textContent=t('No se pudo preparar el resumen. Vuelve a comprobar las versiones.','The summary could not be prepared. Check the versions again.');return;}
    if(!summary.count)return;copyIssues.disabled=true;issuesFallback.hidden=true;issuesText.value='';issuesStatus.textContent=t('Copiando incidencias…','Copying issues…');
    try{if(writeClipboard)await writeClipboard(summary.text);else{const clipboard=doc.defaultView?.navigator?.clipboard;if(!clipboard?.writeText)throw Error('clipboard_unavailable');await clipboard.writeText(summary.text);}if(!current())return;issuesStatus.textContent=summary.count+' '+t(summary.count===1?'incidencia copiada.':'incidencias copiadas.',summary.count===1?'issue copied.':'issues copied.');}
    catch{if(!current())return;issuesText.value=summary.text;issuesFallback.hidden=false;issuesStatus.textContent=t('El navegador no ha permitido copiar. Selecciona el resumen de abajo: ','The browser did not allow copying. Select the summary below: ')+summary.count+' '+t(summary.count===1?'incidencia.':'incidencias.',summary.count===1?'issue.':'issues.');issuesText.focus();issuesText.select();}
    finally{if(current())copyIssues.disabled=false;}
   };
   const cancelCheck=make('button',t('Cancelar comprobación','Cancel check'));cancelCheck.type='button';cancelCheck.className='history-check-cancel';cancelCheck.hidden=true;cancelCheck.disabled=true;cancelCheck.setAttribute('aria-label',t('Cancelar comprobación de ','Cancel check for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);
   cancelCheck.onclick=()=>{
    if(cancelCheck.disabled||!activeCheck||activeCheck.turn!==viewVersion||!dialog.open)return;const {controller}=activeCheck;activeCheck=undefined;controller.abort();checks.delete(controller);completedReport=undefined;checkExport.hidden=true;checkExport.disabled=true;delete checkStatus.dataset.checkedAt;
    clearProgress();resetResultView();checkStatus.textContent=t('Comprobación cancelada. Puedes comprobar otra vez.','Check cancelled. You can check again.');versionRows.forEach(row=>{row.hidden=true;row.textContent='';delete row.dataset.versionState;});cancelCheck.hidden=true;cancelCheck.disabled=true;check.disabled=!successful;check.focus();
   };
   checkExport.onclick=()=>{if(checkExport.disabled||!completedReport||completedTurn!==viewVersion||!dialog.open)return;try{downloadFile(deliveryVersionCheckCsv(b,completedReport,doc.documentElement.lang));status.textContent=t('Informe de comprobación preparado: ','Version check report prepared: ')+b.results.length+' '+word(b.results.length,'pantalla.','pantallas.','screen.','screens.');}catch{status.textContent=t('No se pudo preparar el informe de comprobación. Vuelve a comprobar las versiones e inténtalo de nuevo.','The version check report could not be prepared. Check the versions again and retry.');}};
   check.onclick=async()=>{
    if(check.disabled)return;completedReport=undefined;checkExport.hidden=true;checkExport.disabled=true;delete checkStatus.dataset.checkedAt;clearProgress();resetResultView();const turn=viewVersion,controller=new AbortController(),run={turn,controller};activeCheck=run;checks.add(controller);check.disabled=true;cancelCheck.hidden=false;cancelCheck.disabled=false;checkStatus.textContent=t('Comprobando versiones…','Checking versions…');
    versionRows.forEach((row,i)=>{row.hidden=false;row.dataset.versionState=b.results[i].status==='success'?'checking':'no_link';row.textContent=b.results[i].status==='success'?t('Comprobando versión…','Checking version…'):versionLabel({state:'no_link'});});
    try{
     const report=await checkDeliveryBatchVersions(b,{request:versionRequest,signal:controller.signal,timeoutMs:versionTimeoutMs,onProgress:progress=>{
      if(activeCheck!==run||turn!==viewVersion||controller.signal.aborted||!dialog.open)return;checkStatus.dataset.completed=String(progress.completed);checkStatus.dataset.total=String(progress.total);checkStatus.dataset.withoutLink=String(progress.withoutLink);
      checkStatus.textContent=t('Comprobando versiones · ','Checking versions · ')+progress.completed+' '+t('de','of')+' '+progress.total+' '+word(progress.total,'consulta terminada','consultas terminadas','request completed','requests completed')+' · '+progress.withoutLink+' '+t(progress.withoutLink===1?'destino sin enlace.':'destinos sin enlace.',progress.withoutLink===1?'target without a link.':'targets without a link.');
     }});if(activeCheck!==run||turn!==viewVersion||report.cancelled||!dialog.open)return;
     clearProgress();report.results.forEach((result,i)=>{versionRows[i].dataset.versionState=result.state;versionRows[i].textContent=versionLabel(result);});const c=report.counts;checkStatus.dataset.checkedAt=report.checkedAt;
     checkStatus.textContent=t('Comprobado ','Checked ')+new Date(report.checkedAt).toLocaleString(doc.documentElement.lang==='en'?'en-GB':'es-ES')+' · '+c.available+' '+t(c.available===1?'disponible':'disponibles','available')+' · '+c.unavailable+' '+t(c.unavailable===1?'no disponible':'no disponibles','unavailable')+' · '+c.unknown+' '+t('sin poder comprobar','could not be checked')+' · '+c.no_link+' '+t('sin enlace confirmado.','without a confirmed link.');
     completedReport=report;completedTurn=turn;checkExport.hidden=false;checkExport.disabled=false;checkExport.setAttribute('aria-label',t('Descargar comprobación CSV de ','Download check CSV for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+report.checkedAt);
     resultView.hidden=false;incidents.disabled=false;reportScope.hidden=false;updateResultView();
     const issueCount=c.unavailable+c.unknown+c.no_link;copyIssues.hidden=!issueCount;copyIssues.disabled=!issueCount;copyIssues.setAttribute('aria-label',t('Copiar resumen de incidencias de ','Copy issue summary for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+report.checkedAt);
    }catch{if(activeCheck===run&&turn===viewVersion&&dialog.open){clearProgress();checkStatus.textContent=t('No se pudo completar la comprobación. Vuelve a intentarlo.','The check could not be completed. Try again.');versionRows.forEach((row,i)=>{if(b.results[i].status==='success'){row.dataset.versionState='unknown';row.textContent=versionLabel({state:'unknown'});}});}}
    finally{checks.delete(controller);if(activeCheck===run&&turn===viewVersion){activeCheck=undefined;check.disabled=!successful;cancelCheck.hidden=true;cancelCheck.disabled=true;}}
   };actions.append(check,cancelCheck);details.append(actions,copyStatus,fallback,checkStatus,resultView,issuesStatus,issuesFallback,checkExport,reportScope,ul);list.append(details);
  }
 };
 query.oninput=render;project.onchange=render;outcome.onchange=render;clear.onclick=()=>{query.value='';project.value='';outcome.value='';render();};
 const refreshHistory=(resetFilters=true)=>{
  backupAttempt++;
  const saved=readDeliveryHistory(storage),previousProject=resetFilters?'':project.value;batches=saved.ok?saved.data:[];comparisonSnapshot=JSON.stringify(batches);resetComparison();for(const select of [firstSelect,secondSelect]){select.replaceChildren(option('',t('Elegir lote','Choose batch')),...batches.map(b=>option(b.id,batchLabel(b))));select.value='';select.disabled=!saved.ok||batches.length<2;}compareButton.disabled=!saved.ok||batches.length<2;backup.disabled=!saved.ok||!batches.length;backupStatus.textContent='';backupHint.textContent=batches.length?t('Todo el historial, con cualquier filtro: ','All history, with any filter: ')+batches.length+' '+word(batches.length,'lote','lotes','batch','batches')+' · '+batches.reduce((count,b)=>count+b.results.length,0)+' '+word(batches.reduce((count,b)=>count+b.results.length,0),'destino.','destinos.','target.','targets.'):t('La copia incluye todos los lotes guardados; requiere un historial legible con al menos un lote.','The copy includes all saved batches; a readable history with at least one batch is required.');if(resetFilters){query.value='';outcome.value='';}project.replaceChildren(option('',t('Todos los proyectos','All projects')));
  const projects=new Map();for(const b of batches)if(!projects.has(b.projectId))projects.set(b.projectId,b.projectTitle);
  const names=new Map();for(const name of projects.values())names.set(name,(names.get(name)||0)+1);
  for(const [id,name] of projects)project.append(option(id,name+(names.get(name)>1?' · '+id:'')));project.value=previousProject;filters.hidden=!batches.length;list.replaceChildren();
  if(batches.length)render();else status.textContent=!saved.ok?t('No se puede leer el historial. Se conserva sin modificar; tus proyectos y enlaces preparados siguen disponibles.','History cannot be read. It is preserved unchanged; your projects and prepared links remain available.'):t('Todavía no hay envíos guardados en este navegador. Prepara un envío para iniciar el historial.','No deliveries saved in this browser yet. Prepare a delivery to start the history.');
 };
 button.onclick=()=>{guide.open=false;resetRestore();refreshHistory();dialog.showModal();};
 return dialog;
}
