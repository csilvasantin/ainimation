export const SOUND_KEY='ainimation-sites-preview-muted';

// A view preference, separate from the project and its undo/export history.
export function createPreviewSound({button,getFrames,getChannel,storage}){
  let preference=null,revision=0;const states=new Map();
  try{const saved=storage?.getItem(SOUND_KEY);preference=saved==='1'?true:saved==='0'?false:null;}catch{}
  const valid=data=>Number.isSafeInteger(data.total)&&data.total>=0&&Number.isSafeInteger(data.silent)&&data.silent>=0&&data.silent<=data.total&&Number.isSafeInteger(data.revision)&&data.revision>=-1;
  function isMuted(){const active=Object.keys(getFrames()),ready=active.length&&active.every(key=>states.has(key)),known=active.map(key=>states.get(key));return ready&&known.some(s=>s.total>0)?known.every(s=>s.total===s.silent):preference===true;}
  function paint(){const muted=isMuted(),label=muted?'Activar sonido de los vídeos':'Silenciar todos los vídeos';button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',label);button.title=label;}
  function remember(){try{if(preference===null)storage?.removeItem(SOUND_KEY);else storage?.setItem(SOUND_KEY,preference?'1':'0');}catch{}}
  function send(source){const channel=getChannel(),frame=getFrames()[source];if(channel&&frame&&preference!==null)frame.postMessage({channel,type:'sound-set',muted:preference,revision},'*');}
  function setMuted(value){preference=!!value;revision++;states.clear();remember();paint();for(const source of Object.keys(getFrames()))send(source);}
  function receive(source,data){
    if(!getChannel()||!Object.hasOwn(getFrames(),source)||data?.channel!==getChannel()||!valid(data))return;
    if(data.type==='sound-ready'){if(preference!==null){send(source);return;}}
    else if(data.type!=='sound-state'||(data.revision!==revision&&!(preference===null&&data.revision===-1)))return;
    states.set(source,{total:data.total,silent:data.silent});
    // Native controls remain usable: a per-video change releases the global
    // override, instead of immediately forcing that video back to its old state.
    if(data.type==='sound-state'&&preference!==null&&((preference&&data.silent!==data.total)||(!preference&&data.silent>0))){preference=null;remember();}
    paint();
  }
  const toggle=()=>setMuted(!isMuted());button.addEventListener('click',toggle);paint();
  return {receive,setMuted,isMuted,reset(){states.clear();paint();},get preference(){return preference;},dispose(){button.removeEventListener('click',toggle);states.clear();}};
}

export function previewSoundBridge(channel){return `(()=>{const channel=${JSON.stringify(channel)};let revision=-1;
const report=type=>{const videos=Array.from(document.querySelectorAll('video'));parent.postMessage({channel,type,revision,total:videos.length,silent:videos.filter(v=>v.muted||v.volume===0).length},'*')};
document.addEventListener('volumechange',e=>{if(e.target.tagName==='VIDEO')report('sound-state')},true);
window.addEventListener('message',e=>{const d=e.data;if(e.source!==parent||d?.channel!==channel||d.type!=='sound-set'||typeof d.muted!=='boolean'||!Number.isSafeInteger(d.revision)||d.revision<0||d.revision<revision)return;revision=d.revision;for(const v of document.querySelectorAll('video')){v.muted=d.muted;if(!d.muted&&v.volume===0)v.volume=1;}report('sound-state')});
report('sound-ready');})();`;}
