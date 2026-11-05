const dateFormat=new Intl.DateTimeFormat('es',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
function validDate(value){
  if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!value.trim()))return null;
  const date=new Date(value);return Number.isFinite(date.getTime())?date:null;
}
export function savedSiteLabel(record){
  const project=record.draft,date=validDate(record.updatedAt)||validDate(project.importedAt);
  return project.title+' · copia'+(date?' · '+dateFormat.format(date):'');
}
export function refreshLibraryTitle(select){select.title=select.selectedOptions[0]?.textContent||'';}
export function updateSavedSiteOption(select,record){
  let option=[...select.options].find(o=>o.value===record.id);
  if(!option){option=select.ownerDocument.createElement('option');option.value=record.id;select.append(option);}
  option.textContent=savedSiteLabel(record);option.title=option.textContent;refreshLibraryTitle(select);return option;
}
