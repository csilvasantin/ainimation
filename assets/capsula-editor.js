/* Capsule authoring keeps its editable source separate from the flattened MP4.
 * Preview on this page is a composition study; only server stills are v5.7 renders. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('mode') !== 'capsula') return;
  // Local harness configuration is ignored on hosted pages.
  const localConfig = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) ? (window.ainCapsulaLocal || {}) : {};
  const API = localConfig.api || 'https://api.admira.store';
  const AUTH_ORIGIN = 'https://www.pixeria.com';
  let authToken = localConfig.token || '', authExpiresAt = localConfig.token ? Infinity : 0;
  function connectSession() {
    if (authToken && authExpiresAt > Date.now()+30000) return Promise.resolve(authToken);
    const state = crypto.randomUUID().replace(/-/g,'');
    const popup = window.open(`${AUTH_ORIGIN}/auth/bridge?origin=${encodeURIComponent(location.origin)}&state=${state}`, 'ainimation-session', 'width=520,height=660');
    if (!popup) return Promise.reject(new Error('Permite la ventana de Pixeria para conectar tu sesión.'));
    notify('Conecta tu sesión de Pixeria en la ventana de acceso.');
    return new Promise((resolve,reject)=>{
      const finish=(error,token)=>{clearTimeout(timer);clearInterval(closed);window.removeEventListener('message',receive);try{popup.close();}catch{};error?reject(error):resolve(token);};
      const receive=event=>{const d=event.data;if(event.origin!==AUTH_ORIGIN||event.source!==popup||d?.type!=='ainimation:auth'||d.state!==state)return;
        if(typeof d.token!=='string'||d.token.length>4096||!Number.isFinite(d.expiresAt)||d.expiresAt<=Date.now()+30000)return finish(new Error('La sesión de Pixeria ha caducado.'));
        authToken=d.token;authExpiresAt=d.expiresAt;finish(null,authToken);};
      window.addEventListener('message',receive);
      const timer=setTimeout(()=>finish(new Error('No se completó el acceso. Vuelve a guardar para reintentarlo.')),120000);
      const closed=setInterval(()=>{if(popup.closed)finish(new Error('Acceso cancelado. El borrador sigue en este navegador.'));},500);
    });
  }
  const stockId = params.get('admiraStockId') || '';
  const fields = [['titulo', 'Titular', 160], ['tipologia', 'Tipología', 60], ['gancho', 'Gancho', 160], ['giro', 'Giro', 160], ['remate', 'Remate', 160]];
  const beats = ['gancho', 'giro', 'remate'];
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const http = (value) => { try { const u = new URL(value, location.href); return /https?:/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const label = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  let capsule, history = [], phase = 0, second = 1, orientation = 'horizontal', dirty = false, activeField = 'giro', savedSelection = null, ticker = null;
  let savePending = null, previewPending = false;
  let renderResult = null, lastQueuedSignature = '', stockItems = [], uploadBusy = false, etag = '', reviews = [], previewPoll = null, watchedRenderId = '', totalSeconds = 12, bodyStart = 0, bodyEnd = 12;
  const root = document.createElement('div');
  root.id = 'capsulaEditor';
  root.innerHTML = `<header class="ce-header"><a class="ce-brand" href="studio.html"><span>AI</span>nimation <small>STUDIO</small></a><span class="ce-divider"></span><a class="ce-back" href="https://www.admira.studio/stock">← Stock</a><div class="ce-header-end"><span class="ce-state" data-save-state>Conectando con Stock</span><button class="ce-btn" data-save disabled>Guardar borrador</button></div></header>
    <main class="ce-main"><div class="ce-heading"><div><p class="ce-eyebrow">EDITOR DE CÁPSULAS · PLANTILLA v5.7</p><h1 data-title>Abriendo cápsula…</h1><p data-subtitle>Recuperando textos, media e historial.</p></div><span class="ce-draft-badge" data-version>BORRADOR</span></div>
    <nav class="ce-phases" aria-label="Fases de edición">${['Textos','Media','Tiempos'].map((name,i)=>`<button type="button" data-phase="${i}" aria-current="${i===0?'step':'false'}"><span>${i+1}</span><strong>${name}</strong><small>${['Escribe con intención','Elige qué se ve','Encuentra el ritmo'][i]}</small></button>`).join('')}</nav>
    <p class="ce-notice" role="status" data-notice>Cargando la fuente editable…</p>
    <div class="ce-workspace" hidden><section class="ce-controls" aria-label="Edición de cápsula"><div data-phase-panel="0"><div class="ce-panel-title"><h2>Las palabras, primero.</h2><span>01 / 03</span></div><p class="ce-muted">Selecciona una frase y aplica un estilo de la plantilla.</p><div class="ce-stylebar" role="toolbar" aria-label="Estilos de texto"><button type="button" data-style="normal">Normal</button><button type="button" data-style="enfasis"><b>Énfasis</b></button><button type="button" data-style="cifra"><strong>123</strong> Cifra</button></div><div data-text-fields></div><label class="ce-field"><span>Fuente · crédito visible</span><input data-source-text maxlength="160"></label><label class="ce-field"><span>Enlace de la fuente</span><input data-source-url type="url" placeholder="https://…"></label><p class="ce-small">La tipografía y los tamaños pertenecen a la plantilla. El render final comprueba los saltos de línea.</p></div>
    <div data-phase-panel="1" hidden><div class="ce-panel-title"><h2>Deja que se vea.</h2><span>02 / 03</span></div><p class="ce-muted">El vídeo base cubre toda la pieza. Añade apoyos con su crédito y su intervalo.</p><div class="ce-media-actions"><button class="ce-btn" data-open-stock>+ Desde Stock</button><label class="ce-btn">↑ Subir media<input type="file" data-upload accept="image/*,video/mp4,video/webm" hidden></label></div><p class="ce-small" data-upload-state>La subida crea un asset en Stock; la cápsula sigue en borrador.</p><div data-media-list></div></div>
    <div data-phase-panel="2" hidden><div class="ce-panel-title"><h2>Cada segundo cuenta.</h2><span>03 / 03</span></div><p class="ce-muted">Arrastra los extremos de cada tramo o escribe los segundos exactos.</p><label class="ce-field ce-duration"><span>Duración de la cápsula</span><output data-duration></output></label><div data-time-inputs></div><p class="ce-small">Los intervalos están en segundos de la cápsula. Mantén el orden gancho → giro → remate.</p></div>
    <footer class="ce-controls-footer"><button class="ce-btn" data-previous>← Anterior</button><button class="ce-btn ce-btn-primary" data-next>Continuar →</button></footer></section>
    <section class="ce-preview-area" aria-label="Vista previa"><div class="ce-preview-toolbar"><span class="ce-eyebrow">COMPOSICIÓN · PREVIEW EN EL NAVEGADOR</span><div class="ce-segmented" aria-label="Orientación"><button data-orientation="horizontal" aria-pressed="true">16:9</button><button data-orientation="vertical" aria-pressed="false">9:16</button></div></div><div class="ce-stage-wrap"><div class="ce-stage" data-stage data-orientation="horizontal"><div class="ce-stage-backdrop"></div><div class="ce-stage-brand"><span class="ce-logo">admira<span>Connecting things</span></span><h2>¿Sabías que?</h2><p data-preview-tipologia></p></div><div class="ce-stage-media" data-preview-media></div><div class="ce-stage-copy"><h3 data-preview-title></h3><p data-preview-line></p><small data-preview-source></small></div><div class="ce-stage-progress"></div></div></div><div class="ce-playback"><button data-play class="ce-play-button" aria-label="Reproducir composición">▶</button><input data-scrub aria-label="Instante de la composición" type="range" min="0" max="12" step="0.04" value="1"><output data-timecode>01.00 / 12.00 s</output></div><div class="ce-score"><div class="ce-score-title"><strong>Score</strong><span>25 fps · segundos</span></div><div data-score></div></div><p class="ce-preview-note">Estudio de composición. La animación, tipografía y recorte definitivos se revisan en el render v5.7.</p><div class="ce-render-card"><div><h3>Revisar antes de publicar</h3><p>Guarda el borrador y pide un render con capturas. Cada fase conserva su propia revisión.</p></div><button class="ce-btn ce-btn-primary" data-render>Renderizar preview v5.7 ↗</button><div class="ce-render-result" data-render-result></div></div></section>
    <aside class="ce-history" aria-label="Versiones"><div class="ce-panel-title"><h2>Versiones</h2><span>↶</span></div><p class="ce-muted">La original sigue aquí.</p><div data-history></div><div class="ce-history-note"><strong>Tu siguiente versión</strong><p data-next-version>Se creará tras la revisión.</p><p>El original se conserva mientras revisas la nueva versión.</p></div><div data-reviews></div></aside></div></main>
    <dialog class="ce-stock-dialog"><form method="dialog" class="ce-dialog-heading"><div><p class="ce-eyebrow">BIBLIOTECA</p><h2>Elige media del Stock</h2></div><button class="ce-btn" aria-label="Cerrar selector de Stock">×</button></form><div class="ce-stock-filters"><input type="search" data-stock-search placeholder="Buscar por título o crédito" aria-label="Buscar en Stock"><select data-stock-filter aria-label="Tipo de media"><option value="">Imágenes y vídeos</option value="image">Imágenes</option><option value="video">Vídeos</option></select><button class="ce-btn" data-reload-stock>Recargar</button></div><div data-stock-results class="ce-stock-grid"></div></dialog>`;
  document.body.classList.remove('director-focus','studio-page');
  document.body.classList.add('capsula-mode');
  root.addEventListener('keydown',event=>event.stopPropagation());
  document.documentElement.lang = 'es';
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  function notify(message, error = false) { $('[data-notice]').textContent = message; $('[data-notice]').classList.toggle('is-error', error); }
  async function request(path, options = {}) {
    const controller = new AbortController();let timer;
    try {
      const token = options.method && options.method !== 'GET' ? await connectSession() : '';
      timer=setTimeout(() => controller.abort(),45000);
      const res = await fetch(`${API}${path}`, {...options, signal: controller.signal, headers: {Accept:'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token?{Authorization:`Bearer ${token}`} : {}), ...options.headers}});
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        if(res.status===401){authToken='';authExpiresAt=0;}
        const error=new Error(res.status===412?'Otro cambio ha actualizado este borrador. Recarga antes de guardar.':(body.errors?.join(', ')||body.error||body.message||`HTTP ${res.status}`));
        error.status=res.status;throw error;
      }
      if(path.startsWith('/stock/capsula/'))etag=res.headers.get('ETag')||etag;
      return body;
    } catch (error) { if (error.name === 'AbortError') throw new Error('El servidor no respondió a tiempo. El borrador local sigue disponible.'); throw error; }
    finally { clearTimeout(timer); }
  }
  function duration() { return totalSeconds; }
  function rangeFor(name) {
    const value = capsule.tiempos?.[name];
    const pair = Array.isArray(value) ? value : (value?.linea_t || value?.t || [value?.inicio ?? value?.start, value?.fin ?? value?.end]);
    const defaults = {gancho:[0,3.05],giro:[3.05,8.73],remate:[8.73,duration()]};
    return pair?.length === 2 && pair.every(n => Number.isFinite(Number(n))) ? pair.map(Number) : defaults[name];
  }
  function cacheDraft() { try { localStorage.setItem(`ainimation-capsula-${stockId}`, JSON.stringify({capsula:capsule, savedAt:Date.now()})); } catch {} }
  function changed() { watchedRenderId='';clearTimeout(previewPoll);dirty = true; renderResult = null; cacheDraft(); $('[data-save-state]').textContent = 'Cambios sin guardar'; $('[data-save-state]').classList.add('is-dirty'); $('[data-render-result]').textContent = ''; updatePreview(); }
  function styledHTML(name, text) {
    const marks = (capsule.spans || []).filter(s => s.campo === name && ['cifra','enfasis'].includes(s.estilo));
    const points = new Set([0, text.length]);
    marks.forEach(s => { points.add(Math.max(0,Math.min(text.length,s.ini))); points.add(Math.max(0,Math.min(text.length,s.fin))); });
    const indices = [...points].sort((a,b)=>a-b);
    return indices.slice(0,-1).map((start,i) => { const end=indices[i+1], mark=marks.find(s=>s.ini<=start&&s.fin>=end); return mark ? `<span data-ce-style="${mark.estilo}" class="ce-text-${mark.estilo}">${esc(text.slice(start,end))}</span>` : esc(text.slice(start,end)); }).join('');
  }
  function extractRuns(el) {
    let text = '', spans = [];
    const visit = (node, style) => {
      if (node.nodeType === 3) { const ini=text.length; text+=node.textContent.replace(/\u00a0/g,' '); if(style&&text.length>ini)spans.push({ini,fin:text.length,estilo:style}); return; }
      if (node.nodeType !== 1) return;
      if (node.tagName === 'BR') { text += '\n'; return; }
      const own = ['cifra','enfasis'].includes(node.dataset.ceStyle) ? node.dataset.ceStyle : style;
      [...node.childNodes].forEach(n=>visit(n,own));
      if (['DIV','P'].includes(node.tagName) && node !== el && node.nextSibling) text+='\n';
    };
    visit(el,null);
    return {text,spans};
  }
  function syncField(el) {
    const name=el.dataset.textField, {text,spans}=extractRuns(el);
    capsule.textos[name]=text;
    capsule.spans=[...(capsule.spans||[]).filter(s=>s.campo!==name),...spans.map(s=>({...s,campo:name}))];
    const max=fields.find(f=>f[0]===name)[2], count=el.closest('.ce-field').querySelector('[data-count]');
    count.textContent=`${text.length} / ${max}`; count.classList.toggle('is-over',text.length>max); el.setAttribute('aria-invalid',String(text.length>max));
    changed();
  }
  function renderTextFields() {
    $('[data-text-fields]').innerHTML=fields.map(([name,title,max])=>`<label class="ce-field"><span>${title}<small data-count>${(capsule.textos[name]||'').length} / ${max}</small></span><div class="ce-rich-input" data-text-field="${name}" contenteditable="true" role="textbox" aria-label="${title}" aria-multiline="true" spellcheck="true">${styledHTML(name,capsule.textos[name]||'')}</div></label>`).join('');
    $('[data-source-text]').value=capsule.textos.fuente?.texto||''; $('[data-source-url]').value=capsule.textos.fuente?.url||'';
    $$('[data-text-field]').forEach(el=>{
      el.addEventListener('focus',()=>{if(activeField!==el.dataset.textField)savedSelection=null;activeField=el.dataset.textField;});
      el.addEventListener('input',()=>syncField(el));
      el.addEventListener('mouseup',rememberSelection); el.addEventListener('keyup',rememberSelection);
      el.addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));syncField(el);});
      el.addEventListener('drop',event=>event.preventDefault());
      el.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&['b','i','u'].includes(event.key.toLowerCase()))event.preventDefault();});
    });
  }
  function rememberSelection() {
    savedSelection=null;
    const selection=window.getSelection(); if(!selection.rangeCount)return;
    const range=selection.getRangeAt(0), el=$(`[data-text-field="${activeField}"]`);
    if(el?.contains(range.commonAncestorContainer)) savedSelection=range.cloneRange();
  }
  function applyStyle(style) {
    const el=$(`[data-text-field="${activeField}"]`); if(!el||!savedSelection||savedSelection.collapsed||!el.contains(savedSelection.commonAncestorContainer))return notify('Selecciona primero las palabras que quieres destacar.');
    const pre=document.createRange();pre.selectNodeContents(el);pre.setEnd(savedSelection.startContainer,savedSelection.startOffset);
    const start=pre.toString().length, end=start+savedSelection.toString().length, text=capsule.textos[activeField]||'';
    const existing=(capsule.spans||[]).filter(s=>s.campo===activeField), kept=[];
    existing.forEach(s=>{if(s.fin<=start||s.ini>=end)kept.push(s);else{if(s.ini<start)kept.push({...s,fin:start});if(s.fin>end)kept.push({...s,ini:end});}});
    if(style!=='normal')kept.push({campo:activeField,ini:start,fin:end,estilo:style});
    capsule.spans=[...(capsule.spans||[]).filter(s=>s.campo!==activeField),...kept];
    el.innerHTML=styledHTML(activeField,text);savedSelection=null;changed();notify('Estilo de plantilla aplicado.');
  }
  function activeBeat() { return beats.find(name=>{const [a,b]=rangeFor(name);return second>=a&&second<b;})||''; }
  function updatePreview() {
    if(!capsule)return;
    $('[data-title]').textContent=capsule.textos.titulo||'¿Sabías que?';
    const stage=$('[data-stage]'), main=capsule.media.find(m=>m.role==='background')||capsule.media[0];
    const visible=capsule.media.filter(m=>m!==main&&second>=Number(m.t?.[0]||0)&&second<Number(m.t?.[1]??duration()));
    const signature=JSON.stringify([main,visible]);
    if($('[data-preview-media]').dataset.signature!==signature){
      $('[data-preview-media]').dataset.signature=signature;
      $('[data-preview-media]').innerHTML=[...(main?[main]:[]),...visible].map((m,i)=>{const src=http(m.src);return src?`<${m.tipo==='video'?'video':'img'} src="${esc(src)}" ${m.tipo==='video'?'muted loop playsinline preload="metadata"':''} alt="${esc(m.credito||'Media de la cápsula')}" class="${i?'ce-overlay-media':'ce-base-media'}" style="object-position:${Math.round((m.recorte?.w<1?m.recorte.x/(1-m.recorte.w):.5)*100)}% ${Math.round((m.recorte?.h<1?m.recorte.y/(1-m.recorte.h):.5)*100)}%">`:'';}).join('')||'<div class="ce-no-media">Añade media para componer la cápsula.</div>';
    }
    $$('[data-preview-media] video').forEach(video=>{const m=capsule.media.find(v=>http(v.src)===video.src),offset=Math.max(0,second-Number(m?.t?.[0]||0)); if(video.readyState&&Math.abs(video.currentTime-offset)>.35)try{video.currentTime=offset%Math.max(.1,video.duration||duration());}catch{} });
    $('[data-preview-title]').innerHTML=styledHTML('titulo',capsule.textos.titulo||'');
    $('[data-preview-tipologia]').textContent=capsule.textos.tipologia||capsule.saga?.tema||'';
    const beat=activeBeat(); $('[data-preview-line]').innerHTML=beat?styledHTML(beat,capsule.textos[beat]||''):'';
    $('[data-preview-line]').dataset.beat=beat;
    $('[data-preview-source]').textContent=capsule.textos.fuente?.texto||main?.credito||'';
    stage.style.setProperty('--ce-saga', /^#[\da-f]{6}$/i.test(capsule.saga?.color||'')?capsule.saga.color:'#65a2ff');
    stage.style.setProperty('--ce-progress',`${second/duration()*100}%`);
    stage.dataset.orientation=orientation;
    $('[data-timecode]').textContent=`${second.toFixed(2).padStart(5,'0')} / ${duration().toFixed(2)} s`;
    $('[data-scrub]').value=second; $('[data-scrub]').max=duration();
    $$('[data-score-beat]').forEach(row=>row.classList.toggle('is-active',row.dataset.scoreBeat===beat));
  }
  function setPhase(next) {
    phase=next;$$('[data-phase]').forEach((el,i)=>el.setAttribute('aria-current',i===phase?'step':'false'));
    $$('[data-phase-panel]').forEach((el,i)=>el.hidden=i!==phase);
    $('[data-previous]').disabled=phase===0;$('[data-next]').textContent=phase===2?'Revisar preview ↗':'Continuar →';
    if(capsule){updateReviews();const review=reviews.filter(r=>Number(r.phase||r.fase)===phase+1).at(-1);watchedRenderId=review?.renderId||'';if(review?.renderId){showRender(review);pollPreview(capsule.ref,review.renderId);}else{clearTimeout(previewPoll);$('[data-render-result]').textContent='';}}
  }
  function renderMedia() {
    $('[data-media-list]').innerHTML=capsule.media.map((m,i)=>`<article class="ce-media-item" data-media-index="${i}"><div class="ce-media-item-top">${m.tipo==='video'?'<span class="ce-media-icon">▸</span>':`<img src="${esc(http(m.src))}" alt="">`}<div><strong>${esc(m.nombre||m.credito||`Media ${i+1}`)}</strong><small>${i===0?'MEDIA BASE · TODA LA CÁPSULA':label(m.tipo||'Imagen')}</small></div><button class="ce-icon-btn" data-remove-media="${i}" aria-label="Quitar media ${i+1}">×</button></div><label class="ce-field"><span>Crédito obligatorio</span><input data-media-credit="${i}" value="${esc(m.credito||'')}" required></label><div class="ce-input-pair"><label>Desde (s)<input type="number" step="0.04" min="0" max="${duration()}" data-media-start="${i}" value="${m.t?.[0]??0}" ${i===0?'disabled':''}></label><label>Hasta (s)<input type="number" step="0.04" min="0.04" max="${duration()}" data-media-end="${i}" value="${m.t?.[1]??duration()}" ${i===0?'disabled':''}></label></div><label class="ce-crop">Posición horizontal<input type="range" min="0" max="1" step="0.01" data-media-crop="${i}" value="${m.recorte?.w<1?m.recorte.x/(1-m.recorte.w):.5}"></label><label class="ce-crop">Zoom<input type="range" min="1" max="3" step="0.05" data-media-zoom="${i}" value="${1/(m.recorte?.w||1)}"></label></article>`).join('')||'<p class="ce-empty">Tu media aparecerá aquí.</p>';
    $$('[data-remove-media]').forEach(el=>el.addEventListener('click',()=>{capsule.media.splice(Number(el.dataset.removeMedia),1);if(capsule.media[0]){capsule.media[0].t=[0,duration()];capsule.media[0].role='background';}changed();renderMedia();}));
    $$('[data-media-credit]').forEach(el=>el.addEventListener('input',()=>{capsule.media[Number(el.dataset.mediaCredit)].credito=el.value;changed();}));
    for(const side of ['start','end'])$$(`[data-media-${side}]`).forEach(el=>el.addEventListener('change',()=>{const m=capsule.media[Number(el.dataset[side==='start'?'mediaStart':'mediaEnd'])];m.t=m.t||[0,duration()];const n=Number(el.value);m.t[side==='start'?0:1]=Math.max(0,Math.min(duration(),n));changed();renderMedia();}));
    $$('[data-media-zoom]').forEach(el=>el.addEventListener('change',()=>{const m=capsule.media[Number(el.dataset.mediaZoom)],w=1/Number(el.value);m.recorte={x:(1-w)/2,y:(1-w)/2,w,h:w};changed();renderMedia();}));
    $$('[data-media-crop]').forEach(el=>el.addEventListener('input',()=>{const m=capsule.media[Number(el.dataset.mediaCrop)];const c=m.recorte||{x:0,y:0,w:1,h:1};m.recorte={...c,x:Number(el.value)*(1-c.w)};changed();}));
  }
  function changeBoundary(name,side,value) {
    const index=beats.indexOf(name), next=side===0?index:index+1;
    if(next===0||next===3)return;
    const left=rangeFor(beats[next-1]),right=rangeFor(beats[next]);
    const v=Math.max(left[0]+.04,Math.min(right[1]-.04,Math.round(value*25)/25));
    capsule.tiempos[beats[next-1]]=[left[0],v];capsule.tiempos[beats[next]]=[v,right[1]];
    second=v;changed();
  }
  function renderTimes() {
    $('[data-duration]').textContent=`${duration()} s`;
    $('[data-time-inputs]').innerHTML=beats.map(name=>{const [a,b]=rangeFor(name);return `<div class="ce-beat-input"><strong><i data-beat-color="${name}"></i>${label(name)}</strong><div class="ce-input-pair"><label>Entrada (s)<input type="number" min="0" max="${duration()}" step="0.04" data-beat="${name}" data-side="0" aria-label="${label(name)} entrada" value="${a}" ${name==='gancho'?'disabled':''}></label><label>Salida (s)<input type="number" min="0" max="${duration()}" step="0.04" data-beat="${name}" data-side="1" aria-label="${label(name)} salida" value="${b}" ${name==='remate'?'disabled':''}></label></div></div>`;}).join('');
    $('[data-score]').innerHTML=`<div class="ce-score-ruler">${Array.from({length:7},(_,i)=>`<span>${(i*duration()/6).toFixed(0)}</span>`).join('')}</div>`+beats.map(name=>{const [a,b]=rangeFor(name);return `<div class="ce-score-row" data-score-beat="${name}"><span>${label(name)}</span><div class="ce-score-track" data-track="${name}"><div class="ce-score-clip" data-beat-color="${name}" style="left:${a/duration()*100}%;width:${(b-a)/duration()*100}%"><button class="ce-handle" data-handle="0" aria-label="Arrastrar entrada de ${name}"></button><small>${a.toFixed(2)}–${b.toFixed(2)}</small><button class="ce-handle" data-handle="1" aria-label="Arrastrar salida de ${name}"></button></div></div></div>`;}).join('');
    $$('[data-beat]').forEach(el=>el.addEventListener('change',()=>{const name=el.dataset.beat,r=rangeFor(name),side=Number(el.dataset.side),v=Number(el.value);changeBoundary(name,side,v);renderTimes();}));
    $$('[data-handle]').forEach(handle=>handle.addEventListener('pointerdown',event=>{
      event.preventDefault();setPhase(2);const track=handle.closest('[data-track]'), name=track.dataset.track,side=Number(handle.dataset.handle),rect=track.getBoundingClientRect(),r=rangeFor(name);handle.setPointerCapture(event.pointerId);
      const move=e=>{changeBoundary(name,side,(e.clientX-rect.left)/rect.width*duration());const now=rangeFor(name),clip=handle.parentElement;clip.style.left=`${now[0]/duration()*100}%`;clip.style.width=`${(now[1]-now[0])/duration()*100}%`;clip.querySelector('small').textContent=`${now[0].toFixed(2)}–${now[1].toFixed(2)}`;};
      const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);renderTimes();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    })); updatePreview();
  }
  function updateHistory() {
    $('[data-version]').textContent=`v${capsule.version||1} · BORRADOR`;
    $('[data-next-version]').textContent=`v${Number(capsule.version||1)+1} · pendiente de render y revisión`;
    const rows=history.length?history:[{id:stockId,version:capsule.version||1,title:'Versión abierta'}];
    $('[data-history]').innerHTML=rows.map((row,i)=>`<article class="ce-history-item ${String(row.id)===stockId?'is-current':''}"><span class="ce-version-dot"></span><div><strong>v${esc(row.version||row.capsuleVersion||i+1)} ${row.oculto?'<small>Archivada</small>':''}</strong><p>${esc(row.title||row.titulo||'Cápsula conservada')}</p>${http(row.url)?`<a href="${esc(http(row.url))}" target="_blank" rel="noopener">Ver vídeo ↗</a>`:''}${row.id&&String(row.id)!==stockId?`<a href="studio.html?mode=capsula&admiraStockId=${encodeURIComponent(row.id)}">Abrir versión ↗</a>`:''}</div></article>`).join('');
  }
  function updateReviews() {

    $('[data-reviews]').innerHTML='<h3 class="ce-reviews-heading">Previews por fase</h3>'+['Textos','Media','Tiempos'].map((name,i)=>{const review=reviews.filter(r=>Number(r.phase||r.fase)===i+1).at(-1);return `<p class="ce-review-line"><span>${review?'●':'○'}</span>${name}<small>${review?(review.status==='preview_ready'?'Listo':review.status==='error'?'Error':'En cola'):'Pendiente'}</small></p>`;}).join('');
  }
  function validate() {
    for(const [name,title,max] of fields){if(!String(capsule.textos[name]||'').trim())return `Completa «${title}».`;if(capsule.textos[name].length>max)return `Acorta «${title}» a ${max} caracteres.`;}
    if(!capsule.media.length)return 'Añade al menos una imagen o vídeo.';
    for(const m of capsule.media){if(!m.credito?.trim())return 'Cada media necesita un crédito.';if(!http(m.src))return 'La media necesita una URL HTTPS o HTTP accesible.';if(!Array.isArray(m.t)||m.t[0]<0||m.t[1]>duration()||m.t[1]<=m.t[0])return 'Revisa los intervalos de la media.';}
    let end=bodyStart;for(const name of beats){const [a,b]=rangeFor(name);if(Math.abs(a-end)>.011||a<0||b<=a||b>duration())return 'Revisa el Score: los tramos deben tener duración positiva, estar ordenados y no solaparse.';end=b;}
    return '';
  }
  function save() {
    if(savePending)return savePending;
    savePending=saveDraft().finally(()=>{savePending=null;});
    return savePending;
  }
  async function saveDraft() {
    if(!capsule)return false;
    const error=validate();if(error){notify(error,true);return false;}
    const snapshot=JSON.stringify(capsule);
    const button=$('[data-save]');button.disabled=true;button.textContent='Guardando…';
    try {const data=await request(`/stock/capsula/${encodeURIComponent(stockId)}`,{method:'PUT',headers:etag?{'If-Match':etag}:{},body:snapshot});if(JSON.stringify(capsule)!==snapshot){cacheDraft();notify('Se guardó la revisión anterior. Guarda de nuevo los cambios más recientes.');return false;}if(data.capsula)capsule=data.capsula;dirty=false;cacheDraft();$('[data-save-state]').textContent='Borrador guardado en Stock';$('[data-save-state]').classList.remove('is-dirty');notify('Borrador guardado. Puedes preparar el preview de esta fase.');return true;}
    catch(error){notify(`No se ha guardado en Stock: ${error.message}`,true);return false;}
    finally{button.disabled=false;button.textContent='Guardar borrador';}
  }
  function showRender(data) {
    const job=data.job||data, formats=job.preview?.orientaciones||{};
    $('[data-render-result]').innerHTML=`<p>${job.status==='preview_ready'?'Preview v5.7 listo':job.status==='error'?'Error de render':'Preview en cola'} · fase ${job.phase||phase+1}. ${esc(job.error||'')}</p>`+Object.entries(formats).map(([name,v])=>`<p>${esc(name==='vertical'?'9:16':'16:9')} · <a href="${esc(http(v.url))}" target="_blank" rel="noopener">Ver vídeo ↗</a></p>${(v.stills||[]).map(s=>{const url=http(typeof s==='string'?s:s.url);return `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Captura del render v5.7 ${esc(name)}"></a>`;}).join('')}`).join('');
  }
  async function pollPreview(ref,renderId) {
    if(renderId!==watchedRenderId)return;
    clearTimeout(previewPoll);
    try {
      const data=await request(`/capsula/url/estado?ref=${encodeURIComponent(ref)}&renderId=${encodeURIComponent(renderId)}`);
      if(renderId!==watchedRenderId)return;
      renderResult=data;const job=data.job||{};showRender(data);
      const review=reviews.find(r=>r.renderId===renderId);if(review)Object.assign(review,job);updateReviews();
      if(job.status==='preview_ready'){notify('Preview v5.7 listo. Revisa los vídeos y capturas de ambos formatos.');return;}
      if(job.status==='error'){notify(`El render falló: ${job.error||'reintenta el preview'}`,true);return;}
    }catch(error){if(renderId!==watchedRenderId)return;notify(`No se pudo consultar el render: ${error.message}`,true);}
    previewPoll=setTimeout(()=>pollPreview(ref,renderId),5000);
  }
  async function queuePreview() {
    if(!capsule||uploadBusy||previewPending)return;
    previewPending=true;
    const reviewPhase=phase+1;
    try { if(!await save())return;
    if(dirty)return notify('Guarda los cambios recientes antes de pedir el preview.',true);
    const source=http(capsule.origen?.url||capsule.textos.fuente?.url);
    if(!source)return notify('Falta el enlace de origen de la cápsula.',true);
    const button=$('[data-render]');button.disabled=true;button.textContent='Encolando preview…';
    try {
      const signature=JSON.stringify(capsule),data=await request('/capsula/url/encargar',{method:'POST',body:JSON.stringify({url:source,capsula:clone(capsule),phase:reviewPhase,capsuleVersion:Number(capsule.version||1)+1,previewOnly:true})});
      renderResult=data;lastQueuedSignature=signature;
      const job=data.job||{};reviews.push({...job,phase:reviewPhase,ref:data.ref,fecha:new Date().toISOString()});updateReviews();
      if(JSON.stringify(capsule)!==signature){renderResult=null;notify('El preview corresponde a la edición anterior. Guarda los cambios recientes para solicitar otro.');return;}
      showRender(data);
      notify('Preview encolado. Conserva los originales y espera las capturas del render.');
      window.dispatchEvent(new CustomEvent('ain:capsula-preview',{detail:{fase:reviewPhase,result:data}}));
      if(job.renderId){watchedRenderId=job.renderId;pollPreview(data.ref,job.renderId);}
    }catch(error){notify(`No se pudo solicitar el preview: ${error.message}`,true);}
    finally{button.disabled=false;button.textContent='Renderizar preview v5.7 ↗';}
    } finally {previewPending=false;}
  }
  async function loadStock() {
    $('[data-stock-results]').innerHTML='<p>Cargando Stock…</p>';
    try{const q=$('[data-stock-search]').value,type=$('[data-stock-filter]').value;const data=await request('/stock/list?limit=200'+(q?'&q='+encodeURIComponent(q):'')+(type?'&type='+type:''));stockItems=(data.items||data.stock||data.results||[]).filter(item=>['image','video','animation'].includes(item.type)||/^(image|video)\//.test(item.mime||''));renderStock();}
    catch(error){$('[data-stock-results]').textContent=`No se pudo cargar Stock: ${error.message}`;}
  }
  function renderStock() {
    const q=$('[data-stock-search]').value.toLowerCase(),type=$('[data-stock-filter]').value;
    const items=stockItems.filter(item=>(!type||(type==='video'?['video','animation'].includes(item.type):item.type===type))&&`${item.title||''} ${item.prompt||''} ${item.credit||''}`.toLowerCase().includes(q));
    $('[data-stock-results]').innerHTML=items.map(item=>`<button class="ce-stock-choice" data-add-stock="${esc(item.id)}">${http(item.thumbnail||item.poster||(['image'].includes(item.type)?item.url:''))?`<img loading="lazy" src="${esc(http(item.thumbnail||item.poster||item.url))}" alt="">`:'<span class="ce-stock-placeholder">▸</span>'}<strong>${esc(item.title||item.prompt||'Media del Stock').slice(0,95)}</strong><small>${esc(item.type)} · #${esc(item.num||item.id)}</small></button>`).join('')||'<p>No hay media que coincida con esta búsqueda.</p>';
    $$('[data-add-stock]').forEach(button=>button.addEventListener('click',()=>{const item=stockItems.find(it=>String(it.id)===button.dataset.addStock);if(!item||!http(item.url))return;capsule.media.push({id:`media-${Date.now()}`,role:capsule.media.length?'overlay':'background',tipo:item.type==='image'?'image':'video',src:http(item.url),stockId:item.id,t:[0,duration()],credito:item.credit||item.credito||'',nombre:item.title||'Media del Stock',recorte:{x:0,y:0,w:1,h:1}});changed();renderMedia();$('[data-media-list] .ce-media-item:last-child input[data-media-credit]')?.focus();$('.ce-stock-dialog').close();notify('Media añadida. Completa o confirma el crédito antes de guardar.');}));
  }
  async function upload(file) {
    if(!file)return;if(!/^(image|video)\//.test(file.type))return notify('Selecciona una imagen o vídeo.',true);
    if(file.size>40*1024*1024)return notify('La subida admite hasta 40 MB por asset.',true);
    const connection=connectSession();
    uploadBusy=true;$('[data-upload-state]').textContent=`Subiendo ${file.name}…`;
    try{
      await connection;
      const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
      const data=await request('/stock/publish',{method:'POST',body:JSON.stringify({type:file.type.startsWith('video')?'video':'image',title:file.name,mime:file.type,base64,origin:'ainimation',motor:'ainimation-capsula-media'})});
      const item=data.item||data.asset||data;const src=http(item.url||data.url);if(!src)throw new Error('Stock no devolvió una URL para la media.');
      capsule.media.push({id:`media-${Date.now()}`,role:capsule.media.length?'overlay':'background',tipo:file.type.startsWith('video')?'video':'image',src,stockId:item.id||data.id,t:[0,duration()],credito:'',nombre:file.name,recorte:{x:0,y:0,w:1,h:1}});changed();renderMedia();$('[data-upload-state]').textContent='Media subida al Stock. Añade su crédito.';
    }catch(error){$('[data-upload-state]').textContent=`La subida falló: ${error.message}`;notify('No se añadió media: la subida no terminó.',true);}
    finally{uploadBusy=false;$('[data-upload]').value='';}
  }
  function togglePlay() {
    if(ticker){clearInterval(ticker);ticker=null;$('[data-play]').textContent='▶';$('[data-play]').setAttribute('aria-label','Reproducir composición');return;}
    let last=performance.now();ticker=setInterval(()=>{const now=performance.now();second=(second+(now-last)/1000)%duration();last=now;updatePreview();},40);$('[data-play]').textContent='Ⅱ';$('[data-play]').setAttribute('aria-label','Pausar composición');
  }
  async function boot() {
    if(!stockId){notify('Falta el identificador del Stock. Abre una cápsula desde su botón AI.',true);return;}
    try {
      const data=await request(`/stock/capsula/${encodeURIComponent(stockId)}`);if(!data.capsula||data.capsula.schema!=='capsula/1')throw new Error('Esta pieza todavía no tiene una fuente capsula/1 editable.');
      capsule=clone(data.capsula);history=data.history||[];reviews=(data.reviews||[]).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));bodyStart=Number(capsule.tiempos.gancho[0]);bodyEnd=Number(capsule.tiempos.remate[1]);totalSeconds=bodyEnd+(capsule.cartelas?.postroll?4:0);capsule.textos=capsule.textos||{};capsule.textos.fuente=capsule.textos.fuente||{};capsule.spans=capsule.spans||[];capsule.media=capsule.media||[];capsule.tiempos=capsule.tiempos||{};
      beats.forEach(name=>{capsule.tiempos[name]=rangeFor(name);});
      $('[data-title]').textContent=capsule.textos.titulo||'¿Sabías que?';$('[data-subtitle]').textContent=`Stock ${data.item?.num?'#'+data.item.num:stockId} · ${label(capsule.saga?.tema||'Cápsula')} · ${duration()} segundos`;
      $('.ce-workspace').hidden=false;$('[data-save]').disabled=false;$('[data-save-state]').textContent='Fuente editable cargada';
      renderTextFields();renderMedia();renderTimes();updateHistory();setPhase(0);updatePreview();
      notify('Empieza por los textos. Guarda y solicita un preview al terminar cada fase.');
      let stored;try{stored=JSON.parse(localStorage.getItem(`ainimation-capsula-${stockId}`)||'null');}catch{}
      if(stored?.capsula?.schema==='capsula/1'&&stored.capsula.parentId===stockId&&stored.capsula.ref===capsule.ref&&stored.capsula.version===capsule.version&&JSON.stringify(stored.capsula)!==JSON.stringify(capsule)){
        const button=document.createElement('button');button.className='ce-inline-button';button.textContent='Recuperar borrador de este navegador';button.addEventListener('click',()=>{capsule=stored.capsula;bodyStart=Number(capsule.tiempos.gancho[0]);bodyEnd=Number(capsule.tiempos.remate[1]);totalSeconds=bodyEnd+(capsule.cartelas?.postroll?4:0);changed();renderTextFields();renderMedia();renderTimes();updateHistory();button.remove();});$('[data-notice]').append(' ',button);
      }
    }catch(error){notify(`No se pudo abrir la cápsula: ${error.message}`,true);$('[data-title]').textContent='La fuente editable no está disponible';$('[data-subtitle]').textContent='La pieza del Stock se conserva. Reintenta cuando la fuente esté disponible.';$('[data-save-state]').textContent='Conexión pendiente';}
  }
  $$('[data-phase]').forEach(el=>el.addEventListener('click',()=>setPhase(Number(el.dataset.phase))));
  $$('[data-style]').forEach(el=>{el.addEventListener('mousedown',event=>event.preventDefault());el.addEventListener('click',()=>applyStyle(el.dataset.style));});
  $$('[data-orientation]').forEach(el=>el.addEventListener('click',()=>{orientation=el.dataset.orientation;$$('[data-orientation]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));updatePreview();}));
  $('[data-source-text]').addEventListener('input',event=>{capsule.textos.fuente.texto=event.target.value;changed();});
  $('[data-source-url]').addEventListener('input',event=>{capsule.textos.fuente.url=event.target.value;changed();});
  $('[data-save]').addEventListener('click',save);$('[data-render]').addEventListener('click',queuePreview);
  $('[data-previous]').addEventListener('click',()=>setPhase(Math.max(0,phase-1)));$('[data-next]').addEventListener('click',()=>phase<2?setPhase(phase+1):$('[data-render]').focus());
  $('[data-scrub]').addEventListener('input',event=>{second=Number(event.target.value);updatePreview();});$('[data-play]').addEventListener('click',togglePlay);
  $('[data-open-stock]').addEventListener('click',()=>{$('.ce-stock-dialog').showModal();loadStock();});$('[data-reload-stock]').addEventListener('click',loadStock);let searchTimer;$('[data-stock-search]').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadStock,300);});$('[data-stock-filter]').addEventListener('change',loadStock);
  $('[data-upload]').addEventListener('change',event=>upload(event.target.files[0]));
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.ainCapsula={getState:()=>({capsula:clone(capsule),phase,second,orientation,dirty,renderResult,lastQueuedSignature,reviews:clone(reviews)}),setPhase,save,queuePreview};
  boot();
})();
