// Keep the helper on the same release token as its stamped entry module.
const resizeModuleURL=new URL('./panel-resize.mjs',import.meta.url);
resizeModuleURL.search=new URL(import.meta.url).search;
const {attachPanelResize}=await import(resizeModuleURL.href);
const ICONS = {
  options:'<path d="M2 3h12M2 7h12M2 11h12"/>',
  advanced:'<rect x="1" y="1" width="14" height="12"/><path d="M10 1v12"/>',
  expert:'<rect x="1" y="1" width="14" height="12"/><path d="M1 9h14"/>'
};
const LABELS = {options:['Opciones','Options'],advanced:['Avanzado','Advanced'],expert:['Experto','Expert']};
const ROUTES = {xperiencias:'/xperiencias/',interactivos:'/interactivos/',presentaciones:'/presentaciones/',sites:'/sites/',capsulas:'/capsulas/',login:'/interactivos/?login=1'};

export function mountQuadraticHeader(header, {doc=header.ownerDocument, win=doc.defaultView, panels={}, buttons={}, host=header.closest('dialog,#capsulaEditor')||doc.body, navigate=href=>win.location.assign(href)}={}) {
  if (header.ainQuadraticUI) return header.ainQuadraticUI;
  if(!doc.querySelector('link[data-ain-shell-style],link[href*="/assets/site-shell.css"]')){
    const css=doc.createElement('link');css.rel='stylesheet';css.href=new URL('./site-shell.css',import.meta.url).href;css.dataset.ainShellStyle='';doc.head.append(css);
  }
  const t = (es,en) => (win.AINLanguage?.read() || doc.documentElement.lang) === 'en' ? en : es;
  const labelled = (node,es,en) => { node.dataset.shellEs=es; node.dataset.shellEn=en; node.textContent=t(es,en); return node; };
  const create = (tag,es,en) => labelled(doc.createElement(tag),es,en);
  const order=[], controls={}, layers={}, resizers=[];
  const resizeScope=header.dataset.ainShell||(header.closest('dialog,#capsulaEditor')?'capsule-editor':'shell');
  header.classList.add('ain-quad-header');
  let tools=header.querySelector('.ain-quad-tools');
  if (!tools) { tools=doc.createElement('div'); tools.className='ain-quad-tools'; header.append(tools); }
  let sequence=doc.querySelectorAll('[data-ain-quad-panel]').length;
  function measure() {
    const top=Math.max(0,header.getBoundingClientRect().bottom);
    for (const layer of Object.values(layers)) layer.style.setProperty('--ain-quad-top',top+'px');
    for (const resizer of resizers) resizer.sync();
  }
  function set(name,open,focus=true) {
    const layer=layers[name], button=controls[name];
    if (!layer) return;
    layer.hidden=!open; button.setAttribute('aria-expanded',String(open));
    const index=order.indexOf(name); if(index>=0)order.splice(index,1); if(open)order.push(name);
    measure();
    if(focus) (open ? layer.querySelector('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button,a') || layer : button).focus({preventScroll:true});
  }
  for(const name of ['options','advanced','expert']) {
    const layer=panels[name]||doc.createElement('aside');
    layer.classList.add('ain-quad-panel','ain-quad-'+name);
    layer.dataset.ainQuadPanel=name; layer.id ||= 'ain-quad-'+name+'-'+(++sequence);
    layer.hidden=true; layers[name]=layer;
    const heading=doc.createElement('div'); heading.className='ain-quad-panel-heading';
    const title=create('h2',...LABELS[name]);title.id=layer.id+'-title';layer.setAttribute('aria-labelledby',title.id);
    const close=doc.createElement('button');close.type='button';close.textContent='×';close.dataset.ainQuadClose=name;
    close.onclick=()=>set(name,false);heading.append(title,close);layer.prepend(heading);host.append(layer);
    const button=buttons[name]||doc.createElement('button');
    button.type='button';button.disabled=false;button.classList.add('ain-quad-control');button.dataset.ainQuadToggle=name;
    button.innerHTML='<svg viewBox="0 0 16 14" aria-hidden="true">'+ICONS[name]+'</svg>';
    button.setAttribute('aria-controls',layer.id);button.setAttribute('aria-expanded','false');controls[name]=button;
    button.onclick=()=>set(name,layer.hidden);
    // The compact layout starts with its new CSS sizes, then remembers each
    // subsequent adjustment independently from the former large-panel layout.
    resizers.push(attachPanelResize(layer,{edge:({options:'right',advanced:'left',expert:'top'})[name],name,scope:resizeScope+'-compact',minSize:name==='expert'?56:160,win,getTop:()=>Math.max(0,header.getBoundingClientRect().bottom)}));
    if(!buttons[name]) { if(name==='options')header.prepend(button);else tools.append(button); }
  }
  if(!panels.options) {
    const nav=doc.createElement('nav');nav.className='ain-quad-links';nav.setAttribute('aria-label',t('Secciones','Sections'));
    for(const [key,label,en] of [['xperiencias','Xperiencias','Xperiencias'],['interactivos','Interactivos','Interactives'],['presentaciones','Presentaciones','Presentations'],['capsulas','Cápsulas','Capsules'],['login','Login','Login']]) {
      const a=create('a',label,en);a.href=ROUTES[key];a.dataset.languageLink='';nav.append(a);
    }
    layers.options.append(nav);
  }
  // A common language preference remains available even on an existing inspector.
  const languageLabel=create('label','Idioma','Language'), language=doc.createElement('select');
  for(const [value,text] of [['es','Español'],['en','English']]){const o=doc.createElement('option');o.value=value;o.textContent=text;language.append(o);}
  const languageText=doc.createElement('span');languageText.textContent=languageLabel.textContent;languageText.dataset.shellEs='Idioma';languageText.dataset.shellEn='Language';
  delete languageLabel.dataset.shellEs;delete languageLabel.dataset.shellEn;languageLabel.replaceChildren(languageText,language);
  language.onchange=()=>{if(win.AINLanguage)win.AINLanguage.set(language.value);};
  layers.advanced.append(languageLabel);
  if(!panels.expert) {
    layers.expert.classList.add('ain-quad-expert-cli');
    const log=doc.createElement('pre');
    log.className='ain-quad-log';log.setAttribute('role','log');log.setAttribute('aria-live','polite');
    const form=doc.createElement('form');form.className='ain-quad-command';
    const label=doc.createElement('label'),labelText=create('span','Comando','Command'),input=doc.createElement('input');input.type='text';input.autocomplete='off';input.autocapitalize='none';input.spellcheck=false;input.maxLength=300;
    labelText.className='ain-quad-command-label';
    input.dataset.shellPlaceholderEs='/help · /idioma es|en · /abrir xperiencias|interactivos|presentaciones|sites|capsulas|login · /estado';
    input.dataset.shellPlaceholderEn='/help · /language es|en · /open xperiencias|interactivos|presentaciones|sites|capsulas|login · /status';
    label.append(labelText,input);const run=create('button','Ejecutar','Run');run.type='submit';form.append(label,run);
    form.onsubmit=event=>{
      event.preventDefault();const text=input.value.trim(),[command,arg,...rest]=text.split(/\s+/);let answer;
      if(/^\/(?:help|ayuda)$/.test(command)&&!arg)answer=t('Órdenes: /idioma es|en, /abrir xperiencias|interactivos|presentaciones|sites|capsulas|login, /estado, /cerrar.','Commands: /language es|en, /open xperiencias|interactivos|presentaciones|sites|capsulas|login, /status, /close.');
      else if(/^\/(?:idioma|language)$/.test(command)&&/^(es|en)$/.test(arg)&&!rest.length){win.AINLanguage?.set(arg);answer=t('Idioma actualizado.','Language updated.');}
      else if(/^\/(?:abrir|open)$/.test(command)&&Object.hasOwn(ROUTES,arg)&&!rest.length){const url=new URL(ROUTES[arg],win.location.origin);url.searchParams.set('lang',win.AINLanguage?.read()||doc.documentElement.lang);navigate(url.href);return;}
      else if(/^\/(?:estado|status)$/.test(command)&&!arg)answer=doc.title+' · '+(win.AINLanguage?.read()||doc.documentElement.lang).toUpperCase();
      else if(/^\/(?:cerrar|close)$/.test(command)&&!arg){set('expert',false);return;}
      else answer=t('Comando no reconocido. Escribe /help.','Unknown command. Enter /help.');
      log.textContent=(log.textContent+(log.textContent?'\n':'')+'› '+text+'\n'+answer).slice(-6000);log.scrollTop=log.scrollHeight;input.value='';
    };
    const heading=layers.expert.querySelector('.ain-quad-panel-heading');
    heading.insertBefore(form,heading.querySelector('[data-ain-quad-close]'));
    layers.expert.append(log);
  }
  // Keep the real Interactivos command form and its listeners in the same
  // compact first row; export and reference controls live in Advanced.
  const nativeCommand=layers.expert.querySelector('#expertCommandForm');
  if(nativeCommand){
    const oldSection=nativeCommand.closest('.expert-commands'),heading=layers.expert.querySelector('.ain-quad-panel-heading');
    layers.expert.classList.add('ain-quad-expert-cli');nativeCommand.classList.add('ain-quad-command');
    const row=nativeCommand.querySelector('.command-controls');if(row)row.replaceWith(...row.childNodes);
    const label=nativeCommand.querySelector('label'),labelText=doc.createElement('span');labelText.className='ain-quad-command-label';
    for(const node of Array.from(label.childNodes))if(node.nodeType===3)labelText.append(node);
    label.prepend(labelText);
    const help=nativeCommand.querySelector('#expertCommandHelp');if(help)help.hidden=true;
    const status=nativeCommand.querySelector('#expertCommandStatus');if(status){status.classList.add('ain-quad-log');layers.expert.append(status);}
    heading.insertBefore(nativeCommand,heading.querySelector('[data-ain-quad-close]'));
    oldSection?.remove();
  }
  function translate(){
    for(const [name,button] of Object.entries(controls)){const label=t(...LABELS[name]);button.title=label;button.setAttribute('aria-label',label);layers[name].querySelector('[data-ain-quad-close]').setAttribute('aria-label',t('Cerrar ','Close ')+label);}
    for(const node of [...header.querySelectorAll('[data-shell-es]'),...Object.values(layers).flatMap(layer=>Array.from(layer.querySelectorAll('[data-shell-es]')))]) {
      // Labels that contain an input keep that input in place.
      if(node.children.length) {const text=Array.from(node.childNodes).find(n=>n.nodeType===3);if(text)text.nodeValue=t(node.dataset.shellEs,node.dataset.shellEn);}
      else node.textContent=t(node.dataset.shellEs,node.dataset.shellEn);
    }
    for(const input of layers.expert.querySelectorAll('[data-shell-placeholder-es]'))input.placeholder=t(input.dataset.shellPlaceholderEs,input.dataset.shellPlaceholderEn);
    language.value=win.AINLanguage?.read()||doc.documentElement.lang;
    win.AINLanguage?.links();
  }
  const onKey=event=>{if(event.defaultPrevented||event.key!=='Escape')return;const dialog=event.target.closest?.('dialog');if(dialog&&dialog!==header.closest('dialog')&&!event.target.closest('[data-ain-quad-panel]'))return;const name=event.target.closest?.('[data-ain-quad-panel]')?.dataset.ainQuadPanel||order.at(-1);if(name){event.preventDefault();event.stopPropagation();set(name,false);}};
  doc.addEventListener('keydown',onKey,true);win.addEventListener('ainimation:language',translate);win.addEventListener('resize',measure);doc.addEventListener('scroll',measure,true);
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(measure):null;observer?.observe(header);
  if(!tools.children.length)tools.remove();
  translate();measure();
  return header.ainQuadraticUI={show:name=>set(name,true),hide:name=>set(name,false),isOpen:name=>Boolean(layers[name]&&!layers[name].hidden),panels:layers,buttons:controls,destroy(){for(const resizer of resizers)resizer.destroy();observer?.disconnect();doc.removeEventListener('keydown',onKey,true);win.removeEventListener('ainimation:language',translate);win.removeEventListener('resize',measure);doc.removeEventListener('scroll',measure,true);}};
}

