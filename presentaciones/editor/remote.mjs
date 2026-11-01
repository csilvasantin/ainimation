import {generatorOrigin,validChannel,isGeneratorProject} from './generator.mjs';
import {validateProject} from './project.mjs';
export function connectGenerator({win=window,onLoad,onStatus}) {
  const params=new URLSearchParams(win.location.search),origin=params.get('origin'),channel=params.get('channel');
  const host=win.parent!==win?win.parent:win.opener;
  if(!host||!generatorOrigin(origin)||!validChannel(channel))return null;
  let pending=null;
  const send=(type,extra={})=>host.postMessage({type,channel,...extra},origin);
  win.addEventListener('message',event=>{
    if(event.origin!==origin||event.source!==host||event.data?.channel!==channel)return;
    const data=event.data;
    try{
      if(data.type==='admiranext:refinement:load'&&!pending){const project=validateProject(data.project);if(!isGeneratorProject(project))throw Error('Origen de edición no compatible.');onLoad(project);send('ainimation:refinement:loaded',{id:project.source.id});}
      if(!pending||data.requestId!==pending.id)return;
      if(data.type==='admiranext:refinement:saved'){
        const project=validateProject(data.project);
        if(project.source.id!==pending.source.id||project.source.adapter!==pending.source.adapter||project.source.revision===pending.source.revision)throw Error('El origen no ha confirmado la revisión esperada.');
        for(const change of pending.changes.changes){const field=project.fields.find(f=>f.id===change.field),value=field?.path.reduce((node,key)=>node?.[key],project.document);if(value!==change.after)throw Error('La confirmación no contiene el ajuste enviado. Conservamos el borrador.');}
        clearTimeout(pending.timer);const resolve=pending.resolve;pending=null;resolve(project);
      }
      if(data.type==='admiranext:refinement:error'){clearTimeout(pending.timer);const reject=pending.reject;pending=null;reject(Error(typeof data.error==='string'?data.error.slice(0,500):'No se pudo confirmar el guardado.'));}
    }catch(error){onStatus(error.message);if(data.type==='admiranext:refinement:load')send('ainimation:refinement:load-error',{error:error.message});if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}}
  });
  send('ainimation:refinement:ready');
  return {save(changeset){
    if(pending)return Promise.reject(Error('Hay un guardado en curso.'));
    return new Promise((resolve,reject)=>{
      const id=win.crypto.randomUUID(),timer=setTimeout(()=>{if(pending?.id!==id)return;pending=null;reject(Error('No se pudo confirmar el guardado a tiempo. Conservamos el borrador; recarga el origen antes de reintentar.'));},90000);
      pending={id,source:changeset.source,changes:changeset,resolve,reject,timer};send('ainimation:refinement:save',{requestId:id,changeset});
    });
  }};
}
