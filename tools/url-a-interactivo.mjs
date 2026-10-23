#!/usr/bin/env node
// Uso: node tools/url-a-interactivo.mjs <url> [carpeta-salida]
// Abre la URL en Chromium headless, extrae estructura (título, secciones con
// elementos/precios, imagen de portada) y genera, para 1080x1920 y 1920x1080:
//   proyecto-<orient>.json  → «Abrir proyecto» en /interactivos
//   capsula-<orient>.html   → cápsula autónoma (playerHtml) para mupi/quiosco
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {projectFromStructure} from '../assets/interactive-from-url.mjs';
import {playerHtml,validate} from '../assets/interactive-project.mjs';
const url=process.argv[2];if(!/^https?:\/\//.test(url||'')){console.error('Uso: node tools/url-a-interactivo.mjs <https://…> [salida]');process.exit(2);}
const host=new URL(url).hostname.replace(/^www\./,'');
const out=process.argv[3]||`examples/desde-url/${host.replace(/[^a-z0-9]+/gi,'-')}`;
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},locale:'es-ES'});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});
 // Cerrar banners de cookies habituales (sin aceptar nada más).
 for(const t of ['Aceptar','Accept','Rechazar','Reject all','Acepto'])await page.getByRole('button',{name:t,exact:false}).first().click({timeout:800}).catch(()=>{});
 const structure=await page.evaluate(()=>{
  const txt=e=>(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim();
  const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const meta=n=>document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content||'';
  const heads=[...document.querySelectorAll('h1,h2,h3,h4')].filter(vis);
  let sections=heads.map((h,i)=>{const next=heads[i+1];const items=[];
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT);walker.currentNode=h;
   let n;while((n=walker.nextNode())&&items.length<30){if(next&&(n===next||n.contains(next)))break;if(n.matches('h1,h2,h3,h4'))break;
    if(n.matches('li,tr,dt,p,[class*=item],[class*=product],[class*=dish],[class*=price]')&&(vis(n)||n.closest('[role=tabpanel],[class*=tab-content],[class*=tab-pane]'))){const t=txt(n);if(t&&t.length<140&&!items.some(x=>x.includes(t)||t.includes(x)))items.push(t);}}
   return {heading:txt(h),items};});
  // Cartas en pestañas (Elementor/Bootstrap/ARIA): cada panel es una sección con el nombre de su pestaña.
  for(const panel of document.querySelectorAll('[role=tabpanel],.elementor-tab-content,.tab-pane')){
   const lab=panel.getAttribute('aria-labelledby');const tab=lab&&document.getElementById(lab);
   const heading=(tab&&txt(tab))||panel.getAttribute('aria-label')||panel.dataset.tab||'';
   const items=[...panel.querySelectorAll('li,tr,p')].map(e=>(e.textContent||'').replace(/\s+/g,' ').trim()).filter(t=>t&&t.length<140);
   if(heading&&items.length)sections.push({heading,items:[...new Set(items)].slice(0,30)});
  }
  return {title:meta('og:title')||document.title,description:meta('og:description')||meta('description'),sections,
   links:[...document.querySelectorAll('nav a,button')].filter(vis).map(txt).filter(Boolean).slice(0,30)};
 });
 Object.assign(structure,{url,host,capturedAt:new Date().toISOString()});
 await writeFile(`${out}/estructura.json`,JSON.stringify(structure,null,1));
 for(const [orientation,w,h] of [['portrait',1080,1920],['landscape',1920,1080]]){
  await page.setViewportSize({width:Math.round(w/2),height:Math.round(h/2.4)});
  let image;for(const q of [70,50,35]){const b=await page.screenshot({type:'jpeg',quality:q});image='data:image/jpeg;base64,'+b.toString('base64');if(image.length<=800000)break;}
  const project=validate(projectFromStructure(structure,{orientation,image}));
  await writeFile(`${out}/proyecto-${orientation}.json`,JSON.stringify(project,null,1));
  await writeFile(`${out}/capsula-${orientation}.html`,playerHtml(project));
  console.log(`${orientation}: ${project.scenes.length} pantallas → ${out}/capsula-${orientation}.html`);
 }
}finally{await browser.close();}
