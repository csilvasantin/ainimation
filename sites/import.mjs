import DOMPurify from './vendor/purify.es.mjs';
import {normalizeURL,mediaURL,validateSite} from './model.mjs';
const blocked=['script','iframe','object','embed','form','input','textarea','select','base','meta','noscript','template','foreignObject'];
export function cleanDocument(html){
  const clean=DOMPurify.sanitize(html,{WHOLE_DOCUMENT:true,ADD_TAGS:['link','use'],FORBID_TAGS:blocked,FORBID_ATTR:['srcdoc','autofocus','contenteditable','nonce']});
  const doc=new DOMParser().parseFromString(clean,'text/html');
  doc.querySelectorAll('link').forEach(el=>{if(el.rel!=='stylesheet')el.remove();});
  doc.querySelectorAll('*').forEach(el=>{
    for(const a of [...el.attributes])if(/^on/i.test(a.name)||/^(srcset|ping|formaction|action|target)$/i.test(a.name))el.removeAttribute(a.name);
    if(el.localName==='use')for(const a of ['href','xlink:href'])if(el.hasAttribute(a)&&!el.getAttribute(a).startsWith('#'))el.removeAttribute(a);
  });
  return doc;
}
function absolute(value,base){try{if(value.startsWith('#'))return value;return mediaURL(new URL(value,base).href);}catch{return '';}}
export function cssURLs(css,base){
  return css.replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/gi,'')
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,(_,a,b,c)=>{
      const raw=(a??b??c).trim();const url=raw.startsWith('data:image/')||raw.startsWith('data:font/')?raw:absolute(raw,base);
      return 'url('+JSON.stringify(url)+')';
    });
}
export async function requestSource(url,kind='html'){
  const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?'/site-import/import':'https://ainimation-site-import.csilvasantin.workers.dev/import';
  const r=await fetch(endpoint+'?'+new URLSearchParams({url,kind}),{credentials:'omit',signal:AbortSignal.timeout(25000)});
  const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo importar.');return result;
}
export async function importSite(value,{read=requestSource}={}){
  const source=await read(normalizeURL(value),'html');
  const raw=new DOMParser().parseFromString(source.content,'text/html'),doc=cleanDocument(source.content),warnings=[];
  const base=(()=>{try{return normalizeURL(new URL(raw.querySelector('base')?.href||source.url,source.url).href);}catch{return source.url;}})();
  const scripts=raw.querySelectorAll('script').length;
  if(scripts)warnings.push('Los scripts originales no se ejecutan en la copia. Las animaciones programadas, formularios y datos en directo necesitan recrearse.');
  const sheets=[...doc.querySelectorAll('link[rel="stylesheet"]')];
  await Promise.all(sheets.map(async(link,index)=>{
    try{if(index>=12)throw Error();const css=await read(absolute(link.getAttribute('href')||'',base),'css');
      const style=doc.createElement('style');style.textContent=cssURLs(css.content,css.url);if(link.media)style.media=link.media;link.replaceWith(style);
    }catch{warnings.push('No se ha podido incorporar una hoja de estilo.');link.remove();}
  }));
  doc.querySelectorAll('style').forEach(el=>el.textContent=cssURLs(el.textContent,base));
  doc.querySelectorAll('*').forEach(el=>{
    for(const attr of [...el.attributes]){
      if(attr.name.startsWith('data-ain'))el.removeAttribute(attr.name);
      if(['src','poster','href','xlink:href'].includes(attr.name)){
        const v=attr.value.trim();const resolved=v.startsWith('data:image/')&&el.tagName==='IMG'?v:absolute(v,base);
        if(resolved)el.setAttribute(attr.name,resolved);else el.removeAttribute(attr.name);
      }
      if(attr.name==='style')el.setAttribute('style',cssURLs(attr.value,base));
    }
  });
  const items=[];
  function add(el,type,value,label){
    if(items.length>=500)return false;
    const id='ain-'+items.length;el.setAttribute('data-ain-id',id);
    items.push({id,type,value,label:label.slice(0,200),alt:el.getAttribute('alt')||'',animation:'none',duration:1.2,delay:0});return true;
  }
  doc.querySelectorAll('img').forEach(el=>{
    // Prefer the site's lazy source when the regular src is only a placeholder.
    const lazy=el.getAttribute('data-src')||el.getAttribute('data-lazy-src');if(lazy)el.src=absolute(lazy,base);
    el.removeAttribute('loading');const src=el.getAttribute('src')||'';
    if(src.startsWith('https:'))add(el,'image',src,el.alt||'Imagen '+(items.length+1));
  });
  doc.querySelectorAll('video').forEach(el=>{
    const src=el.getAttribute('src')||el.querySelector('source')?.getAttribute('src')||'';
    el.removeAttribute('autoplay');el.muted=true;el.setAttribute('controls','');
    add(el,'video',src,'Vídeo '+(items.length+1));
  });
  doc.querySelectorAll('svg').forEach(el=>{if(!el.parentElement?.closest('svg'))add(el,'graphic','',el.getAttribute('aria-label')||'Gráfico vectorial');});
  doc.querySelectorAll('[style]').forEach(el=>{
    if(el.hasAttribute('data-ain-id'))return;
    const match=el.style.backgroundImage?.match(/url\(["']?(https:[^"')]+)["']?\)/i);
    if(match)add(el,'background',match[1],'Imagen de fondo');
  });
  const walker=doc.createTreeWalker(doc.body,4),texts=[];let node;
  while((node=walker.nextNode()))if(node.textContent.trim()&&!node.parentElement.closest('style,script,svg,video,canvas'))texts.push(node);
  for(const text of texts){if(text.textContent.length>20000||items.length>=500)continue;
    const span=doc.createElement('span');text.replaceWith(span);span.append(text);
    add(span,'text',text.textContent,text.textContent.trim().replace(/\s+/g,' ').slice(0,65));
  }
  if(!items.length)throw Error('No se han encontrado componentes editables. Esta web puede necesitar un conector para cargar su contenido.');
  if(raw.querySelector('canvas'))warnings.push('El lienzo canvas original no se reproduce; se conserva el resto del diseño disponible.');
  if(items.length>=500)warnings.push('Se han incluido los primeros 500 componentes.');
  const links=[...new Set([...doc.querySelectorAll('a[href]')].map(el=>el.getAttribute('href')).filter(h=>{try{return new URL(h).origin===new URL(source.url).origin&&!h.includes('#');}catch{return false;}}))].slice(0,60);
  return validateSite({format:'ainimation-imported-site',version:1,title:(raw.title||new URL(source.url).hostname).slice(0,220),url:source.url,
    html:'<!doctype html>\n'+doc.documentElement.outerHTML,items,warnings,links,importedAt:new Date().toISOString()});
}
