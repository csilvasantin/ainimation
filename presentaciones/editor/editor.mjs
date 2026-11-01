import {fixture,components,componentFields,fieldValue} from './fixtures.mjs';
import {createSession} from './session.mjs';
import {renderPreview} from './preview.mjs';
import {generatorComponents,isGeneratorProject} from './generator.mjs';
import {connectGenerator} from './remote.mjs';
import {exportThumbnail} from './thumbnail.mjs';
import {THUMBNAIL_ART} from './thumbnail-model.mjs';
import {renderConflict} from './conflict-view.mjs';
import {conflictFixture,conflictFixtureAssets} from './conflict-fixtures.mjs';
import {changesBetween} from './project.mjs';
import {resolutionAssets} from './conflict-resolution.mjs';
const $=id=>document.getElementById(id),sessions=new Map(['site','presentation'].map(kind=>[kind,createSession(fixture(kind))]));
let kind='site',selected='thumbnail',compare=false,mobile=false,busy=false;
let remote=null;const conflicts=new Map(),revisionAssets=new Map();
const session=()=>sessions.get(kind);
const assetKey=project=>JSON.stringify(project.source);
const assetsFor=project=>revisionAssets.get(assetKey(project))||{};
const keepAssets=(project,assets)=>revisionAssets.set(assetKey(project),{...assetsFor(project),...assets});
const activeConflict=()=>conflicts.get(kind)?.get(session().original.source.revision);
function keepConflict(key,original,conflict){if(!conflicts.has(key))conflicts.set(key,new Map());conflicts.get(key).set(original.source.revision,{...conflict,decisions:{}});keepAssets(conflict.current,conflict.assets||{});}
const componentList=()=>isGeneratorProject(session().draft)?generatorComponents(session().draft):components;
const choiceLabels={system:'Sistema','fira-sans':'Fira Sans',impact:'Impacto · imagen protagonista',editorial:'Editorial · panel de color',original:'Original',white:'Blanco'};
const status=message=>{$('status').textContent=message;};
function select(id){
  selected=id;
  document.querySelectorAll('[data-component]').forEach(node=>{
    if(node.tagName==='BUTTON'){node.classList.toggle('selected',node.dataset.component===id);node.setAttribute('aria-pressed',String(node.dataset.component===id));}
  });
  document.querySelectorAll('[data-component-id]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.componentId===id)));
  paintInspector();if(isGeneratorProject(session().draft))paintPreview();status('');
}
function paintInspector(){
  const draft=session().draft;$('selected-title').textContent=componentList().find(c=>c.id===selected).label;
  $('fields').replaceChildren(...componentFields(draft,selected).map(field=>{
    const label=document.createElement('label');label.textContent=field.label;label.htmlFor='field-'+field.id;
    const pickImage=field.id==='thumbnail-image',pickLogo=field.id==='thumbnail-logo',input=document.createElement(pickImage||pickLogo||field.type==='choice'?'select':field.type==='text'?'textarea':'input');input.id='field-'+field.id;input.name=field.id;
    if(pickImage||pickLogo||field.type==='choice'){
      const entries=pickImage||pickLogo?[pickLogo?['','Sin logotipo']:[THUMBNAIL_ART,'Órbita · ilustración original'],...(draft.document.thumbnailMedia||[]).map(item=>[item.url,item.label])]:field.options.map(value=>[value,choiceLabels[value]||value]);
      const current=fieldValue(draft,field);if(!entries.some(([value])=>value===current))entries.push([current,'Imagen guardada en el origen']);
      for(const [value,text]of entries){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}
    }
    else if(field.type==='text'){input.maxLength=field.maxLength;input.rows=field.id.includes('message')||field.id.includes('body')?4:field.id.startsWith('thumbnail-')?2:3;}
    else input.type=field.type==='color'?'color':'number';
    if(field.type==='number'){input.min=field.min;input.max=field.max;input.step='1';}
    input.value=fieldValue(draft,field);
    input.oninput=()=>{
      try{session().edit(field.id,field.type==='number'?input.valueAsNumber:input.value);input.setCustomValidity('');paintPreview();paintChanges();paintHistory();paintConflict();status('Ajuste aplicado al borrador.');}
      catch(error){input.setCustomValidity(error.message);status('Valor no aplicado: '+error.message);}
    };
    label.append(input);return label;
  }));
}
function paintPreview(){
  $('comparison-original').hidden=!compare;$('draft-label').hidden=!compare;
  $('compare').setAttribute('aria-pressed',String(compare));$('compare').textContent=compare?'Cerrar comparación':'Comparar';
  document.querySelector('.canvas-wrap').classList.toggle('comparing',compare);
  document.querySelector('.canvas-wrap').classList.toggle('mobile',mobile);
  $('desktop').setAttribute('aria-pressed',String(!mobile));$('mobile').setAttribute('aria-pressed',String(mobile));
  const assets=assetsFor(session().original);
  renderPreview($('draft-preview'),session().draft,{selected,onSelect:select,assets,onStatus:status});
  if(compare)renderPreview($('original-preview'),session().original,{selected,interactive:false,assets,onStatus:status});
}
function paintChanges(){
  const changes=session().changes.changes,draft=session().draft;
  const display=(field,value)=>draft.fields.find(f=>f.id===field)?.type==='choice'?(choiceLabels[value]||value):['thumbnail-image','thumbnail-logo'].includes(field)?(value===THUMBNAIL_ART?'Órbita · ilustración original':value===''?'Sin logotipo':draft.document.thumbnailMedia?.find(item=>item.url===value)?.label||'Imagen guardada'):String(value)||'(vacío)';
  $('changes-title').textContent=changes.length?`${changes.length} ${changes.length===1?'ajuste':'ajustes'}`:'Sin ajustes';
  $('changes').replaceChildren(...changes.map(change=>{
    const row=document.createElement('article'),title=document.createElement('strong');title.textContent=draft.fields.find(f=>f.id===change.field).label;row.append(title);
    for(const [label,value]of [['Antes',change.before],['Ahora',change.after]]){const p=document.createElement('p'),caption=document.createElement('span');caption.textContent=label+': ';p.append(caption,document.createTextNode(display(change.field,value)));row.append(p);}return row;
  }));
  if(!changes.length){const p=document.createElement('p');p.textContent='El borrador coincide con el original.';$('changes').append(p);}
}
function paintHistory(){
  $('undo').disabled=!session().canUndo;$('redo').disabled=!session().canRedo;
  const clean=!session().changes.changes.length;$('reset').disabled=clean;$('download').disabled=clean;
  $('save').hidden=!isGeneratorProject(session().draft);$('save').disabled=clean||busy||!remote||!!activeConflict();
  $('review-conflict').hidden=!activeConflict();$('review-conflict').disabled=busy;
  $('export-thumbnail').disabled=busy||!session().draft.document.components.thumbnail;
}
function paintConflict(){
  const conflict=activeConflict();$('conflict-panel').hidden=!conflict?.open;
  if(!conflict?.open)return;
  renderConflict($('conflict-panel'),{original:session().original,draft:session().draft,current:conflict.current,originalAssets:assetsFor(session().original),currentAssets:assetsFor(conflict.current),phase:conflict.phase,decisions:conflict.decisions,historyReviewed:conflict.historyReviewed,onDecision(field,choice){conflict.decisions[field]=choice;},onHistoryReview(value){conflict.historyReviewed=value;},onResolve({current,draft}){
    const assets=resolutionAssets(assetsFor(session().original),assetsFor(current),draft);
    session().rebase(current,draft);keepAssets(current,assets);paintAll();status('Borrador combinado preparado sobre '+current.source.revision+'. No se ha guardado. Deshacer recupera la comparación anterior.');$('undo').focus({preventScroll:true});
  },onClose(){conflict.open=false;$('conflict-panel').hidden=true;}});
}
function paintAll(){if(!componentList().some(c=>c.id===selected))selected=componentList()[0].id;paintComponents();paintSource();paintInspector();paintPreview();paintChanges();paintHistory();paintConflict();}
function paintComponents(){
$('components').replaceChildren(...componentList().map(component=>{
  const button=document.createElement('button'),title=document.createElement('strong'),description=document.createElement('span');
  button.type='button';button.dataset.componentId=component.id;button.setAttribute('aria-pressed',String(selected===component.id));title.textContent=component.label;description.textContent=component.description;button.append(title,description);button.onclick=()=>select(component.id);return button;
}));
}
function paintSource(){
  const project=session().draft,live=isGeneratorProject(project);
  $('kind').textContent=live?'PRESENTACIÓN REAL · '+project.document.language.toUpperCase():kind==='site'?'SITE DE MUESTRA':'PRESENTACIÓN DE MUESTRA';
  $('source-title').textContent=project.title;$('source-hint').textContent=live?'Miniatura y textos se guardan con la revisión de origen. Los textos de las escenas sincronizan sus idiomas.': 'Los ajustes quedan en esta pestaña. Cambiar de muestra conserva su borrador durante la sesión.';
  $('context-label').textContent=live?'CONECTADO A ADMIRANEXT':'MUESTRA FICTICIA';
  $('canvas-label').textContent=live?'MINIATURA Y CONTENIDO EDITABLE':'BORRADOR · SELECCIONA UN ELEMENTO';
  $('scope-note').textContent=live?'Miniatura guardada por idioma. El diseño de las escenas se conserva en el generador.':'Las muestras no modifican ni publican proyectos reales.';
  document.querySelector('.component-panel').classList.toggle('is-live',live);
}
$('project').onchange=()=>{kind=$('project').value;paintAll();status('Proyecto cargado.');};
$('undo').onclick=()=>{session().undo();paintAll();status('Ajuste deshecho.');};
$('redo').onclick=()=>{session().redo();paintAll();status('Ajuste rehecho.');};
$('reset').onclick=()=>{session().reset();paintAll();status('Original recuperado. Puedes deshacer esta recuperación.');};
$('compare').onclick=()=>{compare=!compare;paintPreview();};
$('review-conflict').onclick=()=>{const conflict=activeConflict();if(conflict){conflict.open=true;paintConflict();}};
$('desktop').onclick=()=>{mobile=false;paintPreview();};$('mobile').onclick=()=>{mobile=true;paintPreview();};
$('fields').onsubmit=event=>event.preventDefault();
document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey||event.isComposing||event.target.closest('input,textarea,select'))return;
  const key=event.key.toLowerCase();if(key==='z'||(key==='y'&&event.ctrlKey)){event.preventDefault();if(event.shiftKey||key==='y')$('redo').click();else $('undo').click();}
});
$('download').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(session().changes,null,2)],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download=session().draft.source.id+'.ajustes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Ajustes descargados. El proyecto original no se ha modificado.');
};
function setBusy(value){busy=value;document.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);if(!value)paintAll();}
$('save').onclick=async()=>{
  if(!remote||busy||activeConflict()||!isGeneratorProject(session().draft))return;
  const changes=session().changes;if(!changes.changes.length)return;
  const original=session().original,saveAssets=assetsFor(original);
  setBusy(true);status('Guardando y verificando la nueva revisión en el generador…');
  try{const saved=await remote.save(changes);keepAssets(saved,saveAssets);sessions.set('remote',createSession(saved));conflicts.delete('remote');kind='remote';const option=$('project').querySelector('option[value="remote"]');if(option)option.textContent=saved.title;setBusy(false);status('Guardado confirmado en el generador · '+saved.source.revision);}
  catch(error){if(error.code==='source_conflict')keepConflict('remote',original,{current:error.current,assets:error.assets,phase:error.phase,open:true});setBusy(false);status(error.message+' El borrador se conserva.');}
};
remote=connectGenerator({onStatus:status,onConflictAssets({current,assets}){const matches=[...(conflicts.get('remote')?.values()||[])].filter(conflict=>['id','adapter','revision'].every(key=>conflict.current.source[key]===current.source[key]));if(matches.length){keepAssets(current,assets);if(kind==='remote'){paintPreview();paintConflict();}}},onLoad(project,{assets={}}={}){
  const list=generatorComponents(project);
  if(sessions.get('remote')?.changes.changes.length)throw Error('Hay ajustes sin guardar. Guárdalos o recupéralos antes de cargar otra presentación.');
  if(!list.length)throw Error('La presentación no contiene componentes.');
  sessions.set('remote',createSession(project));conflicts.delete('remote');keepAssets(project,assets);kind='remote';selected=list[0].id;
  let option=$('project').querySelector('option[value="remote"]');if(!option){option=document.createElement('option');option.value='remote';$('project').append(option);}option.textContent=project.title;$('project').value='remote';
  paintAll();status('Presentación real cargada. Afina su miniatura o sus textos y guarda para confirmar los ajustes.');
}});
$('export-thumbnail').onclick=async()=>{if(busy)return;const project=session().draft;try{$('export-thumbnail').disabled=true;const blob=await exportThumbnail(project,{assets:assetsFor(session().original)});status('Miniatura JPG descargada · 3840 × 2160 · '+Math.round(blob.size/1024)+' KB.');}catch(error){status(error.message);}finally{$('export-thumbnail').disabled=busy;}};
const demoKind=new URLSearchParams(location.search).get('conflictFixture');
if(!remote&&['localhost','127.0.0.1'].includes(location.hostname)&&['site','presentation'].includes(demoKind)){
  const demo=conflictFixture(demoKind),demoSession=createSession(demo.original);for(const change of changesBetween(demo.original,demo.draft).changes)demoSession.edit(change.field,change.after);
  sessions.set(demoKind,demoSession);kind=demoKind;$('project').value=kind;const assets=conflictFixtureAssets(demo.resources),phase=new URLSearchParams(location.search).get('conflictPhase')==='after-save'?'after-save':'before-save';keepAssets(demo.original,assets);keepConflict(kind,demo.original,{current:demo.current,assets,phase,open:true});
}
paintAll();
