// Keep Creator (and its verified, memory-only Google credential) alive while
// Director edits the shared project. The child receives no authentication data.
export function mountDirectorWorkspace({button,doc=document,win=window,prepare,onReturn,onCancel=()=>{},onError=()=>{}}){
 const t=(es,en)=>doc.documentElement.lang==='en'?en:es;
 let active;const ownedUrls=new Set();
 function close(){const current=active;active=null;current.frame.src='about:blank';current.dialog.close();current.dialog.remove();button.focus({preventScroll:true});}
 function requestReturn(){if(!active)return;if(!active.ready){onCancel(active.prepared);close();return;}active.frame.contentWindow.postMessage({type:'ainimation:director:request-return',id:active.id,channel:active.channel},win.location.origin);}
 button.onclick=()=>{if(active)return;try{
  const prepared=prepare(),id=prepared.interactiveSource.id,channel=win.crypto.randomUUID();
  const dialog=doc.createElement('dialog'),bar=doc.createElement('div'),status=doc.createElement('span'),back=doc.createElement('button'),frame=doc.createElement('iframe');
  dialog.id='directorWorkspace';dialog.setAttribute('aria-label',t('Director del interactivo','Interactive Director'));
  dialog.style.cssText='position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#102621;color:#e5f5df';
  bar.style.cssText='display:flex;align-items:center;gap:12px;padding:8px 12px;min-height:48px;box-sizing:border-box';
  status.setAttribute('role','status');status.textContent=t('Abriendo Director…','Opening Director…');back.type='button';back.textContent=t('Volver al Creador','Return to Creator');back.onclick=requestReturn;
  frame.title=t('Director del interactivo','Interactive Director');frame.style.cssText='width:100%;height:calc(100% - 48px);border:0;display:block';
  active={dialog,frame,status,id,channel,prepared,ready:false};bar.append(back,status);dialog.append(bar,frame);doc.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();try{requestReturn();}catch(error){onError(error);}});
  dialog.showModal();
  const url=new URL('/studio.html',win.location.origin);url.searchParams.set('interactive',id);url.searchParams.set('host','creator');url.searchParams.set('channel',channel);url.searchParams.set('enter','1');url.hash='workspace';frame.src=url.href;ownedUrls.add(url.href);if(ownedUrls.size>8)ownedUrls.delete(ownedUrls.values().next().value);
 }catch(error){onError(error);}};
 win.addEventListener('message',event=>{
  const a=active,data=event.data;
  if(!a||event.origin!==win.location.origin||event.source!==a.frame.contentWindow||data?.id!==a.id||data.channel!==a.channel)return;
  if(data.type==='ainimation:director:ready'){a.ready=true;a.status.textContent=t('La sesión del Creador se mantiene abierta.','Creator stays signed in.');return;}
  if(data.type!=='ainimation:director:return'||!Number.isSafeInteger(data.revision)||data.revision<1)return;
  try{onReturn({id:a.id,revision:data.revision});close();}catch(error){close();onError(error);}
 });
 // Storage events can arrive after the return message. Only suppress events
 // from our exact child URLs; other tabs retain the concurrent-edit warning.
 return {isOpen:()=>!!active,ownsStorageEvent:event=>ownedUrls.has(event.url)};
}
