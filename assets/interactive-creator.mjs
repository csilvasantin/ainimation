import {mountCafeEditor} from './interactive-cafeteria-editor.mjs?v=director-cafe-3';
import {cafeteriaCatalog} from './interactive-cafeteria.mjs?v=director-cafe-3';
import {createDemoCopy} from './interactive-demo-project.mjs';
import {sortedImages,prepareImage,projectFromImages,appendProjectImages,MAX_IMAGES} from './interactive-image-import.mjs';
// Keep the new synchronization controls and their scope implementation together.
const cloudModule=new URL('./interactive-cloud.mjs',import.meta.url);
cloudModule.search=new URL(import.meta.url).search;
const {syncLibrary}=await import(cloudModule.href);
const conflictsModule=new URL('./interactive-conflicts.mjs',import.meta.url);conflictsModule.search=new URL(import.meta.url).search;
const {mountConflictComparison}=await import(conflictsModule.href);
const authModule=new URL('./interactive-auth.mjs',import.meta.url);authModule.search=new URL(import.meta.url).search;
const {mountGoogleAuth}=await import(authModule.href);
const directorWorkspaceModule=new URL('./interactive-director-workspace.mjs',import.meta.url);directorWorkspaceModule.search=new URL(import.meta.url).search;
const {mountDirectorWorkspace}=await import(directorWorkspaceModule.href);
import {prepareDirector,restoreDirectorWorkspace} from './interactive-director-bridge.mjs?v=director-cafe-3';
const deliveryModule=new URL('./interactive-delivery.mjs?v=five-touch-1',import.meta.url);deliveryModule.search=new URL(import.meta.url).search;
const {mountInteractiveDelivery}=await import(deliveryModule.href);
import {template,validate,playerHtml} from './interactive-project.mjs?v=director-cafe-3';
const libraryModule=new URL('./interactive-library.mjs',import.meta.url);libraryModule.search=new URL(import.meta.url).search;
const {loadLibrary,readLibrary,updateProject,createProject,openProject,duplicateProject,renameProject,LIBRARY_KEY}=await import(libraryModule.href);
const $=id=>document.getElementById(id),status=$('status');
let storage;try{storage=localStorage;}catch{}
const loaded=loadLibrary(storage);
let library=loaded.ok?loaded.data:null,activeId=library?.activeId,activeRecord=library?.projects.find(x=>x.id===activeId),revision=activeRecord?.revision;
let project=activeRecord?.project||template(),selected=project.start,dirty=false,directorWorkspace;
function announce(message,error=false){status.textContent=message;status.dataset.error=String(error);}
const current=()=>project.scenes.find(s=>s.id===selected);
function option(label,value){const n=document.createElement('option');n.textContent=label;n.value=value;return n;}
function targets(select,value){select.replaceChildren(...project.scenes.map(s=>option(s.title,s.id)));select.value=value;}
function updatePreview(){try{$('player').srcdoc=playerHtml(project);$('device').className='device '+project.orientation;}catch(e){announce(e.message,true);}}
function persist(){dirty=true;try{validate(project);}catch(e){announce(e.message+' El último proyecto válido se conserva.',true);return false;}const result=updateProject(storage,activeId,project,revision);if(result.ok){library=result.data;revision=library.projects.find(x=>x.id===activeId).revision;dirty=false;renderLibrary();if(cloudToken)$('cloudStatus').textContent='Cambios guardados en este navegador. Pulsa sincronizar para actualizarlos en la nube.';announce('Guardado en tu biblioteca · '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));return true;}announce(result.error+' Usa «Guardar archivo» antes de recargar.',true);return false;}
function activate(result){if(!result.ok){announce(result.error,true);return false;}library=result.data;activeId=library.activeId;const record=library.projects.find(x=>x.id===activeId);revision=record.revision;project=structuredClone(record.project);selected=project.start;dirty=false;render();renderLibrary();return true;}
function renderLibrary(){const parent=$('libraryList');parent.replaceChildren();if(!library){const p=document.createElement('p');p.className='hint';p.textContent='La biblioteca no está disponible. Puedes seguir editando y descargar un archivo.';parent.append(p);return;}for(const record of library.projects){const card=document.createElement('article');card.className='library-card';card.dataset.active=String(record.id===activeId);const badge=document.createElement('span');badge.className='active-label';badge.textContent=record.id===activeId?'EDITANDO AHORA':'PROYECTO GUARDADO';const h=document.createElement('h3');h.textContent=record.project.title;const info=document.createElement('p');info.className='hint';info.textContent=record.project.scenes.length+' pantallas · '+({portrait:'Vertical',landscape:'Horizontal',square:'Cuadrado'}[record.project.orientation]);const actions=document.createElement('div');actions.className='tools';const open=document.createElement('button');open.textContent=record.id===activeId?'Abierto':'Abrir';open.setAttribute('aria-label','Abrir '+record.project.title);open.setAttribute('aria-current',String(record.id===activeId));open.onclick=()=>{if(dirty&&!persist())return;if(activate(openProject(storage,record.id)))announce('Proyecto recuperado: '+project.title);};const dup=document.createElement('button');dup.textContent='Duplicar';dup.setAttribute('aria-label','Duplicar '+record.project.title);dup.onclick=()=>{if(!persist())return;if(activate(duplicateProject(storage,record.id)))announce('Copia independiente creada: '+project.title);};const rename=document.createElement('button');rename.textContent='Renombrar';rename.setAttribute('aria-label','Renombrar '+record.project.title);rename.onclick=()=>{if(!persist())return;const fresh=library.projects.find(x=>x.id===record.id);renaming={id:record.id,revision:fresh.revision};$('renameTitle').value=fresh.project.title;$('renameError').textContent='';$('renameDialog').showModal();$('renameTitle').focus();};actions.append(open,dup,rename);card.append(badge,h,info,actions);parent.append(card);}}
let renaming;
$('renameCancel').onclick=()=>$('renameDialog').close();
$('renameForm').onsubmit=e=>{e.preventDefault();const result=renameProject(storage,renaming.id,$('renameTitle').value,renaming.revision);if(!result.ok){$('renameError').textContent=result.error;return;}library=result.data;if(renaming.id===activeId){const record=library.projects.find(x=>x.id===activeId);project=structuredClone(record.project);revision=record.revision;render();}renderLibrary();$('renameDialog').close();announce('Nombre guardado.');};
$('newProject').onclick=()=>{if(!persist())return;if(activate(createProject(storage,template('blank'))))announce('Nuevo proyecto creado. El anterior sigue en tu biblioteca.');};
window.addEventListener('storage',e=>{if(e.key!==LIBRARY_KEY||directorWorkspace?.ownsStorageEvent(e))return;const latest=readLibrary(storage);if(latest.ok){library=latest.data;renderLibrary();}announce('La biblioteca ha cambiado en otra pestaña. Guarda un archivo si tienes cambios y recarga antes de seguir.',true);});
function list(){const ol=$('scenes');ol.replaceChildren();project.scenes.forEach((s,i)=>{const li=document.createElement('li'),b=document.createElement('button'),num=document.createElement('span'),name=document.createElement('span');num.className='number';num.textContent=String(i+1).padStart(2,'0');name.textContent=s.title;b.append(num,name);b.setAttribute('aria-current',String(s.id===selected));b.onclick=()=>{selected=s.id;render();};li.append(b);ol.append(li);});targets($('start'),project.start);$('remove').disabled=project.scenes.length===1||selected===project.start;$('add').disabled=project.scenes.length>=MAX_IMAGES;}
function changed(){persist();list();updatePreview();}
function renderButtons(){const parent=$('buttons');parent.replaceChildren();current().buttons.forEach((button,i)=>{const row=document.createElement('div');row.className='button-row';const l=document.createElement('label');l.textContent='Texto del botón '+(i+1);const input=document.createElement('input');input.maxLength=80;input.value=button.label;input.addEventListener('input',()=>{button.label=input.value;changed();});l.append(input);const dest=document.createElement('label');dest.textContent='Ir a pantalla';const select=document.createElement('select');targets(select,button.target);select.onchange=()=>{button.target=select.value;changed();};dest.append(select);const remove=document.createElement('button');remove.className='quiet';remove.textContent='Quitar botón';remove.onclick=()=>{current().buttons.splice(i,1);changed();renderButtons();};row.append(l,dest,remove);parent.append(row);});$('addButton').disabled=current().buttons.length>=6;}
function renderHotspots(){const parent=$('hotspots');parent.replaceChildren();(current().hotspots||[]).forEach((zone,i)=>{const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Zona '+(i+1);row.append(legend);const label=document.createElement('label'),input=document.createElement('input');label.textContent='Nombre accesible';input.value=zone.label;input.maxLength=80;input.onchange=()=>{zone.label=input.value;changed();};label.append(input);row.append(label);const dest=document.createElement('label'),select=document.createElement('select');dest.textContent='Destino';targets(select,zone.target);select.onchange=()=>{zone.target=select.value;changed();};dest.append(select);row.append(dest);const coords=document.createElement('div');coords.className='hotspot-coordinates';for(const [key,name]of [['x','Izquierda'],['y','Arriba'],['w','Ancho'],['h','Alto']]){const l=document.createElement('label'),n=document.createElement('input');l.textContent=name+' %';n.type='number';n.min=key==='w'||key==='h'?'0.1':'0';n.max='100';n.step='0.1';n.value=zone[key];n.onchange=()=>{zone[key]=Number(n.value);changed();};l.append(n);coords.append(l);}row.append(coords);const remove=document.createElement('button');remove.textContent='Quitar zona';remove.onclick=()=>{current().hotspots.splice(i,1);changed();renderHotspots();};row.append(remove);parent.append(row);});$('addHotspot').disabled=!current().image||(current().hotspots?.length||0)>=24;}
$('addHotspot').onclick=()=>{(current().hotspots??=[]).push({label:'Nueva zona',target:project.start,x:10,y:10,w:20,h:15});project.presentation='hotspots';changed();renderHotspots();};
$('presentation').onchange=()=>{project.presentation=$('presentation').value;if(project.presentation==='cafeteria'&&!project.cafeteria)project.cafeteria=cafeteriaCatalog();changed();renderCafeCatalog();};
$('expandPlayer').onclick=()=>{const html=playerHtml(project);$('expandedPlayer').showModal();requestAnimationFrame(()=>{$('largePlayer').srcdoc=html;});};
$('closeExpandedPlayer').onclick=()=>{$('expandedPlayer').close();$('largePlayer').srcdoc='';};
function renderCafeCatalog(){const native=project.presentation==='cafeteria',panel=$('cafeCatalog');panel.hidden=!native;panel.parentElement.classList.toggle('native-cafeteria',native);$('scenesHeading').textContent=native?'02 / REFERENCIAS':'02 / PANTALLAS';if(native)mountCafeEditor($('catalogProducts'),project.cafeteria,changed,document.documentElement.lang);}
function render(){for(const k of ['title','orientation','color','resetSeconds'])$(k).value=project[k];if(!$('resetSeconds').value)$('resetSeconds').append(option(project.resetSeconds+' segundos',String(project.resetSeconds)));$('resetSeconds').value=String(project.resetSeconds);$('sceneName').textContent=current().title;$('sceneTitle').value=current().title;$('body').value=current().body;$('presentation').value=project.presentation||'cards';renderCafeCatalog();list();renderButtons();renderHotspots();updatePreview();renderReferenceMedia();}
for(const k of ['title','orientation','color','resetSeconds'])$(k).addEventListener(k==='title'?'input':'change',()=>{project[k]=k==='resetSeconds'?Number($(k).value):$(k).value;changed();});
$('sceneTitle').oninput=()=>{current().title=$('sceneTitle').value;$('sceneName').textContent=current().title;changed();};$('sceneTitle').onchange=renderButtons;
$('body').oninput=()=>{current().body=$('body').value;changed();};
$('start').onchange=()=>{project.start=$('start').value;changed();};
$('add').onclick=()=>{const id='pantalla-'+crypto.randomUUID();project.scenes.push({id,title:'Nueva pantalla',body:'Cuenta qué ocurre aquí.',buttons:[{label:'Volver al inicio',target:project.start}]});selected=id;changed();render();};
$('remove').onclick=()=>{const inbound=project.scenes.filter(s=>s.id!==selected&&[...s.buttons,...s.hotspots||[]].some(b=>b.target===selected));if(inbound.length){announce('Antes de eliminar, cambia los botones que llegan desde: '+inbound.map(s=>s.title).join(', ')+'.',true);return;}project.scenes=project.scenes.filter(s=>s.id!==selected);selected=project.start;changed();render();};
$('addButton').onclick=()=>{current().buttons.push({label:'Nuevo botón',target:project.start});changed();renderButtons();};
$('restart').onclick=updatePreview;
function download(name,type,content){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function filename(){return(project.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'interactivo').slice(0,60);}
$('json').onclick=()=>{try{const data=validate(project);download(filename()+'.json','application/json',JSON.stringify(data,null,2));announce('Archivo del proyecto preparado para descargar.');}catch(e){announce(e.message,true);}};
$('html').onclick=()=>{try{download(filename()+'.html','text/html',playerHtml(project));announce('Interactivo HTML preparado: sin conexión, pedidos ni pagos reales.');}catch(e){announce(e.message,true);}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>24000000)throw Error('El proyecto supera el límite de 24 MB.');const next=validate(JSON.parse(await file.text()));if(!persist())return;if(activate(createProject(storage,next)))announce('Proyecto importado como una entrada nueva. El anterior se conserva.');}catch(e){announce('No se ha abierto el archivo: '+e.message+' Tu proyecto actual se conserva.',true);}finally{$('file').value='';}};
function confirmReplace(kind='plantilla'){return new Promise(resolve=>{const dialog=$('confirm');$('confirmTitle').textContent=kind==='proyecto'?'¿Abrir este proyecto?':'¿Crear desde una plantilla?';$('confirmAction').textContent=kind==='proyecto'?'Abrir proyecto':'Crear proyecto';dialog.returnValue='cancel';dialog.addEventListener('close',()=>resolve(dialog.returnValue==='replace'),{once:true});dialog.showModal();});}
for(const [id,kind]of[['cafe','cafe'],['blank','blank']])$(id).onclick=async()=>{if(!await confirmReplace())return;if(!persist())return;if(activate(createProject(storage,template(kind))))announce('Proyecto creado desde la plantilla. El anterior se conserva.');};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
render();renderLibrary();announce(loaded.ok?'Biblioteca recuperada · '+library.projects.length+' proyecto(s) · '+project.title:loaded.error,!loaded.ok);

$('sceneImage').onchange=async()=>{const file=$('sceneImage').files[0],targetScene=current();if(!file)return;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>600000)throw Error('Usa PNG, JPG o WebP de hasta 600 KB.');const value=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});if(!project.scenes.includes(targetScene))throw Error('La pantalla cambió durante la carga. Selecciona la imagen de nuevo.');targetScene.image=value;changed();}catch(e){announce(e.message,true);}finally{$('sceneImage').value='';}};
$('removeImage').onclick=()=>{if(current().hotspots?.length){announce('Quita primero las zonas táctiles de esta imagen.',true);return;}delete current().image;changed();};
// Endpoint is a reviewed deployment setting, never a URL supplied by a query parameter.
const cloudEndpoint=document.querySelector('meta[name="interactive-cloud-endpoint"]')?.content;
let cloudToken;
const provenanceModule=new URL('./interactive-provenance.mjs',import.meta.url);provenanceModule.search=new URL(import.meta.url).search;
const {mountDeviceNaming}=await import(provenanceModule.href);
mountDeviceNaming({status:$('cloudStatus'),storage});
const conflictComparison=mountConflictComparison({status:$('cloudStatus'),storage,endpoint:cloudEndpoint,onOpen:id=>{
 if(dirty||preparingImages||stagedImages.length)throw Error('Guarda o completa los cambios pendientes antes de abrir otra versión.');
 if(!activate(openProject(storage,id)))throw Error('No se ha podido abrir la versión. Tus proyectos se conservan.');
 announce('Versión abierta. La otra versión sigue en tu biblioteca.');
}});

