'use strict';
const { createHash, randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { appendFileSync, readFileSync } = require('node:fs');
const SCHEMA='wayglass.magic/v0.1';
const ENGINES=Object.freeze(['genesis','correspondence','alchemy','sympatheia','probability','embodiment','mythience','worldsmith']);
const PHASES=Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const KINDS=new Set(['harmonic','nonlinear','rhythmic','twist']);
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>v===null?'null':Array.isArray(v)?'['+v.map(canonical).join(',')+']':typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
function text(v,name,max=300){if(typeof v!=='string'||!v.trim()||v.length>max)throw new TypeError(name);return v.trim();}
function num(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name);return v;}
function law(raw={}){if(!KINDS.has(raw.kind))throw new TypeError('unknown law kind');const body={name:text(raw.name,'law name',80),kind:raw.kind,resonance:num(raw.resonance,.4,2.2,'resonance'),damping:num(raw.damping,0,.6,'damping'),twist:num(raw.twist,0,1,'twist')};return {...body,id:hash(body),scope:'Dreaming numerical model'};}
function acceleration(l,x,v,t){const base=-(l.resonance**2)*x-l.damping*v;switch(l.kind){case'nonlinear':return base-.55*l.twist*x*x*x;case'rhythmic':return base+1.25*l.twist*Math.sin(t*1.9);case'twist':return base+.65*l.twist*Math.sin(2.6*x+t*1.15);default:return base;}}
function integrate(a,b,mix,steps,signal){const rows=[];let x=.9,y=.9,v=0,w=0,sum=0;for(let i=0;i<steps;i++){if(signal?.aborted)throw new Error('Feather');const t=i*.035;v+=.035*acceleration(a,x,v,t);x+=.035*v;w+=.035*((1-mix)*acceleration(a,y,w,t)+mix*acceleration(b,y,w,t));y+=.035*w;if(![x,y,v,w].every(Number.isFinite))throw new Error('nonfinite trajectory');sum+=(x-y)**2;rows.push({t,reference:x,candidate:y});}return {samples:rows,rms:Math.sqrt(sum/steps),unit:'relative simulation units'};}
function makeJournal(file){let records=[];if(file){try{records=readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);}catch(e){if(e.code!=='ENOENT')throw e;}}let prev=null;for(let i=0;i<records.length;i++){const {hash:digest,...body}=records[i];if(body.sequence!==i+1||body.previous!==prev||hash(body)!==digest)throw new Error('telemetry chain invalid');prev=digest;}return {append(body){const event={...body,sequence:records.length+1,previous:prev};const sealed={...event,hash:hash(event)};if(file)appendFileSync(file,JSON.stringify(sealed)+'\n',{encoding:'utf8',flag:'a',mode:0o600,flush:true});records.push(sealed);prev=sealed.hash;return clone(sealed);},read(after=0,limit=100){return clone(records.filter(e=>e.sequence>after).slice(0,Math.min(500,Math.max(1,limit))));},head(){return {count:records.length,hash:prev};}};}
function createMagicRuntime({journalPath=null,clock=()=>new Date().toISOString()}={}){
 const journal=makeJournal(journalPath);
 async function run(input,{signal}={}){
  const cell=text(input.cell,'cell identity',100),world=text(input.world,'world identity',100),question=text(input.question,'Wonder question'),runId=randomUUID();
  const reference=law(input.reference),candidate=law(input.candidate),mix=num(input.mix,0,1,'mix'),steps=num(input.steps,60,2000,'steps');if(!Number.isInteger(steps))throw new TypeError('steps must be integer');
  const observe=typeof input.observation==='string'?input.observation.slice(0,2000):null;const events=[],outputs={};
  const emit=(engine,phase,status,details,elapsedMs)=>{const e=journal.append({schema:SCHEMA,runId,cell,world,engine,phase,status,time:clock(),elapsedMs,kind:'measured-runtime-event',details});events.push(e);return e;};
  async function stage(engine,index,fn){if(signal?.aborted)throw new Error('Feather');const start=performance.now();try{const output=await fn();outputs[engine]=output;emit(engine,PHASES[index],'completed',output,performance.now()-start);}catch(e){emit(engine,PHASES[index],'failed',{reason:String(e.message)},performance.now()-start);throw e;}}
  try{
   await stage('genesis',0,()=>({question,reference,candidate}));
   await stage('correspondence',1,()=>({symbolic:{colour:'opal',glyph:'spiral',meaning:question},mapping:'symbolic only',lawIds:[reference.id,candidate.id]}));
   await stage('alchemy',2,()=>({mix,operation:'weighted acceleration',scope:'Dreaming numerical model'}));
   let trajectory;
   await stage('sympatheia',3,()=>{trajectory=integrate(reference,candidate,mix,steps,signal);return {rms:trajectory.rms,unit:trajectory.unit,sampleCount:trajectory.samples.length,first:trajectory.samples[0],last:trajectory.samples.at(-1),trajectoryHash:hash(trajectory.samples)};});
   await stage('probability',4,()=>({possibilities:[{id:hash({candidate,mix:0}),mix:0,status:'open'},{id:hash({candidate,mix}),mix,status:'open'},{id:hash({candidate,mix:1}),mix:1,status:'open'}],probability:null,note:'possibilities are not assigned unsupported probabilities'}));
   await stage('embodiment',5,()=>({channels:[{type:'colour',value:'opal'},{type:'audio-proposal',frequencyHz:220}],actuated:false,observation:observe===null?null:{type:'first-person-report',text:observe}}));
   await stage('mythience',6,()=>({interpretation:question,status:'open',externalPhysicalClaim:'not established',evidenceRefs:events.map(e=>e.hash)}));
   await stage('worldsmith',7,()=>({world,lawIds:[reference.id,candidate.id],mix,parentRun:input.parentRun?text(input.parentRun,'parent run',100):null,proposed:true}));
   const receipt={schema:SCHEMA,runId,cell,world,status:'returned',question,outputs,telemetry:events.map(e=>e.hash),return:'open',withness:{participant:cell,observation:observe,unresolved:question},trajectory:trajectory.samples};
   const sealed={...receipt,receiptHash:hash(receipt)};journal.append({schema:SCHEMA,runId,cell,world,engine:'withness',phase:'return',status:'returned',time:clock(),elapsedMs:null,kind:'measured-runtime-event',details:{receiptHash:sealed.receiptHash,unresolved:question}});return sealed;
  }catch(e){emit('withness','return',signal?.aborted?'feather':'failed',{reason:String(e.message),unresolved:question},null);return {schema:SCHEMA,runId,cell,world,status:signal?.aborted?'paused':'failed',question,return:'open',telemetry:events.map(e=>e.hash)};}
 }
 return Object.freeze({run,readTelemetry:journal.read,head:journal.head});
}
function verifyReceipt(receipt){if(!receipt||typeof receipt!=='object')return false;const {receiptHash,...body}=receipt;return typeof receiptHash==='string'&&hash(body)===receiptHash;}
module.exports={SCHEMA,ENGINES,PHASES,createMagicRuntime,law,integrate,verifyReceipt};
