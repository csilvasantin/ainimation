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
export function deliveryVersionCheckCsv(input,report,language='es'){
 const b=cleanBatch(input),en=language==='en';
 if(!report||report.cancelled!==false||report.batchId!==b.id||report.projectId!==b.projectId||report.revision!==b.revision||!Array.isArray(report.results)||report.results.length!==b.results.length)throw Error('invalid_version_check');
 const checkedAt=date(report.checkedAt),counts={available:0,unavailable:0,unknown:0,no_link:0};
 const states=en?{available:'Available',unavailable:'Unavailable',unknown:'Could not be checked',no_link:'No confirmed link'}:{available:'Disponible',unavailable:'No disponible',unknown:'Sin poder comprobar',no_link:'Sin enlace confirmado'};
 const reasons=en?{matched:'Receipt, project, version and destination match',not_found:'Confirmed absence (404/410)',mismatch:'Metadata does not match this batch',request_failed:'Request or response could not be verified',no_link:'Not checked: no confirmed link'}:{matched:'Coinciden recibo, proyecto, versión y destino',not_found:'Ausencia confirmada (404/410)',mismatch:'Los datos no coinciden con este lote',request_failed:'No se pudo verificar la petición o respuesta',no_link:'Sin comprobar: no hay enlace confirmado'};
 const rows=b.results.map((r,i)=>{
  const v=report.results[i],id=r.url?new URL(r.url).searchParams.get('ainimation'):undefined;
  if(!v||v.locationId!==r.locationId||v.screenId!==r.screenId||v.receiptId!==id||!(r.status==='success'?(v.state==='available'&&v.reason==='matched')||(v.state==='unavailable'&&['not_found','mismatch'].includes(v.reason))||(v.state==='unknown'&&v.reason==='request_failed'):v.state==='no_link'&&v.reason==='no_link'))throw Error('invalid_version_check');
  counts[v.state]++;return[checkedAt,b.projectTitle,b.revision,r.locationName,r.locationId,r.screenName,r.screenId,states[v.state],reasons[v.reason],r.url||''];
 });
 if(!report.counts||Object.keys(counts).some(key=>report.counts[key]!==counts[key]))throw Error('invalid_version_check');
 const headers=en?['Checked at (UTC)','Project','Version','Xpace','Xpace ID','Screen','Screen ID','Version check','Reason','Confirmed link']:['Comprobado (UTC)','Proyecto','Versión','Xpacio','ID Xpacio','Pantalla','ID pantalla','Comprobación de versión','Motivo','Enlace confirmado'];
 return{filename:'ainimation-'+(en?'version-check':'comprobacion')+'-'+checkedAt.replace(/[:.]/g,'-')+'-v'+b.revision+'-'+b.id+'.csv',type:'text/csv;charset=utf-8',content:'\ufeff'+[headers,...rows].map(row=>row.map(csvQuote).join(',')).join('\r\n')+'\r\n'};
}
export function deliveryBatchLinks(input,language='es'){
 const b=cleanBatch(input),en=language==='en',confirmed=b.results.filter(r=>r.status==='success'),missing=b.results.length-confirmed.length;
 const line=value=>value.replace(/[\p{Cc}\p{Cf}]+/gu,' ').replace(/\s+/g,' ').trim();
 const count=confirmed.length,summary=count+' '+(en?(count===1?'confirmed link':'confirmed links'):(count===1?'enlace confirmado':'enlaces confirmados'))+' · '+missing+' '+(en?(missing===1?'target without a link':'targets without a link'):(missing===1?'destino sin enlace':'destinos sin enlace'));
 const text=[line(b.projectTitle)+' · '+(en?'Version ':'Versión ')+b.revision,summary,...confirmed.map(r=>line(r.locationName)+' · '+line(r.screenName)+'\n'+r.url)].join('\n\n');
 return{text,count,missing,summary};
}
const VERSION_METADATA_URL='https://ainimation-interactive-library-preview.csilvasantin.workers.dev/api/deliveries/';
// Read public metadata only. Never send credentials or follow a receipt redirect.
export async function checkDeliveryBatchVersions(input,{request=fetch,signal,timeoutMs=10000,now=()=>new Date().toISOString()}={}){
 const b=cleanBatch(input),waiting=[],results=b.results.map((r,i)=>{if(r.status==='success')waiting.push(i);return{locationId:r.locationId,screenId:r.screenId,...(r.url?{receiptId:new URL(r.url).searchParams.get('ainimation')}:{}),state:r.status==='success'?'unknown':'no_link',reason:r.status==='success'?'not_checked':'no_link'};});
 const limit=Math.max(1,Math.min(Number.isFinite(timeoutMs)?timeoutMs:10000,15000));let next=0;
 const inspect=async r=>{
  const id=new URL(r.url).searchParams.get('ainimation'),controller=new AbortController();let timer,cancel;
  const deadline=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(Error('cancelled'));};timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},limit);signal?.addEventListener('abort',cancel,{once:true});});
  const read=async()=>{
   const response=await request(VERSION_METADATA_URL+id,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   if(response.status===404||response.status===410)return{state:'unavailable',reason:'not_found'};
   if(!response.ok)return{state:'unknown',reason:'request_failed'};
   const data=await response.json(),matches=data?.id===id&&data.projectId===b.projectId&&data.sourceRevision===b.revision&&data.destination?.id===r.locationId&&data.destination.screen?.id===r.screenId&&data.destination.screen.touch===true;
   return matches?{state:'available',reason:'matched'}:{state:'unavailable',reason:'mismatch'};
  };
  try{return await Promise.race([read(),deadline]);}catch{return{state:'unknown',reason:'request_failed'};}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 };
 const work=async()=>{while(next<waiting.length&&!signal?.aborted){const i=waiting[next++];results[i]={...results[i],...await inspect(b.results[i])};}};
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
export function mountDeliveryHistory({button,storage,doc=document,download,onReuse,writeClipboard,versionRequest=fetch,versionTimeoutMs=10000}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es,make=(tag,value)=>{const n=doc.createElement(tag);if(value)n.textContent=value;return n;};
 const downloadFile=file=>{if(download)return download(file);const url=URL.createObjectURL(new Blob([file.content],{type:file.type})),a=doc.createElement('a');a.href=url;a.download=file.filename;try{a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}};
 let viewVersion=0;const checks=new Set(),cancelChecks=()=>{viewVersion++;for(const controller of checks)controller.abort();checks.clear();};
 const dialog=make('dialog');dialog.className='delivery-history-dialog';dialog.setAttribute('aria-label',t('Historial de envíos','Delivery history'));
 const title=make('h2',t('Historial de envíos','Delivery history')),hint=make('p',t('Últimos 30 lotes guardados en este navegador. Los enlaces conservan su versión; abrirlos no asigna el interactivo automáticamente.','Last 30 batches saved in this browser. Links preserve their version; opening them does not automatically assign the interactive.')),status=make('p'),list=make('div'),close=make('button',t('Cerrar historial','Close history'));status.setAttribute('role','status');list.className='history-batches';close.type='button';close.onclick=()=>{cancelChecks();dialog.close();};dialog.addEventListener('cancel',event=>{event.preventDefault();cancelChecks();dialog.close();});dialog.addEventListener('close',cancelChecks);
 const filters=make('div'),searchLabel=make('label',t('Buscar lotes','Search batches')),query=make('input'),projectLabel=make('label',t('Proyecto del lote','Batch project')),project=make('select'),outcomeLabel=make('label',t('Resultado del lote','Batch result')),outcome=make('select'),clear=make('button',t('Quitar filtros','Clear filters'));
 filters.className='history-filters';searchLabel.className='history-search';query.className='history-query';query.type='search';query.placeholder=t('Proyecto, versión, Xpacio o pantalla','Project, version, Xpace or screen');query.maxLength=300;project.className='history-project';outcome.className='history-outcome';clear.className='history-clear';clear.type='button';
 const option=(value,label)=>{const n=make('option',label);n.value=value;return n;};
 const outcomeText=value=>value==='complete'?t('Completo','Complete'):value==='error'?t('Con errores','With errors'):t('Sin confirmación','Unconfirmed');
 outcome.append(option('',t('Todos los resultados','All results')),...['complete','error','unconfirmed'].map(value=>option(value,outcomeText(value))));
 searchLabel.append(query);projectLabel.append(project);outcomeLabel.append(outcome);filters.append(searchLabel,projectLabel,outcomeLabel,clear);dialog.append(title,hint,filters,status,list,close);doc.body.append(dialog);
 let batches=[];
 const render=()=>{
  cancelChecks();
  const shown=filterDeliveryHistory(batches,{query:query.value,projectId:project.value,outcome:outcome.value});list.replaceChildren();
  clear.disabled=!query.value&&!project.value&&!outcome.value;
  status.textContent=shown.length+' '+t('de','of')+' '+batches.length+' '+t('lotes.','batches.')+(!shown.length?' '+t('No hay lotes que coincidan. Quita los filtros para ver todos.','No matching batches. Clear filters to see all batches.'):'');
  for(const [i,b] of shown.entries()){
   const details=make('details'),summary=make('summary'),ul=make('ul'),actions=make('div'),versionRows=[];details.open=i===0;details.dataset.batchId=b.id;ul.className='delivery-results';actions.className='history-batch-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label',t('Acciones del lote','Batch actions'));
   const successful=b.results.filter(r=>r.status==='success').length;summary.textContent=b.projectTitle+' · '+t('Versión ','Version ')+b.revision+' · '+new Date(b.createdAt).toLocaleString(doc.documentElement.lang==='en'?'en-GB':'es-ES')+' · '+successful+'/'+b.results.length+' '+t('preparados','prepared')+' · '+outcomeText(deliveryBatchOutcome(b));details.append(summary);
   for(const r of b.results){const li=make('li'),name=make('strong',r.locationName+' · '+r.screenName),label=make('span',r.status==='success'?t('Versión preparada','Version prepared'):r.status==='error'?t('No preparado','Not prepared'):t('Sin confirmación · el lote se interrumpió','Unconfirmed · the batch was interrupted'));li.dataset.state=r.status;li.append(name,label);
    if(r.url){const a=make('a',t('Abrir en admira.store','Open in admira.store'));a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',t('Abrir ','Open ')+r.locationName+' · '+r.screenName);li.append(a);}const version=make('span');version.className='history-version-state';version.hidden=true;versionRows.push(version);li.append(version);ul.append(li);
   }const exportButton=make('button',t('Descargar CSV','Download CSV'));exportButton.type='button';exportButton.className='history-csv';exportButton.setAttribute('aria-label',t('Descargar CSV de ','Download CSV for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);
   exportButton.onclick=()=>{try{downloadFile(deliveryBatchCsv(b,doc.documentElement.lang));status.textContent=t('Informe CSV preparado: ','CSV report prepared: ')+b.results.length+' '+t('pantallas.','screens.');}catch{status.textContent=t('No se pudo preparar el CSV. El historial se conserva; vuelve a intentarlo.','The CSV could not be prepared. History is preserved; try again.');}};
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
   const versionLabel=result=>result.state==='available'?t('Versión disponible','Version available'):result.state==='no_link'?t('Sin enlace confirmado · sin comprobar','No confirmed link · not checked'):result.reason==='mismatch'?t('Los datos no coinciden con este lote','Metadata does not match this batch'):result.state==='unavailable'?t('Versión no disponible','Version unavailable'):t('No se pudo comprobar la versión','Could not check the version');
   let completedReport,completedTurn;const checkExport=make('button',t('Descargar comprobación CSV','Download check CSV'));checkExport.type='button';checkExport.className='history-version-csv';checkExport.hidden=true;checkExport.disabled=true;
   checkExport.onclick=()=>{if(checkExport.disabled||!completedReport||completedTurn!==viewVersion||!dialog.open)return;try{downloadFile(deliveryVersionCheckCsv(b,completedReport,doc.documentElement.lang));status.textContent=t('Informe de comprobación preparado: ','Version check report prepared: ')+b.results.length+' '+t('pantallas.','screens.');}catch{status.textContent=t('No se pudo preparar el informe de comprobación. Vuelve a comprobar las versiones e inténtalo de nuevo.','The version check report could not be prepared. Check the versions again and retry.');}};
   check.onclick=async()=>{
    if(check.disabled)return;completedReport=undefined;checkExport.hidden=true;checkExport.disabled=true;delete checkStatus.dataset.checkedAt;const turn=viewVersion,controller=new AbortController();checks.add(controller);check.disabled=true;checkStatus.textContent=t('Comprobando versiones…','Checking versions…');
    versionRows.forEach((row,i)=>{row.hidden=false;row.dataset.versionState=b.results[i].status==='success'?'checking':'no_link';row.textContent=b.results[i].status==='success'?t('Comprobando versión…','Checking version…'):versionLabel({state:'no_link'});});
    try{
     const report=await checkDeliveryBatchVersions(b,{request:versionRequest,signal:controller.signal,timeoutMs:versionTimeoutMs});if(turn!==viewVersion||report.cancelled||!dialog.open)return;
     report.results.forEach((result,i)=>{versionRows[i].dataset.versionState=result.state;versionRows[i].textContent=versionLabel(result);});const c=report.counts;checkStatus.dataset.checkedAt=report.checkedAt;
     checkStatus.textContent=t('Comprobado ','Checked ')+new Date(report.checkedAt).toLocaleString(doc.documentElement.lang==='en'?'en-GB':'es-ES')+' · '+c.available+' '+t(c.available===1?'disponible':'disponibles','available')+' · '+c.unavailable+' '+t(c.unavailable===1?'no disponible':'no disponibles','unavailable')+' · '+c.unknown+' '+t('sin poder comprobar','could not be checked')+' · '+c.no_link+' '+t('sin enlace confirmado.','without a confirmed link.');
     completedReport=report;completedTurn=turn;checkExport.hidden=false;checkExport.disabled=false;checkExport.setAttribute('aria-label',t('Descargar comprobación CSV de ','Download check CSV for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+report.checkedAt);
    }catch{if(turn===viewVersion&&dialog.open){checkStatus.textContent=t('No se pudo completar la comprobación. Vuelve a intentarlo.','The check could not be completed. Try again.');versionRows.forEach((row,i)=>{if(b.results[i].status==='success'){row.dataset.versionState='unknown';row.textContent=versionLabel({state:'unknown'});}});}}
    finally{checks.delete(controller);if(turn===viewVersion)check.disabled=!successful;}
   };actions.append(check);details.append(actions,copyStatus,fallback,checkStatus,checkExport,ul);list.append(details);
  }
 };
 query.oninput=render;project.onchange=render;outcome.onchange=render;clear.onclick=()=>{query.value='';project.value='';outcome.value='';render();};
 button.onclick=()=>{
  const saved=readDeliveryHistory(storage);batches=saved.ok?saved.data:[];query.value='';outcome.value='';project.replaceChildren(option('',t('Todos los proyectos','All projects')));
  const projects=new Map();for(const b of batches)if(!projects.has(b.projectId))projects.set(b.projectId,b.projectTitle);
  const names=new Map();for(const name of projects.values())names.set(name,(names.get(name)||0)+1);
  for(const [id,name] of projects)project.append(option(id,name+(names.get(name)>1?' · '+id:'')));project.value='';filters.hidden=!batches.length;list.replaceChildren();
  if(batches.length)render();else status.textContent=!saved.ok?t('No se puede leer el historial. Se conserva sin modificar; tus proyectos y enlaces preparados siguen disponibles.','History cannot be read. It is preserved unchanged; your projects and prepared links remain available.'):t('Todavía no hay envíos guardados en este navegador. Prepara un envío para iniciar el historial.','No deliveries saved in this browser yet. Prepare a delivery to start the history.');
  dialog.showModal();
 };
 return dialog;
}
