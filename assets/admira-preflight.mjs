const ACTIONS=new Set(['goToMarker','playSegment','showCast','hideCast','setText','playSound','openUrl','stop','setVar','addToCart','clearCart','openCheckout','payAtCounter']);
const FACTS=new Set(['click','hover','frame','markerReached','idleSeconds','qrScanned','orderPaid','cartCount','hour','night','weekend']);
const issue=(level,message)=>({level,message});
export function inspectDirector(plan,{markers=plan.markers||[],compileScripts}={}){
 const issues=[],resources=[];let actions=0;
 const cast=plan.cast||[],sprites=[...cast,...(plan.stageItems||[])],names=new Set(sprites.map(s=>s.spriteName).filter(Boolean)),sounds=new Set(cast.filter(s=>s.mediaType==='audio').map(s=>s.spriteName||s.name||s.id).filter(Boolean)),marks=new Set(markers.map(m=>m.label));
 for(const member of cast){if(member.src)resources.push({name:member.name||member.src,src:member.src,type:member.mediaType==='animation'?'video':member.mediaType||'image'});else if(member.onStage)issues.push(issue('error','Falta el recurso de '+(member.name||'un miembro del Cast')+'.'));}
 if(!resources.length&&!(plan.stageItems||[]).length)issues.push(issue('error','La pieza no tiene recursos ni elementos en Stage.'));
 let rules=(plan.rules||[]).filter(r=>r.enabled!==false);
 if(plan.scripts&&(plan.scripts.movie||Object.keys(plan.scripts.frames||{}).length||Object.keys(plan.scripts.sprites||{}).length)){
  if(!compileScripts)issues.push(issue('error','No se ha podido comprobar el lenguaje de comportamientos.'));
  else{try{const compiled=compileScripts(plan.scripts);for(const e of compiled.errors||[])issues.push(issue('error','Comportamiento '+(e.scope||'')+': '+(e.es||e.message||'error de sintaxis')));rules=[...rules,...(compiled.rules||[])];issues.push(issue('warning','Los comportamientos se han compilado. Prueba sus respuestas en la vista táctil; esta comprobación no ejecuta todos sus caminos.'));}catch(e){issues.push(issue('error','No se han podido comprobar los comportamientos: '+e.message));}}
 }
 for(const rule of rules){
  for(const condition of rule.when?.conds||[]){if(!FACTS.has(condition.fact))issues.push(issue('error','Condición no disponible en el reproductor: '+condition.fact));if(['click','hover'].includes(condition.fact)&&condition.value&&!names.has(condition.value))issues.push(issue('error','La acción apunta a un elemento inexistente: '+condition.value));if(condition.fact==='markerReached'&&condition.value&&!marks.has(condition.value))issues.push(issue('error','No existe la marca '+condition.value+'.'));}
  for(const action of rule.do||[]){actions++;if(!ACTIONS.has(action.id))issues.push(issue('error','Acción no disponible en el reproductor: '+action.id));else if(['goToMarker','playSegment'].includes(action.id)&&!marks.has(action.value))issues.push(issue('error','No existe la marca de destino '+action.value+'.'));else if(['showCast','hideCast','setText','playSound'].includes(action.id)&&!(action.id==='playSound'?sounds:names).has(action.value))issues.push(issue('error','No existe el recurso o elemento de destino '+action.value+'.'));else if(action.id==='openUrl'){try{const u=new URL(action.value);if(!['http:','https:','mailto:','tel:'].includes(u.protocol))throw Error();}catch{issues.push(issue('error','La acción contiene un enlace no válido.'));}issues.push(issue('warning','Los enlaces externos no se abren en esta prueba aislada. Revisa su destino antes de publicar.'));}}
 }
 for(const item of plan.stageItems||[]){if(item.interactive===true){if(!item.text&&!item.label)issues.push(issue('warning','Hay un botón sin texto visible.'));if(Number(item.h||100)*(plan.stage?.h||1080)/100<44||Number(item.w||100)*(plan.stage?.w||1920)/100<44)issues.push(issue('warning','Hay un control táctil menor de 44 píxeles; revisa su tamaño.'));}}
 return{issues,resources,actions};
}
export function inspectStructured(project){
 const issues=[],resources=[],ids=new Set((project.scenes||[]).map(s=>s.id));let actions=0;
 if(!ids.has(project.start))issues.push(issue('error','La pantalla inicial no existe.'));
 for(const scene of project.scenes||[]){if(scene.image)resources.push({name:scene.title||scene.id,src:scene.image,type:'image'});for(const b of [...(scene.buttons||[]),...(scene.hotspots||[])]){actions++;if(!ids.has(b.target))issues.push(issue('error','Destino inexistente en '+(scene.title||scene.id)+': '+b.target));if(!b.label)issues.push(issue('warning','Hay una acción sin etiqueta.'));}}
 if(!actions)issues.push(issue('warning','No hay acciones de navegación. Comprueba si es el comportamiento esperado.'));
 return{issues,resources,actions};
}
export async function checkResources(resources,probe,{signal}={}){
 const entries=[...new Map(resources.map(r=>[r.type+' '+r.src,r])).values()],results=new Array(entries.length);let index=0;
 await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{while(index<entries.length){const i=index++,item=entries[i];if(signal?.aborted)throw new DOMException('Cancelado','AbortError');try{await probe(item,signal);results[i]={...item,ok:true};}catch(e){if(signal?.aborted)throw e;results[i]={...item,ok:false,error:e.message};}}}));return results;
}
export function probeMedia(item,signal){
 return new Promise((resolve,reject)=>{
  if(!['image','video','audio'].includes(item.type)){reject(Error('Tipo de recurso no comprobable.'));return;}
  if(!/^(https:|data:|blob:)/i.test(item.src||'')){reject(Error('La dirección del recurso no es compatible.'));return;}
  const el=document.createElement(item.type==='image'?'img':item.type);let ended=false;
  const finish=error=>{if(ended)return;ended=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);el.onload=el.onerror=el.onloadeddata=el.onloadedmetadata=null;el.pause?.();el.removeAttribute('src');if(el.load)el.load();error?reject(error):resolve();};
  const abort=()=>finish(new DOMException('Cancelado','AbortError')),timer=setTimeout(()=>finish(Error('No responde en 10 segundos. Revisa la conexión y reintenta.')),10000);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
  el.crossOrigin='anonymous';el.muted=true;el.preload='auto';el.onerror=()=>finish(Error('No se puede cargar o decodificar. Revisa el recurso y sus permisos de acceso.'));
  if(item.type==='image')el.onload=()=>finish(el.naturalWidth?null:Error('Imagen vacía.'));else if(item.type==='audio')el.onloadedmetadata=()=>finish();else el.onloadeddata=()=>finish();
  el.src=item.src;el.load?.();
 });
}

