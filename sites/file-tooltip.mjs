import {localReference} from './media.mjs';

export function localMediaName(library,ref){
  if(!localReference(ref))return '';
  try{const name=library.records(new Set([ref]))[0]?.name;return typeof name==='string'?name:'';}catch{return '';}
}

export function localFileTooltip(item,details,getMediaName){
  if(!['image','video'].includes(item?.type)||!localReference(item.value)||typeof item.label!=='string'||typeof details!=='string')return '';
  let name;try{name=getMediaName(item.value);}catch{return '';}
  if(typeof name!=='string'||!name.trim()||name.length>200)return '';
  return item.label+'\n'+details+'\nArchivo local: '+name;
}

export const hasImageDescription=item=>item?.type==='image'&&typeof item.alt==='string'&&item.alt.trim().length>0;

export function componentTooltip(item,details,getMediaName){
  const title=localFileTooltip(item,details,getMediaName);
  if(!hasImageDescription(item)||typeof item.label!=='string'||typeof details!=='string')return title;
  return (title||item.label+'\n'+details)+'\nDescripción de la imagen: '+item.alt;
}
