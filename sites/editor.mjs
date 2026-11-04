import {importSite} from './import.mjs';
import {createSiteSession,validateSite} from './model.mjs';
import {buildDocument} from './preview.mjs';
import {listSites,saveSite} from './storage.mjs';
const $=id=>document.getElementById(id),library=new Map();
let session=null,recordID='',selected='',channel='',comparing=false,mobile=false,importing=false,persistTimer;
const labels={text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'};
const motionLabels={none:'Sin animación',fade:'Aparecer',rise:'Entrada desde abajo',zoom:'Acercamiento suave',float:'Flotar en bucle'};
const say=message=>$('edit-status').textContent=message;
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filename(){return new URL(session.draft.url).hostname.replaceAll('.','-');}
function addOption(id,project){let option=[...$('site-library').options].find(o=>o.value===id);if(!option){option=document.createElement('option');option.value=id;$('site-library').append(option);}option.textContent=project.title+' · copia '+new Date(project.importedAt||Date.now()).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
async function persist(){
  if(!session)return;clearTimeout(persistTimer);
  const record={id:recordID,original:session.original,draft:session.draft,updatedAt:Date.now()};
  try{await saveSite(record);library.set(record.id,record);addOption(record.id,record.draft);if(record.id===recordID){$('saved-status').textContent='Copia guardada en este navegador · '+new Date().toLocaleTimeString('es');try{localStorage.setItem('ainimation-last-site',record.id);}catch{}}}
  catch{$('saved-status').textContent='No se pudo guardar en este navegador. Descarga el proyecto para conservarlo.';}
}
function remember(){ $('saved-status').textContent='Guardando copia…';clearTimeout(persistTimer);persistTimer=setTimeout(persist,250);}
function highlight(scroll=false){$('draft-frame').contentWindow?.postMessage({channel,type:'highlight',id:selected,scroll},'*');}
function preview(){
  if(!session)return;channel=crypto.randomUUID();
  $('draft-frame').srcdoc=buildDocument(session.draft,{channel,interactive:true});
  $('original-wrap').hidden=!comparing;
  if(comparing)$('original-frame').srcdoc=buildDocument(session.original);
  document.querySelector('.canvas-wrap').classList.toggle('comparing',comparing);
  document.querySelector('.canvas-wrap').classList.toggle('mobile',mobile);
  $('compare').setAttribute('aria-pressed',String(comparing));$('compare').textContent=comparing?'Cerrar comparación':'Comparar';
  $('desktop').setAttribute('aria-pressed',String(!mobile));$('mobile').setAttribute('aria-pressed',String(mobile));
}
window.addEventListener('message',event=>{
  if(event.source!==$('draft-frame').contentWindow||event.data?.channel!==channel)return;
  if(event.data.type==='ready')highlight();
  if(event.data.type==='select'&&session?.draft.items.some(i=>i.id===event.data.id)){selected=event.data.id;paintComponents();inspector();highlight();}
});
function history(){ $('undo').disabled=!session?.canUndo;$('redo').disabled=!session?.canRedo;}
function paintComponents(){
  const filter=$('filter').value.toLocaleLowerCase(),items=session.draft.items;
  $('component-count').textContent='· '+items.length;
  $('components').replaceChildren(...items.filter(i=>(i.label+' '+i.value+' '+labels[i.type]).toLocaleLowerCase().includes(filter)).map(i=>{
    const b=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('span');b.type='button';b.dataset.item=i.id;
    strong.textContent=i.label;small.textContent=labels[i.type]+(i.animation==='none'?'':' · '+motionLabels[i.animation]);b.append(strong,small);b.setAttribute('aria-pressed',String(i.id===selected));
    b.onclick=()=>{selected=i.id;paintComponents();inspector();highlight(true);};return b;
  }));
}
function inspector(){
  const item=session.draft.items.find(i=>i.id===selected);$('fields').replaceChildren();if(!item)return;
  $('selected-title').textContent=labels[item.type];
  function field(key,labelText,type,options){
    const label=document.createElement('label');label.textContent=labelText;label.htmlFor='field-'+key;
    const input=document.createElement(type==='select'?'select':type==='textarea'?'textarea':'input');input.id='field-'+key;input.name=key;
    if(type==='select')for(const [value,text]of Object.entries(options)){const o=document.createElement('option');o.value=value;o.textContent=text;input.append(o);}
    else if(type==='textarea'){input.maxLength=20000;input.rows=5;}
    else{input.type=type;if(type==='number'){input.min=key==='duration'?.2:0;input.max=10;input.step=.1;}if(type==='text')input.maxLength=1000;}
    input.value=item[key];
    const apply=()=>{try{session.edit(item.id,{[key]:type==='number'?input.valueAsNumber:input.value});input.setCustomValidity('');preview();history();paintComponents();remember();say('Cambio aplicado a tu copia.');}
      catch(error){input.setCustomValidity(error.message);input.reportValidity();say(error.message);}};
    if(type==='textarea'||type==='text')input.oninput=apply;else input.onchange=apply;
    label.append(input);$('fields').append(label);
  }
  if(item.type==='text')field('value','Texto','textarea');
  if(['image','video','background'].includes(item.type))field('value',item.type==='video'?'URL del vídeo (MP4 o WebM)':'URL de la imagen','url');
  if(item.type==='image')field('alt','Descripción de la imagen','text');
  field('animation','Animación','select',motionLabels);field('duration','Duración · segundos','number');field('delay','Retraso · segundos','number');
}
function paint(){if(!session.draft.items.some(i=>i.id===selected))selected=session.draft.items[0].id;paintComponents();inspector();preview();history();}
function open(record){
  session=createSiteSession(record.original,record.draft);recordID=record.id;selected=session.draft.items[0].id;$('filter').value='';
  $('workspace').hidden=false;$('empty').hidden=true;$('site-title').textContent=session.draft.title;
  $('site-url').value=session.draft.url;$('source-url').href=session.draft.url;$('source-url').textContent=new URL(session.draft.url).hostname+' ↗';
  $('warnings').replaceChildren(...(session.draft.warnings||[]).map(w=>{const p=document.createElement('p');p.textContent=w;return p;}));
  $('site-pages').replaceChildren(new Option('Seleccionar página…',''),...(session.draft.links||[]).map(url=>new Option(new URL(url).pathname,url)));
  addOption(record.id,session.draft);$('site-library').value=record.id;paint();say('Selecciona un elemento en la página o en la lista.');
}
$('import-form').onsubmit=async e=>{
  e.preventDefault();if(importing)return;importing=true;$('import-button').disabled=true;$('site-library').disabled=true;$('site-url').disabled=true;
  $('import-status').textContent='Importando página y estilos…';
  try{if(session)await persist();const p=await importSite($('site-url').value);const record={id:crypto.randomUUID(),original:p,draft:p};open(record);await persist();$('import-status').textContent=p.title+' · '+p.items.length+' componentes editables. Copia importada.';}
  catch(error){$('import-status').textContent='No se ha importado: '+error.message+' La copia abierta se conserva.';}
  finally{importing=false;$('import-button').disabled=false;$('site-library').disabled=false;$('site-url').disabled=false;}
};
$('site-library').onchange=async()=>{
  if(session)await persist();const value=$('site-library').value;
  if(library.has(value)){open(library.get(value));$('import-status').textContent='Copia recuperada del navegador. Puedes seguir editando.';}
  else{$('site-url').value=value==='preset'?'https://www.portaventuranext.com/':'';$('site-url').focus();$('import-status').textContent='Introduce o revisa la URL y pulsa Importar página.';}
};
$('site-pages').onchange=()=>{if(!$('site-pages').value)return;$('site-url').value=$('site-pages').value;$('import-status').textContent='Página seleccionada. Pulsa Importar página para crear otra copia.';$('import-button').focus();};
$('filter').oninput=paintComponents;
$('undo').onclick=()=>{session.undo();paint();remember();say('Cambio deshecho.');};$('redo').onclick=()=>{session.redo();paint();remember();say('Cambio rehecho.');};
$('compare').onclick=()=>{comparing=!comparing;preview();};$('replay').onclick=preview;
$('desktop').onclick=()=>{mobile=false;preview();};$('mobile').onclick=()=>{mobile=true;preview();};
$('fields').onsubmit=e=>e.preventDefault();
$('add-media').onclick=()=>{try{selected=session.addMedia($('media-type').value,$('media-url').value);paint();remember();say('Medio añadido después del contenido original.');}catch(e){say(e.message);}};
$('download-project').onclick=()=>{download(new Blob([JSON.stringify({format:'ainimation-site-workspace',version:1,original:session.original,draft:session.draft})],{type:'application/json'}),filename()+'.ainimation.json');say('Proyecto descargado. Contiene tu copia editable y el original importado.');};
$('download-html').onclick=()=>{download(new Blob([buildDocument(session.draft)],{type:'text/html;charset=utf-8'}),filename()+'.html');say('HTML exportado con tus ajustes y animaciones. Los medios siguen enlazados a sus URLs.');};
async function openFile(event){
  try{const file=event.target.files[0];if(!file)return;if(file.size>5_000_000)throw Error('El proyecto supera 5 MB.');
    const p=JSON.parse(await file.text());if(p.format!=='ainimation-site-workspace'||p.version!==1)throw Error('Archivo no compatible.');
    validateSite(p.original);validateSite(p.draft);const next=createSiteSession(p.original,p.draft);buildDocument(next.draft);
    if(session)await persist();open({id:crypto.randomUUID(),original:p.original,draft:p.draft});await persist();$('import-status').textContent='Proyecto abierto desde el archivo.';
  }catch(e){$('import-status').textContent='No se ha abierto el archivo: '+e.message;}finally{event.target.value='';}
}
$('open-project').onchange=openFile;$('open-empty').onchange=openFile;
document.addEventListener('keydown',e=>{if(!session||!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select'))return;if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session)persist();});
try{const records=await listSites();for(const r of records){try{validateSite(r.draft);validateSite(r.original);library.set(r.id,r);addOption(r.id,r.draft);}catch{}}
  let last='';try{last=localStorage.getItem('ainimation-last-site');}catch{}if(library.has(last)){open(library.get(last));$('saved-status').textContent='Copia recuperada de este navegador.';}
}catch{$('import-status').textContent+=' El almacenamiento del navegador no está disponible; podrás descargar tu proyecto.';}
