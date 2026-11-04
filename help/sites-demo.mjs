// Keep an always-visible mute control in sync with the native player's controls.
const video=document.getElementById('sites-import-demo'),button=document.getElementById('sites-demo-mute');
if(video&&button){
  const update=()=>{const muted=video.muted||video.volume===0,en=document.documentElement.dataset.l==='en';
    const label=muted?(en?'Enable sound':'Activar sonido'):(en?'Mute':'Silenciar');
    button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',label);button.title=label;
  };
  button.addEventListener('click',()=>{const silent=video.muted||video.volume===0;video.muted=!silent;if(silent&&video.volume===0)video.volume=1;update();});
  video.addEventListener('volumechange',update);
  new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['data-l']});
  update();
}
