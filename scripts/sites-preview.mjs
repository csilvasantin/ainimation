import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import importer from '../site-import/worker.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||9138);
createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://127.0.0.1:'+port);
  if(u.pathname==='/site-import/import'){
    const request=new Request('https://local.invalid/import'+u.search,{headers:{origin:'http://127.0.0.1:'+port}});
    const r=await importer.fetch(request,{ALLOW_LOCAL:'1'});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;
  }
  const path=resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!path.startsWith(root)||path.includes('/.git/')){res.writeHead(403);res.end();return;}
  const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
  const data=await readFile(path);res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
}catch(e){res.writeHead(404);res.end('No disponible.');}}).listen(port,'127.0.0.1',()=>process.stdout.write('Local: http://127.0.0.1:'+port+'/sites/\n'));