export function mountSiteShell(doc=document,win=window) {
  for(const header of doc.querySelectorAll('[data-ain-shell]')) {
    if(header.ainQuadraticUI)continue;
    const page=header.dataset.ainShell;
    if(page==='native'){
      // Keep the native toggles and real controls in Sites and Produce.
      for(const [name,rail] of [['options','left'],['advanced','right'],['expert','bottom']]){
        const panel=doc.getElementById(name+'-panel')||doc.querySelector('.rail-'+rail);
        if(panel){panel.id||='produce-'+rail;if(name!=='expert')panel.classList.add('ain-compact-side');attachPanelResize(panel,{edge:({options:'right',advanced:'left',expert:'top'})[name],name,scope:name==='expert'?'native':'native-compact',minSize:name==='expert'?undefined:160,win,getTop:()=>Math.max(0,header.getBoundingClientRect().bottom)});}
      }
      continue;
    }
    if(page==='director'&&new URLSearchParams(win.location.search).get('mode')==='capsula')continue;
    const panels={};
    if(page==='presentation-editor') {
      panels.options=doc.querySelector('.component-panel');panels.advanced=doc.querySelector('.inspector');doc.body.classList.add('ain-presentation-quad');
    }
    if(page==='interactivos') {
      const advanced=doc.createElement('div'),expert=doc.createElement('div');
      for(const node of doc.querySelectorAll('[data-level="advanced"]')){node.removeAttribute('data-level');advanced.append(node);}
      for(const node of doc.querySelectorAll('[data-level="expert"]')){node.removeAttribute('data-level');(node.id==='html'||node.classList.contains('reference')?advanced:expert).append(node);}
      panels.advanced=advanced;panels.expert=expert;
    }
    mountQuadraticHeader(header,{doc,win,panels});
  }
}

if(typeof document!=='undefined')mountSiteShell();
