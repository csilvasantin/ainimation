export const COMPONENT_LABELS=Object.freeze({text:'Texto',image:'Imagen',video:'Vídeo',graphic:'SVG',background:'Fondo'});

export function createComponentFilter({document=globalThis.document,onChange}){
  const search=document.getElementById('filter'),type=document.getElementById('component-type'),status=document.getElementById('component-results');
  type.replaceChildren(...Object.entries({all:'Todos',...COMPONENT_LABELS}).map(([value,label])=>{
    const option=document.createElement('option');option.value=value;option.textContent=label;return option;
  }));
  search.addEventListener('input',onChange);type.addEventListener('change',onChange);
  return {
    apply(items,isHidden){
      const query=search.value.trim().toLocaleLowerCase(),kind=type.value;
      const matches=items.filter(item=>(kind==='all'||item.type===kind)&&
        (item.label+' '+item.value+' '+COMPONENT_LABELS[item.type]+(isHidden(item)?' oculto':'')).toLocaleLowerCase().includes(query));
      status.textContent=matches.length?matches.length+' de '+items.length+' componentes':'No hay coincidencias. Prueba otro tipo o búsqueda.';
      status.hidden=kind==='all'&&!query&&matches.length>0;
      return matches;
    },
    reset(){search.value='';type.value='all';}
  };
}
