import {compareRevisions} from './conflict-report.mjs';
import {validateProject,editField,changesBetween} from './project.mjs';
import {validateThumbnail} from './thumbnail-model.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Decisions only select declared values. The current source owns all other data.
export function planResolution(original,draft,current,decisions={}){
  const report=compareRevisions(original,draft,current);
  if(!decisions||typeof decisions!=='object'||Array.isArray(decisions))throw Error('Decisiones no compatibles.');
  const ids=new Set(report.rows.map(row=>row.field));
  for(const id of Object.keys(decisions))if(!ids.has(id))throw Error('La decisión pertenece a otro campo.');
  const rows=report.rows.map(row=>{
    const options=row.added||!row.currentAvailable?['current']:['draft','current','original'];
    const required=row.status==='conflict'||(!row.currentAvailable&&!same(row.original,row.draft));
    const fallback=required?null:row.status==='draft-only'?'draft':'current';
    const choice=Object.hasOwn(decisions,row.field)?decisions[row.field]:fallback;
    if(choice!==null&&!options.includes(choice))throw Error('No se puede recuperar ese valor en este componente.');
    return {...row,options,choice,required};
  });
  return {...report,rows,unresolved:rows.filter(row=>row.choice===null).length};
}

export function resolveRevisions(original,draft,current,decisions={}){
  const plan=planResolution(original,draft,current,decisions);
  if(plan.unresolved)throw Error('Elige qué conservar en todos los campos pendientes.');
  const base=validateProject(current);let combined=base;
  for(const row of plan.rows){
    if(row.choice==='current')continue;
    // Only compatible fields offer draft/original. Changed bindings stay current.
    combined=editField(combined,row.field,row[row.choice]);
  }
  if(combined.document.components?.thumbnail)validateThumbnail(combined.document.components.thumbnail,combined.source.id);
  return {current:base,draft:combined,changes:changesBetween(base,combined),plan};
}

// Keep current bytes for shared references; bring back old assets only by a
// distinct reference selected in the combined project. No resource is fetched.
export function resolutionAssets(originalAssets,currentAssets,project){
  const keys=new Set([project.document.components?.thumbnail?.image,project.document.components?.thumbnail?.logo,...(project.document.thumbnailMedia||[]).map(item=>item.url)]);
  return Object.fromEntries([...keys].filter(key=>key&&(Object.hasOwn(currentAssets,key)||Object.hasOwn(originalAssets,key))).map(key=>[key,Object.hasOwn(currentAssets,key)?currentAssets[key]:originalAssets[key]]));
}
