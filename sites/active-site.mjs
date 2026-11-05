const KEY='ainimation-last-site';

export function createActiveSitePreference(storage){
  function remember(id,savedSites){
    if(!storage||typeof id!=='string'||!id||!savedSites.has(id))return false;
    try{storage.setItem(KEY,id);return true;}catch{return false;}
  }
  return {
    read(){try{const id=storage?.getItem(KEY);return typeof id==='string'?id:'';}catch{return '';}},
    remember,
    async openSaved(id,savedSites,openRecord){
      if(!savedSites.has(id))throw Error('Esa copia no está guardada en este navegador.');
      const result=await openRecord(savedSites.get(id));
      remember(id,savedSites);return result;
    }
  };
}
