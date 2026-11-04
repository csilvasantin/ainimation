import {cleanDocument,cssURLs} from './import.mjs';
import {validateSite} from './model.mjs';
import {localReference} from './media.mjs';
import {fileDropBridge} from './drop.mjs?v=20261104-replace-1';
const animations=`
@keyframes ain-fade{from{opacity:0}to{opacity:1}}
@keyframes ain-rise{from{opacity:0;translate:0 24px}to{opacity:1;translate:0 0}}
@keyframes ain-zoom{from{opacity:0;scale:.92}to{opacity:1;scale:1}}
@keyframes ain-float{0%,100%{translate:0 0}50%{translate:0 -12px}}
[data-ain-animation]:not([data-ain-animation="none"]){animation-name:var(--ain-name)!important;animation-duration:var(--ain-duration)!important;animation-delay:var(--ain-delay)!important;animation-fill-mode:both!important;animation-timing-function:ease-in-out!important}
[data-ain-animation="float"]{animation-iteration-count:infinite!important}
[data-ain-animation]:not([data-ain-animation="none"]):is(span){display:inline-block}
@media(prefers-reduced-motion:reduce){[data-ain-animation]{animation:none!important}}
`;
export function buildDocument(input,{channel='',interactive=false,dropChannel='',media=new Map()}={}){
  const p=validateSite(input),doc=cleanDocument(p.html);
  // Recheck saved/imported packages. No package can introduce code or an active document.
  doc.querySelectorAll('link').forEach(el=>el.remove());
  doc.querySelectorAll('style').forEach(el=>el.textContent=cssURLs(el.textContent,p.url));
  doc.querySelectorAll('*').forEach(el=>{
    if(el.hasAttribute('style'))el.setAttribute('style',cssURLs(el.getAttribute('style'),p.url));
    for(const a of [...el.attributes])if(['src','href','poster','xlink:href'].includes(a.name)&&!a.value.startsWith('#')&&!a.value.startsWith('https:')&&!(el.tagName==='IMG'&&a.name==='src'&&a.value.startsWith('data:image/')))el.removeAttribute(a.name);
  });
  for(const item of p.items){
    let value=item.value;
    if(localReference(value)){
      const asset=media.get(value),type=item.type==='video'?'video':'image';
      if(!asset||asset.type!==type)throw Error('Falta un archivo local compatible para este componente.');
      if(interactive&&asset.blob instanceof Blob)value='';
      else {if(typeof asset.url!=='string'||!/^data:(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm));base64,/.test(asset.url))throw Error('Falta un archivo local compatible para este componente.');value=asset.url;}
    }
    let el=doc.querySelector('[data-ain-id="'+item.id+'"]');
    if(!el&&item.inserted===true&&['image','video'].includes(item.type)){
      let area=doc.getElementById('ain-added-media');if(!area){area=doc.createElement('section');area.id='ain-added-media';area.style.cssText='position:relative;inset:auto;padding:48px 6vw;background:#071b14;display:flex;gap:24px;flex-wrap:wrap';doc.body.append(area);}
      el=doc.createElement(item.type==='image'?'img':'video');el.setAttribute('data-ain-id',item.id);el.style.cssText='display:block;position:relative;inset:auto;width:min(100%,640px);height:auto;object-fit:contain';area.append(el);
    }
    if(!el)throw Error('Falta un componente en la copia.');
    if(interactive&&localReference(item.value)){el.setAttribute('data-ain-local',item.value);el.setAttribute('data-ain-local-type',item.type);}
    if(item.type==='text')el.textContent=item.value;
    if(item.type==='image'){if(value)el.setAttribute('src',value);else el.removeAttribute('src');el.setAttribute('alt',item.alt);}
    if(item.type==='background')el.style.backgroundImage='url('+JSON.stringify(value)+')';
    if(item.type==='video'){el.querySelectorAll('source').forEach(s=>s.remove());if(value)el.setAttribute('src',value);else el.removeAttribute('src');el.setAttribute('controls','');el.removeAttribute('autoplay');}
    el.setAttribute('data-ain-animation',item.animation);
    el.style.setProperty('--ain-name','ain-'+item.animation);el.style.setProperty('--ain-duration',item.duration+'s');el.style.setProperty('--ain-delay',item.delay+'s');
  }
  const nonce=crypto.randomUUID().replaceAll('-',''),bridge=interactive||!!dropChannel;
  const meta=doc.createElement('meta');meta.httpEquiv='Content-Security-Policy';
  meta.content=`default-src 'none'; img-src https: data: blob:; media-src https: data: blob:; style-src 'unsafe-inline' https:; font-src https: data:; script-src ${bridge?"'nonce-"+nonce+"'":"'none'"}; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  doc.head.prepend(meta);
  const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');doc.head.prepend(charset);
  const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';doc.head.append(viewport);
  const style=doc.createElement('style');style.textContent=animations+(interactive?'[data-ain-id]{cursor:pointer!important}[data-ain-selected]{outline:2px solid #c3ff6b!important;outline-offset:4px}':'');doc.head.append(style);
  if(bridge){
    const script=doc.createElement('script');script.setAttribute('nonce',nonce);
    script.textContent=fileDropBridge(interactive?channel:dropChannel)+(interactive?`(()=>{const channel=${JSON.stringify(channel)},urls=new Map();document.addEventListener('click',e=>{if(e.target.closest('a,button'))e.preventDefault();e.stopPropagation();const el=e.target.closest('[data-ain-id]');if(el)parent.postMessage({channel,type:'select',id:el.dataset.ainId},'*')},true);window.addEventListener('message',e=>{
      if(e.source!==parent||e.data?.channel!==channel)return;
      if(e.data.type==='media'&&Array.isArray(e.data.assets)&&e.data.assets.length<=500){
        for(const a of e.data.assets){if(!/^ain-local:[a-f0-9]{64}$/.test(a.id)||!(a.blob instanceof Blob)||!['image/png','image/jpeg','image/webp','image/gif','image/avif','video/mp4','video/webm'].includes(a.blob.type)||a.blob.size>52428800)continue;
          let url=urls.get(a.id);if(!url){url=URL.createObjectURL(a.blob);urls.set(a.id,url);}
          for(const el of document.querySelectorAll('[data-ain-local]'))if(el.dataset.ainLocal===a.id){const type=el.dataset.ainLocalType;if((type==='video')!==a.blob.type.startsWith('video/'))continue;if(type==='background')el.style.backgroundImage='url('+JSON.stringify(url)+')';else el.setAttribute('src',url);}
        }
      }
      if(e.data.type==='highlight'){document.querySelectorAll('[data-ain-selected]').forEach(n=>n.removeAttribute('data-ain-selected'));const el=[...document.querySelectorAll('[data-ain-id]')].find(n=>n.dataset.ainId===e.data.id);if(el){el.setAttribute('data-ain-selected','');if(e.data.scroll)el.scrollIntoView({block:'center',behavior:'instant'})}}
    });window.addEventListener('pagehide',()=>{for(const url of urls.values())URL.revokeObjectURL(url)});parent.postMessage({channel,type:'ready'},'*')})();`:'');
    doc.body.append(script);
  }
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
