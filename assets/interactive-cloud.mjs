import {validate} from './interactive-project.mjs';
import {LIBRARY_KEY,readLibrary} from './interactive-library.mjs';
// Three-way merge: divergent edits become separate projects, never last-writer-wins.
export function mergeCloud(local,remote,bases={}){
 const result=structuredClone(local),nextBases={...bases},uploads=[];
 for(const cloud of remote){validate(cloud.project);const entry=result.projects.find(p=>p.id===cloud.id),base=bases[cloud.id];
 if(!entry){result.projects.push({...structuredClone(cloud),revision:1});}
 else if(JSON.stringify(entry.project)!==JSON.stringify(cloud.project)){
 if(base&&JSON.stringify(entry.project)===base.content){entry.project=structuredClone(cloud.project);entry.revision++;entry.updatedAt=cloud.updatedAt;}
 else if(!base||cloud.revision!==base.revision){const copy=structuredClone(entry);copy.id=crypto.randomUUID();copy.project.title=copy.project.title.slice(0,58)+' · copia de este equipo';copy.revision=1;result.projects.push(copy);if(result.activeId===entry.id)result.activeId=copy.id;entry.project=structuredClone(cloud.project);entry.revision++;}
 }
 nextBases[cloud.id]={revision:cloud.revision,content:JSON.stringify(cloud.project)};
 }
 if(result.projects.length>100)throw Error('La combinación supera 100 proyectos. Exporta tu biblioteca antes de sincronizar.');
 for(const entry of result.projects){const base=nextBases[entry.id];if(!base||base.content!==JSON.stringify(entry.project))uploads.push({id:entry.id,project:entry.project,baseRevision:base?.revision||0});}
 return{library:result,bases:nextBases,uploads};
}
const contentHash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function compactBases(bases){const result={};for(const [id,base]of Object.entries(bases))result[id]={revision:base.revision,contentHash:base.contentHash||await contentHash(base.content)};return result;}
export async function syncLibrary(storage,endpoint,token,request=fetch){
 const loaded=readLibrary(storage);if(!loaded.ok)throw Error(loaded.error);
 const before=storage.getItem(LIBRARY_KEY);
 const call=async(path,options={})=>{const r=await request(endpoint+path,{...options,headers:{authorization:'Bearer '+token,'content-type':'application/json'}});const data=await r.json();if(!r.ok)throw Error(data.error||'Sin conexión. Tu copia local se conserva.');return data;};
 const remote=await call('/projects');
 if(typeof remote.account!=='string'||!remote.account)throw Error('No se reconoce la cuenta.');
 const key='ainimation:cloud:bases:'+endpoint+':'+remote.account,saved=JSON.parse(storage.getItem(key)||'{}'),previousCompact=await compactBases(saved);
 for(const [id,base]of Object.entries(saved)){if(!base.contentHash)continue;const local=loaded.data.projects.find(p=>p.id===id),content=local?JSON.stringify(local.project):null;base.content=content&&await contentHash(content)===base.contentHash?content:null;}
 const merged=mergeCloud(loaded.data,remote.projects,saved),nextCompact=await compactBases(merged.bases);
 // No asynchronous gap between the comparison and the local write.
 if(storage.getItem(LIBRARY_KEY)!==before)throw Error('Has editado durante la sincronización. Vuelve a sincronizar.');
 // Equivalent compact bases free space before the two full library copies are written.
 storage.setItem(key,JSON.stringify(previousCompact));
 storage.setItem('ainimation:cloud:backup:'+endpoint,before);
 storage.setItem(LIBRARY_KEY,JSON.stringify(merged.library));
 storage.setItem(key,JSON.stringify(nextCompact));
 for(const item of merged.uploads){const result=await call('/projects/'+encodeURIComponent(item.id),{method:'PUT',body:JSON.stringify(item)});merged.bases[item.id]={revision:result.revision,content:JSON.stringify(item.project)};storage.setItem(key,JSON.stringify(await compactBases(merged.bases)));}
 return merged.library;
}
