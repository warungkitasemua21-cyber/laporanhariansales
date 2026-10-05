import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../server/app.mjs';
import { fileStore } from './file-store.mjs';
await import('./build.mjs');
const store=fileStore(),app=createApp({storeFactory:()=>store,secureCookies:false});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const port=Number(process.env.PORT||3000);
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,`http://${req.headers.host}`);
 if(url.pathname.startsWith('/api/')){
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>50000){res.writeHead(413);res.end();return;}chunks.push(c);}
   const body=Buffer.concat(chunks);const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body})});
   const response=await app(request,{ip:req.socket.remoteAddress});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
 }
 const file=path.resolve('dist',url.pathname==='/'?'index.html':'.'+url.pathname);
 if(!file.startsWith(path.resolve('dist')+path.sep)){res.writeHead(404);res.end();return;}
 const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(content);
 }catch{res.writeHead(404);res.end('Tidak ditemukan.');}
}).listen(port,'0.0.0.0',()=>console.log(`Preview lokal: http://localhost:${port}. Data uji lokal dipisahkan dari Netlify.`));
