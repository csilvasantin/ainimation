// URL → interactivo: convierte la estructura extraída de una página web
// (título, secciones, elementos con precio, enlaces) en un proyecto
// `ainimation-interactive` v1 que abre el Creador («Abrir proyecto») y
// reproduce playerHtml. Sin DOM ni red: la extracción vive en tools/url-a-interactivo.mjs.
const clip=(v,n)=>{v=String(v??'').replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1).trimEnd()+'…':v;};
const slug=(v,used)=>{let b=String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'pantalla',s=b,i=2;while(used.has(s))s=`${b}-${i++}`;used.add(s);return s;};
const PRICE=/(\d+[.,]\d{2}\s?(€|eur)|[€$£]\s?\d+([.,]\d{1,2})?|\d+([.,]\d{1,2})?\s?€)/i;
export function sectionsFrom(structure){
 const out=[];
 for(const s of structure.sections||[]){
  const items=[...new Set((s.items||[]).map(x=>clip(x,90)).filter(x=>x.length>1))];
  if(!s.heading||items.length<2)continue;
  const priced=items.filter(x=>PRICE.test(x)).length;
  out.push({heading:clip(s.heading,60),items,score:priced*3+Math.min(items.length,8)});
 }
 // Si la página tiene carta (secciones con precio), descartamos el resto (contacto, legal, redes).
 const menu=out.filter(s=>s.score>=s.items.length+3);const pool=menu.length>=2?menu:out;
 // Las secciones con precios (cartas) primero; máx. 10 para no saturar el quiosco.
 return pool.sort((a,b)=>b.score-a.score).slice(0,10);
}
export function projectFromStructure(structure,{orientation='portrait',color='#b8ee77',resetSeconds=45,image}={}){
 const used=new Set(['inicio','carta','final']);
 const title=clip(structure.title||structure.host||'Interactivo',80)||'Interactivo';
 const secs=sectionsFrom(structure);
 const scenes=[];
 const intro={id:'inicio',title:clip(title,100),body:clip(structure.description||'Toca para empezar.',180),buttons:[]};
 if(image&&image.length<=820000)intro.image=image;
 scenes.push(intro);
 if(!secs.length){
  intro.buttons.push({label:'Descubrir',target:'final'});
 }else{
  intro.buttons.push({label:secs.some(s=>s.score>8)?'Ver la carta':'Empezar',target:'carta'});
  const cats=secs.map(s=>({...s,id:slug(s.heading,used)}));
  // Índice paginado: 5 categorías + «Más» por pantalla (límite de 6 botones).
  const pages=[];for(let i=0;i<cats.length;i+=5)pages.push(cats.slice(i,i+5));
  pages.forEach((pg,i)=>{const id=i?`carta-${i+1}`:'carta';const btns=pg.map(c=>({label:clip(c.heading,80),target:c.id}));if(pages[i+1])btns.push({label:'Más opciones →',target:`carta-${i+2}`});else if(i)btns.push({label:'← Volver',target:'carta'});scenes.push({id,title:i?'Más opciones':'¿Qué te apetece?',body:'Elige una sección.',buttons:btns});});
  for(const c of cats){
   let body='';for(const it of c.items){const next=body?body+'\n'+it:it;if(next.length>480)break;body=next;}
   scenes.push({id:c.id,title:clip(c.heading,100),body,buttons:[{label:'Lo quiero',target:'final'},{label:'Volver',target:'carta'}]});
  }
 }
 scenes.push({id:'final',title:'¡Buena elección!',body:'Recreado desde '+clip(structure.host||'la web',60)+'.\nDemostración: no se envía ningún pedido.',buttons:[{label:'Empezar de nuevo',target:'inicio'}]});
 return {format:'ainimation-interactive',version:1,title,orientation,color,resetSeconds,start:'inicio',scenes,
  source:{kind:'url',url:String(structure.url||''),capturedAt:structure.capturedAt||new Date().toISOString()}};
}
