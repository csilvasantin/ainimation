import {isGeneratorProject} from './generator.mjs';
import {renderThumbnailPreview} from './thumbnail.mjs';
// Content preview; it does not execute imported HTML or replace the original deck.
// All edited copy becomes textContent, and styles come from validated typed fields.
export function renderPreview(root,project,{selected='hero',onSelect=()=>{},interactive=true,assets={},onStatus=()=>{}}={}) {
  if(selected==='thumbnail')return renderThumbnailPreview(root,project,{assets,onStatus});
  if(isGeneratorProject(project))return generatorPreview(root,project,{selected,onSelect,interactive});
  const doc=root.ownerDocument,p=project.document;
  root.replaceChildren();root.className='preview-document '+project.kind;
  const el=(tag,className,text)=>{const node=doc.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const component=(id,label)=>{
    const node=el(interactive?'button':'div','preview-component'+(selected===id&&interactive?' selected':''));
    node.dataset.component=id;
    if(interactive){node.type='button';node.setAttribute('aria-label','Seleccionar '+label);node.setAttribute('aria-pressed',String(selected===id));node.onclick=()=>onSelect(id);}
    return node;
  };
  const header=el('div','preview-header');header.append(el('strong','preview-brand',p.brand));
  header.append(el('span','preview-nav',project.kind==='site'?'EL ENCUENTRO  /  PROGRAMA':'PRESENTACIÓN  /  01—02'));
  const hero=el('section','preview-hero');hero.style.setProperty('--accent',p.components.hero.color);
  const art=el('div','preview-art');art.setAttribute('aria-hidden','true');art.append(el('div','preview-ring one'),el('div','preview-ring two'),el('div','preview-sphere'));
  const copy=component('hero','Portada');copy.classList.add('hero-copy');copy.style.marginLeft=p.components.hero.x+'%';
  copy.style.width=(92-p.components.hero.x)+'%';
  copy.append(el('span','preview-eyebrow',p.components.hero.eyebrow),el('span','preview-title',p.components.hero.title),el('span','preview-message',p.components.hero.message));
  const action=component('action','Llamada a la acción');action.classList.add('preview-action');action.style.marginLeft=p.components.hero.x+'%';action.style.backgroundColor=p.components.action.color;action.append(el('span','',p.components.action.label),el('span','','↗'));
  hero.append(art,copy,action);
  const detail=component('detail','Segundo bloque');detail.classList.add('preview-detail');detail.append(el('span','preview-detail-kicker',project.kind==='site'?'EL PROGRAMA / MUESTRA':'LA SIGUIENTE ESCENA / MUESTRA'),el('span','preview-detail-title',p.components.detail.title),el('span','preview-detail-body',p.components.detail.body));
  const footer=el('div','preview-footer',project.kind==='site'?'ÓRBITA · DISEÑO / TECNOLOGÍA / CULTURA':'ÓRBITA · RELATO / MOVIMIENTO / INTERACCIÓN');
  root.append(header,hero,detail,footer);
}
function generatorPreview(root,project,{selected,onSelect,interactive}){
  const doc=root.ownerDocument,node=project.document.components[selected]||project.document.components[project.document.order[0]];
  root.replaceChildren();root.className='preview-document presentation generator-preview';
  const make=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls;el.textContent=text;return el;};
  const header=make('div','preview-header','');header.append(make('strong','preview-brand',project.document.brand),make('span','preview-nav',project.document.language.toUpperCase()+' / '+node.label));
  const scene=make(interactive?'button':'div','preview-component generator-scene','');
  if(interactive){scene.type='button';scene.dataset.component=selected;scene.setAttribute('aria-label','Seleccionar '+node.label);scene.onclick=()=>onSelect(selected);}
  const keys=project.fields.filter(f=>f.path[1]===selected).map(f=>f.path[2]);
  for(const key of keys){const text=node[key];if(!text)continue;const cls=key==='title'?'preview-title':key==='eyebrow'?'preview-eyebrow':'preview-message';scene.append(make('span',cls,text));}
  root.append(header,scene,make('div','preview-footer','VISTA DE CONTENIDO · EL DISEÑO ORIGINAL SE CONSERVA EN EL GENERADOR'));
}