async function runCloudSync(mode){
 if(!cloudToken)return;
 if(mode==='pull'&&(dirty||preparingImages||stagedImages.length)){$('cloudStatus').textContent='Guarda o completa los cambios pendientes antes de recuperar la biblioteca.';return;}
 if(mode!=='pull'&&dirty&&!persist())return;
 for(const id of ['cloudSync','cloudPull','cloudProjectSync'])$(id).disabled=true;
 let conflictPreserved=false;
 const conflictNotice='Conflicto detectado. Se han conservado ambas versiones: la de la nube y una «copia de este equipo» con tus cambios.';
 try{
  const options={...(mode==='pull'?{upload:false}:mode==='project'?{projectId:activeId}:{}),onConflicts:pairs=>{conflictPreserved=true;conflictComparison.remember(pairs);}};
  const data=await syncLibrary(storage,cloudEndpoint,cloudToken,fetch,options);
  if(dirty){$('cloudStatus').textContent=(conflictPreserved?conflictNotice+' ':'')+'La operación terminó. Tus cambios pendientes siguen en el editor; guárdalos en un archivo antes de recuperar la biblioteca.';return;}
  activate({ok:true,data});
  $('cloudStatus').textContent=conflictPreserved?conflictNotice:mode==='pull'?'Biblioteca recuperada de tu cuenta Google. Los proyectos locales se conservan.':mode==='project'?'Proyecto sincronizado con tu cuenta Google.':'Biblioteca sincronizada. Inicia sesión con esta misma cuenta en el otro dispositivo.';
 }catch(e){$('cloudStatus').textContent=(conflictPreserved?conflictNotice+' ':'')+e.message;}
 finally{for(const id of ['cloudSync','cloudPull','cloudProjectSync'])$(id).disabled=!cloudToken;}
}
$('cloudSync').onclick=()=>runCloudSync('all');
$('cloudPull').onclick=()=>runCloudSync('pull');
$('cloudProjectSync').onclick=()=>runCloudSync('project');
const cloudAuth=mountGoogleAuth({endpoint:cloudEndpoint,onVerified:token=>{cloudToken=token;window.dispatchEvent(new Event('interactive-authenticated'));},onSignedOut:()=>{cloudToken=null;window.dispatchEvent(new Event('interactive-signed-out'));}});
$('cloudLogout').onclick=()=>cloudAuth.signOut();

