import {PROJECT,validateProject,applyChanges} from './project.mjs';
import {TEMA_OPCIONES,NONE as NO_TEMA} from './temas-cine.mjs';
import {sourceThumbnail,thumbnailMedia,thumbnailFields,validateThumbnail} from './thumbnail-model.mjs';
const LANGUAGES=['es','ca','en'];
const limits={eyebrow:120,title:220,summary:900,objective:1200,blockTitle:180,message:900,detail:1600,closingTitle:220,action:700};
const text=value=>typeof value==='string'?value:'';
// Acento por presentación y alineación por lámina (Carlos, 02-11-2026). Valores cerrados:
// el generador los valida igual y el deck público los ignora; solo /pruebas los pinta.
export const ACCENT=/^#[0-9a-f]{6}$/,ALIGNS=['left','center','right'],DEFAULT_ACCENT='#ffb000';
const temaOf=ideas=>TEMA_OPCIONES.includes(ideas?.tema)?ideas.tema:NO_TEMA;
const accentOf=ideas=>ACCENT.test(ideas?.accent||'')?ideas.accent:DEFAULT_ACCENT;
const alignOf=(ideas,id)=>{const value=(ideas?.skeleton||[]).find(b=>b?.id===id)?.align;return ALIGNS.includes(value)?value:'left';};
export function generatorProject(ideas,language='es') {
  if(!LANGUAGES.includes(language)||!ideas||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(ideas.client||''))throw Error('Presentación o idioma no compatible.');
  if(!ideas.updatedAt)throw Error('La presentación necesita una revisión guardada para editarse.');
  const content=language==='es'?ideas:ideas.translations?.[language];
  if(!content||!Array.isArray(content.skeleton))throw Error('No hay contenido guardado en este idioma.');
  const components={},order=[],fields=[],bindings={};
  components.thumbnail={label:'Miniatura',...sourceThumbnail(ideas,language)};order.push('thumbnail');fields.push(...thumbnailFields());
  components.style={label:'Estilo',accent:accentOf(ideas),tema:temaOf(ideas)};order.push('style');
  fields.push({id:'style-accent',label:'Color de acento',type:'color',path:['components','style','accent']});bindings['style-accent']={field:'accent'};
  // Tema cinematográfico: la marca conserva el acento; el tema solo pone la atmósfera.
  fields.push({id:'style-tema',label:'Tema de cine',type:'choice',options:[...TEMA_OPCIONES],path:['components','style','tema']});bindings['style-tema']={field:'tema'};
  const add=(id,label,values)=>{components[id]={label};order.push(id);for(const [key,value,native,limit,blockId]of values){
    components[id][key]=text(value);const fid=id+'-'+key;
    fields.push({id:fid,label:native==='hero.title'?'Titular de portada':native==='closing.title'?'Título del cierre':key==='title'?'Título':key==='message'?'Mensaje':key==='detail'?'Desarrollo':key==='eyebrow'?'Antetítulo':key==='summary'?'Entradilla':key==='action'?'Siguiente acción':'Objetivo',type:'text',path:['components',id,key],maxLength:limit});
    bindings[fid]={field:native,...(blockId?{blockId}: {})};
  }};
  add('cover','Portada',[
    ['eyebrow',content.hero?.eyebrow,'hero.eyebrow',limits.eyebrow],['title',content.hero?.title,'hero.title',limits.title],['summary',content.hero?.summary,'hero.summary',limits.summary]
  ]);
  add('objective','Objetivo',[['body',content.objective,'objective',limits.objective]]);
  const ids=new Set();
  const counts=new Map();for(const block of content.skeleton)counts.set(block.id,(counts.get(block.id)||0)+1);
  content.skeleton.forEach((block,index)=>{
    if(block.enabled===false)return;
    if(typeof block.id!=='string'||!block.id||block.id.length>80||ids.has(block.id)||counts.get(block.id)!==1)throw Error('Una diapositiva no tiene una identidad estable.');
    ids.add(block.id);
    add('block-'+index,block.title||'Diapositiva '+(index+1),[
      ['title',block.title,'skeleton.title',limits.blockTitle,block.id],['message',block.message,'skeleton.message',limits.message,block.id],['detail',block.detail,'skeleton.detail',limits.detail,block.id]
    ]);
    // La alineación es de la lámina, no del idioma: se lee y guarda en el guion base.
    components['block-'+index].align=alignOf(ideas,block.id);const fid='block-'+index+'-align';
    fields.push({id:fid,label:'Alineación',type:'choice',options:[...ALIGNS],path:['components','block-'+index,'align']});bindings[fid]={field:'skeleton.align',blockId:block.id};
  });
  add('closing','Cierre',[['title',content.closing?.title,'closing.title',limits.closingTitle],['action',content.closing?.action,'closing.action',limits.action]]);
  return validateProject({format:PROJECT,version:1,kind:'presentation',title:text(content.hero?.title)||text(ideas.displayName)||ideas.client,
    source:{adapter:'admiranext-presentation:'+language,id:ideas.client,revision:ideas.updatedAt},
    document:{brand:text(ideas.displayName)||ideas.client,language,components,order,bindings,thumbnailMedia:thumbnailMedia(ideas)},fields});
}
const isLayout=(project,change)=>['accent','tema','skeleton.align'].includes(project.document.bindings[change.field]?.field);
function layoutEdits(project,changeset){
  const layout={},align=[];
  for(const change of changeset.changes.filter(c=>isLayout(project,c))){
    const binding=project.document.bindings[change.field];
    if(binding.field==='tema'){if(!TEMA_OPCIONES.includes(change.after))throw Error('El tema no existe. Elige uno del catálogo.');layout.tema=change.after;}
    else if(binding.field==='accent'){if(!ACCENT.test(change.after))throw Error('El acento debe ser un color hexadecimal en minúsculas (#rrggbb).');layout.accent=change.after;}
    else{if(!ALIGNS.includes(change.after))throw Error('La alineación debe ser izquierda, centro o derecha.');align.push({blockId:binding.blockId,value:change.after});}
  }
  if(align.length)layout.align=align;
  return Object.keys(layout).length?{layout}:{};
}
export function nativeEdits(project,changeset) {
  const canonical=validateProject(project),draft=applyChanges(canonical,changeset);
  if(!changeset.changes.length||changeset.changes.length>20)throw Error('Guarda entre 1 y 20 ajustes por vez.');
  return {language:canonical.document.language,revision:canonical.source.revision,refinement:true,
    ...(changeset.changes.some(c=>c.field.startsWith('thumbnail-'))?{thumbnail:validateThumbnail(draft.document.components.thumbnail,canonical.source.id)}:{}),
    ...layoutEdits(canonical,changeset),
    edits:changeset.changes.filter(c=>!c.field.startsWith('thumbnail-')&&!isLayout(canonical,c)).map(change=>{
      const binding=canonical.document.bindings[change.field];if(!binding)throw Error('Campo sin vínculo de origen.');
      if(change.after!==change.after.replace(/\r\n?/g,'\n').trim())throw Error('El texto contiene espacios exteriores o saltos no compatibles con el generador.');
      return {...binding,value:change.after};
    })};
}
export function confirmSaved(project,changeset,ack,ideas) {
  if(!ack?.ok||typeof ack.revision!=='string'||ack.revision===project.source.revision||ideas.updatedAt!==ack.revision)throw Error('El origen no ha confirmado una nueva revisión. Conserva el borrador y recarga.');
  const actual=generatorProject(ideas,project.document.language);
  if(actual.source.id!==project.source.id||actual.source.adapter!==project.source.adapter)throw Error('El guardado corresponde a otro origen.');
  for(const change of changeset.changes){
    const field=actual.fields.find(f=>f.id===change.field);
    const value=field?.path.reduce((node,key)=>node?.[key],actual.document);
    if(value!==change.after)throw Error('La lectura posterior no coincide con el ajuste enviado. Conserva el borrador.');
  }
  return actual;
}
export function generatorComponents(project) {
  return project.document.order.map(id=>({id,label:project.document.components[id].label,description:id==='thumbnail'?'Imagen, titular y composición':id==='style'?'Color de acento y tema de cine de la presentación':id==='cover'?'Textos de portada':id==='closing'?'Cierre y siguiente acción':'Textos y alineación de la diapositiva'}));
}
export function isGeneratorProject(project){return /^admiranext-presentation:(es|ca|en)$/.test(project?.source?.adapter||'');}
export function generatorOrigin(origin){return ['https://www.admiranext.com','https://admiranext.com'].includes(origin)||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin||'');}
export function validChannel(channel){return typeof channel==='string'&&/^[a-f0-9-]{36}$/.test(channel);}
