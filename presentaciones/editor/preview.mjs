// A renderer for these two fictitious documents only, not an arbitrary-site importer.
// All edited copy becomes textContent, and styles come from validated typed fields.
export function renderPreview(root,project,{selected='hero',onSelect=()=>{},interactive=true}={}) {
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
