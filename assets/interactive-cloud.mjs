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
// Image-rich libraries need a backup outside localStorage's small quota.
async function archiveBackups(entries){
 const db=await new Promise((resolve,reject)=>{const open=indexedDB.open('ainimation-interactive-backups',1);open.onupgradeneeded=()=>open.result.createObjectStore('libraries');open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('libraries','readwrite');for(const [key,value]of entries)tx.objectStore('libraries').put(value,key);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('No se ha podido guardar la copia de seguridad.'));tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function syncLibrary(storage,endpoint,token,request=fetch,{projectId,upload=true,archive=globalThis.indexedDB?archiveBackups:null}={}){
 const loaded=readLibrary(storage);if(!loaded.ok)throw Error(loaded.error);
 if(projectId&&!loaded.data.projects.some(p=>p.id===projectId))throw Error('El proyecto ya no está disponible. Recarga antes de sincronizar.');
 const before=storage.getItem(LIBRARY_KEY);
 const call=async(path,options={})=>{try{const r=await request(endpoint+path,{...options,signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+token,'content-type':'application/json'}});const data=await r.json();if(!r.ok)throw Error(data.error||'Sin conexión. Tu copia local se conserva.');return data;}catch(error){if(error.name==='TimeoutError')throw Error('La conexión ha tardado demasiado. Tu copia local se conserva. Vuelve a sincronizar.');throw error;}};
 const remote=await call('/projects');
 if(typeof remote.account!=='string'||!remote.account)throw Error('No se reconoce la cuenta.');
 const key='ainimation:cloud:bases:'+endpoint+':'+remote.account,saved=JSON.parse(storage.getItem(key)||'{}'),previousCompact=await compactBases(saved);
 for(const [id,base]of Object.entries(saved)){if(!base.contentHash)continue;const local=loaded.data.projects.find(p=>p.id===id),content=local?JSON.stringify(local.project):null;base.content=content&&await contentHash(content)===base.contentHash?content:null;}
 const source=projectId?remote.projects.filter(p=>p.id===projectId):remote.projects;
 const merged=mergeCloud(loaded.data,source,saved),nextCompact=await compactBases(merged.bases);
 const selected=new Set([projectId]);
 if(projectId)for(const entry of merged.library.projects)if(!loaded.data.projects.some(p=>p.id===entry.id))selected.add(entry.id);
 const uploads=upload?merged.uploads.filter(item=>!projectId||selected.has(item.id)):[];
 const backupKey='ainimation:cloud:backup:'+endpoint,legacyBackup=storage.getItem(backupKey);
 if(archive){const entries=[[backupKey,before]];if(legacyBackup!==null)entries.push([backupKey+':migrated',legacyBackup]);await archive(entries);}
 // No asynchronous gap between this comparison and the local library write.
 if(storage.getItem(LIBRARY_KEY)!==before)throw Error('Has editado durante la sincronización. Vuelve a sincronizar.');
 // Remove a legacy backup only after both snapshots are safely archived.
 if(archive)storage.removeItem(backupKey);
 storage.setItem(key,JSON.stringify(previousCompact));
 if(!archive)storage.setItem(backupKey,before);
 try{storage.setItem(LIBRARY_KEY,JSON.stringify(merged.library));}catch(error){if(error.name==='QuotaExceededError')throw Error('No queda espacio en este navegador. Tu biblioteca local y su copia de seguridad se conservan; guarda un archivo antes de liberar espacio.');throw error;}
 storage.setItem(key,JSON.stringify(nextCompact));
 for(const item of uploads){const result=await call('/projects/'+encodeURIComponent(item.id),{method:'PUT',body:JSON.stringify(item)});merged.bases[item.id]={revision:result.revision,content:JSON.stringify(item.project)};storage.setItem(key,JSON.stringify(await compactBases(merged.bases)));}
 return merged.library;
}
