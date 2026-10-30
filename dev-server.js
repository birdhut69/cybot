// Local dev server: serves index.html + /api/chat (same handler as Vercel)
const http=require('http'),fs=require('fs'),path=require('path');
const handler=require('./api/chat.js');
const PORT=process.env.PORT||3000;
http.createServer(async(req,res)=>{
 try{
  const u=req.url.split('?')[0];
  if(u==='/api/chat'){
   let body='';req.on('data',c=>body+=c);req.on('end',async()=>{
    const R={_s:200,_h:{},writeHead(c,h){this._s=c;Object.assign(this._h,h)},status(c){this._s=c;return this},
     json(o){res.writeHead(this._s,{'Content-Type':'application/json',...this._h});res.end(JSON.stringify(o))},
     write(c){res.write(c)},end(){res.end()}};
    try{req.body=body?JSON.parse(body):{};}catch(e){req.body={};}
    await handler({method:req.method,body:req.body},R);
   });return;
  }
  const f=u==='/'?'index.html':u.slice(1);
  const p=path.join(__dirname,f);
  if(!p.startsWith(__dirname)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end('404');}
  res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':'text/plain'});
  fs.createReadStream(p).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e));}
}).listen(PORT,async()=>{
 console.log('CYBER-AI dev → http://localhost:'+PORT);
 try{const r=await fetch('http://localhost:11434/api/tags');const j=await r.json();
  console.log('Ollama models:',(j.models||[]).map(m=>m.name).join(', ')||'NONE — run: ollama pull dolphin3');}
 catch(e){console.log('Ollama offline — run: ollama serve && ollama pull dolphin3');}
 console.log('Public URL:  cloudflared tunnel --url http://localhost:'+PORT);});
