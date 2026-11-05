export const COMPONENT_LABELS=Object.freeze({text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'});

export function createComponentFilter({document=globalThis.document,onChange}){
  const search=document.getElementById('filter'),type=document.getElementById('component-type'),visibility=document.getElementById('component-visibility'),status=document.getElementById('component-results');
  type.replaceChildren(...Object.entries({all:'Todos',...COMPONENT_LABELS}).map(([value,label])=>{
    const option=document.createElement('option');option.value=value;option.textContent=label;return option;
  }));
  search.addEventListener('input',onChange);type.addEventListener('change',onChange);visibility.addEventListener('change',onChange);
  return {
    apply(items,isHidden){
      const query=search.value.trim().toLocaleLowerCase(),kind=type.value,state=visibility.value;
      const matches=items.filter(item=>{
        const hidden=isHidden(item);
        return (kind==='all'||item.type===kind)&&(state==='all'||(state==='hidden'?hidden:!hidden))&&
          (item.label+' '+item.value+' '+COMPONENT_LABELS[item.type]+(hidden?' oculto':'')).toLocaleLowerCase().includes(query);
      });
      status.textContent=matches.length?matches.length+' de '+items.length+' componentes':'No hay coincidencias. Prueba otros filtros o búsqueda.';
      status.hidden=kind==='all'&&state==='all'&&!query&&matches.length>0;
      return matches;
    },
    reset(){search.value='';type.value='all';visibility.value='all';},
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
