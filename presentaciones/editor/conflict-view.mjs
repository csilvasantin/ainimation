import {compareRevisions} from './conflict-report.mjs';
import {renderThumbnailPreview} from './thumbnail.mjs';
import {planResolution,resolveRevisions,resolutionAssets} from './conflict-resolution.mjs';
const labels={conflict:'Cambios distintos','draft-only':'Sólo tu borrador','source-only':'Sólo el origen','both-same':'El mismo ajuste',unavailable:'Componente distinto o retirado'};
const choices={system:'Sistema','fira-sans':'Fira Sans',impact:'Impacto',editorial:'Editorial',original:'Original',white:'Blanco'};
function display(value,field,project,available=true){
  if(!available)return 'No comparable con este campo';
  if(field.added&&value===null)return 'No existía';
  if(['thumbnail-image','thumbnail-logo'].includes(field.field))return value==='builtin:orbita'?'Ilustración de Órbita':value===''?'Sin logotipo':project.document.thumbnailMedia?.find(item=>item.url===value)?.label||'Recurso guardado en el origen';
  if(field.type==='choice')return choices[value]||String(value);
  if(field.type==='boolean')return value?'Sí':'No';
  return value===''?'(Vacío)':String(value);
}
export function renderConflict(root,{original,draft,current,originalAssets={},currentAssets={},phase='before-save',decisions={},historyReviewed=false,onDecision=()=>{},onHistoryReview=()=>{},onResolve=()=>{},onClose=()=>{}}){
  const report=compareRevisions(original,draft,current),doc=root.ownerDocument;
  // Fields may stop differing when the user edits/undoes the old draft.
  const activeDecisions=Object.fromEntries(Object.entries(decisions).filter(([id])=>report.rows.some(row=>row.field===id)));
  const initialPlan=planResolution(original,draft,current,activeDecisions);
  const make=(tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  root.replaceChildren();root.hidden=false;
  const header=make('div','conflict-heading'),copy=make('div',''),kicker=make('p','eyebrow','EL ORIGEN TIENE OTRA REVISIÓN'),title=make('h2','','Tu borrador sigue aquí.');title.id='conflict-title';
  const close=make('button','','Cerrar revisión');close.type='button';close.onclick=onClose;header.append(copy,close);copy.append(kicker,title);
  const notice=make('p','conflict-notice',phase==='after-save'?'La lectura posterior no coincide con la confirmación del guardado. El ajuste pudo haberse aplicado: revisa su historial antes de volver a guardar.':'Compara lo que abriste, tus ajustes y lo que está guardado ahora. Esta vista conserva las tres versiones.');
  const summary=make('p','conflict-summary',`${report.counts.conflict} ${report.counts.conflict===1?'cambio distinto':'cambios distintos'} · ${report.counts['draft-only']} sólo en tu borrador · ${report.counts['source-only']} sólo en el origen · ${report.counts['both-same']} ${report.counts['both-same']===1?'coincide':'coinciden'}`+(report.counts.unavailable?` · ${report.counts.unavailable} ${report.counts.unavailable===1?'componente no comparable':'componentes no comparables'}`:''));
  const revisions=make('p','conflict-revisions','Original: '+report.source.originalRevision+' · Actual: '+report.source.currentRevision);
  root.append(header,notice,summary,revisions);
  if(report.metadataChanged)root.append(make('p','conflict-metadata','El origen también cambió recursos o metadatos fuera de estos campos. La comparación los conserva.'));
  if([original,draft,current].every(p=>p.document.components?.thumbnail)){
    const previews=make('div','conflict-thumbnails');
    for(const [label,project,assets]of [['Original',original,originalAssets],['Tu borrador',draft,originalAssets],['Actual en el origen',current,currentAssets]]){
      const figure=make('figure',''),caption=make('figcaption','',label),canvas=make('div','');figure.append(caption,canvas);previews.append(figure);renderThumbnailPreview(canvas,project,{assets,onStatus:message=>{let note=figure.querySelector('.conflict-asset-note');if(!note){note=make('p','conflict-asset-note');figure.append(note);}note.textContent=message;}});
    }
    root.append(previews);
  }
  const result=make('section','conflict-result'),resultImage=make('div','conflict-result-image'),resultCopy=make('div',''),resultTitle=make('h3','','El resultado que eliges'),resultStatus=make('p','conflict-result-status'),resultHint=make('p','','Los cambios sólo del borrador o del origen ya tienen una propuesta. Puedes cambiarla. Los cambios distintos necesitan tu elección.'),use=make('button','primary','Continuar con este borrador');use.type='button';
  result.setAttribute('aria-label','Resultado combinado');resultStatus.setAttribute('role','status');
  resultCopy.append(resultTitle,resultHint,resultStatus);
  if(phase==='after-save'){
    const label=make('label','conflict-history-check'),check=make('input','');check.type='checkbox';check.checked=historyReviewed;
    check.onchange=()=>{historyReviewed=check.checked;onHistoryReview(historyReviewed);refreshResult();};label.append(check,doc.createTextNode('He revisado el historial del origen antes de preparar otro guardado.'));resultCopy.append(label);
  }
  resultCopy.append(use);result.append(resultImage,resultCopy);root.append(result);
  function refreshResult(){
    try{
      const plan=planResolution(original,draft,current,activeDecisions),provisional=Object.fromEntries(plan.rows.map(row=>[row.field,row.choice??'current']));
      const resolved=resolveRevisions(original,draft,current,provisional);
      resultStatus.textContent=plan.unresolved?`${plan.unresolved} ${plan.unresolved===1?'campo pendiente':'campos pendientes'}. Vista provisional con los valores actuales en esos campos.`:`Todas las decisiones listas · ${resolved.changes.changes.length} ${resolved.changes.changes.length===1?'ajuste sobre la revisión actual':'ajustes sobre la revisión actual'}. Aún no se ha guardado.`;
      use.disabled=!!plan.unresolved||(phase==='after-save'&&!historyReviewed);
      if(resolved.draft.document.components?.thumbnail){const preview=make('div',''),note=make('p','conflict-asset-note');resultImage.replaceChildren(preview,note);renderThumbnailPreview(preview,resolved.draft,{assets:resolutionAssets(originalAssets,currentAssets,resolved.draft),onStatus:message=>{note.textContent=message;}});}
      else resultImage.hidden=true;
    }catch(error){use.disabled=true;resultStatus.textContent=error.message;resultImage.replaceChildren();}
  }
  use.onclick=()=>{try{const resolved=resolveRevisions(original,draft,current,activeDecisions);if(phase==='after-save'&&!historyReviewed)return;onResolve(resolved);}catch(error){resultStatus.textContent=error.message;use.disabled=true;}};
  const rows=make('div','conflict-rows');
  const priority={conflict:0,unavailable:1,'draft-only':2,'source-only':3,'both-same':4};
  for(const field of [...report.rows].sort((a,b)=>priority[a.status]-priority[b.status])){
    const article=make('article','conflict-row '+field.status),heading=make('div','conflict-row-heading');heading.append(make('h3','',field.label),make('span','conflict-tag',labels[field.status]));article.append(heading);
    const values=make('div','conflict-values');
    for(const [label,value,project,available]of [['Original',field.original,original,true],['Tu borrador',field.draft,draft,true],['Actual',field.current,current,field.currentAvailable]]){const cell=make('div','');cell.append(make('span','conflict-value-label',label),make('p','',display(value,field,project,available)));values.append(cell);}
    article.append(values);
    const planRow=initialPlan.rows.find(row=>row.field===field.field),picker=make('fieldset','conflict-picker');picker.append(make('legend','','Conservar · '+field.label));
    if(!field.currentAvailable)article.append(make('p','conflict-metadata','Este componente fue retirado o cambió su contrato o vínculo. Sólo puede conservarse su estado actual; el borrador anterior sigue recuperable con Deshacer.'));
    const optionNames={draft:'Tu borrador',current:'Actual del origen',original:'Original'};
    for(const option of planRow.options){
      const label=make('label',''),input=make('input','');input.type='radio';input.name='resolve-'+field.field;input.value=option;input.checked=planRow.choice===option;input.setAttribute('aria-label',field.label+': '+optionNames[option]);
      input.onchange=()=>{if(!input.checked)return;activeDecisions[field.field]=option;onDecision(field.field,option);refreshResult();};label.append(input,doc.createTextNode(optionNames[option]));picker.append(label);
    }
    article.append(picker);rows.append(article);
  }
  if(!report.rows.length)rows.append(make('p','','Los campos editables no cambiaron; revisa los recursos o metadatos del origen.'));
  root.append(rows,make('p','conflict-footnote','Continuar prepara un borrador sobre la revisión actual y conserva sus componentes y recursos no editados. Deshacer recupera el borrador y la comparación anteriores; Rehacer restaura la resolución. Guardar requiere una acción aparte y vuelve a comprobar la revisión en el origen.'));
  refreshResult();
  return report;
}
