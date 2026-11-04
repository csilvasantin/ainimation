// Independent overlay panels: their state never alters the stage layout or persists.
export function createQuadraticUI(doc=document){
  const names=['options','advanced','expert'],order=[];
  const panel=name=>doc.getElementById(name+'-panel'),button=name=>doc.getElementById(name+'-toggle');
  function set(name,open,focus=false){
    if(!names.includes(name))return;
    panel(name).hidden=!open;button(name).setAttribute('aria-expanded',String(open));
    const old=order.indexOf(name);if(old>=0)order.splice(old,1);if(open)order.push(name);
    if(focus){const target=open?(panel(name).querySelector('input:not(:disabled),select:not(:disabled),[data-panel-close]')||panel(name)):button(name);target.focus({preventScroll:true});}
  }
  for(const name of names){
    set(name,false);
    button(name).addEventListener('click',()=>set(name,panel(name).hidden,true));
    panel(name).querySelector('[data-panel-close]').addEventListener('click',()=>set(name,false,true));
  }
  doc.addEventListener('keydown',event=>{if(event.key!=='Escape')return;
    const owner=event.target.closest?.('[data-quad-panel]')?.dataset.quadPanel||order.at(-1);
    if(owner){event.preventDefault();set(owner,false,true);}
  });
  return {show:(name,focus=false)=>set(name,true,focus),hide:(name,focus=false)=>set(name,false,focus),isOpen:name=>names.includes(name)&&!panel(name).hidden};
}
