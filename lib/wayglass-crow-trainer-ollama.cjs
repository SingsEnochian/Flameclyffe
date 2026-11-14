'use strict';
// Local-only Crow Trainer executor. Invokes the real Ollama model; never simulates replies.
const {createHash,randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {mkdir,writeFile}=require('node:fs/promises');
const {resolve}=require('node:path');
const {prepareCohort,assessWyrdrune}=require('./wayglass-crow-trainer-cohort.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
const DEFAULT_URL='http://127.0.0.1:11434';
function localEndpoint(value=DEFAULT_URL){
 const u=new URL(value);
 if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')
  throw new Error('Crow Trainer only permits local Ollama HTTP endpoints');
 return u.origin;
}
async function ollama(path,body,{endpoint=DEFAULT_URL,fetcher=fetch,timeoutMs=120000}={}){
 const url=localEndpoint(endpoint)+path;
 const res=await fetcher(url,{method:body?'POST':'GET',headers:{'content-type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs)});
 if(!res.ok)throw new Error('Ollama HTTP '+res.status+' at '+path);
 return res.json();
}
function chooseAmber(tags,requested){
 const models=(tags.models||[]).map(m=>m.name).filter(Boolean);
 if(requested){if(!models.includes(requested))throw new Error('Requested Amber model not installed: '+requested);return requested;}
 const candidates=models.filter(x=>/orion/i.test(x));
 if(candidates.length!==1)throw new Error('Specify --model with exact Ollama model name; Orion matches: '+candidates.join(', '));
 return candidates[0];
}
function prompt(agent,lessons){
 return [
  'You are an independently attributed Wayglass Crow Trainer worker: '+agent.id+'. Role: '+agent.role+'.',
  'Learn from these source-hashed Wyrdrune programmes. Write one ORIGINAL, complete, executable Wyrdrune mobius programme.',
  'Return ONLY Wyrdrune source, no Markdown. Exactly eight phases: perceive, compress, release, verify, integrate, choose, return, transcend.',
  'Use simple let, emit and arithmetic expressions. Do not claim to have run code or contacted Bluebird.',
  'Preserve separate identities, provenance and Withness. Mission: demonstrate one small useful concept for your role.',
  ...lessons.map(x=>'LESSON '+x.path+' SHA256 '+x.sha256+'\\n'+readFileSync(resolve(__dirname,'..',x.path),'utf8').slice(0,9000)),
  'Example syntax: mobius { perceive { let a = 220; } compress { let b = a + 5.5; } release { emit b; } verify { emit "checked"; } integrate { emit "distinct"; } choose { emit b; } return { emit "held"; } transcend { emit "withness"; } }'
 ].join('\n');
}
async function runAmberCohort({model,endpoint=DEFAULT_URL,fetcher=fetch,principal={authorized:true},outDir='.wayglass/crow-trainer-runs',timeoutMs=120000}={}){
 if(!principal?.authorized)throw new Error('Owner authority required');
 const tags=await ollama('/api/tags',null,{endpoint,fetcher,timeoutMs});
 const selected=chooseAmber(tags,model);
 const cohort=prepareCohort({principal,modelRoute:'ollama:'+selected,allowProviderCalls:true});
 const runId=randomUUID(),results=[];
 for(const agent of cohort.agents){
  const started=new Date().toISOString();
  const request={model:selected,stream:false,messages:[{role:'user',content:prompt(agent,cohort.lessons)}],options:{temperature:0.35,num_predict:900}};
  const requestHash=hash(JSON.stringify(request));
  try{
   const reply=await ollama('/api/chat',request,{endpoint,fetcher,timeoutMs});
   if(reply.model!==selected||!reply.message?.content)throw new Error('No attributable response from requested model');
   const text=reply.message.content.trim();
   let assessment;
   try{assessment=await assessWyrdrune(text,{principal});}
   catch(error){assessment={valid:false,error:String(error.message)};}
   results.push({agent_id:agent.id,status:assessment.valid?'compiled':'needs-revision',model:reply.model,
    created_at:reply.created_at||null,started_at:started,request_sha256:requestHash,
    response_sha256:hash(text),assessment,source:text,provider:'ollama',provider_response_id:reply.id||null,
    eval_count:reply.eval_count??null,done:reply.done===true});
  }catch(error){results.push({agent_id:agent.id,status:'route-failed',started_at:started,request_sha256:requestHash,error:String(error.message)});}
 }
 const receipt={schema:'wayglass.crow-trainer-live-run/v0.1',run_id:runId,
  completed_at:new Date().toISOString(),provider:'ollama',model:selected,
  lesson_hashes:cohort.lessons.map(({path,sha256})=>({path,sha256})),results,
  live_model_called:true,weights_finetuned:false,bluebird_contacted:false,hearthweave_connected:false,
  return_marker:'crow-trainer:'+runId};
 const path=resolve(outDir,runId+'.json');await mkdir(resolve(outDir),{recursive:true});
 await writeFile(path,JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
 return {path,run_id:runId,model:selected,results:results.map(({agent_id,status,assessment})=>({agent_id,status,valid:assessment?.valid??false}))};
}
module.exports={localEndpoint,chooseAmber,runAmberCohort};
if(require.main===module){
 const args=process.argv.slice(2);
 const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:undefined;};
 runAmberCohort({model:get('--model'),endpoint:get('--endpoint')||DEFAULT_URL,outDir:get('--out')||'.wayglass/crow-trainer-runs'})
  .then(r=>{process.stdout.write(JSON.stringify(r,null,2)+'\n');if(r.results.some(x=>x.status!=='compiled'))process.exitCode=2;})
  .catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
}
