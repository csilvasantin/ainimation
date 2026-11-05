const KEY = Symbol.for('ainimation.panelResize');
const LABELS = {options:['Opciones','Options'],advanced:['Avanzado','Advanced'],expert:['Experto','Expert']};

// Resize only the overlay. The stage, projects and window geometry are untouched.
export function attachPanelResize(panel, {edge, name, scope='page', minSize, getTop=()=>0, win=panel.ownerDocument.defaultView}={}) {
  if(panel[KEY])return panel[KEY];
  const doc=panel.ownerDocument,vertical=edge!=='top',dimension=vertical?'width':'height';
  const sign=edge==='right'?1:-1,handle=doc.createElement('div');
  const original={value:panel.style.getPropertyValue(dimension),priority:panel.style.getPropertyPriority(dimension)};
  const path=win.location.pathname.replace(/\/index\.html$/,'/');
  const storageKey='ainimation:panel-size:v1:'+encodeURIComponent(path)+':'+encodeURIComponent(scope)+':'+name+':'+dimension;
  function readSize(){
    try{const saved=JSON.parse(win.localStorage.getItem(storageKey)||'null');return saved?.version===1&&Number.isInteger(saved.size)&&saved.size>0&&saved.size<=32768?saved.size:null;}catch{return null;}
  }
  function saveSize(){try{if(selected>0)win.localStorage.setItem(storageKey,JSON.stringify({version:1,size:selected}));}catch{}}
  function clearSize(){try{win.localStorage.removeItem(storageKey);}catch{}}
  let selected=readSize(),drag=null,stopped=false;
  handle.className='ain-panel-resize ain-panel-resize-'+edge;
  handle.tabIndex=0;handle.setAttribute('role','separator');
  handle.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  handle.setAttribute('aria-controls',panel.id);
  handle.dataset.panelResize=name;
  panel.append(handle);
  function bounds(){
    const max=Math.max(0,Math.floor(vertical?win.innerWidth-16:win.innerHeight-Math.max(0,getTop())-8));
    const minimum=Number.isFinite(minSize)&&minSize>0?minSize:vertical?220:160;
    return {min:Math.min(minimum,max),max};
  }
  function clamp(value){const {min,max}=bounds();return Math.round(Math.max(min,Math.min(max,value)));}
  function current(){return panel.getBoundingClientRect()[dimension]||selected||(vertical?360:380);}
  function translate(){
    const en=(win.AINLanguage?.read()||doc.documentElement.lang)==='en',label=(LABELS[name]||[name,name])[en?1:0];
    handle.setAttribute('aria-label',(en?'Resize ':'Redimensionar ')+label);
    handle.title=en?'Drag or use arrows to resize · double-click or Enter to reset':'Arrastra o usa las flechas · doble clic o Intro para restablecer';
  }
  function sync(){
    if(stopped)return;
    if(selected!==null)panel.style.setProperty(dimension,clamp(selected)+'px','important');
    const rect=panel.getBoundingClientRect(),{min,max}=bounds();
    handle.setAttribute('aria-valuemin',String(min));handle.setAttribute('aria-valuemax',String(max));
    const size=clamp(current());handle.setAttribute('aria-valuenow',String(size));handle.setAttribute('aria-valuetext',size+' px');
    if(!rect.width||!rect.height){finish();return;}
    Object.assign(handle.style,vertical?{
      left:(edge==='right'?rect.right-6:rect.left-6)+'px',top:rect.top+'px',width:'12px',height:rect.height+'px'
    }:{left:rect.left+'px',top:(rect.top-6)+'px',width:rect.width+'px',height:'12px'});
  }
  function apply(value,persist=true){selected=clamp(value);panel.style.setProperty(dimension,selected+'px','important');sync();if(persist)saveSize();}
  function finish(persist=true){
    if(!drag)return;
    const {id,changed}=drag;drag=null;
    try{if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);}catch{}
    handle.classList.remove('is-resizing');doc.documentElement.classList.remove('ain-panel-resizing');
    if(persist!==false&&changed)saveSize();
  }
  function down(event){
    if(event.button!==0||drag)return;
    event.preventDefault();handle.focus({preventScroll:true});
    drag={id:event.pointerId,position:vertical?event.clientX:event.clientY,size:current(),changed:false};
    try{handle.setPointerCapture(event.pointerId);}catch{}
    handle.classList.add('is-resizing');doc.documentElement.classList.add('ain-panel-resizing');
  }
  function move(event){
    if(!drag||event.pointerId!==drag.id)return;
    event.preventDefault();drag.changed=true;apply(drag.size+sign*((vertical?event.clientX:event.clientY)-drag.position),false);
  }
  function up(event){if(drag&&event.pointerId===drag.id)finish();}
  function reset(event){
    if(stopped)return;
    event.preventDefault();event.stopPropagation();finish(false);
    selected=null;
    clearSize();
    // Remove our override: each surface keeps its responsive CSS default.
    panel.style.setProperty(dimension,original.value,original.priority);
    sync();
  }
  function key(event){
    if(event.key==='Enter'){reset(event);return;}
    const directions=vertical?{ArrowLeft:-1,ArrowRight:1}:{ArrowUp:-1,ArrowDown:1};
    let value;
    if(event.key==='Home')value=bounds().min;
    else if(event.key==='End')value=bounds().max;
    else if(Object.hasOwn(directions,event.key))value=current()+directions[event.key]*sign*(event.shiftKey?64:16);
    else return;
    event.preventDefault();event.stopPropagation();apply(value);
  }
  handle.addEventListener('pointerdown',down);
  // Capture keeps the drag working over preview iframes; window listeners also
  // cover browsers that decline capture or cancel a touch gesture.
  win.addEventListener('pointermove',move,{passive:false});win.addEventListener('pointerup',up);win.addEventListener('pointercancel',up);
  handle.addEventListener('lostpointercapture',finish);handle.addEventListener('keydown',key);
  handle.addEventListener('dblclick',reset);
  win.addEventListener('blur',finish);win.addEventListener('resize',sync);doc.addEventListener('scroll',sync,true);
  win.addEventListener('ainimation:language',translate);
  const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(sync):null;resize?.observe(panel);
  const observer=new win.MutationObserver(sync);
  observer.observe(panel,{attributes:true,attributeFilter:['hidden','class']});
  observer.observe(doc.body,{attributes:true,attributeFilter:['class']});
  const languageObserver=new win.MutationObserver(translate);languageObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();sync();
  const api={handle,sync,destroy(){
    stopped=true;finish();resize?.disconnect();observer.disconnect();languageObserver.disconnect();
    handle.removeEventListener('pointerdown',down);handle.removeEventListener('lostpointercapture',finish);handle.removeEventListener('keydown',key);
    handle.removeEventListener('dblclick',reset);
    win.removeEventListener('pointermove',move);win.removeEventListener('pointerup',up);win.removeEventListener('pointercancel',up);
    win.removeEventListener('blur',finish);win.removeEventListener('resize',sync);doc.removeEventListener('scroll',sync,true);win.removeEventListener('ainimation:language',translate);
    panel.style.setProperty(dimension,original.value,original.priority);handle.remove();delete panel[KEY];
  }};
  return panel[KEY]=api;
}
