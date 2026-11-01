import {validatePresentation, demo, acceptsMessage, trustedGeneratorOrigin, MAX_BYTES} from './contract.mjs';
import {toDirector, prepareDirector, restoreDirector} from './director.mjs';
const $ = id => document.getElementById(id);
let deck, index=0, recoveryKey='';
function notice(message){$('notice').textContent=message;}
function show(next, focus=false){
  index=Math.max(0,Math.min(deck.slides.length-1,next));const slide=deck.slides[index];
  $('chapter').textContent=slide.chapter;$('title').textContent=slide.title;
  $('title').classList.toggle('long',slide.title.length>80);$('message').textContent=slide.message;
  $('detail').textContent=slide.detail;$('detail').hidden=true;$('explore').hidden=!slide.detail;
  $('explore').setAttribute('aria-expanded','false');$('explore').firstChild.textContent='Explorar la idea ';
  $('position').textContent=`${String(index+1).padStart(2,'0')} / ${String(deck.slides.length).padStart(2,'0')}`;
  $('scene-number').textContent=String(index+1).padStart(2,'0');
  $('previous').disabled=index===0;$('next').disabled=index===deck.slides.length-1;
  $('progress').style.width=((index+1)/deck.slides.length*100)+'%';
  $('scene').classList.remove('enter');void $('scene').offsetWidth;$('scene').classList.add('enter');
  if(focus)$('presentation').focus({preventScroll:true});
}
function load(input){
  const clean=validatePresentation(input);deck=clean;document.title=deck.title+' · AINimation';
  $('scene').lang=deck.source.language;
  $('source').textContent=deck.source.id==='demo-ainimation'?'Demo de diseño · contenido ficticio':
    `AdmiraNeXT / ${deck.source.id} · ${deck.source.language.toUpperCase()} · copia del guion`;
  show(0);notice('');
}
$('previous').onclick=()=>show(index-1,true);$('next').onclick=()=>show(index+1,true);
$('explore').onclick=()=>{const expanded=$('explore').getAttribute('aria-expanded')!=='true';$('detail').hidden=!expanded;$('explore').setAttribute('aria-expanded',String(expanded));$('explore').firstChild.textContent=expanded?'Cerrar detalle ':'Explorar la idea ';};
$('map').onclick=()=>{
  $('map-list').replaceChildren(...deck.slides.map((slide,i)=>{const b=document.createElement('button'),n=document.createElement('span'),label=document.createElement('strong');n.textContent=String(i+1).padStart(2,'0')+' / '+slide.chapter;label.textContent=slide.title;b.append(n,label);b.setAttribute('aria-current',String(index===i));b.onclick=()=>{$('scene-map').close();show(i,true);};return b;}));$('scene-map').showModal();
};
$('close-map').onclick=()=>$('scene-map').close();
$('motion').onclick=()=>{const paused=document.body.classList.toggle('paused');$('motion').setAttribute('aria-pressed',String(paused));$('motion').textContent=paused?'Activar movimiento':'Detener movimiento';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('La pantalla completa no está disponible en este panel.');}};
document.addEventListener('keydown',event=>{
  if(!deck)return;
  if(event.altKey||event.ctrlKey||event.metaKey||$('scene-map').open||event.target.closest('button,input,a,textarea,select'))return;
  if(['ArrowRight','ArrowLeft','Home','End','m','M',' '].includes(event.key))event.preventDefault();
  if(event.key==='ArrowRight')show(index+1,true);if(event.key==='ArrowLeft')show(index-1,true);
  if(event.key==='Home')show(0,true);if(event.key==='End')show(deck.slides.length-1,true);
  if(event.key.toLowerCase()==='m')$('map').click();if(event.key===' ')$('explore').click();
});
$('import').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>MAX_BYTES)throw Error('El paquete supera 200 KB.');load(JSON.parse(await file.text()));}catch(error){notice(error.message);}finally{event.target.value='';}};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify(deck,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=deck.source.id+'.ainimation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function downloadJson(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
if(location.protocol==='file:')$('director').textContent='Descargar película Director';
$('director').onclick=()=>{try{
  if(location.protocol==='file:'){downloadJson(toDirector(deck),deck.source.id+'.director.json');notice('Película descargada. Ábrela desde Archivo en Director para editarla.');return;}
  const plan=prepareDirector(localStorage,deck);recoveryKey=plan.presentationRecoveryKey;$('restore').hidden=false;
  const link=document.createElement('a');link.href='/studio.html';link.target='_blank';link.rel='noopener';link.click();
  notice('Copia preparada en Director. La película anterior tiene una copia de recuperación. Los cambios de Director no vuelven al generador.');
}catch(error){notice('No se pudo abrir Director: '+error.message);}};
$('restore').onclick=()=>{try{restoreDirector(localStorage,recoveryKey);$('restore').hidden=true;notice('Película anterior recuperada. Recarga Director para verla.');}catch(error){notice(error.message);}};
try{const current=JSON.parse(localStorage.getItem('ainimation-film-plan'));if(current?.presentationRecoveryKey?.startsWith('ainimation:presentation:recovery:')&&localStorage.getItem(current.presentationRecoveryKey)){recoveryKey=current.presentationRecoveryKey;$('restore').hidden=false;}}catch{/* Storage may be unavailable; ordinary playback still works. */}

// Cross-origin transfer: exact origin, exact window and fresh per-opening channel.
const params=new URLSearchParams(location.search),origin=params.get('origin'),channel=params.get('channel');
const sender=window.parent!==window?window.parent:window.opener;
const connected=sender&&trustedGeneratorOrigin(origin)&&/^[a-f0-9-]{36}$/.test(channel||'');
if(connected){
  document.body.classList.add('awaiting');$('scene').hidden=true;$('source').textContent='Esperando la presentación de AdmiraNeXT…';
  for(const id of ['map','previous','next','explore','director','download'])$(id).disabled=true;
  window.addEventListener('message',event=>{
    if(!acceptsMessage(event,{origin,source:sender,channel}))return;
    try{load(event.data.presentation);$('scene').hidden=false;document.body.classList.remove('awaiting');
      for(const id of ['map','explore','director','download'])$(id).disabled=false;
      sender.postMessage({type:'ainimation:presentation:loaded',channel,slides:deck.slides.length},origin);
    }catch(error){notice(error.message);sender.postMessage({type:'ainimation:presentation:error',channel},origin);}
  });
  sender.postMessage({type:'ainimation:presentation:ready',channel},origin);
}else load(demo);
