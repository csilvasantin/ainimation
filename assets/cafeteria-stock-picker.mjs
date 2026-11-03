import {cafeteriaStockImage} from './interactive-cafeteria.mjs?v=cafe-stock-1';
import {fetchResourceIndex} from './admira-resource-updates.mjs';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function cafeteriaStockChoices(items,query=''){
 if(!Array.isArray(items))throw Error('El catálogo de Admira no contiene recursos válidos.');
 const needle=normalize(query.trim()),seen=new Set(),choices=[];
 for(const item of items){
  if(item?.type!=='image'||typeof item.id!=='string'||seen.has(item.id))continue;
  let image;try{image=cafeteriaStockImage(item.url);}catch{continue;}
  if(image.stockId!==item.id)continue;
  seen.add(item.id);
  const title=typeof item.title==='string'&&item.title.trim()?item.title.trim():item.id;
  const tags=Array.isArray(item.tags)?item.tags.filter(x=>typeof x==='string'):[];
  if(needle&&!normalize([title,item.id,...tags].join(' ')).includes(needle))continue;
  choices.push({title,image});
 }
 return choices;
}
// Selection is explicit and local. Closing, failed reads and searches never edit a product.
export function openCafeteriaStockPicker(doc,{lang='es',request=fetch}={}){
 const t=(es,en)=>lang==='en'?en:es;
 return new Promise(resolve=>{
  const make=(tag,text)=>{const el=doc.createElement(tag);if(text)el.textContent=text;return el;};
  const dialog=make('dialog');dialog.className='cafeteria-stock-picker';
  dialog.style.cssText='box-sizing:border-box;width:min(820px,94vw);max-height:90svh;overflow:auto;padding:24px;background:#102621;color:#eef5e9;border:1px solid #789965;border-radius:12px;font:15px system-ui';
  const style=make('style');style.textContent='.cafeteria-stock-picker *{box-sizing:border-box}.cafeteria-stock-picker h2{font:600 24px system-ui;margin:0 0 12px}.cafeteria-stock-picker input,.cafeteria-stock-picker button{font:inherit;min-height:44px;padding:10px;border:1px solid #789965;border-radius:6px;background:#193226;color:#eef5e9}.cafeteria-stock-picker input{display:block;width:100%;margin-top:8px}.cafeteria-stock-picker label{display:block;margin:16px 0}.cafeteria-stock-picker .stock-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px;margin:16px 0}.cafeteria-stock-picker .stock-grid button{display:flex;flex-direction:column;text-align:left;gap:8px;overflow-wrap:anywhere;min-width:0}.cafeteria-stock-picker img{width:100%;height:130px;object-fit:contain}.cafeteria-stock-picker footer{display:flex;gap:12px;flex-wrap:wrap}.cafeteria-stock-picker button:focus-visible,.cafeteria-stock-picker input:focus-visible{outline:3px solid #b8ee77;outline-offset:3px}';
  const title=make('h2',t('Elegir imagen de Stock','Choose a Stock image'));title.id='cafe-stock-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',title.id);
  const label=make('label',t('Buscar por título, etiqueta o ID','Search by title, tag or ID')),search=make('input');search.type='search';search.maxLength=160;label.append(search);
  const status=make('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const grid=make('div');grid.className='stock-grid';
  const footer=make('footer'),more=make('button',t('Mostrar más','Show more')),retry=make('button',t('Reintentar','Retry')),close=make('button',t('Cancelar','Cancel'));
  for(const button of [more,retry,close])button.type='button';more.hidden=true;retry.hidden=true;footer.append(more,retry,close);dialog.append(style,title,label,status,grid,footer);
  let items=[],limit=24,closed=false,controller=null;
  const finish=value=>{if(closed)return;closed=true;controller?.abort();dialog.close();dialog.remove();resolve(value);};
  const render=()=>{
   const choices=cafeteriaStockChoices(items,search.value),shown=choices.slice(0,limit);grid.replaceChildren();
   status.textContent=choices.length?t('Mostrando ','Showing ')+shown.length+' / '+choices.length+t(' imágenes.',' images.'):t('No hay imágenes compatibles con esta búsqueda.','No compatible images match this search.');
   for(const choice of shown){const button=make('button'),image=make('img'),name=make('span',choice.title),id=make('small',choice.image.stockId);button.type='button';button.setAttribute('aria-label',t('Elegir ','Choose ')+choice.title);image.src=choice.image.src;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>{image.remove();button.disabled=true;name.textContent=choice.title+t(' · imagen no disponible',' · image unavailable');};button.append(image,name,id);button.onclick=()=>finish(choice.image);grid.append(button);}
   more.hidden=shown.length===choices.length;
  };
  const load=async()=>{controller?.abort();controller=new AbortController();const current=controller;retry.hidden=true;more.hidden=true;status.textContent=t('Consultando imágenes de Admira Stock…','Loading Admira Stock images…');try{const result=await fetchResourceIndex(request,current.signal);if(closed||current!==controller)return;items=result;render();}catch(error){if(closed||current.signal.aborted)return;status.textContent=t(error.message,'Admira Stock could not be loaded. Retry or cancel; your product image is unchanged.');retry.hidden=false;}};
  search.oninput=()=>{limit=24;if(items.length)render();};more.onclick=()=>{limit+=24;render();};retry.onclick=load;close.onclick=()=>finish(null);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
  doc.body.append(dialog);dialog.showModal();search.focus();load();
 });
}
