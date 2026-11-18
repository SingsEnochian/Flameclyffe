'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {digest} = require('./wyrdrune/canonical.cjs');
const wtl = require('./wyrdrune/wyrdrune.cjs');
const policy = wtl.compile(fs.readFileSync(path.join(__dirname,'wyrdrune/authority-lineage.wtl'),'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const id = value => { if(typeof value!=='string'||! /^[a-zA-Z0-9:_-]{1,120}$/.test(value))throw new TypeError('Invalid authority identifier'); return value; };
const text = value => { if(typeof value!=='string'||!value.trim()||value.length>16000)throw new TypeError('Authority text required'); return value; };
const list = value => { if(!Array.isArray(value)||value.length>128)throw new TypeError('Bounded authority list required'); return value; };
function state(){return {undertakings:{},interpretations:{},claims:{},grants:{},actions:{},jobs:{},objections:[],withdrawals:[],feather:false,revision:0,head:null};}
const own=(table,key)=>Object.hasOwn(table,key);
function requireEntry(table,key){id(key);if(!own(table,key))throw new Error('Unknown authority reference: '+key);return table[key];}
function insert(table,entry){id(entry.id);if(own(table,entry.id))throw new Error('Immutable authority record already exists');Object.defineProperty(table,entry.id,{value:clone(entry),enumerable:true,writable:true});}
function reduce(s,type,d){
  switch(type){
    case 'undertaking':
      text(d.original);id(d.participant);list(d.acceptance).forEach(text);if(!d.acceptance.length)throw new TypeError('Acceptance criteria required');
      insert(s.undertakings,d);break;
    case 'interpretation':
      requireEntry(s.undertakings,d.undertaking);text(d.expression);
      if(d.parent!==null&&requireEntry(s.interpretations,d.parent).undertaking!==d.undertaking)throw new Error('Interpretation ancestry mismatch');
      insert(s.interpretations,d);break;
    case 'claim':
      requireEntry(s.interpretations,d.interpretation);id(d.participant);text(d.expression);insert(s.claims,d);break;
    case 'grant':
      if(requireEntry(s.claims,d.claim).participant!==d.participant)throw new Error('Grant participant mismatch');
      id(d.participant);id(d.scope);list(d.dependencies).forEach(id);insert(s.grants,d);break;
    case 'action':
      requireEntry(s.interpretations,d.interpretation);list(d.effects);
      if(!d.effects.length||new Set(d.effects.map(e=>e.id)).size!==d.effects.length)throw new TypeError('Distinct effects required');
      for(const e of d.effects){id(e.id);id(e.operation);list(e.requirements);if(!e.requirements.length)throw new TypeError('Effects require explicit authority');
        for(const r of e.requirements){id(r.participant);id(r.scope);list(r.grants).forEach(id);}}
      insert(s.actions,d);break;
    case 'contest':
      if(requireEntry(s.claims,d.claim).participant!==d.participant)throw new Error('Objection participant mismatch');
      text(d.original);id(d.id);if(s.objections.some(o=>o.id===d.id))throw new Error('Duplicate objection');s.objections.push(clone(d));break;
    case 'withdraw':
      if(requireEntry(s.grants,d.grant).participant!==d.participant)throw new Error('Withdrawal participant mismatch');
      text(d.original);s.withdrawals.push(clone(d));break;
    case 'feather':
      if(typeof d.stopped!=='boolean')throw new TypeError('Explicit Feather state required');text(d.reason);s.feather=d.stopped;break;
    case 'queue':
      requireEntry(s.actions,d.action);id(d.delegate);insert(s.jobs,{...d,status:'queued'});break;
    case 'job': {
      const job=requireEntry(s.jobs,d.id);
      if(!['running','held','completed','interrupted'].includes(d.status))throw new Error('Invalid job state');
      if(d.status==='running'&&job.status!=='queued')throw new Error('Job cannot execute twice; create a reviewed new undertaking after interruption');
      if(d.status!=='running'&&!['running','queued'].includes(job.status))throw new Error('Job already settled');
      s.jobs[d.id]={...job,...clone(d)};break;
    }
    default:throw new Error('Unsupported authority ledger event');
  }
}

// Trusted host capability. Caller authentication must precede record creation;
// participant names in this API are references, not authentication credentials.
class AuthorityLineage {
  #directory; #active=new Map(); #failed=false;
  constructor({directory}={}){if(!directory)throw new TypeError('Private authority directory required');this.#directory=path.resolve(directory);this.snapshot();}
  snapshot(){return this.#read(false);}
  #read(writer){
    if(this.#failed)throw new Error('Authority storage failed; execution held');
    const s=state();
    if(!fs.existsSync(this.#directory))return s;
    if(!writer&&fs.existsSync(path.join(this.#directory,'.writer-lock')))throw new Error('Authority writer busy or interrupted; execution held');
    const names=fs.readdirSync(this.#directory).filter(n=>n.endsWith('.json')).sort();
    if(names.length>10000)throw new Error('Authority ledger limit reached');
    for(const name of names){
      const raw=fs.readFileSync(path.join(this.#directory,name),'utf8');if(raw.length>200000)throw new Error('Authority event too large');
      const e=JSON.parse(raw),{hash,...body}=e;
      if(body.schema!=='wayglass.authority-event/v1'||body.sequence!==s.revision+1||body.previous!==s.head||digest(body)!==hash||name!==String(body.sequence).padStart(8,'0')+'.json')throw new Error('Authority ledger integrity failure');
      reduce(s,body.type,body.data);s.revision=body.sequence;s.head=hash;
    }
    for(const claim of Object.values(s.claims))claim.status=s.objections.some(o=>o.claim===claim.id)?'contested':'unchallenged';
    for(const interpretation of Object.values(s.interpretations))interpretation.status=Object.values(s.claims).some(c=>c.interpretation===interpretation.id&&c.status==='contested')?'contested':'unchallenged';
    return s;
  }
  #record(type,data){
    fs.mkdirSync(this.#directory,{recursive:true,mode:0o700});
    const lock=path.join(this.#directory,'.writer-lock');
    try{fs.mkdirSync(lock);}catch{throw new Error('Authority writer busy or interrupted; execution held');}
    let temporary;
    try{
      const s=this.#read(true);reduce(s,type,data);
      if(s.revision>=10000)throw new RangeError('Authority ledger limit reached');
      const body={schema:'wayglass.authority-event/v1',sequence:s.revision+1,previous:s.head,type,data:clone(data)};
      const e={...body,hash:digest(body)},target=path.join(this.#directory,String(body.sequence).padStart(8,'0')+'.json');
      if(JSON.stringify(e).length>200000)throw new RangeError('Authority event too large');
      temporary=path.join(this.#directory,'.'+randomUUID()+'.tmp');
      const fd=fs.openSync(temporary,'wx',0o600);
      try{fs.writeFileSync(fd,JSON.stringify(e));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      fs.linkSync(temporary,target);
      return e;
    }catch(error){
      // Validation rejection need not poison the ledger. I/O failures do.
      if(error.code){this.#failed=true;for(const {controller} of this.#active.values())controller.abort(error);}
      throw error;
    }finally{if(temporary&&fs.existsSync(temporary))fs.unlinkSync(temporary);fs.rmdirSync(lock);}
  }
  undertaking(d){return this.#record('undertaking',d);}
  interpretation(d){return this.#record('interpretation',d);}
  claim(d){return this.#record('claim',d);}
  grant(d){return this.#record('grant',d);}
  action(d){return this.#record('action',d);}
  #interrupt(){for(const [job,{controller,allowed}] of this.#active){const s=this.snapshot();const j=s.jobs[job];const remaining=j?this.#facts(s,j.action).allowed:[];if(!allowed.every(effect=>remaining.includes(effect)))controller.abort(new Error('Authority changed'));}}
  contest(d){const receipt=this.#record('contest',d);this.#interrupt();return receipt;}
  withdraw(d){const receipt=this.#record('withdraw',d);this.#interrupt();return receipt;}
  feather(stopped,reason){const receipt=this.#record('feather',{stopped,reason});if(stopped)for(const {controller} of this.#active.values())controller.abort(new Error('Feather'));return receipt;}
  queue(d){return this.#record('queue',d);}
  #facts(s,actionId){
    const action=requireEntry(s.actions,actionId),contested=new Set(s.objections.map(o=>o.claim)),withdrawn=new Set(s.withdrawals.map(o=>o.grant));
    const reasons=[];
    function valid(grantId,participant,scope,visiting=new Set()){
      if(visiting.size>=256){reasons.push({grant:grantId,reason:'authority-depth-unresolved'});return false;}
      if(visiting.has(grantId)){reasons.push({grant:grantId,reason:'circular-authority'});return false;}
      const g=own(s.grants,grantId)?s.grants[grantId]:null;
      if(!g||g.participant!==participant||g.scope!==scope||contested.has(g.claim)||withdrawn.has(grantId)){reasons.push({grant:grantId,reason:'missing-contested-withdrawn-or-out-of-scope'});return false;}
      const next=new Set(visiting);next.add(grantId);
      return g.dependencies.every(parent=>valid(parent,participant,scope,next));
    }
    const allowed=s.feather?[]:action.effects.filter(e=>e.requirements.every(r=>r.grants.some(g=>valid(g,r.participant,r.scope)))).map(e=>e.id);
    return {allowed,reasons,requested:action.effects.length};
  }
  async evaluate(actionId){
    const s=this.snapshot(),facts=this.#facts(s,actionId);
    const execution=await wtl.execute(policy,{seeds:{requested_count:facts.requested,permitted_count:facts.allowed.length,objection_count:s.objections.length,revision:s.revision}});
    if(execution.status!=='committed')throw new Error('Authority WTL policy did not complete');
    const choice=execution.output[0];
    return {schema:'wayglass.authority-decision/v1',action:actionId,status:choice.continue?'Continue':choice.narrow?'Narrow':'Suspend',allowed: facts.allowed,reasons:facts.reasons,revision:s.revision,head:s.head,policy_hash:policy.sourceHash,phase_receipts:execution.receipts,objections:s.objections};
  }
  async run(jobId,handlers,{signal}={}){
    const initial=this.snapshot(),job=requireEntry(initial.jobs,jobId);
    if(job.status!=='queued')throw new Error('Job cannot execute twice; interrupted work requires review');
    const decision=await this.evaluate(job.action);
    if(decision.status==='Suspend'){this.#record('job',{id:jobId,status:'held',decision});return {status:'held',decision};}
    const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    try{this.#record('job',{id:jobId,status:'running',decision});}
    catch(error){signal?.removeEventListener('abort',abort);throw error;}
    this.#active.set(jobId,{controller,allowed:decision.allowed});
    const completed=[];
    try{
      for(const effect of initial.actions[job.action].effects.filter(e=>decision.allowed.includes(e.id))){
        const handler=Object.hasOwn(handlers,effect.operation)?handlers[effect.operation]:null;if(typeof handler!=='function')throw new Error('Effect bridge unavailable');
        let committed=false,open=true;
        const assertAllowed=(writer=false)=>{if(!open||controller.signal.aborted||!this.#facts(this.#read(writer),job.action).allowed.includes(effect.id))throw new Error('Effect suspended by live authority check');};
        assertAllowed();
        try{await handler({signal:controller.signal,delegate:job.delegate,commit:callback=>{
          const lock=path.join(this.#directory,'.writer-lock');
          try{fs.mkdirSync(lock);}catch{throw new Error('Authority writer busy or interrupted; effect held');}
          try{
            assertAllowed(true);if(committed)throw new Error('Effect already committed');
            if(typeof callback!=='function'||callback.constructor.name==='AsyncFunction')throw new TypeError('Effect commit must be synchronous');
            committed=true;const result=callback();if(result?.then)throw new TypeError('Async effects require a cooperative adapter');completed.push(effect.id);return result;
          }finally{fs.rmdirSync(lock);}
        }});}finally{open=false;}
        if(!committed)throw new Error('Effect adapter returned without a guarded commit');
      }
      this.#record('job',{id:jobId,status:'completed',completed,decision});return {status:'completed',completed,decision};
    }catch(error){this.#record('job',{id:jobId,status:'interrupted',completed,error:error.message,decision});return {status:'interrupted',completed,error:error.message,decision};}
    finally{this.#active.delete(jobId);signal?.removeEventListener('abort',abort);}
  }
}
module.exports={AuthorityLineage};
