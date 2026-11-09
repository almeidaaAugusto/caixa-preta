import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args=process.argv.slice(2);
const arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..',args.includes('--dist')?'dist':'.');
const port=Number(arg('--port',process.env.PORT||'4173'));
const host=arg('--host','127.0.0.1');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const route=pathname.replace(/\/$/,'')||'/';
    let target=path.resolve(root,`.${pathname}`);
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Acesso não permitido');return;}
    if(['/','/links','/admin'].includes(route))target=path.join(root,'index.html');
    else if((await stat(target)).isDirectory())target=path.join(target,'index.html');
    const content=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Conteúdo não encontrado.');}
});
server.listen(port,host,()=>console.log(`Caixa Preta disponível em http://${host}:${port}`));
