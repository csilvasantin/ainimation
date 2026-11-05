import {localReference} from './media.mjs';
import {hasConfiguredAnimation} from './animation-state.mjs?v=20261105-animation-filter-1';

const secondsFormat=new Intl.NumberFormat('es',{useGrouping:false,maximumFractionDigits:20});
const fileSizeFormat=new Intl.NumberFormat('es',{maximumFractionDigits:2}),bytesFormat=new Intl.NumberFormat('es',{maximumFractionDigits:0});
const fileSizeUnits=['B','kB','MB','GB','TB','PB'];
const fileFormats=new Map([['image/png',['image','PNG']],['image/jpeg',['image','JPEG']],['image/webp',['image','WebP']],['image/gif',['image','GIF']],['image/avif',['image','AVIF']],['video/mp4',['video','MP4']],['video/webm',['video','WebM']]]);
const validFileSize=size=>Number.isSafeInteger(size)&&size>=0;
function fileSizeLabel(size){
  let value=size,unit=0;while(value>=1000&&unit<fileSizeUnits.length-1){value/=1000;unit++;}
  if(Math.round(value*100)/100>=1000&&unit<fileSizeUnits.length-1){value/=1000;unit++;}
  return fileSizeFormat.format(value)+' '+fileSizeUnits[unit]+(unit?' ('+bytesFormat.format(size)+' B)':'');
}
function localMediaProperty(library,ref,key){
  if(!localReference(ref))return;
  try{const record=library.records(new Set([ref]))[0];return record?.id===ref?record[key]:undefined;}catch{}
}

export function localMediaName(library,ref){
  const name=localMediaProperty(library,ref,'name');return typeof name==='string'?name:'';
}
export function localMediaSize(library,ref){const size=localMediaProperty(library,ref,'size');return validFileSize(size)?size:undefined;}
export function localMediaMime(library,ref){const mime=localMediaProperty(library,ref,'mime');return typeof mime==='string'&&fileFormats.has(mime)?mime:'';}

export function localFileTooltip(item,details,getMediaName){
  if(!['image','video'].includes(item?.type)||!localReference(item.value)||typeof item.label!=='string'||typeof details!=='string')return '';
  let name;try{name=getMediaName(item.value);}catch{return '';}
  if(typeof name!=='string'||!name.trim()||name.length>200)return '';
  return item.label+'\n'+details+'\nArchivo local: '+name;
}

export const hasImageDescription=item=>item?.type==='image'&&typeof item.alt==='string'&&item.alt.trim().length>0;

export function componentTooltip(item,details,getMediaName,getMediaSize=()=>undefined,getMediaMime=()=> ''){
  let title=localFileTooltip(item,details,getMediaName);
  if(typeof item?.label!=='string'||typeof details!=='string')return title;
  const heading=item.label+'\n'+details;
  if(hasImageDescription(item))title=(title||heading)+'\nDescripción de la imagen: '+item.alt;
  if(hasConfiguredAnimation(item)&&Number.isFinite(item.duration)&&item.duration>=.2&&item.duration<=10&&Number.isFinite(item.delay)&&item.delay>=0&&item.delay<=10){
    title=(title||heading)+'\nDuración: '+secondsFormat.format(item.duration)+' s · Retraso: '+secondsFormat.format(item.delay)+' s';
  }
  if(['image','video'].includes(item.type)&&localReference(item.value)){
    let size;try{size=getMediaSize(item.value);}catch{}
    if(validFileSize(size))title=(title||heading)+'\nTamaño del archivo: '+fileSizeLabel(size);
    let mime;try{mime=getMediaMime(item.value);}catch{}
    const format=typeof mime==='string'?fileFormats.get(mime):undefined;
    if(format?.[0]===item.type)title=(title||heading)+'\nFormato del archivo: '+format[1];
  }
  return title;
}
