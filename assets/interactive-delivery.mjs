import {validate,playerHtml} from './interactive-project.mjs';
export function mountInteractiveDelivery({button,getState,endpoint,doc=document,request=fetch}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es;
 const dialog=doc.createElement('dialog');dialog.className='send-xpacio-dialog';dialog.setAttribute('aria-label',t('Enviar a Xpacio','Send to Xpace'));
 const title=doc.createElement('h2'),description=doc.createElement('p'),form=doc.createElement('form'),preview=doc.createElement('iframe'),status=doc.createElement('p'),location=doc.createElement('select'),screen=doc.createElement('select'),send=doc.createElement('button'),close=doc.createElement('button'),link=doc.createElement('a');
 preview.title=t('Versión que se enviará','Version to send');preview.setAttribute('sandbox','allow-scripts');status.setAttribute('role','status');location.required=screen.required=true;send.type='submit';send.className='primary';close.type='button';link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;link.className='button-link primary';
 const grid=doc.createElement('div');grid.className='send-xpacio-grid';
 function field(label,control){const n=doc.createElement('label'),text=doc.createElement('span');text.textContent=label;n.append(text,control);return n;}
 const locationField=field(t('Xpacio','Xpace'),location),screenField=field(t('Pantalla','Screen'),screen),note=doc.createElement('p');note.className='hint';
 note.textContent=t('Gemelo digital. El enlace permite ver esta versión; no cambia las playlists ni envía a hardware físico.','Digital twin. The link lets its holder view this version; it does not change playlists or send to physical hardware.');
 form.append(locationField,screenField,note,send);grid.append(form,preview);dialog.append(title,description,grid,status,link,close);doc.body.append(dialog);
 let state,destinations=[],busy=false;
 const option=(label,value)=>{const o=doc.createElement('option');o.textContent=label;o.value=value;return o;};
 function screens(){screen.replaceChildren(option(t('Elige una pantalla','Choose a screen'),''),...(destinations.find(d=>d.id===location.value)?.screens||[]).map(s=>option(s.name,s.id)));}
 location.onchange=screens;
 function hide(){if(busy)return;preview.removeAttribute('srcdoc');dialog.close();}
 close.onclick=hide;dialog.addEventListener('cancel',e=>{e.preventDefault();hide();});
 button.onclick=async()=>{
  title.textContent=t('Enviar a Xpacio','Send to Xpace');close.textContent=t('Cerrar','Close');send.textContent=t('Preparar envío','Prepare delivery');link.textContent=t('Abrir en admira.store','Open in admira.store');link.hidden=true;status.textContent='';
  try{state=getState();validate(state.project);if(!state.token)throw Error(t('Conecta tu cuenta Google antes de preparar el envío.','Connect your Google account before preparing a delivery.'));preview.srcdoc=playerHtml(state.project);description.textContent=state.project.title+' · '+t('Versión','Version')+' '+state.revision;dialog.showModal();send.disabled=true;
   const r=await request(endpoint+'/destinations',{headers:{authorization:'Bearer '+state.token},signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok)throw Error(data.error);destinations=data.destinations;location.replaceChildren(option(t('Elige un Xpacio','Choose a Xpace'),''),...destinations.map(d=>option(d.name,d.id)));screens();send.disabled=false;
  }catch(error){if(!dialog.open)dialog.showModal();status.textContent=error.message;send.disabled=true;}
 };
 form.onsubmit=async event=>{event.preventDefault();if(busy||!location.value||!screen.value)return;busy=true;send.disabled=close.disabled=true;status.textContent=t('Preparando la versión…','Preparing this version…');
  try{const r=await request(endpoint+'/deliveries',{method:'POST',headers:{authorization:'Bearer '+state.token,'content-type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({projectId:state.id,sourceRevision:state.revision,project:state.project,location:location.value,screen:screen.value})});const data=await r.json();if(!r.ok)throw Error(data.error||t('No se pudo preparar.','Could not prepare delivery.'));const u=new URL(data.storeUrl);if(u.origin!=='https://www.admira.store'||u.pathname!=='/admira-xp/')throw Error('Destino no válido');u.searchParams.set('lang',doc.documentElement.lang==='en'?'en':'es');link.href=u.href;link.hidden=false;status.textContent=t('Versión preparada. Ábrela en admira.store para revisarla y mostrarla en la pantalla elegida.','Version prepared. Open it in admira.store to review it and display it on the chosen screen.');
  }catch(error){status.textContent=error.name==='TimeoutError'?t('La conexión tardó demasiado. Puedes reintentar; tus proyectos se conservan.','The connection timed out. Retry safely; your projects are preserved.'):error.message;}finally{busy=false;send.disabled=close.disabled=false;}
 };
 return dialog;
}
