const dateFormat=new Intl.DateTimeFormat('es',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
function validDate(value){
  if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!value.trim()))return null;
  const date=new Date(value);return Number.isFinite(date.getTime())?date:null;
}
const savedDate=record=>validDate(record.updatedAt)||validDate(record.draft.importedAt);
export function savedSiteLabel(record){
  const project=record.draft,date=savedDate(record);
  return project.title+' · copia'+(date?' · '+dateFormat.format(date):'');
}
export function savedSiteTooltip(record){
  let tooltip=savedSiteLabel(record);const {url:value,items}=record.draft;
  if(typeof value==='string')try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)tooltip+='\n'+value;}catch{}
  if(Array.isArray(items))tooltip+='\n'+items.length+' '+(items.length===1?'componente':'componentes');
  return tooltip;
}
export function refreshLibraryTitle(select){const option=select.selectedOptions[0];select.title=option?.title||option?.textContent||'';}
export function updateSavedSiteOption(select,record){
  let option=[...select.options].find(o=>o.value===record.id);
  if(!option){option=select.ownerDocument.createElement('option');option.value=record.id;select.append(option);}
  option.textContent=savedSiteLabel(record);option.title=savedSiteTooltip(record);refreshLibraryTitle(select);return option;
}
export function orderSavedSiteOptions(select,records){
  const options=[...select.options],byID=new Map(options.map(option=>[option.value,option]));
  const rows=Array.from(records).filter(record=>byID.has(record.id)).map(record=>({option:byID.get(record.id),time:savedDate(record)?.getTime()??-Infinity}));
  const positions=new Map(options.map((option,index)=>[option,index]));
  rows.sort((a,b)=>a.time===b.time?positions.get(a.option)-positions.get(b.option):a.time>b.time?-1:1);
  const saved=new Set(rows.map(row=>row.option));let index=0;
  const ordered=options.map(option=>saved.has(option)?rows[index++].option:option);
  if(ordered.some((option,i)=>option!==options[i])){
    const selected=select.value;for(const option of ordered)select.append(option);select.value=selected;
  }
  refreshLibraryTitle(select);
}
