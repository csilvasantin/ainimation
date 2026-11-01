import {validateProject,changesBetween} from './project.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const value=(project,field)=>field.path.reduce((node,key)=>node[key],project.document);
function outsideFields(project){
  const doc=structuredClone(project.document);
  for(const field of project.fields){let node=doc;for(const key of field.path.slice(0,-1))node=node[key];node[field.path.at(-1)]={editable:field.id};}
  return doc;
}
function matchesField(base,current,field,other){
  return other&&same(field,other)&&same(base.document.bindings?.[field.id]??null,current.document.bindings?.[field.id]??null);
}
// Comparison only: this module never rebases a draft, applies it to current, or writes.
export function compareRevisions(original,draft,current){
  const base=validateProject(original),edited=validateProject(draft),actual=validateProject(current);
  changesBetween(base,edited);
  if(base.kind!==actual.kind||base.source.adapter!==actual.source.adapter||base.source.id!==actual.source.id)throw Error('La comparación pertenece a otro proyecto.');
  if(base.source.revision===actual.source.revision)throw Error('La comparación necesita otra revisión del origen.');
  const rows=[],seen=new Set(),counts={conflict:0,'draft-only':0,'source-only':0,'both-same':0,unavailable:0};
  for(const field of base.fields){
    seen.add(field.id);const other=actual.fields.find(f=>f.id===field.id),before=value(base,field),after=value(edited,field),compatible=matchesField(base,actual,field,other);
    if(!compatible){rows.push({field:field.id,label:field.label,type:field.type,status:'unavailable',original:before,draft:after,current:null,currentAvailable:false});counts.unavailable++;continue;}
    const now=value(actual,other),ours=!same(before,after),theirs=!same(before,now);
    if(!ours&&!theirs)continue;
    const status=ours&&theirs?(same(after,now)?'both-same':'conflict'):ours?'draft-only':'source-only';counts[status]++;
    rows.push({field:field.id,label:field.label,type:field.type,status,original:before,draft:after,current:now,currentAvailable:true});
  }
  for(const field of actual.fields)if(!seen.has(field.id)){counts['source-only']++;rows.push({field:field.id,label:field.label,type:field.type,status:'source-only',original:null,draft:null,current:value(actual,field),currentAvailable:true,added:true});}
  return {format:'ainimation-refinement-conflict',version:1,source:{adapter:base.source.adapter,id:base.source.id,originalRevision:base.source.revision,currentRevision:actual.source.revision},counts,rows,metadataChanged:!same(outsideFields(base),outsideFields(actual))};
}
