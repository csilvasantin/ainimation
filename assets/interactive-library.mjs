const provenanceModule=new URL('./interactive-provenance.mjs',import.meta.url);provenanceModule.search=new URL(import.meta.url).search;
const {deviceLabel}=await import(provenanceModule.href);
import {validate, readDraft, template} from './interactive-project.mjs';
export const LIBRARY_KEY='ainimation:interactive:library:v1';
const MAX_PROJECTS=100;
const clone=x=>structuredClone(x);
function read(storage){
 if(!storage)throw Error('El almacenamiento no está disponible. Guarda un archivo para conservar tu trabajo.');
 const raw=storage.getItem(LIBRARY_KEY);
 if(raw===null)return null;
 let data;try{data=JSON.parse(raw);}catch{throw Error('La biblioteca guardada no se reconoce. Se ha conservado sin modificar.');}
 if(data?.version!==1||!Array.isArray(data.projects)||!data.projects.length||data.projects.length>MAX_PROJECTS)throw Error('Esta biblioteca no es compatible. Se ha conservado sin modificar.');
 const ids=new Set();
 for(const record of data.projects){if(typeof record.id!=='string'||!record.id||ids.has(record.id)||!Number.isInteger(record.revision)||record.revision<1||typeof record.updatedAt!=='string')throw Error('La biblioteca guardada no se reconoce. Se ha conservado sin modificar.');validate(record.project);ids.add(record.id);}
 if(!ids.has(data.activeId))throw Error('No se reconoce el proyecto activo. La biblioteca se conserva.');
 return data;
}
function write(storage,data){storage.setItem(LIBRARY_KEY,JSON.stringify(data));return clone(data);}
function id(){return globalThis.crypto.randomUUID();}
function fresh(project,storage){return{sourceDevice:deviceLabel(storage),id:id(),revision:1,updatedAt:new Date().toISOString(),project:validate(project)};}
function attempt(fn){try{return{ok:true,data:fn()};}catch(e){return{ok:false,error:e.message||'No se ha podido guardar. Conserva una copia con «Guardar archivo».'};}}
export function loadLibrary(storage){return attempt(()=>{const existing=read(storage);if(existing)return clone(existing);const legacy=readDraft(storage);if(legacy.blocked)throw Error('El borrador anterior no se reconoce. Se conserva sin modificar; exporta tu trabajo antes de continuar.');const record=fresh(legacy.project||template(),storage);return write(storage,{version:1,activeId:record.id,projects:[record]});});}
export function readLibrary(storage){return attempt(()=>{const data=read(storage);if(!data)throw Error('La biblioteca no está disponible. Recarga antes de continuar.');return clone(data);});}
export function updateProject(storage,projectId,project,revision){return attempt(()=>{const data=read(storage);if(!data)throw Error('Recarga la biblioteca antes de guardar.');const rec=data.projects.find(x=>x.id===projectId);if(!rec||rec.revision!==revision)throw Error('Este proyecto cambió en otra pestaña. Guarda un archivo con tus cambios y recupera la versión de la biblioteca antes de seguir.');rec.project=validate(project);rec.revision++;rec.updatedAt=new Date().toISOString();rec.sourceDevice=deviceLabel(storage);data.activeId=projectId;return write(storage,data);});}
export function createProject(storage,project){return attempt(()=>{const data=read(storage);if(!data)throw Error('Recarga la biblioteca antes de continuar.');if(data.projects.length>=MAX_PROJECTS)throw Error('La biblioteca tiene 100 proyectos. Tus proyectos se conservan; puedes guardar un archivo.');const record=fresh(project,storage);data.projects.push(record);data.activeId=record.id;return write(storage,data);});}
export function openProject(storage,projectId){return attempt(()=>{const data=read(storage);if(!data||!data.projects.some(x=>x.id===projectId))throw Error('El proyecto ya no está disponible.');data.activeId=projectId;return write(storage,data);});}
export function duplicateProject(storage,projectId){return attempt(()=>{const data=read(storage);if(!data)throw Error('Recarga la biblioteca antes de continuar.');const source=data.projects.find(x=>x.id===projectId);if(!source)throw Error('El proyecto ya no está disponible.');if(data.projects.length>=MAX_PROJECTS)throw Error('La biblioteca tiene 100 proyectos. No se ha eliminado ninguno.');const copy=clone(source.project);let n=1,title;do{const suffix=n===1?' · copia':` · copia ${n}`;title=copy.title.slice(0,80-suffix.length)+suffix;n++;}while(data.projects.some(x=>x.project.title===title));copy.title=title;const record=fresh(copy,storage);data.projects.push(record);data.activeId=record.id;return write(storage,data);});}
export function renameProject(storage,projectId,title,revision){return attempt(()=>{if(typeof title!=='string'||!title.trim()||title.trim().length>80)throw Error('Pon un nombre de entre 1 y 80 caracteres.');const data=read(storage),rec=data?.projects.find(x=>x.id===projectId);if(!rec||rec.revision!==revision)throw Error('El proyecto ha cambiado. Vuelve a abrir la biblioteca antes de renombrarlo.');rec.project={...rec.project,title:title.trim()};rec.revision++;rec.updatedAt=new Date().toISOString();rec.sourceDevice=deviceLabel(storage);return write(storage,data);});}
