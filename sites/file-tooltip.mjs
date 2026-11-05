import {localReference} from './media.mjs';
import {hasConfiguredAnimation} from './animation-state.mjs?v=20261105-animation-filter-1';

const secondsFormat=new Intl.NumberFormat('es',{useGrouping:false,maximumFractionDigits:20});

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
  let title=localFileTooltip(item,details,getMediaName);
  if(typeof item?.label!=='string'||typeof details!=='string')return title;
  const heading=item.label+'\n'+details;
  if(hasImageDescription(item))title=(title||heading)+'\nDescripción de la imagen: '+item.alt;
  if(hasConfiguredAnimation(item)&&Number.isFinite(item.duration)&&item.duration>=.2&&item.duration<=10&&Number.isFinite(item.delay)&&item.delay>=0&&item.delay<=10){
    title=(title||heading)+'\nDuración: '+secondsFormat.format(item.duration)+' s · Retraso: '+secondsFormat.format(item.delay)+' s';
  }
  return title;
}
