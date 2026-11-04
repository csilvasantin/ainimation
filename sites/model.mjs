import {localReference} from './media.mjs';
export const ANIMATIONS=['none','fade','rise','zoom','float'];
export const DEFAULT_MEDIA_WIDTH=640,MIN_MEDIA_WIDTH=80,MAX_MEDIA_WIDTH=3840;
const validMediaWidth=value=>Number.isInteger(value)&&value>=MIN_MEDIA_WIDTH&&value<=MAX_MEDIA_WIDTH;
export function normalizeURL(value){
  const u=new URL(/^[a-z]+:/i.test(value.trim())?value.trim():'https://'+value.trim());
  if(u.protocol!=='https:'||u.username||u.password)throw Error('Introduce una URL HTTPS.');
  u.hash='';return u.href;
}
export function mediaURL(value){
  const u=new URL(value);if(u.protocol!=='https:')throw Error('Usa una URL HTTPS para el medio.');return u.href;
}
const mediaReference=value=>localReference(value)?value:mediaURL(value);
export function validateSite(p){
  if(p?.format!=='ainimation-imported-site'||p.version!==1||typeof p.html!=='string'||p.html.length>2_000_000||
    typeof p.title!=='string'||p.title.length>220||!Array.isArray(p.items)||p.items.length>500)throw Error('El archivo no es un site editable compatible.');
  normalizeURL(p.url);const ids=new Set();
  if(!Array.isArray(p.warnings)||p.warnings.length>30||p.warnings.some(w=>typeof w!=='string'||w.length>1000)||
    !Array.isArray(p.links)||p.links.length>60||p.links.some(l=>typeof l!=='string'||l.length>4000))throw Error('Metadatos del site no compatibles.');
  for(const link of p.links)normalizeURL(link);
  for(const item of p.items){
    if(!/^ain-\d+$/.test(item.id)||ids.has(item.id)||!['text','image','video','graphic','background'].includes(item.type)||
       typeof item.label!=='string'||item.label.length>200||typeof item.value!=='string'||item.value.length>20000||
       !ANIMATIONS.includes(item.animation)||!Number.isFinite(item.duration)||item.duration<.2||item.duration>10||
       !Number.isFinite(item.delay)||item.delay<0||item.delay>10||typeof item.alt!=='string'||item.alt.length>1000)throw Error('El site contiene un componente incompatible.');
    if(['image','video','background'].includes(item.type)&&item.value)mediaReference(item.value);
    if(Object.hasOwn(item,'maxWidth')&&(item.inserted!==true||!['image','video'].includes(item.type)||!validMediaWidth(item.maxWidth)))throw Error('El ancho de un medio añadido debe ser un entero entre 80 y 3840 píxeles.');
    ids.add(item.id);
  }
  return structuredClone(p);
}
export function createSiteSession(input,saved){
  const original=validateSite(input);let states=[original],cursor=0;
  if(saved){const draft=validateSite(saved);if(draft.url!==original.url||draft.html!==original.html)throw Error('El borrador pertenece a otra importación.');if(JSON.stringify(draft)!==JSON.stringify(original)){states.push(draft);cursor=1;}}
  const read=()=>structuredClone(states[cursor]);
  const addedMedia=id=>{const item=states[cursor].items.find(i=>i.id===id);return item?.inserted===true&&['image','video'].includes(item.type)&&!original.items.some(i=>i.id===id);};
  const mediaNeighbor=(id,direction)=>{
    if(![-1,1].includes(direction)||!addedMedia(id))return -1;
    const items=states[cursor].items,index=items.findIndex(i=>i.id===id);
    for(let next=index+direction;next>=0&&next<items.length;next+=direction)if(addedMedia(items[next].id))return next;
    return -1;
  };
  return {get draft(){return read();},get original(){return structuredClone(original);},get canUndo(){return cursor>0;},get canRedo(){return cursor<states.length-1;},
    canRemoveMedia:addedMedia,canDuplicateMedia:addedMedia,canSetMediaWidth:addedMedia,
    canMoveMedia:(id,direction)=>mediaNeighbor(id,direction)>=0,
    edit(id,patch){const p=read(),item=p.items.find(i=>i.id===id);if(!item)throw Error('Componente desconocido.');
      const keys=['value','animation','duration','delay','alt',...(addedMedia(id)?['maxWidth']:[])];if(Object.keys(patch).some(k=>!keys.includes(k)))throw Error('Propiedad no editable.');
      if(Object.hasOwn(patch,'maxWidth')&&!validMediaWidth(patch.maxWidth))throw Error('Introduce un ancho entero entre 80 y 3840 píxeles.');
      Object.assign(item,patch);if(Object.hasOwn(patch,'maxWidth')&&patch.maxWidth===DEFAULT_MEDIA_WIDTH)delete item.maxWidth;validateSite(p);if(JSON.stringify(p)===JSON.stringify(states[cursor]))return;
      states=states.slice(0,cursor+1);states.push(p);if(states.length>100)states.shift();cursor=states.length-1;},
    addMedia(type,value){return this.addMediaBatch([{type,value}])[0];},
    addMediaBatch(media){if(!Array.isArray(media)||!media.length||media.length>10)throw Error('Selecciona de uno a diez archivos.');const p=read();if(p.items.length+media.length>500)throw Error('Límite de componentes alcanzado.');
      let next=Math.max(0,...p.items.map(i=>Number(i.id.slice(4))+1));const ids=[];
      for(const {type,value,label}of media){if(!['image','video'].includes(type))throw Error('Medio incompatible.');const id='ain-'+next++;ids.push(id);p.items.push({id,type,value:mediaReference(value),label:label||(type==='image'?'Imagen añadida':'Vídeo añadido'),alt:'',animation:'none',duration:1.2,delay:0,inserted:true});}
      validateSite(p);states=states.slice(0,cursor+1);states.push(p);if(states.length>100)states.shift();cursor=states.length-1;return ids;},
    duplicateMedia(id){if(!addedMedia(id))throw Error('Sólo puedes duplicar imágenes o vídeos añadidos a esta copia.');
      const p=read();if(p.items.length>=500)throw Error('Límite de componentes alcanzado.');
      const index=p.items.findIndex(i=>i.id===id),copy={...p.items[index],id:'ain-'+Math.max(0,...[...original.items,...p.items].map(i=>Number(i.id.slice(4))+1))};
      p.items.splice(index+1,0,copy);validateSite(p);
      states=states.slice(0,cursor+1);states.push(p);if(states.length>100)states.shift();cursor=states.length-1;return copy.id;},
    moveMedia(id,direction){if(![-1,1].includes(direction))throw Error('Dirección no compatible.');
      if(!addedMedia(id))throw Error('Sólo puedes ordenar imágenes o vídeos añadidos a esta copia.');
      const next=mediaNeighbor(id,direction);if(next<0)return false;
      const p=read(),index=p.items.findIndex(i=>i.id===id);[p.items[index],p.items[next]]=[p.items[next],p.items[index]];validateSite(p);
      states=states.slice(0,cursor+1);states.push(p);if(states.length>100)states.shift();cursor=states.length-1;return true;},
    removeMedia(id){if(!addedMedia(id))throw Error('Sólo puedes retirar imágenes o vídeos añadidos a esta copia.');
      const p=read();p.items=p.items.filter(i=>i.id!==id);validateSite(p);
      states=states.slice(0,cursor+1);states.push(p);if(states.length>100)states.shift();cursor=states.length-1;},
    undo(){if(cursor>0)cursor--;},redo(){if(cursor<states.length-1)cursor++;},reset(){states=states.slice(0,cursor+1);states.push(structuredClone(original));cursor=states.length-1;}
  };
}
