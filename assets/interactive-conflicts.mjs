import {versionIdentity} from './interactive-provenance.mjs';
import {readLibrary} from './interactive-library.mjs';
import {playerHtml} from './interactive-project.mjs';

// Compare every field, including layout, images and button destinations.
export function compareProjects(left,right){
 const changes=[];
 const walk=(a,b,path)=>{
  if(a===b)return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
   for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],[...path,key]);
  }else changes.push({path,left:a,right:b});
 };
 walk(left,right,[]);return changes;
}
export function conflictVersions(library,pair){
 if(!pair||typeof pair.projectId!=='string'||typeof pair.copyId!=='string'||pair.projectId===pair.copyId)return null;
 const cloud=library.projects.find(p=>p.id===pair.projectId),local=library.projects.find(p=>p.id===pair.copyId);
 return cloud&&local?{cloud,local}:null;
}
const names={title:'Nombre / título',body:'Texto',orientation:'Formato',color:'Color',resetSeconds:'Reinicio por inactividad',start:'Pantalla inicial',scenes:'Pantallas',buttons:'Botones',label:'Etiqueta',target:'Destino',image:'Imagen',hotspots:'Zonas táctiles',presentation:'Presentación',directorLayout:'Diseño',referenceAssets:'Referencias'};
const label=path=>path.map(k=>/^\d+$/.test(k)?Number(k)+1:names[k]||k).join(' → ');
function value(v){if(v===undefined)return 'No incluido';if(v===null)return 'Sin valor';if(typeof v==='boolean')return v?'Sí':'No';if(typeof v==='string'&&v.startsWith('data:image/'))return 'Imagen incorporada · '+Math.ceil(v.length*0.75/1024)+' KB';return typeof v==='object'?JSON.stringify(v,null,2):String(v);}

export function mountConflictComparison({status,storage,endpoint,onOpen}){
 const doc=status.ownerDocument,key='ainimation:conflict-pairs:'+endpoint;
 let pairs=[];try{const saved=JSON.parse(storage.getItem(key)||'[]');if(Array.isArray(saved))pairs=saved.filter(p=>p&&typeof p.projectId==='string'&&typeof p.copyId==='string').slice(-20);}catch{}
 const actions=doc.createElement('div');actions.className='tools conflict-actions';
 const trigger=doc.createElement('button');trigger.type='button';trigger.textContent='Comparar versiones conservadas';actions.append(trigger);status.after(actions);
 const dialog=doc.createElement('dialog');dialog.className='conflict-compare-dialog';dialog.setAttribute('aria-label','Comparar versiones conservadas');
 const h=doc.createElement('h2');h.textContent='Comparar versiones conservadas';
 const note=doc.createElement('p');note.textContent='Consulta las versiones guardadas actuales. Abrir una en el editor conserva la otra.';
 const pickerLabel=doc.createElement('label');pickerLabel.textContent='Proyecto en conflicto';const picker=doc.createElement('select');pickerLabel.append(picker);
 const message=doc.createElement('p');message.setAttribute('role','status');message.className='conflict-compare-status';
 const previews=doc.createElement('div');previews.className='conflict-compare-previews';
 const differences=doc.createElement('div');differences.className='conflict-differences';
 const close=doc.createElement('button');close.type='button';close.textContent='Volver al creador';close.onclick=()=>dialog.close();
 dialog.append(h,note,pickerLabel,message,previews,differences,close);doc.body.append(dialog);
 const latest=()=>{const result=readLibrary(storage);if(!result.ok)throw Error(result.error);return result.data;};
 function available(){try{const lib=latest();return pairs.filter(p=>conflictVersions(lib,p));}catch{return [];}}
 function refresh(){actions.hidden=available().length===0;}
 function render(){
  message.textContent='';previews.replaceChildren();differences.replaceChildren();
  try{
   const pair=available()[Number(picker.value)],versions=conflictVersions(latest(),pair);
   if(!versions)throw Error('Una de las versiones ya no está disponible. No se ha modificado ningún proyecto.');
   for(const [name,record]of [['Versión de la nube',versions.cloud],['Copia de este equipo',versions.local]]){
    const section=doc.createElement('section'),heading=doc.createElement('h3'),title=doc.createElement('p'),identity=doc.createElement('p'),frame=doc.createElement('iframe'),open=doc.createElement('button');
    heading.textContent=name;title.textContent=record.project.title;const info=versionIdentity(record);identity.className='conflict-version-identity';identity.textContent='Guardada: '+info.date+' · Origen: '+info.device;frame.title='Recorrido · '+name;frame.setAttribute('sandbox','allow-scripts');frame.srcdoc=playerHtml(record.project);
    open.type='button';open.textContent='Abrir '+name.toLowerCase();open.onclick=()=>{try{const current=conflictVersions(latest(),pair);if(!current)throw Error('Una de las versiones ya no está disponible.');onOpen(record.id);dialog.close();}catch(e){message.textContent=e.message;}};
    section.append(heading,title,identity,frame,open);previews.append(section);
   }
   const changes=compareProjects(versions.cloud.project,versions.local.project),heading=doc.createElement('h3');heading.textContent=changes.length?'Diferencias entre las versiones':'Las dos versiones tienen el mismo contenido';differences.append(heading);
   for(const change of changes){const row=doc.createElement('section'),name=doc.createElement('h4'),grid=doc.createElement('div');name.textContent=label(change.path);grid.className='conflict-difference-values';for(const [side,v]of [['Nube',change.left],['Este equipo',change.right]]){const cell=doc.createElement('div'),caption=doc.createElement('strong'),text=doc.createElement('pre');caption.textContent=side;text.textContent=value(v);cell.append(caption,text);grid.append(cell);}row.append(name,grid);differences.append(row);}
  }catch(e){message.textContent=e.message;}
 }
 trigger.onclick=()=>{const entries=available();picker.replaceChildren();entries.forEach((pair,i)=>{const o=doc.createElement('option');o.value=i;o.textContent=conflictVersions(latest(),pair).cloud.project.title+' · conflicto '+(i+1);picker.append(o);});pickerLabel.hidden=entries.length<2;picker.value=String(Math.max(0,entries.length-1));render();dialog.showModal();};
 picker.onchange=render;dialog.addEventListener('close',()=>previews.replaceChildren());
 refresh();
 return{remember(incoming){for(const pair of incoming)if(!pairs.some(p=>p.projectId===pair.projectId&&p.copyId===pair.copyId))pairs.push({projectId:pair.projectId,copyId:pair.copyId});pairs=pairs.slice(-20);try{storage.setItem(key,JSON.stringify(pairs));}catch{}refresh();},refresh};
}
