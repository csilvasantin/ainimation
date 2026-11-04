const DB='ainimation-sites-v1';
async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('sites',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function run(mode,operation){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('sites',mode),request=operation(tx.objectStore('sites'));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export const listSites=()=>run('readonly',store=>store.getAll());
export const saveSite=record=>run('readwrite',store=>store.put(record));
