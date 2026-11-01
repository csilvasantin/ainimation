import {compareRevisions} from './conflict-report.mjs';
import {renderThumbnailPreview} from './thumbnail.mjs';
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
export function renderConflict(root,{original,draft,current,originalAssets={},currentAssets={},phase='before-save',onClose=()=>{}}){
  const report=compareRevisions(original,draft,current),doc=root.ownerDocument;
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
  const rows=make('div','conflict-rows');
  const priority={conflict:0,unavailable:1,'draft-only':2,'source-only':3,'both-same':4};
  for(const field of [...report.rows].sort((a,b)=>priority[a.status]-priority[b.status])){
    const article=make('article','conflict-row '+field.status),heading=make('div','conflict-row-heading');heading.append(make('h3','',field.label),make('span','conflict-tag',labels[field.status]));article.append(heading);
    const values=make('div','conflict-values');
    for(const [label,value,project,available]of [['Original',field.original,original,true],['Tu borrador',field.draft,draft,true],['Actual',field.current,current,field.currentAvailable]]){const cell=make('div','');cell.append(make('span','conflict-value-label',label),make('p','',display(value,field,project,available)));values.append(cell);}
    article.append(values);rows.append(article);
  }
  if(!report.rows.length)rows.append(make('p','','Los campos editables no cambiaron; revisa los recursos o metadatos del origen.'));
  root.append(rows,make('p','conflict-footnote','Tu borrador puede seguir editándose, deshacerse o descargarse. Guardar queda detenido hasta abrir una revisión nueva; esta comparación no combina ni escribe versiones.'));
  return report;
}