let stagedImages=[],stagedReferences=[],preparingImages=false;let appendTarget=null;const referencePreviews=new Map();
function renderImageImport(){const list=$('imagesList');list.replaceChildren();stagedImages.forEach((item,index)=>{const li=document.createElement('li'),img=document.createElement('img'),name=document.createElement('span'),actions=document.createElement('div');img.src=item.data;img.alt='Vista previa de '+item.name;name.textContent=String(index+1).padStart(2,'0')+' · '+item.name;actions.className='tools';for(const [label,delta]of [['Subir',-1],['Bajar',1]]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',label+' '+item.name);b.disabled=preparingImages||index+delta<0||index+delta>=stagedImages.length;b.onclick=()=>{[stagedImages[index],stagedImages[index+delta]]=[stagedImages[index+delta],stagedImages[index]];renderImageImport();};actions.append(b);}const remove=document.createElement('button');remove.textContent='Quitar';remove.disabled=preparingImages;remove.onclick=()=>{stagedImages.splice(index,1);renderImageImport();};actions.append(remove);li.append(img,name,actions);list.append(li);});for(const ref of stagedReferences){const li=document.createElement('li'),video=document.createElement('video'),caption=document.createElement('span');video.controls=true;video.preload='metadata';video.style.maxWidth='100%';video.src=referencePreviews.get(ref.id)||'';caption.textContent='Vídeo de referencia · '+ref.name;li.append(video,caption);list.append(li);}$('imagesCreate').disabled=$('imagesDownload').disabled=preparingImages||!stagedImages.length;$('imagesAppend').disabled=preparingImages||!stagedImages.length;$('imagesAppend').textContent='Añadir a «'+project.title+'»';$('imagesFiles').disabled=preparingImages;$('imagesCancel').disabled=preparingImages;}
$('uploadImages').onclick=()=>{renderImageImport();$('imagesStatus').textContent=stagedImages.length?stagedImages.length+' imágenes listas. Revisa el orden antes de crear el proyecto.':'Las imágenes se ordenan por nombre: 01, 02… 18. Puedes cambiar el orden aquí.';appendTarget={id:activeId,revision};$('imagesDialog').showModal();};
$('imagesCancel').onclick=()=>$('imagesDialog').close();
$('imagesDialog').addEventListener('cancel',e=>{if(preparingImages)e.preventDefault();});
$('imagesFiles').onchange=async()=>{const files=sortedImages($('imagesFiles').files);if(!files.length)return;if(files.length+stagedImages.length>MAX_IMAGES){$('imagesStatus').textContent='Máximo 60 imágenes. No se ha añadido ninguna; tu selección anterior se conserva.';$('imagesFiles').value='';return;}preparingImages=true;renderImageImport();const prepared=[];try{for(let i=0;i<files.length;i++){$('imagesStatus').textContent='Preparando '+(i+1)+' de '+files.length+' · '+files[i].name;prepared.push(await prepareImage(files[i]));}stagedImages.push(...prepared);$('imagesStatus').textContent=stagedImages.length+' imágenes listas. Revisa el orden y la legibilidad antes de crear el proyecto.';}catch(e){$('imagesStatus').textContent=e.message+' No se ha añadido este lote; la selección anterior y tus proyectos se conservan.';}finally{preparingImages=false;$('imagesFiles').value='';renderImageImport();}};
$('imagesCreate').onclick=()=>{if(preparingImages||!stagedImages.length)return;try{const next=projectFromImages(stagedImages,$('imagesProjectTitle').value);if(stagedReferences.length)next.referenceAssets=structuredClone(stagedReferences);if(!persist()){$('imagesStatus').textContent='Primero guarda los cambios del proyecto actual. La selección de imágenes se conserva.';return;}const result=createProject(storage,next);if(!result.ok){$('imagesStatus').textContent=result.error+' La selección se conserva. Puedes guardar una copia del proyecto y volver a intentarlo.';return;}activate(result);stagedImages=[];stagedReferences=[];$('imagesDialog').close();announce('Proyecto nuevo creado con '+next.scenes.length+' imágenes. Los anteriores se conservan.');if(cloudToken)$('cloudStatus').textContent='Nuevo proyecto guardado en este navegador. Pulsa sincronizar para recuperarlo en tus dispositivos.';}catch(e){$('imagesStatus').textContent=e.message;}};
$('imagesDownload').onclick=()=>{try{const next=projectFromImages(stagedImages,$('imagesProjectTitle').value);if(stagedReferences.length)next.referenceAssets=structuredClone(stagedReferences);download('interactivo-imagenes.json','application/json',JSON.stringify(next,null,2));}catch(e){$('imagesStatus').textContent=e.message;}};

window.addEventListener('beforeunload',e=>{if(preparingImages||stagedImages.length){e.preventDefault();e.returnValue='';}});

let telegramPairToken,telegramBusy=false;
async function telegramCall(path,options={}){if(!cloudToken||!cloudEndpoint)throw Error('Inicia sesión con Google desde Cuenta / Idioma antes de vincular Telegram.');const r=await fetch(cloudEndpoint+'/telegram'+path,{...options,headers:{authorization:'Bearer '+cloudToken,'content-type':'application/json'}});if(!r.ok){const data=await r.json();throw Error(data.error||'No se puede conectar con Telegram.');}return r;}
async function refreshTelegram(){try{const state=await(await telegramCall('/status')).json();$('telegramPair').disabled=!state.enabled||state.linked;$('telegramStatus').textContent=!state.enabled?'La conexión está preparada. Falta disponer del bot de pruebas para activarla.':state.linked?'Telegram vinculado a tu cuenta. Puedes enviar archivos y revisar las subidas.':'Vincula tu Telegram y confirma aquí la cuenta que lo utilizará.';if(!state.enabled)return;const data=await(await telegramCall('/batches')).json();$('telegramBatches').replaceChildren();for(const batch of data.batches){const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');card.className='library-card';h.textContent=batch.title;p.textContent=batch.count+' archivos · '+(batch.status==='ready'?'Lista para revisar':'Subida abierta');b.textContent='Revisar subida';b.disabled=batch.status!=='ready'||!batch.count;b.onclick=()=>reviewTelegramBatch(batch.id);card.append(h,p,b);$('telegramBatches').append(card);}}catch(e){$('telegramPair').disabled=true;$('telegramStatus').textContent=e.message;}}
$('telegramOpen').onclick=()=>{$('telegramDialog').showModal();refreshTelegram();};
$('telegramClose').onclick=()=>{if(!telegramBusy)$('telegramDialog').close();};$('telegramDialog').addEventListener('cancel',e=>{if(telegramBusy)e.preventDefault();});
$('telegramRefresh').onclick=refreshTelegram;
$('telegramPair').onclick=async()=>{try{const result=await(await telegramCall('/pair',{method:'POST'})).json();telegramPairToken=result.token;$('telegramLink').href=result.url;$('telegramLink').hidden=false;$('telegramCheck').hidden=false;$('telegramConfirm').hidden=true;$('telegramStatus').textContent='Abre el bot de pruebas desde este enlace. Después vuelve y comprueba la vinculación. El enlace caduca en 10 minutos.';}catch(e){$('telegramStatus').textContent=e.message;}};
async function checkTelegram(confirm=false){try{const result=await(await telegramCall('/pair',{method:'PUT',body:JSON.stringify({token:telegramPairToken,confirm})})).json();if(result.linked){telegramPairToken=null;$('telegramCheck').hidden=$('telegramConfirm').hidden=$('telegramLink').hidden=true;await refreshTelegram();return;}if(result.pending){$('telegramStatus').textContent='Todavía no has abierto el enlace en Telegram. Abre el bot y pulsa Iniciar.';return;}$('telegramStatus').textContent='Telegram solicita vincular: '+result.name+' (ID '+result.tgUser+'). Confirma solo si es tu cuenta.';$('telegramConfirm').hidden=false;}catch(e){$('telegramStatus').textContent=e.message;}}
$('telegramCheck').onclick=()=>checkTelegram();$('telegramConfirm').onclick=()=>checkTelegram(true);
async function reviewTelegramBatch(id){if(telegramBusy)return;telegramBusy=true;$('telegramClose').disabled=true;try{const batch=await(await telegramCall('/batches/'+encodeURIComponent(id))).json();if(batch.status!=='ready'||!batch.files.length||batch.files.length>MAX_IMAGES)throw Error('Este lote todavía no está listo.');if(stagedImages.length)throw Error('Ya tienes imágenes pendientes en Subir imágenes. Crea ese proyecto o quítalas antes de importar otro lote.');const prepared=[],references=[],ordered=sortedImages(batch.files);if(!ordered.some(x=>x.mime.startsWith('image/')))throw Error('Este lote solo contiene vídeos de referencia. Añade un lote con las imágenes para crear las pantallas.');for(let i=0;i<ordered.length;i++){const item=ordered[i];if(item.mime.startsWith('video/')){references.push({id:item.id,name:item.name,mime:item.mime,size:item.size,sha256:item.sha256});continue;}$('telegramStatus').textContent='Recuperando archivo '+(i+1)+' de '+ordered.length+' · '+item.name;const bytes=await(await telegramCall('/files/'+item.id)).arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==item.sha256)throw Error('El archivo no coincide con su original. Vuelve a intentarlo.');if(item.mime.startsWith('video/')){references.push({id:item.id,name:item.name,mime:item.mime,size:item.size,sha256:item.sha256});referencePreviews.set(item.id,URL.createObjectURL(new Blob([bytes],{type:item.mime})));continue;}prepared.push({...await prepareImage(new File([bytes],item.name,{type:item.mime})),sourceAssetId:item.id});}stagedImages=prepared;stagedReferences=references;appendTarget={id:activeId,revision};$('imagesProjectTitle').value=batch.title;$('telegramDialog').close();renderImageImport();$('imagesStatus').textContent=prepared.length+' imágenes y '+references.length+' vídeos de referencia comprobados. Los vídeos originales quedan en el lote privado y sus referencias se guardan con el proyecto. Revisa el orden antes de crear el proyecto nuevo.';$('imagesDialog').showModal();}catch(e){$('telegramStatus').textContent=e.message;}finally{telegramBusy=false;$('telegramClose').disabled=false;}}

$('imagesAppend').onclick=()=>{try{if(preparingImages||!stagedImages.length||!appendTarget||appendTarget.id!==activeId||appendTarget.revision!==revision||dirty)throw Error('El proyecto cambió durante la revisión. Vuelve a abrir la subida antes de añadir archivos.');const next=appendProjectImages(project,stagedImages,stagedReferences);const result=updateProject(storage,activeId,next,revision);if(!activate(result))return;stagedImages=[];stagedReferences=[];appendTarget=null;$('imagesDialog').close();announce('Archivos combinados sin duplicados. Los otros proyectos se conservan.');if(cloudToken)$('cloudStatus').textContent='Proyecto ampliado en este navegador. Pulsa sincronizar para guardarlo en la nube.';}catch(e){$('imagesStatus').textContent=e.message;}};

function renderReferenceMedia(){const panel=$('referenceMedia');if(!panel)return;panel.replaceChildren();for(const ref of project.referenceAssets||[]){const card=document.createElement('article'),name=document.createElement('h3'),button=document.createElement('button'),message=document.createElement('p');name.textContent='Vídeo de referencia · '+ref.name;button.textContent='Ver vídeo';button.onclick=async()=>{button.disabled=true;try{message.textContent='Preparando vídeo privado…';const access=await(await telegramCall('/preview/'+encodeURIComponent(ref.id),{method:'POST'})).json();const video=document.createElement('video');video.controls=true;video.preload='metadata';video.style.width='100%';video.src=cloudEndpoint+'/telegram/play/'+encodeURIComponent(ref.id)+'?ticket='+encodeURIComponent(access.ticket);video.onerror=()=>{message.textContent='No se pudo reproducir. Pulsa Ver vídeo para volver a intentarlo.';video.remove();button.hidden=false;button.disabled=false;};card.append(video);message.textContent='Referencia privada. No se incorpora a la exportación HTML.';button.hidden=true;}catch(e){message.textContent=e.message;button.disabled=false;}};card.append(name,button,message);panel.append(card);}}

const createDemoButton=$('createDemoProject');
createDemoButton.disabled=false;
createDemoButton.onclick=()=>{
  if(createDemoButton.disabled||!$('interactiveDemo').open)return;
  createDemoButton.disabled=true;
  const result=createDemoCopy(storage,{hasUnsavedWork:dirty||preparingImages||stagedImages.length>0});
  if(!result.ok){$('demoCreateStatus').textContent=result.error;createDemoButton.disabled=false;return;}
  activate(result);
  $('demoCreateStatus').textContent='';
  $('interactiveDemo').close();
  window.dispatchEvent(new Event('interactive-demo-created'));
  const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(null,'',url);
  announce('Copia editable creada: '+project.title+'. Tus proyectos anteriores se conservan.');
  if(cloudToken)$('cloudStatus').textContent='Copia guardada en este navegador. Pulsa sincronizar para recuperarla en tus dispositivos.';
  const workspace=document.querySelector('.workspace');workspace.tabIndex=-1;workspace.focus({preventScroll:true});workspace.scrollIntoView({block:'start'});
  createDemoButton.disabled=false;
};
mountInteractiveDelivery({button:$('sendXpacio'),historyButton:$('deliveryHistory'),storage,endpoint:cloudEndpoint,getState:()=>{
 if(dirty||preparingImages||stagedImages.length)throw Error('Guarda o completa los cambios pendientes antes de enviar.');
 const latest=readLibrary(storage),record=latest.data?.projects.find(r=>r.id===activeId);
 if(!latest.ok||!record||record.revision!==revision)throw Error('El proyecto cambió en otra pestaña. Recupéralo antes de enviarlo.');
 return{id:activeId,revision,project:structuredClone(project),token:cloudToken};
}});

if($('director'))directorWorkspace=mountDirectorWorkspace({button:$('director'),prepare:()=>{
 if(preparingImages||stagedImages.length||dirty&&!persist())throw Error('Completa y guarda los cambios antes de abrir Director.');
 const latest=readLibrary(storage),record=latest.data?.projects.find(r=>r.id===activeId);
 if(!latest.ok||record?.revision!==revision)throw Error('El proyecto cambió en otra pestaña. Recupéralo antes de abrir Director.');
 return prepareDirector(storage,activeId);
},onCancel:plan=>restoreDirectorWorkspace(storage,plan),onReturn:({id,revision:returnedRevision})=>{
 const latest=readLibrary(storage),record=latest.data?.projects.find(r=>r.id===id);
 if(!latest.ok||dirty||id!==activeId||record?.revision!==returnedRevision)throw Error('El proyecto cambió durante el retorno. El trabajo de Director se conserva; recupera la biblioteca antes de seguir.');
 activate({ok:true,data:{...latest.data,activeId:id}});announce('Cambios de Director recuperados. Tu sesión del Creador se conserva.');
 if(cloudToken)$('cloudStatus').textContent='Cuenta verificada. Cambios de Director recuperados; ya puedes sincronizar y enviar.';
},onError:error=>announce(error.message,true)});

// Catalogue edits keep their own identity in the project, across reloads and cloud saves.
const stockBridge=await import('./admira-roundtrip.mjs?v=roundtrip-1');
const saveToAdmira=document.createElement('button');saveToAdmira.type='button';saveToAdmira.className='primary';saveToAdmira.textContent='Guardar nueva versión en Admira';
$('html').parentElement.append(saveToAdmira);
saveToAdmira.onclick=async()=>{
 if(!persist())return;
 saveToAdmira.disabled=true;
 try{
  const snapshot=validate(project),editorProject=await stockBridge.portableProject(snapshot,'interactive');
  const html=playerHtml(snapshot),base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(new Blob([html],{type:'text/html'}));});
  announce('Guardando nueva versión en el catálogo de Admira…');
  const response=await fetch('https://api.admira.store/stock/publish',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({type:'animation',motor:'ainimation',mime:'text/html',title:snapshot.title,base64,editorProject,...(snapshot.admiraEdit?.id?{externalRef:snapshot.admiraEdit.id}:{})})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'No se ha podido guardar en Admira.');
  const href=stockBridge.catalogueVersion(snapshot.admiraEdit,result);
  if(JSON.stringify(project)!==JSON.stringify(snapshot)){announce('Versión publicada. Hay cambios posteriores sin publicar; tu proyecto sigue abierto.');const a=document.createElement('a');a.href=href;a.textContent='Ver la versión guardada en Admira';status.append(' ',a);return;}
  window.location.assign(href);
 }catch(error){announce(error.message+' Tu proyecto sigue en la biblioteca; puedes reintentar.',true);}
 finally{saveToAdmira.disabled=false;}
};
const stockParams=new URLSearchParams(location.search);
if(stockParams.get('admiraEditable')==='interactive'){
 try{
  const context=stockBridge.editContext(stockParams),source=await stockBridge.readEditorProject(context?.id);
  if(source.kind!=='interactive')throw Error('Este proyecto necesita Director.');
  const next=validate(source.plan);next.admiraEdit=context;
  if(!persist())throw Error('Guarda el proyecto actual antes de abrir la versión de Admira.');
  if(!activate(createProject(storage,next)))throw Error('No se ha podido abrir la versión de Admira.');
  history.replaceState({},'',location.pathname+'?project='+encodeURIComponent(activeId));
  announce('Versión de Admira abierta. Guarda para crear una nueva versión vinculada al original.');
 }catch(error){announce(error.message,true);saveToAdmira.disabled=true;}
}
