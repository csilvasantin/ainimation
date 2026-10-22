import {readLibrary} from './interactive-library.mjs';
import {prepareDirector,fromDirector,saveDirectorInteractive,restoreDirectorWorkspace} from './interactive-director-bridge.mjs?v=director-1';
import {playerHtml} from './interactive-project.mjs?v=director-1';
const q=new URLSearchParams(location.search),id=q.get('interactive');
const t=(es,en)=>document.documentElement.lang==='en'?en:es;
if(location.pathname.includes('/interactivos')){
 const button=document.getElementById('director');if(button)button.onclick=()=>{try{const lib=readLibrary(localStorage);if(!lib.ok)throw Error(lib.error);prepareDirector(localStorage,lib.data.activeId);location.href='/studio.html?interactive='+encodeURIComponent(lib.data.activeId)+'#workspace';}catch(error){document.getElementById('status').textContent=error.message;}};
}else if(id){
 const start=()=>{const plan=window.currentPlan?.();if(plan?.interactiveSource?.id!==id)return;
 const bar=document.createElement('section');bar.className='interactive-director-bar';bar.setAttribute('aria-label',t('Edición del interactivo','Interactive editing'));bar.style.cssText='position:sticky;top:0;z-index:9999;background:#102621;color:#e5f5df;border:1px solid #b8ee77;padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
 const label=document.createElement('strong'),status=document.createElement('span');label.textContent=t('Interactivo · ','Interactive · ')+plan.title;status.setAttribute('role','status');
 const make=(es,en,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=t(es,en);b.onclick=()=>{try{fn();}catch(error){console.error(error);status.textContent=error.message;}};return b;};
 const save=()=>{const current=window.currentPlan();current.markers=window.loadTimelineMarkers?.(current.totalFrames)||current.markers;const result=saveDirectorInteractive(localStorage,current);const movie=window.normalizeFilmPlan({...current,...result.plan});window.saveFilmPlan(movie);window.renderFilmPlan(movie);status.textContent=t('Interactivo guardado. Vuelve al Creador para sincronizar y preparar un nuevo envío.','Interactive saved. Return to Creator to sync and prepare a new delivery.');};
 const preview=()=>{const project=fromDirector(window.currentPlan()),d=document.createElement('dialog'),f=document.createElement('iframe'),b=make('Cerrar prueba','Close preview',()=>{f.src='about:blank';d.close();d.remove();});d.style.cssText='width:min(1000px,95vw);height:90svh;background:#102621;color:white';f.title=t('Prueba del interactivo editado','Edited interactive preview');f.setAttribute('sandbox','allow-scripts');f.srcdoc=playerHtml(project);f.style.cssText='width:100%;height:calc(100% - 60px);border:0';d.append(b,f);document.body.append(d);d.showModal();};
 bar.append(label,make('Guardar interactivo','Save interactive',save),make('Probar recorrido','Test journey',preview),make('Volver al Creador','Return to Creator',()=>{save();restoreDirectorWorkspace(localStorage,window.currentPlan());location.href='/interactivos/?project='+encodeURIComponent(id);}),status);
 document.querySelector('.director-shell')?.prepend(bar);window.applyProjectExtras?.(plan);window.ainTransport?.setFrame(plan.markers[plan.interactiveSource.project.scenes.findIndex(s=>s.id===plan.interactiveSource.project.start)].frame);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
