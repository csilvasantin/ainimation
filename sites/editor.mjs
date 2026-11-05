import {importSite} from './import.mjs';
import {createSiteSession,validateSite,DEFAULT_MEDIA_WIDTH,MIN_MEDIA_WIDTH,MAX_MEDIA_WIDTH} from './model.mjs?v=20261105-names-1';
import {buildDocument} from './preview.mjs?v=20261104-visibility-1';
import {listSites,saveSite} from './storage.mjs';
import {createMediaLibrary,verifyMediaRecords,prepareLocalFile,referencedMedia,localReference,exportMedia,importMedia,exportMediaURLs,IMAGE_ACCEPT,VIDEO_ACCEPT,FILE_ACCEPT,MAX_PACKAGE,MAX_LIBRARY} from './media.mjs';
import {createQuadraticUI} from './quad.mjs';
import {parseExpertCommand,EXPERT_HELP} from './expert.mjs';
import {createFileDrop,previewMessageSource,mediaDropReplacement} from './drop.mjs?v=20261104-replace-1';
import {createPreviewSound} from './sound.mjs?v=20261104-sound-1';
import {createImagePaste} from './paste.mjs?v=20261104-paste-1';
import {COMPONENT_LABELS,createComponentFilter} from './filter.mjs?v=20261105-alt-search-1';
const $=id=>document.getElementById(id),library=new Map();
const quad=createQuadraticUI();
let session=null,recordID='',selected='',channel='',comparing=false,mobile=false,importing=false,persistTimer;
let mediaLibrary=createMediaLibrary(),mediaBusy=false,selectScroll=false;
const labels=COMPONENT_LABELS,componentFilter=createComponentFilter({onChange:paintComponents});
const motionLabels={none:'Sin animación',fade:'Aparecer',rise:'Entrada desde abajo',zoom:'Acercamiento suave',float:'Flotar en bucle'};
const say=message=>{$('edit-status').textContent=message;$('workspace-status').textContent=message;};
let soundStorage;try{soundStorage=window.localStorage;}catch{}
const sound=createPreviewSound({button:$('mute-videos'),storage:soundStorage,getChannel:()=>channel,getFrames:()=>({draft:$('draft-frame').contentWindow,...(comparing?{original:$('original-frame').contentWindow}:{})})});
function dropFeedback(message){say(message);if(!session){$('import-status').textContent=message;quad.show('options');}}
const replacement=context=>mediaDropReplacement(session?.draft,selected,context);
const fileDrop=createFileDrop({document,overlay:$('media-drop-overlay'),onFiles:(files,context)=>loadLocalFiles(files,replacement(context)||{}),onError:dropFeedback,getMessage:context=>{
  if(!session)return 'Importa o abre un site primero';if(mediaBusy||importing)return 'Espera a que termine la operación en curso';
  const target=replacement(context);return target?'Suelta '+(target.expected==='video'?'un vídeo':'una imagen')+' para sustituir «'+target.label+'»':'Suelta imágenes o vídeos para añadirlos a tu copia';
},getDetail:context=>replacement(context)?'Un archivo del mismo tipo · conserva descripción, animación e historial. Puedes deshacer.':'Hasta 10 archivos · imágenes de 10 MB y vídeos de 50 MB'});
createImagePaste({document,onFiles:files=>loadLocalFiles(files,{expected:'image'})});
$('start-import').onclick=()=>quad.show('options',true);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filename(){return new URL(session.draft.url).hostname.replaceAll('.','-');}
function addOption(id,project){let option=[...$('site-library').options].find(o=>o.value===id);if(!option){option=document.createElement('option');option.value=id;$('site-library').append(option);}option.textContent=project.title+' · copia '+new Date(project.importedAt||Date.now()).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});}
async function persist(){
  if(!session)return;clearTimeout(persistTimer);
  const record={id:recordID,original:session.original,draft:session.draft,assets:mediaLibrary.records(referencedMedia(session.original,session.draft)),updatedAt:Date.now()};
  try{await saveSite(record);library.set(record.id,record);addOption(record.id,record.draft);if(record.id===recordID){$('saved-status').textContent='Copia guardada en este navegador · '+new Date().toLocaleTimeString('es');try{localStorage.setItem('ainimation-last-site',record.id);}catch{}}}
  catch{$('saved-status').textContent='No se pudo guardar en este navegador. Descarga el proyecto para conservarlo.';}
}
function remember(){ $('saved-status').textContent='Guardando copia…';clearTimeout(persistTimer);persistTimer=setTimeout(persist,250);}
function highlight(scroll=false){$('draft-frame').contentWindow?.postMessage({channel,type:'highlight',id:selected,scroll},'*');}
async function preview(){
  if(!session)return;channel=crypto.randomUUID();sound.reset();
  if($('original-frame').srcdoc)$('original-frame').srcdoc='';
  $('draft-frame').srcdoc=buildDocument(session.draft,{channel,interactive:true,media:mediaLibrary.previewMedia(session.draft)});
  $('original-wrap').hidden=!comparing;
  document.querySelector('.canvas-wrap').classList.toggle('comparing',comparing);
  document.querySelector('.canvas-wrap').classList.toggle('mobile',mobile);
  $('compare').setAttribute('aria-pressed',String(comparing));$('compare').textContent=comparing?'Cerrar comparación':'Comparar';
  $('desktop').setAttribute('aria-pressed',String(!mobile));$('mobile').setAttribute('aria-pressed',String(mobile));
  if(comparing){const token=channel;try{const media=await exportMediaURLs(mediaLibrary,session.original);if(token===channel)$('original-frame').srcdoc=buildDocument(session.original,{media,dropChannel:channel});}catch(e){say(e.message);}}
}
window.addEventListener('message',event=>{
  const source=previewMessageSource(event,channel,$('draft-frame').contentWindow,comparing?$('original-frame').contentWindow:null);
  if(!source)return;const draft=source==='draft';
  if(event.data.type==='sound-ready'||event.data.type==='sound-state'){sound.receive(source,event.data);return;}
  const context={source,id:event.data.id};
  if(event.data.type==='file-drag'){fileDrop.show(context);return;}
  if(event.data.type==='file-folder'){fileDrop.rejectFolder();return;}
  if(event.data.type==='file-drop'&&Array.isArray(event.data.files)){fileDrop.drop(event.data.files,context);return;}
  if(event.data.type==='image-paste'&&Array.isArray(event.data.files)){loadLocalFiles(event.data.files,{expected:'image'});return;}
  if(!draft)return;
  if(event.data.type==='ready'){highlight(selectScroll);selectScroll=false;$('draft-frame').contentWindow.postMessage({channel,type:'media',assets:mediaLibrary.records(referencedMedia(session.draft)).map(a=>({id:a.id,blob:a.blob}))},'*');}
  if(event.data.type==='select'&&session?.draft.items.some(i=>i.id===event.data.id)){selected=event.data.id;paintComponents();inspector();highlight();quad.show('advanced');}
});
function history(){ $('undo').disabled=mediaBusy||!session?.canUndo;$('redo').disabled=mediaBusy||!session?.canRedo;}
function movement(){
  for(const [name,direction]of [['up',-1],['down',1]]){
    const button=$('move-'+name+'-media');button.hidden=!session?.canRemoveMedia(selected);button.disabled=mediaBusy||importing||!session?.canMoveMedia(selected,direction);
    const item=session?.draft.items.find(i=>i.id===selected),label=(direction===-1?'Subir':'Bajar')+(item?.type==='video'?' vídeo añadido':item?.type==='image'?' imagen añadida':' medio añadido');button.setAttribute('aria-label',label);button.title=label;
  }
}
function locateAvailability(){$('locate-selection').disabled=mediaBusy||!session?.draft.items.some(i=>i.id===selected);}
function lockMedia(value){mediaBusy=value;document.querySelectorAll('button,input,select,textarea').forEach(el=>{if(el.id!=='mute-videos')el.disabled=value;});history();movement();locateAvailability();}
function paintComponents(){
  const items=session.draft.items;
  const hidden=item=>session.canSetMediaVisibility(item.id)&&item.hidden===true;
  $('component-count').textContent='· '+items.length;
  $('components').replaceChildren(...componentFilter.apply(items,hidden).map(i=>{
    const b=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('span');b.type='button';b.disabled=mediaBusy;b.dataset.item=i.id;
    strong.textContent=i.label;small.textContent=labels[i.type]+(hidden(i)?' · Oculto':'')+(i.animation==='none'?'':' · '+motionLabels[i.animation]);b.append(strong,small);b.setAttribute('aria-pressed',String(i.id===selected));
    b.onclick=()=>{selected=i.id;paintComponents();inspector();highlight(true);quad.show('advanced');};return b;
  }));
  locateAvailability();
}
function inspector(){
  const item=session.draft.items.find(i=>i.id===selected);$('fields').replaceChildren();
  const visibility=$('visibility-added-media'),isHidden=item?.hidden===true,visibilityLabel=(isHidden?'Mostrar':'Ocultar')+(item?.type==='video'?' vídeo añadido':item?.type==='image'?' imagen añadida':' medio añadido');
  visibility.hidden=!session.canSetMediaVisibility(selected);visibility.disabled=mediaBusy||importing;visibility.setAttribute('aria-pressed',String(isHidden));visibility.setAttribute('aria-label',visibilityLabel);visibility.title=visibilityLabel;
  for(const [action,verb,allowed]of [['remove','Retirar',session.canRemoveMedia(selected)],['duplicate','Duplicar',session.canDuplicateMedia(selected)]]){
    const button=$(action+'-added-media'),label=verb+(item?.type==='video'?' vídeo añadido':item?.type==='image'?' imagen añadida':' medio añadido')+(action==='remove'?' de la copia':'');
    button.hidden=!allowed;button.disabled=mediaBusy||importing;button.setAttribute('aria-label',label);button.title=label;
  }
  movement();
  if(!item){$('selected-title').textContent='Selecciona un elemento';return;}
  $('selected-title').textContent=labels[item.type];
  function field(key,labelText,type,options){
    const label=document.createElement('label');label.textContent=labelText;label.htmlFor='field-'+key;
    const input=document.createElement(type==='select'?'select':type==='textarea'?'textarea':'input');input.id='field-'+key;input.name=key;input.disabled=mediaBusy;
    if(type==='select')for(const [value,text]of Object.entries(options)){const o=document.createElement('option');o.value=value;o.textContent=text;input.append(o);}
    else if(type==='textarea'){input.maxLength=20000;input.rows=5;}
    else{input.type=type;if(type==='number'){if(key==='maxWidth'){input.min=MIN_MEDIA_WIDTH;input.max=MAX_MEDIA_WIDTH;input.step=1;input.required=true;}else{input.min=key==='duration'?.2:0;input.max=10;input.step=.1;}}if(type==='text'){input.maxLength=key==='label'?200:1000;input.required=key==='label';}}
    input.value=key==='maxWidth'?(item.maxWidth??DEFAULT_MEDIA_WIDTH):key==='value'&&localReference(item.value)?'':item[key];
    const apply=()=>{try{session.edit(item.id,{[key]:type==='number'?input.valueAsNumber:input.value});input.setCustomValidity('');if(key==='label')input.value=session.draft.items.find(i=>i.id===item.id).label;else preview();history();paintComponents();remember();say(key==='label'?'Nombre aplicado al medio añadido.':'Cambio aplicado a tu copia.');}
      catch(error){input.setCustomValidity(error.message);input.reportValidity();say(error.message);}};
    if(key!=='label'&&(type==='textarea'||type==='text'))input.oninput=apply;else input.onchange=apply;
    label.append(input);$('fields').append(label);
  }
  if(session.canRenameMedia(item.id))field('label','Nombre del medio','text');
  if(item.type==='text')field('value','Texto','textarea');
  if(['image','video','background'].includes(item.type)){
    const local=localReference(item.value);
    if(local){const asset=mediaLibrary.records(new Set([item.value]))[0],note=document.createElement('p');note.className='local-media-note';note.textContent=asset.name+' · archivo local · '+(asset.size/1024/1024).toFixed(1)+' MB';$('fields').append(note);}
    field('value',item.type==='video'?(local?'Sustituir por URL de vídeo':'URL del vídeo (MP4 o WebM)'):(local?'Sustituir por URL de imagen':'URL de la imagen'),'url');
    const label=document.createElement('label');label.className='local-file-control';label.textContent='Sustituir desde el ordenador';label.htmlFor='replace-local';
    const file=document.createElement('input');file.id='replace-local';file.type='file';file.disabled=mediaBusy;file.accept=item.type==='video'?VIDEO_ACCEPT:IMAGE_ACCEPT;file.onchange=e=>loadPicker(e,{replace:item.id,expected:item.type==='video'?'video':'image'});label.append(file);$('fields').append(label);
  }
  if(item.type==='image')field('alt','Descripción de la imagen','text');
  if(session.canSetMediaWidth(item.id))field('maxWidth','Ancho máximo · píxeles','number');
  field('animation','Animación','select',motionLabels);field('duration','Duración · segundos','number');field('delay','Retraso · segundos','number');
}
function paint(){if(!session.draft.items.some(i=>i.id===selected))selected=session.draft.items[0]?.id||'';paintComponents();inspector();preview();history();}
async function open(record,prepared){
  const next=createSiteSession(record.original,record.draft),nextLibrary=prepared||await verifyMediaRecords(record.assets||[]);
  try{buildDocument(next.draft,{interactive:true,media:nextLibrary.previewMedia(next.draft)});buildDocument(next.original,{interactive:true,media:nextLibrary.previewMedia(next.original)});}catch(e){nextLibrary.dispose();throw e;}
  mediaLibrary.dispose();mediaLibrary=nextLibrary;session=next;recordID=record.id;selected=session.draft.items[0]?.id||'';componentFilter.reset();
  $('workspace').hidden=false;$('project-options').hidden=false;$('empty').hidden=true;$('site-title').textContent=session.draft.title;
  $('site-url').value=session.draft.url;$('source-url').href=session.draft.url;$('source-url').textContent=new URL(session.draft.url).hostname+' ↗';
  $('warnings').replaceChildren(...(session.draft.warnings||[]).map(w=>{const p=document.createElement('p');p.textContent=w;return p;}));
  $('site-pages').replaceChildren(new Option('Seleccionar página…',''),...(session.draft.links||[]).map(url=>new Option(new URL(url).pathname,url)));
  addOption(record.id,session.draft);$('site-library').value=record.id;paint();say('Selecciona un elemento en la página o en la lista.');
}
$('import-form').onsubmit=async e=>{
  e.preventDefault();if(importing)return;importing=true;$('import-button').disabled=true;$('site-library').disabled=true;$('site-url').disabled=true;
  $('import-status').textContent='Importando página y estilos…';
  try{if(session)await persist();const p=await importSite($('site-url').value);const record={id:crypto.randomUUID(),original:p,draft:p};await open(record);await persist();$('import-status').textContent=p.title+' · '+p.items.length+' componentes editables. Copia importada.';quad.hide('options');say(p.title+' · '+p.items.length+' componentes importados. '+(p.warnings.length?'Revisa los avisos en Avanzado.':'Selecciona un elemento para editarlo.'));}
  catch(error){$('import-status').textContent='No se ha importado: '+error.message+' La copia abierta se conserva.';}
  finally{importing=false;$('import-button').disabled=false;$('site-library').disabled=false;$('site-url').disabled=false;}
};
$('site-library').onchange=async()=>{
  const value=$('site-library').value;
  if(library.has(value)){try{lockMedia(true);if(session)await persist();await open(library.get(value));$('import-status').textContent='Copia recuperada del navegador. Puedes seguir editando.';}catch(e){$('import-status').textContent='No se ha abierto la copia: '+e.message;}finally{lockMedia(false);}}
  else{$('site-url').value=value==='preset'?'https://www.portaventuranext.com/':'';$('site-url').focus();$('import-status').textContent='Introduce o revisa la URL y pulsa Importar página.';if(session)await persist();}
};
$('site-pages').onchange=()=>{if(!$('site-pages').value)return;$('site-url').value=$('site-pages').value;$('import-status').textContent='Página seleccionada. Pulsa Importar página para crear otra copia.';$('import-button').focus();};
$('locate-selection').onclick=()=>{
  if(mediaBusy||!session?.draft.items.some(i=>i.id===selected))return;
  componentFilter.reset();paintComponents();componentFilter.locate(selected);
};
$('undo').onclick=()=>{session.undo();paint();remember();say('Cambio deshecho.');};$('redo').onclick=()=>{session.redo();paint();remember();say('Cambio rehecho.');};
$('compare').onclick=()=>{comparing=!comparing;preview();};$('replay').onclick=preview;
$('desktop').onclick=()=>{mobile=false;preview();};$('mobile').onclick=()=>{mobile=true;preview();};
$('fields').onsubmit=e=>e.preventDefault();
$('visibility-added-media').onclick=()=>{
  if(mediaBusy||importing||!session||!session.canSetMediaVisibility(selected))return;
  try{const hidden=session.draft.items.find(i=>i.id===selected).hidden!==true;session.edit(selected,{hidden});selectScroll=!hidden;paint();remember();
    $('selected-title').focus({preventScroll:true});say(hidden?'Medio añadido oculto. Puedes recuperarlo desde Opciones o con el icono de mostrar.':'Medio añadido visible. Puedes deshacer el cambio.');
  }catch(e){say(e.message);}
};
for(const [name,direction]of [['up',-1],['down',1]])$('move-'+name+'-media').onclick=()=>{
  if(mediaBusy||importing||!session)return;
  try{if(!session.moveMedia(selected,direction))return;selectScroll=true;paint();remember();
    $('selected-title').focus({preventScroll:true});say('Medio añadido '+(direction===-1?'subido':'bajado')+'. Puedes deshacer el cambio.');
  }catch(e){say(e.message);}
};
$('duplicate-added-media').onclick=()=>{
  if(mediaBusy||importing||!session)return;
  try{selected=session.duplicateMedia(selected);selectScroll=true;paint();remember();
    $('selected-title').focus({preventScroll:true});say('Medio añadido duplicado. Puedes deshacer el cambio.');
  }catch(e){say(e.message);}
};
$('remove-added-media').onclick=()=>{
  if(mediaBusy||importing||!session)return;
  try{const index=session.draft.items.findIndex(i=>i.id===selected);session.removeMedia(selected);
    const items=session.draft.items;selected=items[Math.min(index,items.length-1)]?.id||'';selectScroll=!!selected;paint();remember();
    $('selected-title').focus({preventScroll:true});say('Medio añadido retirado de la copia. Puedes deshacer el cambio.');
  }catch(e){say(e.message);}
};
$('add-media').onclick=()=>{try{selected=session.addMedia($('media-type').value,$('media-url').value);selectScroll=true;paint();remember();quad.hide('options');quad.show('advanced');say('Medio añadido después del contenido original.');}catch(e){say(e.message);}};
$('download-project').onclick=async()=>{if(mediaBusy)return;lockMedia(true);say('Preparando el proyecto con sus archivos locales…');try{const assets=await exportMedia(mediaLibrary,referencedMedia(session.original,session.draft));download(new Blob([JSON.stringify({format:'ainimation-site-workspace',version:2,original:session.original,draft:session.draft,assets})],{type:'application/json'}),filename()+'.ainimation.json');say('Proyecto descargado con sus imágenes y vídeos locales.');}catch(e){say(e.message);}finally{lockMedia(false);}};
$('download-html').onclick=async()=>{if(mediaBusy)return;lockMedia(true);say('Preparando el HTML con sus archivos locales…');try{const media=await exportMediaURLs(mediaLibrary,session.draft);download(new Blob([buildDocument(session.draft,{media})],{type:'text/html;charset=utf-8'}),filename()+'.html');say('HTML exportado con los archivos locales incluidos. Los medios por URL conservan sus enlaces.');}catch(e){say(e.message);}finally{lockMedia(false);}};
async function loadLocalFiles(inputFiles,{replace='',expected}={}){
  const files=Array.from(inputFiles);if(!files.length)return;
  if(mediaBusy||importing){dropFeedback('Espera a que termine la operación en curso.');return;}
  if(!session){dropFeedback('Importa o abre primero un site para añadir archivos a su copia.');return;}
  const target=session;lockMedia(true);say('Comprobando y cargando archivos locales…');
  try{
    if(files.length>10||(replace&&files.length!==1))throw Error('Selecciona hasta diez archivos; para sustituir un componente, selecciona uno.');
    if(files.reduce((bytes,file)=>bytes+file.size,0)>MAX_LIBRARY)throw Error('Los archivos seleccionados superan 100 MB.');
    const assets=[];for(const file of files)assets.push(await prepareLocalFile(file,{expected}));
    if(session!==target)throw Error('El proyecto cambió durante la carga. Selecciona los archivos de nuevo.');
    if(!replace&&session.draft.items.length+assets.length>500)throw Error('Límite de componentes alcanzado.');
    mediaLibrary.add(assets);
    if(replace){session.edit(replace,{value:assets[0].id});selected=replace;}
    else selected=session.addMediaBatch(assets.map(a=>({type:a.type,value:a.id,label:a.name})))[0];
    selectScroll=true;paint();await persist();quad.hide('options');quad.show('advanced');say(replace?'Archivo sustituido en tu copia. Puedes deshacer el cambio.':assets.length+' '+(assets.length===1?'archivo local añadido.':'archivos locales añadidos.'));
  }catch(e){say(e.message+' La copia anterior se conserva.');}
  finally{lockMedia(false);}
}
function loadPicker(event,options){const input=event.target;return loadLocalFiles(input.files,options).finally(()=>{input.value='';});}
$('add-local').accept=FILE_ACCEPT;$('add-local').onchange=loadPicker;
async function openFile(event){
  if(mediaBusy)return;
  try{const file=event.target.files[0];if(!file)return;if(file.size>MAX_PACKAGE)throw Error('El proyecto supera 145 MB.');lockMedia(true);$('import-status').textContent='Abriendo proyecto y comprobando archivos locales…';
    const p=JSON.parse(await file.text());if(p.format!=='ainimation-site-workspace'||![1,2].includes(p.version))throw Error('Archivo no compatible.');
    validateSite(p.original);validateSite(p.draft);createSiteSession(p.original,p.draft);const assets=p.version===2?await importMedia(p.assets):createMediaLibrary();
    if(session)await persist();await open({id:crypto.randomUUID(),original:p.original,draft:p.draft},assets);await persist();quad.hide('options');$('import-status').textContent='Proyecto abierto desde el archivo, incluidos sus medios locales.';
  }catch(e){$('import-status').textContent='No se ha abierto el archivo: '+e.message;}finally{event.target.value='';lockMedia(false);}
}
$('open-project').onchange=openFile;$('open-empty').onchange=openFile;
const commandHistory=[];let commandCursor=0,commandDraft='';
function expertLog(text){const node=$('expert-output');node.textContent=(node.textContent+'\n'+text).split('\n').slice(-100).join('\n');node.scrollTop=node.scrollHeight;}
$('expert-form').onsubmit=event=>{
  event.preventDefault();const input=$('expert-command'),raw=input.value.trim();if(!raw)return;
  commandHistory.push(raw);if(commandHistory.length>50)commandHistory.shift();commandCursor=commandHistory.length;commandDraft='';input.value='';expertLog('› '+raw);
  try{
    const command=parseExpertCommand(raw);
    if(command.type==='help'){expertLog(EXPERT_HELP);return;}
    if(mediaBusy||importing)throw Error('Espera a que termine la operación en curso.');
    if(command.type==='import'){$('site-url').value=command.url;quad.show('options');$('import-form').requestSubmit();expertLog('Importación solicitada. Sigue su estado en Opciones.');return;}
    if(!session)throw Error('Importa o abre primero un site desde Opciones.');
    if(command.type==='estado'){expertLog(session.draft.title+'\n'+session.draft.url+'\n'+session.draft.items.length+' componentes · '+mediaLibrary.size+' bytes locales · seleccionado: '+selected);return;}
    if(command.type==='componentes'){expertLog(session.draft.items.slice(0,50).map(i=>i.id+' · '+labels[i.type]+' · '+i.label).join('\n'));return;}
    if(command.type==='select'){if(!session.draft.items.some(i=>i.id===command.id))throw Error('Ese componente no existe en esta copia.');selected=command.id;paintComponents();inspector();highlight(true);quad.show('advanced');}
    if(command.type==='text'){if(session.draft.items.find(i=>i.id===selected)?.type!=='text')throw Error('Selecciona primero un componente de texto.');session.edit(selected,{value:command.value});paint();remember();}
    if(command.type==='animate'){session.edit(selected,{animation:command.animation,...(command.duration===undefined?{}:{duration:command.duration})});paint();remember();}
    if(command.type==='deshacer'){if(!session.canUndo){expertLog('No hay cambios que deshacer.');return;}$('undo').click();}
    if(command.type==='rehacer'){if(!session.canRedo){expertLog('No hay cambios que rehacer.');return;}$('redo').click();}
    if(command.type==='download'){$(command.format==='html'?'download-html':'download-project').click();expertLog('Descarga solicitada. Comprueba el estado en el lienzo.');return;}
    expertLog('Orden aplicada a la copia. El original no cambia.');
  }catch(e){expertLog(e.message);}
};
$('expert-command').onkeydown=event=>{if(!['ArrowUp','ArrowDown'].includes(event.key)||!commandHistory.length)return;event.preventDefault();if(commandCursor===commandHistory.length)commandDraft=event.target.value;commandCursor=Math.max(0,Math.min(commandHistory.length,commandCursor+(event.key==='ArrowUp'?-1:1)));event.target.value=commandCursor===commandHistory.length?commandDraft:commandHistory[commandCursor];};
document.addEventListener('keydown',e=>{if(mediaBusy||!session||!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select'))return;if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session)persist();});
try{const records=await listSites();for(const r of records){try{validateSite(r.draft);validateSite(r.original);library.set(r.id,r);addOption(r.id,r.draft);}catch{}}
  let last='';try{last=localStorage.getItem('ainimation-last-site');}catch{}if(library.has(last)){lockMedia(true);try{await open(library.get(last));$('saved-status').textContent='Copia recuperada de este navegador, con sus archivos locales.';}finally{lockMedia(false);}}
}catch{$('import-status').textContent+=' El almacenamiento del navegador no está disponible; podrás descargar tu proyecto.';}
