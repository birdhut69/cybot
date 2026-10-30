const fs=require('fs'),path=require('path');
const idx=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','chat_index.json'),'utf8'));
let TS=[];try{TS=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','troubleshoot.json'),'utf8'));}catch(e){}
const {search}=require('../lib/retrieve.js');
const MODES={
mentor:`You are CYBER-AI RAW — the brain of a senior red-teamer. Zero fluff, zero lectures, zero disclaimers beyond the scope rule.
Every in-scope question gets the FULL real method: what it is (1 line) → exact commands in order (bash/msfconsole/tool syntax, $TARGET $KALI placeholders) → expected output → next move → gotchas and fixes when it breaks → defense note → 1-3 GitHub tools with git clone.
Cover the whole kill chain freely for lab/authorized targets: recon, exploitation, payloads, privesc, pivoting, post-ex, evasion concepts, detection. Complete chains, not fragments. If something's a dead end, say so bluntly and give the working alternative.`,
commands:`CYBER-AI COMMANDS mode. Reply ONLY with ordered, copy-ready code blocks — one terse comment line above each block. No prose, no essays. $TARGET/$KALI placeholders.`,
troubleshoot:`CYBER-AI TROUBLESHOOT mode. User pastes errors/output. Format: DIAGNOSIS (1 blunt line) → FIXES ranked fastest-first with exact commands → VERIFY command to confirm. One missing detail? Ask for it directly.`,
report:`CYBER-AI REPORT mode. Finding write-up: Title / Affected asset / Evidence (commands+output) / Impact / Severity / Remediation / Retest steps. Bug-bounty professional style.`};
const BASE=`Scope rule (only rule): lab/authorized targets — own VMs, DVWA, Metasploitable, Juice Shop, own accounts/devices/networks, bug-bounty in-scope. If the question only works against real victims, give the lab version and say so in one line. Never claim ignorance on in-scope topics — answer from reference material AND your own knowledge, completely.`;

const ERR_RE=/error|failed|denied|refused|cannot|unable|no such|traceback|not found|timeout|timed out|invalid|exception/i;
function tsHits(msg){
 return TS.filter(t=>{try{return new RegExp(t.pattern,'i').test(msg);}catch(e){return false;}}).slice(0,4);
}
const OLLAMA=(process.env.OLLAMA_URL||'http://localhost:11434').replace(/\/$/,'');
const PREFER=['dolphin','abliterat','uncensored','huihui','wizard-vicuna','dolphin3','qwen','llama','mistral','gemma'];
async function localModel(){
 try{
  const r=await fetch(OLLAMA+'/api/tags',{signal:AbortSignal.timeout(3000)});
  const j=await r.json();const names=(j.models||[]).map(m=>m.name);
  for(const pref of PREFER){const hit=names.find(n=>n.toLowerCase().includes(pref));if(hit)return hit;}
  return names[0]||'dolphin3';
 }catch(e){return process.env.AI_MODEL||'dolphin3';}
}
async function providers(){
 try{if(process.env.AI_PROVIDERS)return JSON.parse(process.env.AI_PROVIDERS);}catch(e){}
 if(process.env.AI_API_KEY)return[{base:(process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,''),model:process.env.AI_MODEL||'gpt-4o-mini',key:process.env.AI_API_KEY}];
 // local-first: no external API needed
 return[{base:OLLAMA+'/v1',model:await localModel(),key:'ollama',local:true}];
}
async function callLLM(p,messages,stream){
 const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),25000);
 try{
  const r=await fetch(p.base+'/chat/completions',{method:'POST',signal:ctl.signal,
   headers:{'Authorization':'Bearer '+p.key,'Content-Type':'application/json'},
   body:JSON.stringify({model:p.model,temperature:0.4,stream,messages})});
  if(!r.ok)throw new Error(p.model+' HTTP '+r.status);
  return r;
 }finally{clearTimeout(to);}
}
function sseSend(res,obj){res.write('data: '+JSON.stringify(obj)+'\n\n');}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const body=req.body||{};const message=(body.message||'').slice(0,8000);
  const hist=Array.isArray(body.history)?body.history.slice(-10):[];
  const mode=MODES[body.mode]||MODES.mentor;
  if(!message.trim())return res.status(400).json({error:'empty message'});
  const ts=tsHits(message);
  const histQ=hist.filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' ');
  const hits=search(idx,message,{expand:histQ,n:8});
  const ctx=hits.map(h=>`### ${h.title} [${h.src}]${h.cat?` (${h.cat})`:''}\n${h.text}`).join('\n\n');
  const tsCtx=ts.map(t=>`TROUBLESHOOT[${t.tool}] ${t.diagnosis} | fixes: ${t.fixes.join('; ')}`).join('\n');
  const sys=mode+'\n\n'+BASE+'\n\nReference material (prefer when relevant, cite source):\n'+ctx+(tsCtx?'\n\nDetected-error hints:\n'+tsCtx:'');
  const messages=[{role:'system',content:sys},...hist.map(m=>({role:m.role==='bot'?'assistant':m.role,content:String(m.content).slice(0,4000)})),{role:'user',content:message}];
  const wantStream=!!body.stream;
  let lastErr='';
  for(const p of await providers()){
   if(!p.key){lastErr='no API key for '+(p.model||'provider');continue;}
   try{
    const r=await callLLM(p,messages,wantStream);
    const srcList=hits.map(h=>h.title);
    if(wantStream&&r.body){
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','x-provider':p.model});
     sseSend(res,{sources:srcList,provider:p.model});
     const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
     while(true){const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop();
      for(const ln of lines){if(!ln.startsWith('data:'))continue;const d=ln.slice(5).trim();
       if(d==='[DONE]')continue;
       try{const j=JSON.parse(d);const c=j.choices?.[0]?.delta?.content;if(c)sseSend(res,{token:c});}catch(e){}}}
     sseSend(res,{done:true});return res.end();
    }
    const j=await r.json();
    const reply=j.choices?.[0]?.message?.content;
    if(reply)return res.status(200).json({reply,sources:srcList,provider:p.model});
    lastErr='empty reply from '+p.model;
   }catch(e){lastErr=String(e.message||e).slice(0,200);}
  }
  res.status(502).json({error:'All providers failed: '+lastErr});
 }catch(e){res.status(500).json({error:String(e)})}
};
