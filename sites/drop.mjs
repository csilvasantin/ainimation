const folderError='Arrastra archivos de imagen o vídeo, sin carpetas.';
export function previewMessageSource(event,channel,draft,original){if(!channel||event.data?.channel!==channel)return '';if(event.source===draft)return 'draft';if(original&&event.source===original)return 'original';return '';}
export function hasFileDrag(transfer){return !!transfer&&(Array.from(transfer.types||[]).some(t=>String(t).toLowerCase()==='files')||transfer.files?.length>0);}
export function mediaDropReplacement(project,selected,{source,id}={}){
  if(source!=='draft'||typeof id!=='string'||id!==selected)return null;
  const item=project?.items.find(i=>i.id===id);
  return item&&['image','video'].includes(item.type)?{replace:item.id,expected:item.type,label:item.label.slice(0,70)}:null;
}
function hasFolder(transfer){return Array.from(transfer.items||[]).some(item=>{try{return item.kind==='file'&&item.webkitGetAsEntry?.()?.isDirectory;}catch{return false;}});}

// The outer document and both opaque previews share this controller. File
// validation and changes to the project remain in the existing media loader.
export function createFileDrop({document:doc,overlay,onFiles,onError,getMessage,getDetail}){
  const win=doc.defaultView;let timer;
  function reset(){clearTimeout(timer);overlay.hidden=true;}
  function show(context){const title=overlay.querySelector('strong'),text=getMessage(context);if(title.textContent!==text)title.textContent=text;const detail=overlay.querySelector('p');if(detail&&getDetail){const text=getDetail(context);if(detail.textContent!==text)detail.textContent=text;}overlay.hidden=false;clearTimeout(timer);timer=setTimeout(reset,900);}
  function drop(files,context){const snapshot=Array.from(files||[]);reset();if(snapshot.length)onFiles(snapshot,context);}
  function rejectFolder(){reset();onError(folderError);}
  const over=event=>{if(!hasFileDrag(event.dataTransfer))return;event.preventDefault();event.dataTransfer.dropEffect='copy';show();};
  const leave=event=>{if(event.target===doc.documentElement&&!event.relatedTarget)reset();};
  const receive=event=>{if(!hasFileDrag(event.dataTransfer))return;event.preventDefault();event.stopPropagation();if(hasFolder(event.dataTransfer))rejectFolder();else drop(event.dataTransfer.files);};
  const escape=event=>{if(event.key==='Escape')reset();};
  for(const name of ['dragenter','dragover'])doc.addEventListener(name,over,true);
  doc.addEventListener('dragleave',leave,true);doc.addEventListener('drop',receive,true);doc.addEventListener('dragend',reset,true);doc.addEventListener('keydown',escape,true);
  win.addEventListener('blur',reset);win.addEventListener('pagehide',reset);
  return {show,drop,rejectFolder,reset,dispose(){reset();for(const name of ['dragenter','dragover'])doc.removeEventListener(name,over,true);doc.removeEventListener('dragleave',leave,true);doc.removeEventListener('drop',receive,true);doc.removeEventListener('dragend',reset,true);doc.removeEventListener('keydown',escape,true);win.removeEventListener('blur',reset);win.removeEventListener('pagehide',reset);}};
}

// Only our nonce-protected preview script receives these handlers; exported
// HTML has no bridge. Copy File objects synchronously while the drag store is open.
export function fileDropBridge(channel){return `(()=>{const channel=${JSON.stringify(channel)};
const files=t=>!!t&&(Array.from(t.types||[]).some(x=>String(x).toLowerCase()==='files')||t.files.length>0);
const target=e=>e.target.closest?.('[data-ain-id]')?.dataset.ainId||'';
for(const name of ['dragenter','dragover'])document.addEventListener(name,e=>{if(!files(e.dataTransfer))return;e.preventDefault();e.dataTransfer.dropEffect='copy';parent.postMessage({channel,type:'file-drag',id:target(e)},'*')},true);
document.addEventListener('drop',e=>{if(!files(e.dataTransfer))return;e.preventDefault();e.stopPropagation();const folder=Array.from(e.dataTransfer.items||[]).some(i=>{try{return i.kind==='file'&&i.webkitGetAsEntry?.()?.isDirectory}catch{return false}});parent.postMessage(folder?{channel,type:'file-folder'}:{channel,type:'file-drop',id:target(e),files:Array.from(e.dataTransfer.files)},'*')},true);
})();`;}
