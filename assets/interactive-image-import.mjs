import {validate} from './interactive-project.mjs';
export const MAX_IMAGES=60;
export const IMAGE_BUDGET=45000;
export function sortedImages(files){return [...files].sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true,sensitivity:'base'}));}
export function projectFromImages(images,title='Cafetería · recreación'){
 if(!images.length||images.length>MAX_IMAGES)throw Error('Selecciona entre 1 y 60 imágenes.');
 const scenes=images.map((image,i)=>({id:'imagen-'+(i+1),title:image.name.replace(/\.[^.]+$/,'').slice(0,100)||'Pantalla '+(i+1),body:'',image:image.data,imageAlt:image.name.slice(0,100),sourceName:image.name,...(image.sourceAssetId?{sourceAssetId:image.sourceAssetId}:{}),buttons:[...(i?[{label:'Anterior',target:'imagen-'+i}]:[]),{label:i===images.length-1?'Volver al inicio':'Siguiente',target:i===images.length-1?'imagen-1':'imagen-'+(i+2)}]}));
 const first=images[0],ratio=first.width/first.height;
 return validate({format:'ainimation-interactive',version:1,title:title.trim(),orientation:ratio>1.15?'landscape':ratio<.87?'portrait':'square',color:'#00ff41',resetSeconds:60,start:scenes[0].id,scenes,importedImages:true});
}
export async function prepareImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error(file.name+': usa PNG, JPG o WebP.');
 if(file.size>20000000)throw Error(file.name+': supera 20 MB.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error(file.name+': no se puede leer la imagen.');}
 try{
 if(bitmap.width*bitmap.height>40000000)throw Error(file.name+': la imagen supera 40 megapíxeles.');
 const canvas=document.createElement('canvas');let data;
 // Sequential decoding and bounded editing copies keep 18 screens within local library quota.
 for(const max of [1600,1280,1024,800,640]){const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pueden preparar imágenes en este navegador.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);for(const quality of [.88,.72,.55,.38]){data=canvas.toDataURL('image/webp',quality);if(data.startsWith('data:image/webp;')&&data.length<=IMAGE_BUDGET*4/3+40)return{name:file.name,data,width:bitmap.width,height:bitmap.height,editingWidth:canvas.width,editingHeight:canvas.height};}}
 throw Error(file.name+': no se pudo ajustar para la biblioteca. Prueba una imagen más pequeña.');
 }finally{bitmap.close();}
}
