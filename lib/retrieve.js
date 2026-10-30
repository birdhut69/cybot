const SYN={msf:'metasploit',idor:'bola access control',sqli:'sql injection',xss:'cross site scripting',privesc:'privilege escalation',rce:'remote code execution',ssrf:'server side request forgery',ssti:'template injection',xxe:'xml external entity',ad:'active directory',kerb:'kerberoasting',ap:'access point',revshell:'reverse shell',c2:'command and control',exfil:'exfiltration',enum:'enumeration',recon:'reconnaissance',osint:'open source intelligence',lfi:'local file inclusion',rfi:'remote file inclusion',csrf:'cross site request forgery',av:'antivirus',dfir:'forensics',iac:'infrastructure as code',k8s:'kubernetes',pwn:'exploit',ctf:'capture the flag',lolbin:'living off the land',uac:'privilege escalation',jail:'escape breakout',bof:'buffer overflow',rce:'remote code execution',dcsync:'domain replication',ntlm:'ntlm relay hash'};
const STOP=new Set('the a an and or of to in on for with how what why is are do does did can could should would give me show tell step steps command commands please get make use'.split(' '));
let inv=null;
function buildInv(idx){
 inv=Object.create(null);
 idx.forEach((s,i)=>{
  const words=new Set((s.title+' '+(s.tags||[]).join(' ')+' '+s.text.slice(0,500)).toLowerCase().split(/[^a-z0-9]+/));
  for(const w of words)if(w.length>2){if(!(inv[w] instanceof Set))inv[w]=new Set();inv[w].add(i);}
 });
}
function terms(q,extra){
 let t=q.toLowerCase().replace(/[^a-z0-9 ._-]/g,' ');
 for(const k in SYN){const re=new RegExp('\\b'+k+'\\b','g');t=t.replace(re,k+' '+SYN[k]);}
 if(extra)t+=' '+extra.toLowerCase().replace(/[^a-z0-9 ._-]/g,' ');
 return [...new Set(t.split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)))];
}
function search(idx,q,opts={}){
 if(!inv)buildInv(idx);
 const ws=terms(q,opts.expand||'');
 const cand=new Set();
 for(const w of ws){const set=inv[w];if(set)for(const i of set)cand.add(i);}
 const per=opts.perSource||3,n=opts.n||10;
 const scored=[];
 for(const i of cand){
  const s=idx[i];const tl=s.title.toLowerCase(),tg=(s.tags||[]).join(' ').toLowerCase(),tx=s.text.toLowerCase();
  let sc=0;
  for(const w of ws){if(tl.includes(w))sc+=4;else if(tg.includes(w))sc+=3;else if(tx.includes(w))sc+=1;}
  if((s.cat==='our-docs'||s.cat==='sessions')&&sc>0)sc*=1.15;
  if(sc>0)scored.push({s,sc});
 }
 scored.sort((a,b)=>b.sc-a.sc);
 const out=[],cnt={};
 for(const o of scored){const k=o.s.cat||o.s.src;if((cnt[k]=(cnt[k]||0)+1)>per&&out.length>=n)continue;out.push(o.s);if(out.length>=n*2)break;}
 return out.slice(0,n);
}
module.exports={search,terms};
