import {localReference} from './media.mjs';
import {hasConfiguredAnimation} from './animation-state.mjs?v=20261105-animation-filter-1';

export const COMPONENT_LABELS=Object.freeze({text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'});
const SEARCH_VOWELS={á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u'};
const searchKey=text=>text.normalize('NFC').toLocaleLowerCase('es').replace(/[áéíóúü]/g,letter=>SEARCH_VOWELS[letter]);

export function createComponentFilter({document=globalThis.document,onChange,getMediaName=()=>''}){
  const search=document.getElementById('filter'),type=document.getElementById('component-type'),visibility=document.getElementById('component-visibility'),animation=document.getElementById('component-animation'),status=document.getElementById('component-results');
  type.replaceChildren(...Object.entries({all:'Todos',...COMPONENT_LABELS}).map(([value,label])=>{
    const option=document.createElement('option');option.value=value;option.textContent=label;return option;
  }));
  search.addEventListener('input',onChange);type.addEventListener('change',onChange);visibility.addEventListener('change',onChange);animation.addEventListener('change',onChange);
  return {
    apply(items,isHidden){
      const query=searchKey(search.value.trim()),kind=type.value,state=visibility.value,motion=animation.value;
      const words=query?query.split(/\s+/u):[];
      const matches=items.filter(item=>{
        const hidden=isHidden(item),animated=hasConfiguredAnimation(item),matchesType=kind==='all'||item.type===kind,matchesVisibility=state==='all'||(state==='hidden'?hidden:!hidden),matchesAnimation=motion==='all'||(motion==='animated'?animated:!animated);
        if(!matchesType||!matchesVisibility||!matchesAnimation)return false;
        const fileName=['image','video'].includes(item.type)&&localReference(item.value)?getMediaName(item.value)||'':'';
        const content=searchKey(item.label+' '+item.value+' '+COMPONENT_LABELS[item.type]+(hidden?' oculto':'')+(item.type==='image'?' '+(item.alt??''):'')+' '+fileName);
        return words.every(word=>content.includes(word));
      });
      status.textContent=matches.length?matches.length+' de '+items.length+' componentes':'No hay coincidencias. Prueba otros filtros o búsqueda.';
      status.hidden=kind==='all'&&state==='all'&&motion==='all'&&!query&&matches.length>0;
      return matches;
    },
    reset(){search.value='';type.value='all';visibility.value='all';animation.value='all';},
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
