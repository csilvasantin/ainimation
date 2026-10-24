const ID=/^[A-Za-z0-9-]{1,160}$/;
const ORIGINS=new Set(['https://admira.studio','https://www.admira.studio','https://pixeria.com','https://www.pixeria.com']);
export function returnCatalogue(value){
  try{const u=new URL(value);if(ORIGINS.has(u.origin)&&/^\/(?:en\/)?stock(?:\.html|\/)?$/.test(u.pathname)){u.hash='';u.searchParams.delete('highlight');return u.href;}}catch{}
  return 'https://admira.studio/stock.html';
}
export function editContext(params){
  const id=params.get('admiraStockId');
  return ID.test(id||'')?{id,returnUrl:returnCatalogue(params.get('admiraReturnUrl'))}:null;
}
export function catalogueVersion(context,result){
  if(result?.ok!==true||!ID.test(result.id||'')||!result.editorProjectUrl)throw Error('El catálogo no ha confirmado el guardado del proyecto editable. Conserva esta pestaña y reintenta.');
  const u=new URL(returnCatalogue(context?.returnUrl));u.searchParams.set('highlight',result.id);
  u.searchParams.set('origen',result.versionRoot||context?.id||result.id);return u.href;
}
export async function readEditorProject(id,request=fetch){
  if(!ID.test(id||''))throw Error('Identidad de Stock no válida.');
  const r=await request('https://api.admira.store/stock/editor-project/'+encodeURIComponent(id),{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('No se ha podido recuperar el proyecto editable. El original se conserva en Admira.');
  if(Number(r.headers.get('content-length'))>24*1024*1024)throw Error('Proyecto demasiado grande.');
  const value=await r.json();
  if(value?.schema!=='ainimation.editor.v1'||!['director','interactive'].includes(value.kind)||!value.plan)throw Error('Proyecto editable no compatible.');
  return value;
}
export async function portableProject(plan,kind='director',request=fetch){
  const copy=structuredClone(plan);
  if(copy.admiraDraft)delete copy.admiraDraft.recoveryKey;
  async function walk(value){
    for(const key of Object.keys(value)){
      const v=value[key];
      if(typeof v==='string'&&v.startsWith('blob:')){
        const r=await request(v);if(!r.ok)throw Error('No se ha podido conservar un recurso local.');
        const blob=await r.blob();value[key]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
      }else if(v&&typeof v==='object')await walk(v);
    }
  }
  await walk(copy);
  const project={schema:'ainimation.editor.v1',kind,plan:copy};
  if(new TextEncoder().encode(JSON.stringify(project)).length>24*1024*1024)throw Error('El proyecto editable supera 24 MB. Reduce los recursos antes de guardar.');
  return project;
}
