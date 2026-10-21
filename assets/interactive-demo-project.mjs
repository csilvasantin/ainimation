import {readLibrary,createProject} from './interactive-library.mjs';

// The three screens and four buttons used in /demo interactivo.
export function demoProject() {
  return {
    format:'ainimation-interactive',version:1,title:'Demo · Mi cafetería',
    orientation:'portrait',color:'#b8ee77',resetSeconds:30,start:'bienvenida',
    scenes:[
      {id:'bienvenida',title:'Tu pausa empieza aquí',body:'Crea tu momento. Descubre nuestra carta de café.',buttons:[{label:'Ver la carta',target:'carta'}]},
      {id:'carta',title:'Elige tu café',body:'Espresso · 2,60 €\nUn café corto, intenso y recién preparado.',buttons:[{label:'Descubrir Espresso',target:'espresso'},{label:'Volver al inicio',target:'bienvenida'}]},
      {id:'espresso',title:'Tu Espresso, con calma',body:'Pídelo en la barra y disfruta de tu pausa.\nEsto es una demo: no se envía ningún pedido.',buttons:[{label:'Volver a la carta',target:'carta'}]}
    ]
  };
}

export function createDemoCopy(storage,{hasUnsavedWork=false}={}) {
  if(hasUnsavedWork)return {ok:false,error:'Tienes cambios o imágenes pendientes. Cierra la demo y guarda o completa ese trabajo antes de crear la copia.'};
  const latest=readLibrary(storage);
  if(!latest.ok)return latest;
  const project=demoProject(),base=project.title+' · copia';
  let number=1;
  project.title=base;
  while(latest.data.projects.some(record=>record.project.title===project.title))project.title=base+' '+(++number);
  // Append to the latest library. Do not persist, rename or revise older records.
  return createProject(storage,project);
}
