import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
let browser,server,base;
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
before(async()=>{
  server=createServer(async(req,res)=>{
    try {const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!path.startsWith(root+sep)&&path!==root)throw Error();
      const content=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(content);
    }catch{res.statusCode=404;res.end();}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
async function fixture(t,width=1280){
  const context=await browser.newContext({viewport:{width,height:900}});t.after(()=>context.close());
  await context.route('**/*',route=>new URL(route.request().url()).origin===base||route.request().url().startsWith('data:')?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(6000);
  await page.goto(base+'/studio.html?intro=1');await page.waitForFunction(()=>typeof currentPlan==='function'&&window.ainCastLibrary);
  await page.evaluate(()=>{
    const p=currentPlan();p.cast=[
      {id:'z',name:'Zorro 10',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="orange"/></svg>'),imported:true,onStage:false,mediaType:'image',role:'Actor',type:'Imagen',startFrame:1,durationFrames:48},
      {id:'a',name:'Árbol 2',fileName:'bosque.png',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="green"/></svg>'),imported:true,onStage:true,mediaType:'image',role:'Fondo',type:'Imagen',startFrame:1,durationFrames:48},
      {id:'v',name:'Zorro 2',src:'data:video/mp4;base64,',imported:true,onStage:false,mediaType:'video',role:'Clip',type:'Vídeo',startFrame:1,durationFrames:48}
    ];saveFilmPlan(p);renderFilmPlan(p);document.body.classList.remove('director-focus');
    window.__savedBefore=localStorage.getItem('ainimation-film-plan');window.__stageBefore=document.querySelector('.stage-imported-member');
  });
  return page;
}
test('search preserves focus, project, playback DOM and supports reset after no results',async t=>{
  const p=await fixture(t);const input=p.locator('[data-cast-search]');
  await input.fill('arbol bosque');assert.equal(await p.locator('#castBin [data-cast-index]').count(),1);
  assert.equal(await p.locator('#castBin [data-cast-index]').getAttribute('data-cast-index'),'1');
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  assert.equal(await p.evaluate(()=>document.querySelector('.stage-imported-member')===window.__stageBefore),true);
  assert.equal(await p.evaluate(()=>localStorage.getItem('ainimation-film-plan')===window.__savedBefore),true);
  await input.fill('no-existe');assert.equal(await p.locator('#castBin [data-cast-index]').count(),0);
  await p.locator('[data-cast-reset]').click();assert.equal(await p.locator('#castBin [data-cast-index]').count(),3);
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
});
test('sorting and usage preserve drag payload and insert the original resource',async t=>{
  const p=await fixture(t);await p.locator('[data-cast-sort]').selectOption('name');
  assert.deepEqual(await p.locator('#castBin [data-cast-index]').evaluateAll(els=>els.map(e=>e.dataset.castIndex)),['1','2','0']);
  const payload=await p.locator('#castBin [data-cast-index="0"]').evaluate(el=>{const dataTransfer=new DataTransfer();el.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));el.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer}));return dataTransfer.getData('text/plain');});assert.equal(payload,'cast:0');
  await p.locator('[data-cast-usage]').selectOption('unused');assert.equal(await p.locator('#castBin [data-cast-index]').count(),2);
  await p.locator('#castBin [data-cast-index="0"]').press('Enter');
  assert.equal(await p.evaluate(()=>currentPlan().cast[0].onStage),true);assert.equal(await p.locator('#castBin [data-cast-index]').count(),1);
  await p.locator('[data-cast-usage]').selectOption('used');assert.equal(await p.locator('#castBin [data-cast-index]').count(),2);
});
test('controls stay inside a narrow Cast and leave scrollable library space',async t=>{
  const p=await fixture(t,900);await p.evaluate(()=>applyLayoutMode('floating'));await p.addStyleTag({content:'.director-window:not([data-window="cast"]) { visibility: hidden; }'});await p.locator('[data-window="cast"]').evaluate(el=>{el.style.width='300px';el.style.minWidth='300px';el.style.height='370px';});
  const dimensions=await p.locator('#castToolbar').evaluate(el=>{const r=el.getBoundingClientRect();return {width:el.clientWidth,overflow:el.scrollWidth>el.clientWidth,inputs:[...el.querySelectorAll('input,select,button')].every(c=>{const q=c.getBoundingClientRect();return q.left>=r.left&&q.right<=r.right+1;}),libraryHeight:document.querySelector('#castBin').getBoundingClientRect().height};});
  const folder=process.env.CAST_SCREENSHOT_DIR;if(folder){await mkdir(folder,{recursive:true});await p.locator('[data-window="cast"]').screenshot({path:resolve(folder,'cast-library.png')});}
  assert.ok(dimensions.width<=300,JSON.stringify(dimensions));assert.equal(dimensions.overflow,false);assert.equal(dimensions.inputs,true);assert.ok(dimensions.libraryHeight>80);
  if(folder){await p.locator('[data-window="cast"]').evaluate(el=>{el.style.width='430px';el.style.height='370px';});await p.locator('[data-window="cast"]').screenshot({path:resolve(folder,'cast-library-wide.png')});}
});
