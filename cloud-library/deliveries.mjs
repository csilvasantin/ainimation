import {TOUCH_RECEIVERS,receiverFor} from '../assets/interactive-receivers.mjs';
import {validate,playerHtml} from '../assets/interactive-project.mjs';
export const DESTINATIONS=[{id:'alsea-sbux-021',name:'Starbucks · Paseo de Gracia 103',kind:'virtual',screens:[{id:'starbucks-avatar-wall',name:'Tótem táctil',orientation:'portrait',touch:true},...Array.from({length:6},(_,i)=>({id:'starbucks-wall-0'+(6-i),name:'Pantalla '+(i+1),orientation:'portrait',touch:false})),{id:'starbucks-tpv-01',name:'TPV',orientation:'portrait',touch:false},{id:'starbucks-ipad-01',name:'iPad horizontal',orientation:'landscape',touch:true}]},...TOUCH_RECEIVERS.map(r=>({id:r.location,name:r.name,kind:'virtual',screens:[{id:r.screen,name:r.label,orientation:r.orientation,touch:true,available:true,scene:{renderer:'better',item:r.scene.item,aperture:r.scene.aperture}}]}))];
export const deliveryPath=path=>/^\/deliveries\/[a-f0-9]{64}(?:\/player)?$/.test(path);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer'}});
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
function metadata(row,origin){const destination=DESTINATIONS.find(d=>d.id===row.location),screen=destination?.screens.find(s=>s.id===row.screen);return{id:row.id,title:JSON.parse(row.project).title,projectId:row.project_id,sourceRevision:row.project_revision,sha256:row.sha256,createdAt:row.created_at,destination:{id:destination.id,name:destination.name,kind:'virtual',screen},playerUrl:origin+'/api/deliveries/'+row.id+'/player',storeUrl:receiverFor(row.location,row.screen)?'https://www.admira.store/xpacios/pantalla/?loc='+encodeURIComponent(row.location)+'&screen='+encodeURIComponent(row.screen)+'&ainimation='+row.id:'https://www.admira.store/admira-xp/?loc='+row.location+'&project=starbucks&circuit=alsea_starbucks&quality=matrix&ainimation='+row.id};}
export async function publicDelivery(request,env){
 const url=new URL(request.url),id=url.pathname.match(/^\/deliveries\/([a-f0-9]{64})(?:\/player)?$/)?.[1];
 if(!id||request.method!=='GET')return json({error:'Entrega no disponible.'},404);
 const row=await env.LIBRARY_DB.prepare('SELECT * FROM interactive_deliveries WHERE id=?').bind(id).first();
 if(!row)return json({error:'Entrega no encontrada.'},404);
 if(!url.pathname.endsWith('/player'))return json(metadata(row,url.origin));
 const html=playerHtml(JSON.parse(row.project));
 return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','content-security-policy':"frame-ancestors https://www.admira.store https://admira.store https://www.xpaceos.com https://xpaceos.com https://www.ainimation.studio https://ainimation.studio https://ainimation-interactive-library-preview.csilvasantin.workers.dev http://127.0.0.1:46223 http://localhost:46223"}});
}
export async function createDelivery(request,env,owner){
 if(request.method!=='POST')return json({error:'Método no permitido.'},405);
 let data,project;try{const raw=await request.text();if(raw.length>24000000)return json({error:'Proyecto demasiado grande.'},413);data=JSON.parse(raw);project=validate(data.project);if(!/^[a-zA-Z0-9-]{1,80}$/.test(data.projectId)||!Number.isInteger(data.sourceRevision)||data.sourceRevision<1)throw Error();}catch{return json({error:'Proyecto no válido.'},400);}
 const destination=DESTINATIONS.find(d=>d.id===data.location),screen=destination?.screens.find(s=>s.id===data.screen);
 if(!screen||screen.touch!==true)return json({error:'Selecciona una pantalla táctil disponible de un Xpacio. / Select an available touch screen in a Xpace.'},400);
 const encoded=JSON.stringify(project),hash=await digest(encoded),now=new Date().toISOString(),id=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
 await env.LIBRARY_DB.prepare('INSERT INTO interactive_deliveries (id,owner,project_id,project_revision,sha256,project,location,screen,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,project_id,project_revision,sha256,location,screen) DO NOTHING').bind(id,owner,data.projectId,data.sourceRevision,hash,encoded,destination.id,screen.id,now).run();
 const row=await env.LIBRARY_DB.prepare('SELECT * FROM interactive_deliveries WHERE owner=? AND project_id=? AND project_revision=? AND sha256=? AND location=? AND screen=?').bind(owner,data.projectId,data.sourceRevision,hash,destination.id,screen.id).first();
 return json(metadata(row,new URL(request.url).origin),201);
}
