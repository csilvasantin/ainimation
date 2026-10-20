export const KEY='ainimation:interactive:draft:v1';
const text=(v,max=300)=>typeof v==='string'&&v.trim().length<=max?v.trim():null;
export function validate(p){
 if(!p||p.format!=='ainimation-interactive'||p.version!==1)throw Error('Este archivo no es un proyecto interactivo compatible (versión 1).');
 if(!text(p.title,80)||!['portrait','landscape','square'].includes(p.orientation)||!/^#[\da-f]{6}$/i.test(p.color))throw Error('Revisa el nombre, el formato y el color del proyecto.');
 if(!Number.isInteger(p.resetSeconds)||p.resetSeconds<10||p.resetSeconds>300)throw Error('El reinicio debe estar entre 10 y 300 segundos.');
 if(!Array.isArray(p.scenes)||!p.scenes.length||p.scenes.length>20)throw Error('El proyecto debe tener entre 1 y 20 pantallas.');
 const ids=new Set();
 for(const s of p.scenes){if(!text(s.id,80)||ids.has(s.id)||!text(s.title,100)||text(s.body??'',500)===null||!Array.isArray(s.buttons)||s.buttons.length>6)throw Error('Revisa las pantallas y sus textos (máximo 6 botones por pantalla).');ids.add(s.id);}
 if(!ids.has(p.start))throw Error('La pantalla inicial no existe.');
 for(const s of p.scenes)for(const b of s.buttons)if(!text(b.label,80)||!ids.has(b.target))throw Error('Cada botón necesita un texto y una pantalla de destino existente.');
 return structuredClone(p);
}
export function template(kind='cafe'){
 const base={format:'ainimation-interactive',version:1,title:kind==='cafe'?'Mi cafetería':'Mi interactivo',orientation:'portrait',color:'#b8ee77',resetSeconds:30,start:'bienvenida',scenes:kind==='cafe'?[
 {id:'bienvenida',title:'Tu pausa empieza aquí',body:'Elige tu café y descubre algo para acompañarlo.',buttons:[{label:'Ver la carta',target:'carta'}]},
 {id:'carta',title:'¿Qué te apetece?',body:'Una elección para cada momento del día.',buttons:[{label:'Café caliente',target:'caliente'},{label:'Algo fresco',target:'frio'}]},
 {id:'caliente',title:'Un café con calma',body:'Latte · Cappuccino · Espresso\nPreparado a tu gusto.',buttons:[{label:'Lo quiero',target:'final'},{label:'Volver a la carta',target:'carta'}]},
 {id:'frio',title:'Una pausa refrescante',body:'Café con hielo · Té frío\nTu momento, a tu manera.',buttons:[{label:'Lo quiero',target:'final'},{label:'Volver a la carta',target:'carta'}]},
 {id:'final',title:'¡Buena elección!',body:'Acércate a la barra para hacer tu pedido.\nEsta es una demostración: no se envía ninguna comanda.',buttons:[{label:'Empezar de nuevo',target:'bienvenida'}]}
 ]:[{id:'bienvenida',title:'Bienvenido',body:'Toca para descubrir más.',buttons:[{label:'Descubrir',target:'final'}]},{id:'final',title:'Tu siguiente paso',body:'Personaliza esta pantalla y su acción.',buttons:[{label:'Volver al inicio',target:'bienvenida'}]}]};return base;
}
export function readDraft(storage){try{const raw=storage.getItem(KEY);return raw?{project:validate(JSON.parse(raw)),blocked:false}:{project:null,blocked:false};}catch{return{project:null,blocked:true};}}
export function saveDraft(storage,p){try{const before=readDraft(storage);if(before.blocked)return false;storage.setItem(KEY,JSON.stringify(validate(p)));return true;}catch{return false;}}
// One runtime powers the embedded preview and the standalone HTML export.
export function playerRuntime(project,root){
 let scene=project.start,timer;const doc=root.ownerDocument;
 function show(id,moveFocus=false){scene=id;const s=project.scenes.find(x=>x.id===id);root.replaceChildren();const label=doc.createElement('p');label.className='step';label.textContent=project.title;const h=doc.createElement('h1');h.textContent=s.title;const body=doc.createElement('p');body.className='copy';body.textContent=s.body;const actions=doc.createElement('div');actions.className='actions';for(const b of s.buttons){const btn=doc.createElement('button');btn.textContent=b.label;btn.onclick=()=>{show(b.target,true);arm();};actions.append(btn);}root.append(label,h,body,actions);h.setAttribute('tabindex','-1');if(moveFocus)h.focus?.({preventScroll:true});}
 function arm(){clearTimeout(timer);if(scene!==project.start)timer=setTimeout(()=>show(project.start),project.resetSeconds*1000);}
 root.addEventListener('pointerdown',arm);root.addEventListener('keydown',arm);show(scene);
}
export function playerHtml(input){
 const p=validate(input),data=JSON.stringify(p).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Interactivo · AINimation</title><style>*{box-sizing:border-box}body{margin:0;background:#102621;color:#fff;font-family:system-ui;min-height:100svh;display:grid;place-items:center}main{width:100%;max-width:860px;padding:clamp(24px,7vw,80px)}.step{text-transform:uppercase;letter-spacing:.15em;font-size:12px;color:${p.color}}h1{font-size:clamp(30px,8vw,72px);line-height:1.05;letter-spacing:-.04em;overflow-wrap:anywhere}.copy{white-space:pre-line;font-size:clamp(16px,3vw,24px);line-height:1.5;color:#d5e2dc}.actions{display:grid;gap:12px;margin-top:36px}button{min-height:52px;padding:16px;border:1px solid ${p.color};background:${p.color};color:#102621;border-radius:14px;font:600 17px system-ui;cursor:pointer;overflow-wrap:anywhere}button:focus-visible{outline:3px solid white;outline-offset:4px}button:nth-child(n+2){background:transparent;color:#fff}</style><main id="app" aria-live="polite"></main><script>(${playerRuntime.toString()})(${data},document.getElementById('app'))</script></html>`;
}
