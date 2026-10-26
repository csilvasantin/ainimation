// Only the Director page bootstraps a modal; importing the engine in Stock has no side effects.
const {mountCapsuleEditor}=await import('./capsule-editor.mjs'+new URL(import.meta.url).search);
// Preserve the Admira deep link without covering Stage/Score before H.
if(document.body.classList.contains('director-focus')){
 const reveal=event=>{if(!event.detail?.visible)return;document.removeEventListener('director:interface',reveal);mountCapsuleEditor();};
 document.addEventListener('director:interface',reveal);
}else mountCapsuleEditor();
