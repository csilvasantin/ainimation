import {cleanProject,projectHash,draftId,DRAFT_LIMIT} from '../assets/admira-draft-model.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
async function boundedJSON(request){if(Number(request.headers.get('content-length'))>DRAFT_LIMIT+4096)throw Error('too-large');const reader=request.body?.getReader();if(!reader)throw Error('empty');const decoder=new TextDecoder();let raw='',size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>DRAFT_LIMIT+4096){await reader.cancel();throw Error('too-large');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();return JSON.parse(raw);}
const summary=row=>({id:row.id,revision:row.revision,title:row.title,kind:row.kind,contentHash:row.content_hash,updatedAt:row.updated_at,publishedId:row.published_id||row.last_published_id||null,pendingPublication:row.content_hash!==row.published_hash});
export async function editorDrafts(request,env,owner){
 if(!env.TELEGRAM_ORIGINALS)return reply({error:'El almacenamiento de borradores está pendiente de configurar.'},503);
 const path=new URL(request.url).pathname;
 if(path==='/drafts'&&request.method==='GET'){const offset=Number(new URL(request.url).searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000)return reply({error:'Página no válida.'},400);const {results}=await env.LIBRARY_DB.prepare('SELECT d.*,p.content_hash AS published_hash,p.stock_id AS published_id,(SELECT stock_id FROM editor_draft_publications history WHERE history.id=d.id ORDER BY confirmed_at DESC LIMIT 1) AS last_published_id FROM editor_drafts d LEFT JOIN editor_draft_publications p ON p.id=d.id AND p.content_hash=d.content_hash WHERE d.owner=? ORDER BY d.updated_at DESC,d.id DESC LIMIT 101 OFFSET ?').bind(owner,offset).all();return reply({drafts:results.slice(0,100).map(summary),hasMore:results.length>100,nextOffset:results.length>100?offset+100:null});}
 const id=path.match(/^\/drafts\/([^/]+)$/)?.[1];if(!draftId(id))return reply({error:'Borrador no encontrado.'},404);
 const row=await env.LIBRARY_DB.prepare('SELECT d.*,p.content_hash AS published_hash,p.stock_id AS published_id,(SELECT stock_id FROM editor_draft_publications history WHERE history.id=d.id ORDER BY confirmed_at DESC LIMIT 1) AS last_published_id FROM editor_drafts d LEFT JOIN editor_draft_publications p ON p.id=d.id AND p.content_hash=d.content_hash WHERE d.id=? AND d.owner=?').bind(id,owner).first();
 if(request.method==='GET'){if(!row)return reply({error:'Borrador no encontrado.'},404);const object=await env.TELEGRAM_ORIGINALS.get(row.project_key);if(!object)return reply({error:'No se puede recuperar el archivo del borrador.'},503);return reply({...summary(row),project:await object.json()});}
 if(request.method!=='PUT')return reply({error:'No encontrado.'},404);
 let data,project;try{data=await boundedJSON(request);project=cleanProject(data.project);if(!Number.isInteger(data.baseRevision)||data.baseRevision<0)throw Error();}catch(e){return reply({error:e.message==='too-large'?'El borrador supera 24 MB.':'Borrador no válido.'},e.message==='too-large'?413:400);}
 const hash=await projectHash(project);
 // An uncertain save can be safely repeated with its exact original revision/content.
 if(row&&row.revision===data.baseRevision+1&&row.content_hash===hash)return reply({...summary(row),recovered:true});
 if((row?.revision||0)!==data.baseRevision)return reply({error:'El borrador cambió en otra sesión. Tu copia local se conserva. Guarda una copia independiente.',conflict:true},409);
 const now=new Date().toISOString(),key='editor-drafts/'+id+'/'+crypto.randomUUID()+'.json';await env.TELEGRAM_ORIGINALS.put(key,JSON.stringify(project),{httpMetadata:{contentType:'application/json'}});
 const statement=data.baseRevision===0?env.LIBRARY_DB.prepare('INSERT INTO editor_drafts (id,owner,revision,title,kind,project_key,content_hash,updated_at) VALUES (?,?,1,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,project.plan.title,project.kind,key,hash,now):env.LIBRARY_DB.prepare('UPDATE editor_drafts SET revision=revision+1,title=?,kind=?,project_key=?,content_hash=?,updated_at=? WHERE id=? AND owner=? AND revision=?').bind(project.plan.title,project.kind,key,hash,now,id,owner,data.baseRevision);
 let result;try{result=await statement.run();}catch(error){const committed=await env.LIBRARY_DB.prepare('SELECT project_key FROM editor_drafts WHERE id=? AND owner=?').bind(id,owner).first();if(committed?.project_key!==key)await env.TELEGRAM_ORIGINALS.delete(key);throw error;}
 if(result.meta.changes!==1){await env.TELEGRAM_ORIGINALS.delete(key);return reply({error:'El borrador cambió en otra sesión. Tu copia local se conserva.',conflict:true},409);}
 // Keep previous immutable objects as recovery history; current metadata always names one complete object.
 const publication=await env.LIBRARY_DB.prepare('SELECT stock_id FROM editor_draft_publications WHERE id=? AND content_hash=?').bind(id,hash).first();return reply({id,revision:data.baseRevision+1,title:project.plan.title,kind:project.kind,contentHash:hash,updatedAt:now,publishedId:publication?.stock_id||null,pendingPublication:!publication});
}
// This endpoint cannot read or edit a private draft. It records only a public
// Stock source whose draft ID and entire saved content prove an exact publication.
export async function confirmDraftPublication(request,env,network=fetch){
 const id=new URL(request.url).pathname.split('/')[2];if(!draftId(id)||request.method!=='POST')return reply({error:'No encontrado.'},404);
 let body;try{body=await boundedJSON(request);if(!/^[A-Za-z0-9-]{1,160}$/.test(body.stockId||''))throw Error();}catch{return reply({error:'Publicación no válida.'},400);}
 const response=await network('https://api.admira.store/stock/editor-project/'+body.stockId,{signal:AbortSignal.timeout(20000)});if(!response.ok)return reply({error:'Admira no ha confirmado la fuente editable.'},409);
 const publicProject=await boundedJSON(response);
 if(publicProject.plan?.admiraDraft?.id!==id)return reply({error:'La publicación no corresponde al borrador.'},409);
 const hash=await projectHash(publicProject);
 const result=await env.LIBRARY_DB.prepare('INSERT INTO editor_draft_publications (id,content_hash,stock_id,confirmed_at) SELECT id,?,?,? FROM editor_drafts WHERE id=? AND kind=? ON CONFLICT(id,content_hash) DO UPDATE SET stock_id=excluded.stock_id,confirmed_at=excluded.confirmed_at').bind(hash,body.stockId,new Date().toISOString(),id,publicProject.kind).run();
 return reply({ok:true,confirmed:result.meta.changes===1});
}
