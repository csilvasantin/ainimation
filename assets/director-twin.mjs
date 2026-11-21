// Director → same-origin object preview. Frames never leave the browser or reach hardware.
export function fitFrame(ctx,source,width,height,fit='contain') {
  const sw=source.width,sh=source.height;
  if(!(sw>0&&sh>0))throw Error('El Stage no tiene dimensiones válidas.');
  const scale=(fit==='cover'?Math.max:Math.min)(width/sw,height/sh);
  ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
  ctx.drawImage(source,(width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale);
}
export function acceptsFrameRequest(event,{origin,source,session}){
  return Boolean(source&&session&&event.origin===origin&&event.source===source&&event.data?.session===session&&event.data?.type==='ain:director:request');
}

export function mountDirectorTwin(win=window,doc=document){
 const triggers=[...doc.querySelectorAll('[data-director-twin]')];const trigger=triggers[0];if(!trigger)return;
 const dialog=doc.createElement('dialog');dialog.className='director-twin-dialog';dialog.setAttribute('aria-label','Digital twin · Corsair Galleon 100 SD');
 dialog.innerHTML=`<header><strong>Admira Director · Corsair Galleon 100 SD</strong><button type="button" data-close>Volver a editar</button></header><div class="director-twin-tools"><label>Objeto<select aria-label="Objeto"><option>Corsair Galleon 100 SD</option></select></label><label>Superficie<select data-surface aria-label="Superficie"><option value="both">Pantalla superior y 12 teclas</option><option value="lcd">Pantalla superior · 720 × 384</option><option value="keys">Mosaico de 12 teclas · 480 × 640</option></select></label><label>Ajuste<select data-fit aria-label="Ajuste"><option value="contain">Completo · con márgenes</option><option value="cover">Llenar · recortar</option></select></label><button type="button" data-size>Usar formato de superficie</button><button type="button" data-play>Reproducir</button><button type="button" data-start>Al inicio</button><button type="button" data-demo>Añadir ejemplo animado</button></div><p data-state role="status">Conectando con el gemelo…</p><iframe title="Vista previa del Galleon desde Director" allow="autoplay"></iframe><footer>Vista previa local del Stage · no modifica la playlist ni envía al teclado físico. <a href="/digital-twins/help/" target="_blank" rel="noopener">Ayuda</a></footer>`;
 doc.body.append(dialog);
 const frame=dialog.querySelector('iframe'),state=dialog.querySelector('[data-state]'),surface=dialog.querySelector('[data-surface]'),fit=dialog.querySelector('[data-fit]'),play=dialog.querySelector('[data-play]');
 let session='',busy=false,ownPlayback=false;
 const horizontal=doc.createElement('canvas'),vertical=doc.createElement('canvas');horizontal.width=720;horizontal.height=384;vertical.width=480;vertical.height=640;
 const saveTarget=()=>{const plan=win.currentPlan();plan.digitalTwin={object:'galleon-100',surface:surface.value,fit:fit.value};win.saveFilmPlan(plan);};
 surface.onchange=fit.onchange=saveTarget;
 const open=()=>{
  if(!win.drawDirectorTwinStage||!win.ainTransport){win.alert('Director está terminando de cargar. Vuelve a intentarlo.');return;}
  const target=win.currentPlan().digitalTwin||{};surface.value=['both','lcd','keys'].includes(target.surface)?target.surface:'both';fit.value=target.fit==='cover'?'cover':'contain';
  session=win.crypto.randomUUID();state.textContent='Conectando con el gemelo…';frame.src='/digital-twins/galleon-100/?director=1&session='+encodeURIComponent(session);dialog.showModal();saveTarget();
 };
 dialog.querySelector('[data-size]').onclick=()=>{
  win.ainTransport?.stop();ownPlayback=false;const plan=win.currentPlan();
  plan.stage=surface.value==='keys'?{w:480,h:640}:{w:720,h:384};
  if(win.ainDirector?.setStageSize)win.ainDirector.setStageSize(plan.stage.w,plan.stage.h);else{win.ainStageSize.set(plan.stage.w,plan.stage.h);win.saveFilmPlan(plan);}
  win.renderFilmPlan(win.currentPlan());win.ainTransport.setFrame(1);
 };
 for(const button of triggers){button.addEventListener('pointerdown',event=>event.stopPropagation());button.onclick=open;}
 const close=()=>{if(ownPlayback)win.ainTransport?.stop();ownPlayback=false;session='';frame.src='about:blank';dialog.close();triggers.find(button=>button.getClientRects().length)?.focus();};
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 play.onclick=()=>{const transport=win.ainTransport;if(transport.isPlaying()){transport.stop();ownPlayback=false;}else{transport.play();ownPlayback=true;}};
 dialog.querySelector('[data-start]').onclick=()=>win.ainTransport?.setFrame(1);
 dialog.querySelector('[data-demo]').onclick=()=>{
  win.ainTransport?.stop();const plan=win.currentPlan(),id='galleon-demo-'+Date.now();
  const base={startFrame:1,durationFrames:96,opacity:1,rotation:0};
  const block={...base,id:id+'-shape',type:'rect-fill',x:5,y:58,w:18,h:22,color:'#00ff41',keyframes:[{frame:1,x:5,y:58,w:18,h:22,color:'#00ff41'},{frame:48,x:76,y:58,w:18,h:22,color:'#5cbcff'},{frame:96,x:5,y:58,w:18,h:22,color:'#00ff41'}]};
  const text={...base,id:id+'-text',type:'text',text:'ADMIRA · GALLEON',x:10,y:20,w:80,h:22,color:'#ffffff',fontSize:'64px',fontWeight:'850',keyframes:[{frame:1,x:10,y:20,w:80,h:22,opacity:1,text:'ADMIRA · GALLEON'},{frame:96,x:10,y:35,w:80,h:22,opacity:1,text:'ADMIRA · GALLEON'}]};
  plan.stageItems=[...(plan.stageItems||[]),block,text];plan.totalFrames=Math.max(Number(plan.totalFrames)||0,96);saveDemo(plan);
 };
 function saveDemo(plan){win.saveFilmPlan(plan);win.renderFilmPlan(plan);win.ainTransport.setFrame(1);state.textContent='Ejemplo añadido al proyecto. Pulsa Reproducir; puedes deshacerlo en Editar.';}
 win.addEventListener('message',async event=>{
  if(!dialog.open||busy||!acceptsFrameRequest(event,{origin:win.location.origin,source:frame.contentWindow,session}))return;
  busy=true;let a,b;const activeSession=session;const peer=frame.contentWindow;
  try{
   const source=win.drawDirectorTwinStage();
   for(const [canvas,active] of [[horizontal,surface.value!=='keys'],[vertical,surface.value!=='lcd']]){
    const ctx=canvas.getContext('2d');if(active)fitFrame(ctx,source,canvas.width,canvas.height,fit.value);else{ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);}
   }
   a=await win.createImageBitmap(horizontal);b=await win.createImageBitmap(vertical);
   if(!dialog.open||session!==activeSession){a.close();b.close();return;}
   peer.postMessage({type:'ain:director:frame',session:activeSession,landscape:a,portrait:b},win.location.origin,[a,b]);
   state.textContent='Stage conectado · '+(win.ainTransport.isPlaying()?'reproduciendo':'en pausa')+' · '+(win.currentPlan().title||'Proyecto actual');
   play.textContent=win.ainTransport.isPlaying()?'Pausar':'Reproducir';
  }catch(error){a?.close();b?.close();state.textContent='No se puede dibujar el Stage: '+error.message;frame.contentWindow.postMessage({type:'ain:director:error',session},win.location.origin);}
  finally{busy=false;}
 });
 if(new URLSearchParams(win.location.search).get('twin')==='galleon-100')open();
}
if(typeof window!=='undefined'){
 const boot=()=>mountDirectorTwin();if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
}
