import {editorDrafts,confirmDraftPublication} from './editor-drafts.mjs';
import {telegramAccount,telegramWebhook,telegramPlayback} from './telegram.mjs';
import {validate} from '../assets/interactive-project.mjs';
import {discoverDestinations} from './destination-discovery.mjs';
import {DESTINATIONS,deliveryPath,publicDelivery,createDelivery} from './deliveries.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function authenticate(request,env){
 if(!env.GOOGLE_CLIENT_ID)throw Error('not configured');
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw Error('unauthorized');
 const parts=token.split('.');if(parts.length!==3)throw Error('unauthorized');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 if(header.alg!=='RS256'||!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==env.GOOGLE_CLIENT_ID||typeof claims.sub!=='string'||!claims.sub||!Number.isFinite(claims.exp)||!Number.isFinite(claims.iat)||claims.exp<=Date.now()/1000||claims.iat>Date.now()/1000+60)throw Error('unauthorized');
 const keys=await fetch('https://www.googleapis.com/oauth2/v3/certs',{cf:{cacheTtl:300}}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json();});
 const jwk=keys.keys.find(k=>k.kid===header.kid);if(!jwk)throw Error('unauthorized');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('unauthorized');
 if(env.PREVIEW_EMAILS&&(!(claims.email_verified===true||claims.email_verified==='true')||!env.PREVIEW_EMAILS.split(',').includes(String(claims.email||'').toLowerCase())))throw Error('unauthorized');
 return claims.sub;
}
export async function route(request,env,identify=authenticate,catalogFetcher=fetch){
 const path=new URL(request.url).pathname;
 if(path==='/telegram/webhook')return telegramWebhook(request,env);
 if(path.startsWith('/telegram/play/'))return telegramPlayback(request,env);
 if(path==='/config'&&request.method==='GET')return reply({clientId:env.GOOGLE_CLIENT_ID||null});
 if(deliveryPath(path))return publicDelivery(request,env);
 if(/^\/drafts\/[^/]+\/published$/.test(path))return confirmDraftPublication(request,env,catalogFetcher);
 let owner;try{owner=await identify(request,env);}catch{return reply({error:'Inicia sesión para abrir tu biblioteca.'},401);}
 if(!env.LIBRARY_DB)return reply({error:'Almacenamiento pendiente de configurar.'},503);
 if(path==='/drafts'||path.startsWith('/drafts/'))return editorDrafts(request,env,owner);
 if(path==='/destinations'&&request.method==='GET'){try{return reply(await discoverDestinations(DESTINATIONS,catalogFetcher));}catch{return reply({destinations:DESTINATIONS,coverage:{error:'catalog_unavailable'}});}}
 if(path==='/deliveries')return createDelivery(request,env,owner);
 if(path.startsWith('/telegram/'))return telegramAccount(request,env,owner);
 if(path==='/projects'&&request.method==='GET'){
 const {results}=await env.LIBRARY_DB.prepare('SELECT id, revision, project, updated_at, source_device FROM interactive_projects WHERE owner = ?').bind(owner).all();
 return reply({account:owner,projects:results.map(r=>({id:r.id,revision:r.revision,updatedAt:r.updated_at,sourceDevice:r.source_device||null,project:JSON.parse(r.project)}))});
 }
 const id=path.match(/^\/projects\/([a-zA-Z0-9-]{1,80})$/)?.[1];
 if(!id||request.method!=='PUT')return reply({error:'No encontrado.'},404);
 if(Number(request.headers.get('content-length'))>24000000)return reply({error:'Proyecto demasiado grande.'},413);
 let data,project;try{const raw=await request.text();if(raw.length>24000000)return reply({error:'Proyecto demasiado grande.'},413);data=JSON.parse(raw);project=validate(data.project);if(data.sourceDevice!=null&&(typeof data.sourceDevice!=='string'||data.sourceDevice.length>100||/[\u0000-\u001f\u007f]/.test(data.sourceDevice)))throw Error();if(!Number.isInteger(data.baseRevision)||data.baseRevision<0)throw Error();}catch{return reply({error:'Proyecto no válido.'},400);}
 const json=JSON.stringify(project),now=new Date().toISOString();
 const result=data.baseRevision===0
 ?await env.LIBRARY_DB.prepare('INSERT INTO interactive_projects (owner,id,revision,project,updated_at,source_device) VALUES (?,?,1,?,?,?) ON CONFLICT(owner,id) DO NOTHING').bind(owner,id,json,now,data.sourceDevice||null).run()
 :await env.LIBRARY_DB.prepare('UPDATE interactive_projects SET project=?, revision=revision+1, updated_at=?, source_device=? WHERE owner=? AND id=? AND revision=?').bind(json,now,data.sourceDevice||null,owner,id,data.baseRevision).run();
 if(result.meta.changes!==1)return reply({error:'El proyecto cambió en otro dispositivo. Se conserva tu copia local.'},409);
 return reply({id,revision:data.baseRevision+1,updatedAt:now});
}
export default{async fetch(request,env){
 const origin=request.headers.get('origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
 const publicOrigin=deliveryPath(new URL(request.url).pathname)&&['https://www.admira.store','https://admira.store','https://www.xpaceos.com','https://xpaceos.com','http://127.0.0.1:46223','http://localhost:46223'].includes(origin);
 if(origin&&!allowed.includes(origin)&&!publicOrigin)return reply({error:'Origen no permitido.'},403);
 const response=request.method==='OPTIONS'?new Response(null,{status:204}):await route(request,env).catch(()=>reply({error:'No se ha podido sincronizar. Tu copia local se conserva.'},503));
 if(origin){response.headers.set('access-control-allow-origin',origin);response.headers.set('vary','Origin');response.headers.set('access-control-allow-methods','GET,PUT,POST,OPTIONS');response.headers.set('access-control-allow-headers','authorization,content-type');}
 return response;
}};
