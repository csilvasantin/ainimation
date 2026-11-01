import {fixture} from './fixtures.mjs';
import {validateProject,editField} from './project.mjs';
const art=new URL('./assets/orbita-key-art.png',import.meta.url).href;
export function conflictFixture(kind='site'){
  let original=fixture(kind);const prefix='/presentaciones/'+original.source.id+'/media/';
  const resources={draftArt:prefix+'library-es-0000000000000001.png',currentArt:prefix+'library-es-0000000000000002.png',draftLogo:prefix+'library-es-0000000000000003.png',currentLogo:prefix+'library-es-0000000000000004.png'};
  original.document.thumbnailMedia=Object.entries(resources).map(([key,url])=>({url,label:{draftArt:'Arte del borrador · muestra',currentArt:'Arte actual · muestra',draftLogo:'Logo del borrador · muestra',currentLogo:'Logo actual · muestra'}[key]}));original=validateProject(original);
  let draft=original,current=structuredClone(original);
  const ours={title:kind==='site'?'Un encuentro para imaginarlo todo.':'Una idea que abre conversaciones.',kicker:'ÓRBITA · ENCUENTROS',image:resources.draftArt,logo:resources.draftLogo,font:'fira-sans',accent:'#00a7c7',logoStyle:'white'};
  const theirs={title:kind==='site'?'Un encuentro para cambiar la mirada.':'Un relato que conecta.',kicker:'ÓRBITA · ENCUENTROS',image:resources.currentArt,logo:resources.currentLogo,font:'fira-sans',accent:'#e3b4ff',layout:'editorial'};
  for(const [key,value]of Object.entries(ours))draft=editField(draft,'thumbnail-'+key,value);
  draft=editField(draft,'hero-message','Un ajuste que sólo existe en el borrador ficticio.');
  for(const [key,value]of Object.entries(theirs))current=editField(current,'thumbnail-'+key,value);
  current.source.revision='demo-r2';current.document.extension.sourceNote='Metadatos añadidos en la revisión actual. No se reescriben.';
  return {original,draft,current:validateProject(current),resources};
}
export function conflictFixtureAssets(resources,doc=document){
  const logo=color=>{const canvas=doc.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');ctx.strokeStyle=color;ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(66,64,46,29,-.45,0,Math.PI*2);ctx.stroke();ctx.fillStyle=color;ctx.font='900 35px Arial';ctx.fillText('ORB',115,77);return canvas.toDataURL('image/png');};
  return {[resources.draftArt]:art,[resources.currentArt]:art,[resources.draftLogo]:logo('#85caf0'),[resources.currentLogo]:logo('#e3b4ff')};
}
