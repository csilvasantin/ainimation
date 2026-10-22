import {validate,playerHtml} from './interactive-project.mjs';
const historyModule=new URL('./interactive-delivery-history.mjs',import.meta.url);historyModule.search=new URL(import.meta.url).search;
const {saveDeliveryBatch,mountDeliveryHistory}=await import(historyModule.href);
export function mountInteractiveDelivery({button,historyButton,storage,getState,endpoint,doc=document,request=fetch}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es;
 const make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const dialog=make('dialog',null,'send-xpacio-dialog');dialog.setAttribute('aria-label',t('Enviar a Xpacios','Send to Xpaces'));
 const title=make('h2',t('Enviar a Xpacios','Send to Xpaces')),description=make('p'),form=make('form'),preview=make('iframe'),status=make('p'),location=make('select'),send=make('button'),close=make('button',t('Cerrar','Close')),list=make('div',null,'delivery-targets'),results=make('ul',null,'delivery-results'),all=make('button',t('Seleccionar visibles','Select visible')),clear=make('button',t('Quitar selección','Clear selection')),coverage=make('p',null,'hint');
 preview.title=t('Versión que se enviará','Version to send');preview.setAttribute('sandbox','allow-scripts');status.setAttribute('role','status');results.setAttribute('aria-label',t('Resultado por pantalla','Results by screen'));results.hidden=true;
 send.type='submit';send.className='primary';close.type=all.type=clear.type='button';location.setAttribute('aria-label',t('Xpacio','Xpace'));list.setAttribute('aria-label',t('Pantallas táctiles','Touch screens'));
 const grid=make('div',null,'send-xpacio-grid'),field=make('label'),tools=make('div',null,'tools'),note=make('p',t('Gemelo digital. Cada enlace conserva esta versión; no cambia las playlists ni envía a hardware físico.','Digital twin. Each link preserves this version; it does not change playlists or send to physical hardware.'),'hint');
 field.append(make('span',t('Xpacio','Xpace')),location);tools.append(all,clear);form.append(field,tools,list,coverage,note,send);grid.append(form,preview);dialog.append(title,description,grid,status,results,close);doc.body.append(dialog);
 const historyNote=make('p',null,'hint');historyNote.setAttribute('role','status');dialog.append(historyNote);
 if(historyButton)mountDeliveryHistory({button:historyButton,storage,doc,onReuse:targets=>openDelivery(targets)});
 let state,batch,rows=[],reuseTargets=[],busy=false,loading=false,generation=0;const outcomes=new Map();
 function remember(){
  if(!historyButton&&!storage)return;
  batch||={id:crypto.randomUUID(),projectId:state.id,projectTitle:state.project.title,revision:state.revision,createdAt:new Date().toISOString()};
  const saved=saveDeliveryBatch(storage,{...batch,updatedAt:new Date().toISOString(),results:[...outcomes].map(([key,o])=>{const r=rows.find(r=>r.key===key);return{locationId:r.location.id,locationName:r.location.name,screenId:r.screen.id,screenName:r.screen.name,status:o.status,...(o.url?{url:o.url}:{})};})});
  historyNote.textContent=saved.ok?t('Lote guardado en el historial de este navegador.','Batch saved in this browser’s history.'):t('No se pudo guardar el historial. Conserva los enlaces de este diálogo antes de salir; tus proyectos no han cambiado.','History could not be saved. Keep the links in this dialog before leaving; your projects are unchanged.');
 }
 const eligible=r=>r.screen.touch===true&&r.screen.available!==false;
 const selected=()=>rows.filter(r=>eligible(r)&&r.check.checked);
 const pending=()=>selected().filter(r=>outcomes.get(r.key)?.status!=='success');
 const option=(label,value)=>{const n=make('option',label);n.value=value;return n;};
 function controls(){
  for(const r of rows)r.check.disabled=busy||loading||!eligible(r);
  location.disabled=all.disabled=clear.disabled=busy||loading;close.disabled=busy;send.disabled=busy||loading||!pending().length;
  const n=pending().length;send.textContent=(outcomes.size?t('Preparar / reintentar','Prepare / retry'):t('Preparar','Prepare'))+' '+n+' '+t(n===1?'envío':'envíos',n===1?'delivery':'deliveries');
 }
 function filter(){
  const visible=rows.filter(r=>!location.value||r.location.id===location.value);
  for(const r of rows)r.row.hidden=!visible.includes(r);
  const missing=visible.filter(r=>!eligible(r)),reusedAvailable=rows.filter(r=>r.reused&&eligible(r)).length;
  coverage.textContent=(reuseTargets.length?reusedAvailable+' / '+reuseTargets.length+' '+t('pantallas del lote disponibles. Se usará la versión del proyecto abierto ahora. ','batch screens available. The current open project version will be used. '):'')+(missing.length?t('Pantallas no disponibles: ','Unavailable screens: ')+missing.map(r=>r.location.name+' · '+r.screen.name+' ('+r.reason+')').join(', ')+'. '+(missing.some(r=>r.screen.touch===true&&r.screen.available===false)?t('No se puede asignar hasta conectar su receptor.','Assignment requires a connected receiver.'):t('No se enviará a estas pantallas.','These screens will not receive a delivery.')):'');
  status.textContent=!visible.some(eligible)?t('Este Xpacio no tiene pantallas táctiles disponibles.','This Xpace has no touch screens available.'):'';controls();
 }
 location.onchange=filter;
 all.onclick=()=>{for(const r of rows)if(!r.row.hidden&&eligible(r))r.check.checked=true;controls();};
 clear.onclick=()=>{for(const r of rows)r.check.checked=false;controls();};
 function renderResults(){
  results.hidden=!outcomes.size;results.replaceChildren();
  for(const [key,o] of outcomes){const r=rows.find(r=>r.key===key),item=make('li'),name=make('strong',r.location.name+' · '+r.screen.name),detail=make('span',o.message);item.dataset.state=o.status;item.append(name,detail);
   if(o.url){const a=make('a',t('Abrir en admira.store','Open in admira.store'));a.href=o.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',t('Abrir ','Open ')+r.location.name+' · '+r.screen.name);item.append(a);}results.append(item);
  }
 }
 function hide(){if(busy)return;generation++;loading=false;preview.removeAttribute('srcdoc');dialog.close();}
 close.onclick=hide;dialog.addEventListener('cancel',e=>{e.preventDefault();hide();});
 async function openDelivery(targets=[]){
  if(dialog.open||busy)return;const turn=++generation;batch=undefined;historyNote.textContent='';reuseTargets=targets;rows=[];outcomes.clear();list.replaceChildren();results.replaceChildren();results.hidden=true;coverage.textContent='';location.replaceChildren(option(t('Todos los Xpacios','All Xpaces'),''));loading=true;controls();status.textContent=t('Buscando pantallas táctiles…','Finding touch screens…');
  try{
   const current=getState();validate(current.project);if(!current.token)throw Error(t('Conecta tu cuenta Google antes de preparar el envío.','Connect your Google account before preparing a delivery.'));
   state={...current,project:structuredClone(current.project)};preview.srcdoc=playerHtml(state.project);description.textContent=state.project.title+' · '+t('Versión guardada','Saved version')+' '+state.revision;dialog.showModal();
   const response=await request(endpoint+'/destinations',{headers:{authorization:'Bearer '+state.token},signal:AbortSignal.timeout(30000)}),data=await response.json();if(turn!==generation)return;if(!response.ok)throw Error(data.error);
   if(data.coverage?.error)description.textContent+=' · '+t('No se pudo revisar el inventario completo. Se muestran los destinos ya conectados.','The full inventory could not be checked. Showing connected destinations.');
   const destinations=data.destinations;location.replaceChildren(option(t('Todos los Xpacios','All Xpaces'),''),...destinations.map(d=>option(d.name,d.id)));
   const wanted=new Set(reuseTargets.map(r=>JSON.stringify([r.locationId,r.screenId]))),seen=new Set();
   function addRow(d,s,reason=''){
    const key=JSON.stringify([d.id,s.id]);if(seen.has(key))return;seen.add(key);const reused=wanted.has(key),usable=s.touch===true&&s.available!==false;
    reason||=s.touch!==true?t('capacidad táctil sin confirmar','touch capability unconfirmed'):s.available===false?t('receptor pendiente','receiver pending'):'';
    const row=make('label',null,'delivery-target'),check=make('input'),text=make('span',d.name+' · '+s.name+(reason?' · '+reason:''));check.type='checkbox';check.checked=reused&&usable;check.onchange=controls;row.append(check,text);list.append(row);rows.push({key,location:d,screen:s,row,check,reused,reason});
   }
   for(const d of destinations)for(const s of d.screens.filter(s=>s.touch===true))addRow(d,s);
   for(const r of reuseTargets)if(!seen.has(JSON.stringify([r.locationId,r.screenId]))){
    const d=destinations.find(d=>d.id===r.locationId),s=d?.screens.find(s=>s.id===r.screenId);
    addRow(d||{id:r.locationId,name:r.locationName},s||{id:r.screenId,name:r.screenName,touch:false,available:false},s?t('capacidad táctil sin confirmar','touch capability unconfirmed'):t('ya no consta en los destinos disponibles','no longer listed in available destinations'));
   }
   loading=false;filter();
  }catch(error){if(turn!==generation)return;loading=false;if(!dialog.open)dialog.showModal();status.textContent=error.message;controls();}
 }
 button.onclick=()=>openDelivery();
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||loading)return;const targets=pending();if(!targets.length){status.textContent=t('Selecciona una pantalla táctil disponible.','Select an available touch screen.');controls();return;}
  // Recheck the saved revision once. All requests and retries keep the same opening snapshot.
  try{const current=getState();if(current.id!==state.id||current.revision!==state.revision||JSON.stringify(current.project)!==JSON.stringify(state.project))throw Error(t('El proyecto cambió. Cierra y vuelve a abrir Enviar a Xpacios para revisar la nueva versión.','The project changed. Close and reopen Send to Xpaces to review the new version.'));if(!current.token)throw Error(t('Conecta tu cuenta Google antes de preparar el envío.','Connect your Google account before preparing a delivery.'));state.token=current.token;}catch(error){status.textContent=error.message;return;}
  busy=true;controls();for(const r of targets)outcomes.set(r.key,{status:'pending',message:t('Pendiente','Pending')});renderResults();remember();
  for(const [i,r] of targets.entries()){
   status.textContent=t('Preparando ','Preparing ')+(i+1)+' / '+targets.length+'…';outcomes.set(r.key,{status:'sending',message:t('Preparando…','Preparing…')});renderResults();
   try{
    const response=await request(endpoint+'/deliveries',{method:'POST',headers:{authorization:'Bearer '+state.token,'content-type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({projectId:state.id,sourceRevision:state.revision,project:state.project,location:r.location.id,screen:r.screen.id})}),data=await response.json();if(!response.ok)throw Error(data.error||t('No se pudo preparar.','Could not prepare delivery.'));
    const u=new URL(data.storeUrl);if(u.origin!=='https://www.admira.store'||!['/admira-xp/','/xpacios/pantalla/'].includes(u.pathname)||u.searchParams.get('loc')!==r.location.id||data.destination?.id!==r.location.id||data.destination?.screen?.id!==r.screen.id||data.destination.screen.touch!==true||data.projectId!==state.id||data.sourceRevision!==state.revision||(u.pathname==='/xpacios/pantalla/'&&u.searchParams.get('screen')!==r.screen.id))throw Error(t('El resultado no corresponde a esta pantalla o versión.','The result does not match this screen or version.'));
    u.searchParams.set('lang',doc.documentElement.lang==='en'?'en':'es');outcomes.set(r.key,{status:'success',message:t('Versión preparada','Version prepared'),url:u.href});
   }catch(error){outcomes.set(r.key,{status:'error',message:error.name==='TimeoutError'?t('La conexión tardó demasiado. Reintenta este envío.','The connection timed out. Retry this delivery.'):error.message});}
   renderResults();remember();
  }
  busy=false;controls();const done=[...outcomes.values()].filter(o=>o.status==='success').length,failed=[...outcomes.values()].filter(o=>o.status==='error').length;
  status.textContent=done+' '+t('preparados','prepared')+' · '+failed+' '+t('con error','failed')+'. '+(failed?t('Reintentar conserva los enlaces ya preparados.','Retry preserves the links already prepared.'):t('Abre cada enlace para asignar y restaurar en su escena 3D.','Open each link to assign and restore in its 3D scene.'));
 };
 return dialog;
}
