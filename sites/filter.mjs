import {localReference} from './media.mjs';
import {hasConfiguredAnimation} from './animation-state.mjs?v=20261105-animation-filter-1';
import {hasImageDescription,componentMediaMime,MEDIA_FORMAT_LABELS} from './file-tooltip.mjs?v=20261105-format-filter-1';

export const COMPONENT_LABELS=Object.freeze({text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'});
const SEARCH_VOWELS={á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u'};
const searchKey=text=>text.normalize('NFC').toLocaleLowerCase('es').replace(/[áéíóúü]/g,letter=>SEARCH_VOWELS[letter]);

export function createComponentProvenance(session){
  const importedIDs=new Set(session.original.items.map(item=>item.id));
  return item=>importedIDs.has(item.id)?'imported':session.canSetMediaVisibility(item.id)?'added':'';
}

export function createComponentFilter({document=globalThis.document,onChange,getMediaName=()=>'',getMediaMime=()=>'',isLocked=()=>false}){
  const search=document.getElementById('filter'),type=document.getElementById('component-type'),visibility=document.getElementById('component-visibility'),animation=document.getElementById('component-animation'),provenance=document.getElementById('component-provenance'),status=document.getElementById('component-results');
  const description=document.getElementById('component-description'),format=document.getElementById('component-format'),resetButton=document.getElementById('reset-component-filters');let total=0;
  const selectors=document.getElementById('component-selectors'),toggleButton=document.getElementById('toggle-component-selectors');
  function setSelectorsExpanded(expanded){
    selectors.hidden=!expanded;const label=(expanded?'Ocultar':'Mostrar')+' selectores de filtro';toggleButton.setAttribute('aria-expanded',String(expanded));toggleButton.setAttribute('aria-label',label);toggleButton.title=label;
  }
  const hasFilters=()=>search.value!==''||type.value!=='all'||visibility.value!=='all'||animation.value!=='all'||provenance.value!=='all'||description.value!=='all'||format.value!=='all';
  function syncAvailability(){resetButton.disabled=isLocked()||!hasFilters();toggleButton.disabled=isLocked();}
  function reset(){search.value='';type.value='all';visibility.value='all';animation.value='all';provenance.value='all';description.value='all';format.value='all';syncAvailability();}
  type.replaceChildren(...Object.entries({all:'Todos',...COMPONENT_LABELS}).map(([value,label])=>{
    const option=document.createElement('option');option.value=value;option.textContent=label;return option;
  }));
  format.replaceChildren(...Object.entries({all:'Todos',...MEDIA_FORMAT_LABELS}).map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
  const changed=event=>{syncAvailability();onChange(event);};
  search.addEventListener('input',changed);type.addEventListener('change',changed);visibility.addEventListener('change',changed);animation.addEventListener('change',changed);provenance.addEventListener('change',changed);description.addEventListener('change',changed);format.addEventListener('change',changed);
  resetButton.addEventListener('click',()=>{
    if(isLocked()||!hasFilters())return;
    reset();onChange();status.textContent='Filtros restablecidos. '+total+' '+(total===1?'componente.':'componentes.');status.hidden=false;
  });
  toggleButton.addEventListener('click',()=>{if(!isLocked())setSelectorsExpanded(selectors.hidden);});
  setSelectorsExpanded(true);
  syncAvailability();
  return {
    apply(items,isHidden,getProvenance=()=>'',selected=''){
      total=items.length;syncAvailability();
      const query=searchKey(search.value.trim()),kind=type.value,state=visibility.value,motion=animation.value,origin=provenance.value,altState=description.value,mime=format.value;
      const words=query?query.split(/\s+/u):[];
      const matches=items.filter(item=>{
        const hidden=isHidden(item),animated=hasConfiguredAnimation(item),matchesType=kind==='all'||item.type===kind,matchesVisibility=state==='all'||(state==='hidden'?hidden:!hidden),matchesAnimation=motion==='all'||(motion==='animated'?animated:motion==='unanimated'?!animated:animated&&item.animation===motion);
        const matchesProvenance=origin==='all'||(['imported','added'].includes(origin)&&getProvenance(item)===origin);
        const matchesDescription=altState==='all'||(item.type==='image'&&(altState==='described'?hasImageDescription(item):altState==='undescribed'&&!hasImageDescription(item)));
        if(!matchesType||!matchesVisibility||!matchesAnimation||!matchesProvenance||!matchesDescription)return false;
        if(mime!=='all'&&componentMediaMime(item,getMediaMime)!==mime)return false;
        const fileName=['image','video'].includes(item.type)&&localReference(item.value)?getMediaName(item.value)||'':'';
        const content=searchKey(item.label+' '+item.value+' '+COMPONENT_LABELS[item.type]+(hidden?' oculto':'')+(item.type==='image'&&typeof item.alt==='string'?' '+item.alt:'')+' '+fileName);
        return words.every(word=>content.includes(word));
      });
      const selectionOutside=items.some(item=>item.id===selected)&&!matches.some(item=>item.id===selected);
      status.textContent=(matches.length?matches.length+' de '+items.length+' componentes':'No hay coincidencias. Prueba otros filtros o búsqueda.')+(selectionOutside?' La selección actual no aparece con estos filtros.':'');
      status.hidden=kind==='all'&&state==='all'&&motion==='all'&&origin==='all'&&altState==='all'&&mime==='all'&&!query&&matches.length>0&&!selectionOutside;
      return matches;
    },
    reset,syncAvailability,expandSelectors:()=>setSelectorsExpanded(true),
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
