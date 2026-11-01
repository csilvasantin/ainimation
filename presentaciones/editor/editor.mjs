import {fixture,components,componentFields,fieldValue} from './fixtures.mjs';
import {createSession} from './session.mjs';
import {renderPreview} from './preview.mjs';
const $=id=>document.getElementById(id),sessions=new Map(['site','presentation'].map(kind=>[kind,createSession(fixture(kind))]));
let kind='site',selected='hero',compare=false,mobile=false;
const session=()=>sessions.get(kind);
const status=message=>{$('status').textContent=message;};
function select(id){
  selected=id;
  document.querySelectorAll('[data-component]').forEach(node=>{
    if(node.tagName==='BUTTON'){node.classList.toggle('selected',node.dataset.component===id);node.setAttribute('aria-pressed',String(node.dataset.component===id));}
  });
  document.querySelectorAll('[data-component-id]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.componentId===id)));
  paintInspector();status('');
}
function paintInspector(){
  const draft=session().draft;$('selected-title').textContent=components.find(c=>c.id===selected).label;
  $('fields').replaceChildren(...componentFields(draft,selected).map(field=>{
    const label=document.createElement('label');label.textContent=field.label;label.htmlFor='field-'+field.id;
    const input=document.createElement(field.type==='text'?'textarea':'input');input.id='field-'+field.id;input.name=field.id;
    if(field.type==='text'){input.maxLength=field.maxLength;input.rows=field.id.includes('message')||field.id.includes('body')?4:3;}
    else input.type=field.type==='color'?'color':'number';
    if(field.type==='number'){input.min=field.min;input.max=field.max;input.step='1';}
    input.value=fieldValue(draft,field);
    input.oninput=()=>{
      try{session().edit(field.id,field.type==='number'?input.valueAsNumber:input.value);input.setCustomValidity('');paintPreview();paintChanges();paintHistory();status('Ajuste aplicado al borrador.');}
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
  renderPreview($('draft-preview'),session().draft,{selected,onSelect:select});
  if(compare)renderPreview($('original-preview'),session().original,{interactive:false});
}
function paintChanges(){
  const changes=session().changes.changes,draft=session().draft;
  $('changes-title').textContent=changes.length?`${changes.length} ${changes.length===1?'ajuste':'ajustes'}`:'Sin ajustes';
  $('changes').replaceChildren(...changes.map(change=>{
    const row=document.createElement('article'),title=document.createElement('strong');title.textContent=draft.fields.find(f=>f.id===change.field).label;row.append(title);
    for(const [label,value]of [['Antes',change.before],['Ahora',change.after]]){const p=document.createElement('p'),caption=document.createElement('span');caption.textContent=label+': ';p.append(caption,document.createTextNode(String(value)||'(vacío)'));row.append(p);}return row;
  }));
  if(!changes.length){const p=document.createElement('p');p.textContent='El borrador coincide con el original.';$('changes').append(p);}
}
function paintHistory(){
  $('undo').disabled=!session().canUndo;$('redo').disabled=!session().canRedo;
  const clean=!session().changes.changes.length;$('reset').disabled=clean;$('download').disabled=clean;
}
function paintAll(){paintInspector();paintPreview();paintChanges();paintHistory();}
$('components').replaceChildren(...components.map(component=>{
  const button=document.createElement('button'),title=document.createElement('strong'),description=document.createElement('span');
  button.type='button';button.dataset.componentId=component.id;button.setAttribute('aria-pressed',String(selected===component.id));title.textContent=component.label;description.textContent=component.description;button.append(title,description);button.onclick=()=>select(component.id);return button;
}));
$('project').onchange=()=>{kind=$('project').value;$('kind').textContent=kind==='site'?'SITE DE MUESTRA':'PRESENTACIÓN DE MUESTRA';$('source-title').textContent=session().draft.title;paintAll();status('Muestra cargada. Sus destinos y estructura se conservan.');};
$('undo').onclick=()=>{session().undo();paintAll();status('Ajuste deshecho.');};
$('redo').onclick=()=>{session().redo();paintAll();status('Ajuste rehecho.');};
$('reset').onclick=()=>{session().reset();paintAll();status('Original recuperado. Puedes deshacer esta recuperación.');};
$('compare').onclick=()=>{compare=!compare;paintPreview();};
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
$('kind').textContent='SITE DE MUESTRA';$('source-title').textContent=session().draft.title;paintAll();
