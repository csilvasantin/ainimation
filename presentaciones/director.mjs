import {validatePresentation} from './contract.mjs';
const FILM = 'ainimation-film-plan', MARKERS = 'ainimation-timeline-markers';

function chunks(text) {
  const result = [];
  while (text.length > 420) {
    let split = text.lastIndexOf(' ', 420);
    if (split < 200) split = 420;
    result.push(text.slice(0, split)); text = text.slice(split);
  }
  if (text) result.push(text);
  return result.length ? result : [''];
}

export function toDirector(input) {
  const presentation = validatePresentation(input);
  const pages = presentation.slides.flatMap(slide => chunks([slide.message, slide.detail].filter(Boolean).join('\n\n'))
    .map((body, part, all) => ({...slide, body, part, parts: all.length})));
  const markers = pages.flatMap((p, i) => [{id:`presentation-${i}`, label:`P${i + 1}`, frame:i * 120 + 1},
    {id:`presentation-hold-${i}`, label:`H${i + 1}`, frame:(i + 1) * 120}]);
  const items = [], rules = [];
  pages.forEach((p, i) => {
    const startFrame = i * 120 + 1;
    const add = (key, text, x, y, w, h, fontSize, color='transparent', textColor='#ffffff', target) => {
      const item = {id:`p${i}-${key}`, spriteName:`p${i}-${key}`, type:'button', text, x,y,w,h,fontSize,color,textColor,
        startFrame, durationFrames:120, interactive:target !== undefined, radius:1};
      if (['title','body'].includes(key)) item.keyframes = [
        {frame:startFrame,x,y:y+3,w,h,opacity:1,rotation:0,easing:'ease-out'},
        {frame:startFrame+20,x,y,w,h,opacity:1,rotation:0,easing:'linear'}];
      items.push(item);
      if (target !== undefined) rules.push({id:`go-${item.id}`, name:text, enabled:true,
        when:{join:'and',conds:[{fact:'click',value:item.id}]},
        do:[{id:'goToMarker',value:`P${target+1}`},{id:'playSegment',value:`H${target+1}`}]});
    };
    add('background','',0,0,100,100,1,'#0b0b14');
    add('accent','',6,8,8,1,1,'#c3ff6b');
    add('chapter',`${p.chapter} · ${i+1}/${pages.length}`,6,12,87,6,1.5,'transparent','#c3ff6b');
    add('title',p.title,6,23,87,25,p.title.length>100?3:5);
    add('body',p.body,6,51,84,28,2.2,'transparent','#c9c7db');
    add('home','Inicio',6,88,22,7,1.7,'#222135','#ffffff',0);
    if(i>0)add('previous','Anterior',39,88,22,7,1.7,'#222135','#ffffff',i-1);
    if(i<pages.length-1)add('next','Continuar →',66,88,28,7,1.7,'#c3ff6b','#0b0b14',i+1);
    rules.push({id:`hold-${i}`,name:`Esperar · ${p.title}`,enabled:true,when:{join:'and',conds:[{fact:'markerReached',value:`H${i+1}`}]},do:[{id:'stop'}]});
  });
  return {title:presentation.title,format:'Landscape',duration:'90 segundos',genre:'Presentación interactiva',tone:'Claro',
    protagonist:'Audiencia',world:presentation.title,logline:'Importada del generador de AdmiraNeXT',
    cast:[],stageItems:items,stage:{w:1920,h:1080},markers,rules,totalFrames:pages.length*120,
    scripts:{movie:'',frames:{},sprites:{}},scenes:pages.map((p,i)=>({number:i+1,beat:p.title,scene:p.body,act:p.chapter,behavior:'interactive',startFrame:i*120+1,length:120})),
    presentationSource:presentation};
}

// Nothing is changed until the user chooses Director. Keep the complete previous workspace.
export function prepareDirector(storage, input, id = crypto.randomUUID()) {
  const plan = toDirector(input), key = 'ainimation:presentation:recovery:'+id;
  const before = {film:storage.getItem(FILM),markers:storage.getItem(MARKERS),labels:storage.getItem('ainimation-score-labels')};
  storage.setItem(key, JSON.stringify(before));
  plan.presentationRecoveryKey = key;
  try {
    storage.setItem(FILM, JSON.stringify(plan)); storage.setItem(MARKERS,JSON.stringify(plan.markers));
    storage.removeItem('ainimation-score-labels');
  } catch (error) {
    for (const [k,v] of [[FILM,before.film],[MARKERS,before.markers],['ainimation-score-labels',before.labels]]) {
      if(v===null)storage.removeItem(k);else storage.setItem(k,v);
    }
    throw error;
  }
  return plan;
}

export function restoreDirector(storage, key) {
  if(!key?.startsWith('ainimation:presentation:recovery:'))throw Error('Copia de recuperación no válida.');
  const raw=storage.getItem(key);if(!raw)throw Error('No se encuentra la copia anterior.');
  const before=JSON.parse(raw);
  storage.setItem(key+':before-restore',JSON.stringify({film:storage.getItem(FILM),markers:storage.getItem(MARKERS),labels:storage.getItem('ainimation-score-labels')}));
  for (const [k,v] of [[FILM,before.film],[MARKERS,before.markers],['ainimation-score-labels',before.labels]]) {
    if(v===null)storage.removeItem(k);else storage.setItem(k,v);
  }
}
