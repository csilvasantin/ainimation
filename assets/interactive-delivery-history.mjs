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
// CSV is built from the same validated, metadata-only snapshot shown in History.
export function deliveryBatchCsv(input,language='es'){
 const b=cleanBatch(input),en=language==='en';
 const quote=value=>{let text=String(value);if(/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const headers=en?['Date (UTC)','Project','Version','Xpace','Xpace ID','Screen','Screen ID','Result','Link']:['Fecha (UTC)','Proyecto','Versión','Xpacio','ID Xpacio','Pantalla','ID pantalla','Resultado','Enlace'];
 const rows=b.results.map(r=>[b.createdAt,b.projectTitle,b.revision,r.locationName,r.locationId,r.screenName,r.screenId,r.status==='success'?(en?'Prepared':'Preparado'):r.status==='error'?(en?'Not prepared':'No preparado'):(en?'Unconfirmed':'Sin confirmación'),r.status==='success'?r.url:'']);
 return{filename:'ainimation-'+(en?'deliveries':'envios')+'-'+b.createdAt.slice(0,10)+'-v'+b.revision+'-'+b.id+'.csv',type:'text/csv;charset=utf-8',content:'\ufeff'+[headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n'};
}
export function mountDeliveryHistory({button,storage,doc=document,download}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es,make=(tag,value)=>{const n=doc.createElement(tag);if(value)n.textContent=value;return n;};
 const dialog=make('dialog');dialog.className='delivery-history-dialog';dialog.setAttribute('aria-label',t('Historial de envíos','Delivery history'));
 const title=make('h2',t('Historial de envíos','Delivery history')),hint=make('p',t('Últimos 30 lotes guardados en este navegador. Los enlaces conservan su versión; abrirlos no asigna el interactivo automáticamente.','Last 30 batches saved in this browser. Links preserve their version; opening them does not automatically assign the interactive.')),status=make('p'),list=make('div'),close=make('button',t('Cerrar historial','Close history'));status.setAttribute('role','status');close.type='button';close.onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});dialog.append(title,hint,status,list,close);doc.body.append(dialog);
 button.onclick=()=>{
  const saved=readDeliveryHistory(storage);list.replaceChildren();status.textContent=!saved.ok?t('No se puede leer el historial. Se conserva sin modificar; tus proyectos y enlaces preparados siguen disponibles.','History cannot be read. It is preserved unchanged; your projects and prepared links remain available.'):!saved.data.length?t('Todavía no hay envíos guardados en este navegador. Prepara un envío para iniciar el historial.','No deliveries saved in this browser yet. Prepare a delivery to start the history.'):'';
  if(saved.ok)for(const [i,b] of saved.data.entries()){
   const details=make('details'),summary=make('summary'),ul=make('ul');details.open=i===0;details.dataset.batchId=b.id;ul.className='delivery-results';
   const successful=b.results.filter(r=>r.status==='success').length;summary.textContent=b.projectTitle+' · '+t('Versión ','Version ')+b.revision+' · '+new Date(b.createdAt).toLocaleString(doc.documentElement.lang==='en'?'en-GB':'es-ES')+' · '+successful+'/'+b.results.length+' '+t('preparados','prepared');details.append(summary);
   for(const r of b.results){const li=make('li'),name=make('strong',r.locationName+' · '+r.screenName),label=make('span',r.status==='success'?t('Versión preparada','Version prepared'):r.status==='error'?t('No preparado','Not prepared'):t('Sin confirmación · el lote se interrumpió','Unconfirmed · the batch was interrupted'));li.dataset.state=r.status;li.append(name,label);
    if(r.url){const a=make('a',t('Abrir en admira.store','Open in admira.store'));a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',t('Abrir ','Open ')+r.locationName+' · '+r.screenName);li.append(a);}ul.append(li);
   }const exportButton=make('button',t('Descargar CSV','Download CSV'));exportButton.type='button';exportButton.className='history-csv';exportButton.setAttribute('aria-label',t('Descargar CSV de ','Download CSV for ')+b.projectTitle+' · '+t('versión ','version ')+b.revision+' · '+b.createdAt);
   exportButton.onclick=()=>{try{const file=deliveryBatchCsv(b,doc.documentElement.lang);if(download)download(file);else{const url=URL.createObjectURL(new Blob([file.content],{type:file.type})),a=doc.createElement('a');a.href=url;a.download=file.filename;try{a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),30000);}}status.textContent=t('Informe CSV preparado: ','CSV report prepared: ')+b.results.length+' '+t('pantallas.','screens.');}catch{status.textContent=t('No se pudo preparar el CSV. El historial se conserva; vuelve a intentarlo.','The CSV could not be prepared. History is preserved; try again.');}};
   details.append(exportButton,ul);list.append(details);
  }dialog.showModal();
 };
 return dialog;
}
