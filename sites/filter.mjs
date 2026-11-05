import {localReference} from './media.mjs';
import {hasConfiguredAnimation} from './animation-state.mjs?v=20261105-animation-filter-1';
import {hasImageDescription,componentMediaMime,MEDIA_FORMAT_LABELS,componentMediaUsage} from './file-tooltip.mjs?v=20261105-usage-filter-1';

export const COMPONENT_LABELS=Object.freeze({text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'});
const SEARCH_VOWELS={á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u'};
const searchKey=text=>text.normalize('NFC').toLocaleLowerCase('es').replace(/[áéíóúü]/g,letter=>SEARCH_VOWELS[letter]);
const nameCollator=new Intl.Collator('es',{numeric:true,sensitivity:'variant'});

export function createComponentProvenance(session){
  const importedIDs=new Set(session.original.items.map(item=>item.id));
  return item=>importedIDs.has(item.id)?'imported':session.canSetMediaVisibility(item.id)?'added':'';
}

export function createComponentFilter({document=globalThis.document,onChange,getMediaName=()=>'',getMediaMime=()=>'',isLocked=()=>false}){
  const search=document.getElementById('filter'),type=document.getElementById('component-type'),visibility=document.getElementById('component-visibility'),animation=document.getElementById('component-animation'),provenance=document.getElementById('component-provenance'),status=document.getElementById('component-results');
  const description=document.getElementById('component-description'),format=document.getElementById('component-format'),resetButton=document.getElementById('reset-component-filters');let total=0;
  const usage=document.getElementById('component-usage');
  const sortButton=document.getElementById('sort-components');let alphabetical=false;
  const selectors=document.getElementById('component-selectors'),toggleButton=document.getElementById('toggle-component-selectors');
  const selectorControls=[type,visibility,animation,provenance,description,format,usage],activeSelectorCount=()=>selectorControls.filter(control=>control.value!=='all').length;
  function syncToggleHelp(){
    const count=activeSelectorCount(),label=(selectors.hidden?'Mostrar':'Ocultar')+' selectores de filtro · '+count+' '+(count===1?'selector activo':'selectores activos');toggleButton.setAttribute('aria-label',label);toggleButton.title=label;
  }
  function setSelectorsExpanded(expanded){
    selectors.hidden=!expanded;toggleButton.setAttribute('aria-expanded',String(expanded));syncToggleHelp();
  }
  const hasFilters=()=>search.value!==''||activeSelectorCount()>0;
  function syncSortHelp(){const label=alphabetical?'Restaurar orden original de la lista':'Ordenar lista por nombre';sortButton.setAttribute('aria-label',label);sortButton.title=label;sortButton.setAttribute('aria-pressed',String(alphabetical));}
  function resetOrder(){alphabetical=false;syncSortHelp();}
  function syncAvailability(){resetButton.disabled=isLocked()||!hasFilters();toggleButton.disabled=isLocked();sortButton.disabled=isLocked();syncToggleHelp();syncSortHelp();}
  function reset(){search.value='';type.value='all';visibility.value='all';animation.value='all';provenance.value='all';description.value='all';format.value='all';usage.value='all';syncAvailability();}
  type.replaceChildren(...Object.entries({all:'Todos',...COMPONENT_LABELS}).map(([value,label])=>{
    const option=document.createElement('option');option.value=value;option.textContent=label;return option;
  }));
  format.replaceChildren(...Object.entries({all:'Todos',...MEDIA_FORMAT_LABELS}).map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
  const changed=event=>{syncAvailability();onChange(event);};
  search.addEventListener('input',changed);type.addEventListener('change',changed);visibility.addEventListener('change',changed);animation.addEventListener('change',changed);provenance.addEventListener('change',changed);description.addEventListener('change',changed);format.addEventListener('change',changed);usage.addEventListener('change',changed);
  resetButton.addEventListener('click',()=>{
    if(isLocked()||!hasFilters())return;
    reset();onChange();status.textContent='Filtros restablecidos. '+total+' '+(total===1?'componente.':'componentes.');status.hidden=false;
  });
  toggleButton.addEventListener('click',()=>{if(!isLocked())setSelectorsExpanded(selectors.hidden);});
  sortButton.addEventListener('click',()=>{
    if(isLocked())return;
    alphabetical=!alphabetical;syncSortHelp();onChange();
    if(!alphabetical)status.textContent='Orden original de la lista. '+status.textContent;
    status.hidden=false;
  });
  setSelectorsExpanded(true);
  syncAvailability();
  return {
    apply(items,isHidden,getProvenance=()=>'',selected='',getMediaUsage=()=>undefined){
      total=items.length;syncAvailability();
      const query=searchKey(search.value.trim()),kind=type.value,state=visibility.value,motion=animation.value,origin=provenance.value,altState=description.value,mime=format.value,usageState=usage.value;
      const words=query?query.split(/\s+/u):[];
      const matches=items.filter(item=>{
        const hidden=isHidden(item),animated=hasConfiguredAnimation(item),matchesType=kind==='all'||item.type===kind,matchesVisibility=state==='all'||(state==='hidden'?hidden:!hidden),matchesAnimation=motion==='all'||(motion==='animated'?animated:motion==='unanimated'?!animated:animated&&item.animation===motion);
        const matchesProvenance=origin==='all'||(['imported','added'].includes(origin)&&getProvenance(item)===origin);
        const matchesDescription=altState==='all'||(item.type==='image'&&(altState==='described'?hasImageDescription(item):altState==='undescribed'&&!hasImageDescription(item)));
        if(!matchesType||!matchesVisibility||!matchesAnimation||!matchesProvenance||!matchesDescription)return false;
        if(mime!=='all'&&componentMediaMime(item,getMediaMime)!==mime)return false;
        if(usageState!=='all'){
          const count=componentMediaUsage(item,getMediaUsage);
          if(!(usageState==='unique'?count===1:usageState==='shared'&&count>1))return false;
        }
        const fileName=['image','video'].includes(item.type)&&localReference(item.value)?getMediaName(item.value)||'':'';
        const content=searchKey(item.label+' '+item.value+' '+COMPONENT_LABELS[item.type]+(hidden?' oculto':'')+(item.type==='image'&&typeof item.alt==='string'?' '+item.alt:'')+' '+fileName);
        return words.every(word=>content.includes(word));
      });
      const selectionOutside=items.some(item=>item.id===selected)&&!matches.some(item=>item.id===selected);
      status.textContent=(alphabetical?'Orden por nombre. ':'')+(matches.length?matches.length+' de '+items.length+' componentes':'No hay coincidencias. Prueba otros filtros o búsqueda.')+(selectionOutside?' La selección actual no aparece con estos filtros.':'');
      status.hidden=!alphabetical&&kind==='all'&&state==='all'&&motion==='all'&&origin==='all'&&altState==='all'&&mime==='all'&&usageState==='all'&&!query&&matches.length>0&&!selectionOutside;
      return alphabetical?matches.map((item,index)=>({item,index})).sort((a,b)=>nameCollator.compare(a.item.label,b.item.label)||a.index-b.index).map(entry=>entry.item):matches;
    },
    reset,resetOrder,syncAvailability,expandSelectors:()=>setSelectorsExpanded(true),
    locate(id){
      const list=document.getElementById('components'),target=[...list.children].find(node=>node.dataset.item===id);
      if(!target)return false;
      status.textContent='Selección localizada: '+target.querySelector('strong').textContent;status.hidden=false;
      const bounds=list.getBoundingClientRect(),row=target.getBoundingClientRect(),top=bounds.top+list.clientTop,bottom=top+list.clientHeight;
      if(row.top<top)list.scrollTop+=row.top-top;else if(row.bottom>bottom)list.scrollTop+=row.bottom-bottom;
      return true;
    }
  };
}
