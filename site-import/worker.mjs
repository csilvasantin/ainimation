// Read-only, bounded HTML/CSS importer. Never forwards visitor cookies or credentials.
export const MAX_BYTES = 2_000_000;
export function publicURL(input) {
  const u = new URL(input);
  const h = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') ||
      !h.includes('.') || /[:\[\]]/.test(h) || /^[\d.]+$/.test(h) ||
      /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(h)) throw Error('Introduce una URL HTTPS pública.');
  u.hash = ''; return u;
}
export function publicIP(ip) {
  if (ip.includes(':')) {
    // Only globally routable IPv6 unicast. Exclude IPv4 mapping and documentation.
    return /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^2001:(db8|0*0|0*2|1[0-9a-f]):/i.test(ip);
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b,c] = p;
  return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) ||
    (a===192&&(b===168||b===0||b===2)) || (a===100&&b>=64&&b<=127) ||
    (a===198&&(b===18||b===19||(b===51&&c===100))) || (a===203&&b===0&&c===113));
}
async function checkDNS(host, fetcher) {
  const answers = await Promise.all(['A','AAAA'].map(async type => {
    const r = await fetcher('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type='+type,
      {headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(5000)});
    if (!r.ok) throw Error('No se ha podido comprobar el dominio.');
    const d = await r.json(); if(d.Status!==0) throw Error('El dominio no responde en DNS.');
    return (d.Answer||[]).filter(a=>[1,28].includes(a.type)).map(a=>a.data);
  }));
  const ips = answers.flat();
  if (!ips.length || ips.some(ip=>!publicIP(ip))) throw Error('La URL no apunta a un servidor público.');
}
export async function boundedText(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('La página supera 2 MB.');
  const reader=response.body.getReader(), chunks=[];let size=0;
  try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>MAX_BYTES)throw Error('La página supera 2 MB.');chunks.push(value);}
  } catch(e){await reader.cancel();throw e;}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  return new TextDecoder().decode(bytes);
}
export async function importURL(input, kind='html', fetcher=fetch, resolve=host=>checkDNS(host,fetcher)) {
  if(!['html','css'].includes(kind))throw Error('Formato de importación no válido.');
  let url=publicURL(input);
  for(let i=0;i<4;i++){
    await resolve(url.hostname);
    const r=await fetcher(url.href,{redirect:'manual',credentials:'omit',headers:{accept:kind==='css'?'text/css':'text/html','user-agent':'AINimation-Site-Importer/1.0'},signal:AbortSignal.timeout(15000)});
    if([301,302,303,307,308].includes(r.status)){
      await r.body?.cancel();url=publicURL(new URL(r.headers.get('location'),url).href);continue;
    }
    if(!r.ok)throw Error('El site ha respondido con '+r.status+'. No se ha importado.');
    const type=r.headers.get('content-type')||'';
    if(!(kind==='css'?/text\/css/i:/text\/html|application\/xhtml\+xml/i).test(type))throw Error('La URL no devuelve '+(kind==='css'?'CSS.':'una página HTML.'));
    return {url:url.href,content:await boundedText(r),kind};
  }
  throw Error('La URL tiene demasiadas redirecciones.');
}
export default {async fetch(request,env={}) {
  const url=new URL(request.url),origin=request.headers.get('origin')||'';
  const allowed=['https://www.ainimation.studio','https://ainimation.studio'];
  if(env.ALLOW_LOCAL==='1'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))allowed.push(origin);
  const cors={'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'GET, OPTIONS','cache-control':'no-store','x-content-type-options':'nosniff'};
  if(url.pathname==='/health')return Response.json({service:'ainimation-site-import',version:1});
  if(!allowed.includes(origin))return Response.json({error:'Origen no permitido.'},{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET'||url.pathname!=='/import')return Response.json({error:'Ruta no disponible.'},{status:404,headers:cors});
  // Optional Cloudflare rate-limit binding; absent only for the local preview server.
  if(env.IMPORT_LIMITER){const {success}=await env.IMPORT_LIMITER.limit({key:request.headers.get('cf-connecting-ip')||'unknown'});if(!success)return Response.json({error:'Espera un minuto antes de importar más páginas.'},{status:429,headers:cors});}
  try{return Response.json(await importURL(url.searchParams.get('url'),url.searchParams.get('kind')||'html'),{headers:cors});}
  catch(e){return Response.json({error:e.name==='TimeoutError'?'El site tarda demasiado en responder.':e.message},{status:422,headers:cors});}
}};
