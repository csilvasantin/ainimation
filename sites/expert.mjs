import {normalizeURL,ANIMATIONS} from './model.mjs';
export const EXPERT_HELP='/help · /estado · /componentes · /seleccionar ain-0 · /texto contenido · /animar rise 1.2 · /deshacer · /rehacer · /descargar proyecto|html · /importar URL';
export function parseExpertCommand(input){
  if(typeof input!=='string'||input.length>20500)throw Error('Orden demasiado larga.');
  const raw=input.trim(),match=raw.match(/^\/(\S+)(?:\s+([\s\S]*))?$/);
  if(!match)throw Error('Escribe /help para consultar las órdenes disponibles.');
  const cmd=match[1].toLowerCase(),arg=(match[2]||'').trim();
  if(['help','ayuda','estado','componentes','deshacer','rehacer'].includes(cmd)){if(arg)throw Error('Esta orden no necesita argumentos.');return {type:cmd==='ayuda'?'help':cmd};}
  if(cmd==='seleccionar'&&/^ain-\d+$/.test(arg))return {type:'select',id:arg};
  if(cmd==='texto'&&arg.length&&arg.length<=20000)return {type:'text',value:arg};
  if(cmd==='animar'){
    const [animation,seconds,...rest]=arg.split(/\s+/),duration=seconds===undefined?undefined:Number(seconds);
    if(!ANIMATIONS.includes(animation)||rest.length||(duration!==undefined&&(!Number.isFinite(duration)||duration<.2||duration>10)))throw Error('/animar none|fade|rise|zoom|float [segundos de 0.2 a 10]');
    return {type:'animate',animation,...(duration===undefined?{}:{duration})};
  }
  if(cmd==='descargar'&&['proyecto','html'].includes(arg))return {type:'download',format:arg};
  if(cmd==='importar'&&arg)return {type:'import',url:normalizeURL(arg)};
  throw Error('Orden no disponible. Usa /help. No se ejecuta código externo.');
}
