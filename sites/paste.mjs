// Only inspect file representations in the user's paste event. Text stays with the browser.
export function editablePasteTarget(target){
  let el=target?.nodeType===3?target.parentElement:target;
  if(el?.closest?.('input,textarea,select,[role="textbox"]'))return true;
  if(el?.isContentEditable)return true;
  for(;el?.getAttribute;el=el.parentElement){
    const value=el.getAttribute('contenteditable')?.toLowerCase();
    if(value===''||value==='true'||value==='plaintext-only')return true;
    if(value==='false')return false;
  }
  return false;
}
export function clipboardImages(event){
  if(event.defaultPrevented||editablePasteTarget(event.target))return [];
  const data=event.clipboardData;if(!data)return [];
  try{
    const items=Array.from(data.items||[]).filter(item=>item.kind==='file');
    const files=items.length?items.map(item=>item.getAsFile()):Array.from(data.files||[]);
    // A mixed file batch is left untouched; byte/type/size validation remains in the loader.
    return files.length&&files.every(file=>file&&/^image\//i.test(file.type))?files:[];
  }catch{return [];}
}
export function createImagePaste({document,onFiles}){
  const paste=event=>{
    const files=clipboardImages(event);if(!files.length)return;
    event.preventDefault();event.stopPropagation();onFiles(files);
  };
  document.addEventListener('paste',paste,true);
  return {dispose:()=>document.removeEventListener('paste',paste,true)};
}
export function imagePasteBridge(channel){
  return `(()=>{const channel=${JSON.stringify(channel)};${editablePasteTarget.toString()};${clipboardImages.toString()};${createImagePaste.toString()};createImagePaste({document,onFiles:files=>parent.postMessage({channel,type:'image-paste',files},'*')});})();`;
}