// One frozen review owns the exact preview/asset that will be published.
export async function openPublicationReview({snapshot,getCurrent,inspection,makePreview,probe=probeMedia,kind='interactive',onRelease=()=>{}}){
 if(document.querySelector('.admira-publication-review'))throw Error('Ya hay una revisión abierta. Ciérrala antes de abrir otra.');
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='admira-publication-review';dialog.setAttribute('aria-labelledby','admira-review-title');
 const css=document.createElement('style');css.textContent='.admira-publication-review{width:min(1050px,96vw);max-height:94svh;overflow:auto;padding:20px;background:#101923;color:#edf4f8;border:1px solid #658175;border-radius:12px;font:14px system-ui}.admira-publication-review::backdrop{background:#000b}.admira-publication-review header,.admira-publication-review nav,.admira-publication-review footer{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.admira-publication-review h2{margin:0;flex:1;font:700 24px/1.2 system-ui;letter-spacing:0}.admira-publication-review button{padding:10px 14px;cursor:pointer}.admira-publication-review button[aria-pressed=true]{outline:2px solid #8cdb74}.admira-review-screen{position:relative;margin:14px auto;background:#000;overflow:hidden}.admira-review-screen iframe,.admira-review-screen video{position:absolute;left:0;top:0;border:0;max-width:none!important;max-height:none!important;transform-origin:top left}.admira-publication-review [data-level=error]{color:#ffb6aa}.admira-publication-review [data-level=warning]{color:#ffe19b}.admira-publication-review ul{max-height:180px;overflow:auto}.admira-review-status{font-weight:700;margin:14px 0}';dialog.append(css);
 const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='admira-review-title';title.textContent='Revisar antes de publicar en Admira';close.type='button';close.textContent='Volver al editor';header.append(title,close);
 const status=document.createElement('p');status.className='admira-review-status';status.setAttribute('role','status');status.textContent='Comprobando recursos y acciones…';
 const summary=document.createElement('p');summary.textContent=kind==='video'?`${inspection.resources.length} recursos. Esta vista reproduce la misma grabación que se enviará a Admira.`:`${inspection.resources.length} recursos · ${inspection.actions} acciones. Las comprobaciones automáticas no sustituyen la prueba de las respuestas del interactivo.`;
 const list=document.createElement('ul'),nav=document.createElement('nav');nav.setAttribute('aria-label','Formato de previsualización');const screen=document.createElement('div');screen.className='admira-review-screen';
 const dimensions=document.createElement('p');dimensions.textContent='Horizontal · 1920 × 1080';
 const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.reviewAcknowledged='';label.append(check,document.createTextNode(kind==='video'?' He revisado el vídeo en los formatos necesarios.':' He probado las acciones necesarias en la vista táctil. Los enlaces externos y formularios están aislados en esta prueba.'));
 const publish=document.createElement('button');publish.type='button';publish.textContent='Publicar en Admira';publish.disabled=true;const footer=document.createElement('footer');footer.append(label,publish);
 dialog.append(header,status,summary,nav,screen,dimensions,list,footer);document.body.append(dialog);dialog.showModal();
 const previewToken=crypto.randomUUID();
 const controller=new AbortController();let ready=false,uploading=false,settled=false,artifact=null,media=null,objectUrl=null,format=0;
 const formats=[['Horizontal',1920,1080],['Vertical',1080,1920],['Pantalla táctil',768,1024]];
 const notices=[...inspection.issues];const add=(level,message)=>{const li=document.createElement('li');li.dataset.level=level;li.textContent=message;list.append(li);};notices.forEach(x=>add(x.level,x.message));
 const unchanged=()=>JSON.stringify(getCurrent())===JSON.stringify(snapshot);
 const refresh=()=>{publish.disabled=!ready||uploading||!check.checked||notices.some(x=>x.level==='error')||!unchanged();if(ready&&!uploading&&!unchanged())status.textContent='El proyecto ha cambiado. Vuelve al editor y abre una revisión nueva.';};
 const resize=()=>{if(!media)return;const[,w,h]=formats[format],scale=Math.min((dialog.clientWidth-44)/w,420/h,1);screen.style.width=w*scale+'px';screen.style.height=h*scale+'px';media.style.width=w+'px';media.style.height=h+'px';media.style.transform='scale('+scale+')';};
 formats.forEach(([name],index)=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.setAttribute('aria-pressed',String(index===0));button.onclick=()=>{format=index;dimensions.textContent=formats[index][0]+' · '+formats[index][1]+' × '+formats[index][2];nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));resize();};nav.append(button);});
 const receive=event=>{if(event.source!==media?.contentWindow||event.data?.token!==previewToken||event.data?.type!=='admira-preview-error')return;const message='Error del reproductor: '+String(event.data.message||'Error').slice(0,240);notices.push(issue('error',message));add('error',message);status.textContent='El reproductor ha detectado un error. Vuelve al editor para corregirlo.';refresh();};
 window.addEventListener('message',receive);
 const observer=new ResizeObserver(resize);observer.observe(dialog);check.onchange=refresh;
 let resolve;const answer=new Promise(r=>resolve=r);
 const dispose=()=>{controller.abort();observer.disconnect();window.removeEventListener('message',receive);media?.pause?.();if(media?.tagName==='IFRAME')media.srcdoc='';if(objectUrl)URL.revokeObjectURL(objectUrl);dialog.remove();onRelease();previous?.focus?.({preventScroll:true});};
 const cancel=()=>{if(uploading)return;if(!settled){settled=true;resolve(null);}dispose();};close.onclick=cancel;dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
 const session={artifact:null,setStatus(message){uploading=true;status.textContent=message;publish.disabled=true;close.disabled=true;},close:dispose,fail(message){uploading=false;status.textContent='No se ha publicado: '+message+' Tu proyecto sigue en el editor.';publish.hidden=true;close.disabled=false;close.focus();}};
 publish.onclick=()=>{refresh();if(publish.disabled)return;settled=true;uploading=true;session.artifact=artifact;session.setStatus('Preparando el envío a Admira…');resolve(session);};
 (async()=>{try{
  const resources=await checkResources(inspection.resources,probe,{signal:controller.signal});if(controller.signal.aborted)return;
  for(const r of resources){const level=r.ok?'info':'error',message=(r.ok?'Disponible: ':'Revisar: ')+r.name+(r.error?' · '+r.error:'');add(level,message);if(!r.ok)notices.push(issue('error',message));}
  if(notices.some(x=>x.level==='error')){status.textContent='Hay errores que resolver antes de publicar. El proyecto se conserva.';return;}
  status.textContent=kind==='video'?'Preparando la grabación que se va a publicar…':'Preparando el interactivo que se va a publicar…';artifact=await makePreview({signal:controller.signal});if(controller.signal.aborted)return;
  if(kind==='video'){media=document.createElement('video');media.controls=true;media.style.objectFit='contain';objectUrl=URL.createObjectURL(artifact.blob);media.src=objectUrl;}else{media=document.createElement('iframe');media.title='Prueba de la pieza antes de publicar';media.setAttribute('sandbox','allow-scripts');const monitor='<script>addEventListener("error",e=>parent.postMessage({type:"admira-preview-error",token:'+JSON.stringify(previewToken)+',message:e.message},"*"));addEventListener("unhandledrejection",e=>parent.postMessage({type:"admira-preview-error",token:'+JSON.stringify(previewToken)+',message:String(e.reason?.message||e.reason)},"*"));<\/script>';
   media.srcdoc=artifact.html.replace(/<html[^>]*>/i,match=>match+monitor);}
  const loaded=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('El reproductor no ha terminado de cargar.')),15000);const finish=()=>{clearTimeout(timeout);resolve();};media.addEventListener(kind==='video'?'loadedmetadata':'load',finish,{once:true});controller.signal.addEventListener('abort',finish,{once:true});});screen.append(media);resize();await loaded;if(controller.signal.aborted)return;ready=true;status.textContent=notices.some(x=>x.level==='error')?'El reproductor ha detectado errores. Vuelve al editor para corregirlos.':kind==='video'?'Recursos disponibles. Revisa el vídeo y confirma para publicar.':'Recursos disponibles y referencias de acciones comprobadas. Prueba la pieza y confirma para publicar.';refresh();
 }catch(error){if(controller.signal.aborted)return;notices.push(issue('error',error.message));add('error',error.message);status.textContent='No se ha podido completar la revisión. Vuelve al editor y reintenta.';}})();
 dialog.addEventListener('focusin',refresh);return answer;
}
