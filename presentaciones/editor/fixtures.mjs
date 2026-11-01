import {PROJECT,validateProject} from './project.mjs';

export const components=[
  {id:'hero',label:'Portada',description:'Titular, mensaje, color y posición'},
  {id:'action',label:'Llamada a la acción',description:'Texto y color del botón'},
  {id:'detail',label:'Segundo bloque',description:'Título y desarrollo'}
];
const field=(id,label,path,type,extra={})=>({id,label,path,type,...extra});
export function fixture(kind='site') {
  if(!['site','presentation'].includes(kind))throw Error('Muestra no compatible.');
  const site=kind==='site';
  return validateProject({format:PROJECT,version:1,kind,title:site?'Órbita · site de muestra':'Órbita · presentación de muestra',
    source:{adapter:site?'owned-site-fixture':'presentation-fixture',id:site?'orbita-site':'orbita-presentation',revision:'demo-r1'},
    document:{brand:'ÓRBITA',components:{
      hero:{eyebrow:site?'ENCUENTROS QUE DEJAN HUELLA':'UNA IDEA. MUCHAS POSIBILIDADES.',title:site?'Un lugar para las buenas ideas.':'Las buenas ideas merecen un escenario.',message:site?'Un encuentro ficticio de diseño, tecnología y cultura. Ven a compartir lo que imaginas.':'Explora una propuesta, encuentra su intención y decide cómo quieres contarla.',color:site?'#c3ff6b':'#e3b4ff',x:6},
      action:{label:site?'Descubrir el encuentro':'Explorar la propuesta',color:site?'#c3ff6b':'#e3b4ff',target:site?'#programa':'scene-2',behavior:{type:site?'scroll':'go-to-scene',enabled:true}},
      detail:{title:site?'Ideas que se encuentran.':'Del mensaje al movimiento.',body:site?'Conversaciones, talleres y nuevas miradas. Este bloque forma parte de una muestra: no hay un evento ni una inscripción reales.':'Una escena puede abrir una conversación y dar paso a un recorrido. Este contenido es ficticio y sirve para probar el mismo editor.'}},
      navigation:site?{links:[{label:'El encuentro',target:'#encuentro'},{label:'Programa',target:'#programa'}]}:{scenes:[{id:'scene-1',next:'scene-2'},{id:'scene-2',next:'scene-1'}]},
      media:{id:'abstract-orbit',kind:'illustration',credit:'Composición de muestra'},
      extension:{preserve:'La estructura, los destinos y las extensiones no se editan en este ensayo.'}},
    fields:[
      field('hero-title','Titular',['components','hero','title'],'text',{maxLength:160}),
      field('hero-message','Mensaje',['components','hero','message'],'text',{maxLength:700}),
      field('hero-color','Color de acento',['components','hero','color'],'color'),
      field('hero-x','Posición horizontal (%)',['components','hero','x'],'number',{min:0,max:24}),
      field('action-label','Texto del botón',['components','action','label'],'text',{maxLength:80}),
      field('action-color','Color del botón',['components','action','color'],'color'),
      field('detail-title','Título del bloque',['components','detail','title'],'text',{maxLength:160}),
      field('detail-body','Desarrollo',['components','detail','body'],'text',{maxLength:1400})
    ]});
}
export function componentFields(project,id) {
  return project.fields.filter(field=>field.path[0]==='components'&&field.path[1]===id);
}
export function fieldValue(project,field) {
  return field.path.reduce((node,key)=>node[key],project.document);
}
