document.addEventListener('pointerdown',event=>{if(event.target.closest?.('[data-director-interface-toggle]'))event.stopPropagation();},true);
// View-only: never change the plan, saved window geometry or Admira reference.
function toggleInterface(){
 const button=document.querySelector('[data-director-interface-toggle]');
 const focused=document.body.classList.toggle('director-focus');
 document.dispatchEvent(new CustomEvent('director:interface',{detail:{visible:!focused}}));
 button?.setAttribute('aria-pressed',String(!focused));
 button?.setAttribute('aria-label',focused?'Mostrar interfaz / Show interface · H':'Ocultar interfaz / Hide interface · H');
}
document.addEventListener('click',event=>{if(event.target.closest?.('[data-director-interface-toggle]')){event.stopPropagation();toggleInterface();}},true);
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.key.toLowerCase()!=='h'||document.body.classList.contains('ain-play'))return;
 if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog,[role="dialog"]'))return;
 event.preventDefault();toggleInterface();
});
