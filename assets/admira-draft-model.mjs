import {validate} from './interactive-project.mjs';
export const DRAFT_LIMIT=24*1024*1024;
export const draftId=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'');
export function cleanProject(value){
 if(value?.schema!=='ainimation.editor.v1'||!['director','interactive'].includes(value.kind)||!value.plan||typeof value.plan!=='object'||Array.isArray(value.plan))throw Error('Proyecto editable no compatible.');
 const project={schema:value.schema,kind:value.kind,plan:{...value.plan}};delete project.plan.admiraDraft;
 if(value.kind==='interactive')project.plan=validate(project.plan);
 else if(!Array.isArray(project.plan.cast)||!Array.isArray(project.plan.stageItems))throw Error('Falta el montaje del proyecto.');
 if(typeof project.plan.title!=='string'||!project.plan.title.trim()||project.plan.title.length>300)throw Error('Revisa el nombre del borrador.');
 const json=JSON.stringify(project);if(new TextEncoder().encode(json).length>DRAFT_LIMIT)throw Error('El borrador supera 24 MB.');if(/"blob:/i.test(json))throw Error('Conserva los recursos locales antes de guardar.');return project;
}
const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,sorted(x[k])])):x;
export async function projectHash(project){project=cleanProject(project);delete project.plan.admiraPackage;if(project.kind==='director')project.plan.packageFps=Number(project.plan.packageFps)||24;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(sorted(project)))))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function linkedProject(record){const project=structuredClone(cleanProject(record.project));project.plan.admiraDraft={id:record.id,revision:record.revision,contentHash:record.contentHash};return project;}
