'use strict';
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {randomUUID}=require('node:crypto');
function createKernelCustody({directory=path.join(process.env.WAYGLASS_DATA_DIR||path.join(os.homedir(),'.wayglass'),'magic-kernel'),makeKernel=()=>require('./wyrdrune/wyrdrune.cjs').createUpgradeableKernel()}={}){
 const target=path.join(directory,'active.json'),proposals=path.join(directory,'proposals');let kernel=null,tail=Promise.resolve();
 function owner(p){if(p?.authorized!==true||p.id!=='house:steward')throw Object.assign(new Error('House kernel custody required'),{status:401});}
 function serial(fn){const next=tail.then(fn);tail=next.catch(()=>{});return next;}
 async function start(){if(kernel)return kernel;const candidate=makeKernel();try{const record=JSON.parse(fs.readFileSync(target,'utf8'));await candidate.restore(record,{authorized:true,expectedVersion:candidate.snapshot().activeVersion});}catch(error){if(error.code!=='ENOENT')throw error;}kernel=candidate;return kernel;}
 function persist(k){fs.mkdirSync(directory,{recursive:true,mode:0o700});const temp=path.join(directory,'.'+randomUUID()+'.tmp');const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(k.snapshot()));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}try{fs.renameSync(temp,target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
 function preserveProposal(p){fs.mkdirSync(proposals,{recursive:true,mode:0o700});const file=path.join(proposals,p.candidate.id+'.json');try{fs.writeFileSync(file,JSON.stringify(p),{flag:'wx',mode:0o600,flush:true});}catch(e){if(e.code!=='EEXIST')throw e;}}
 async function inspect(principal){owner(principal);return serial(async()=>({schema:'wayglass.kernel-custody/v0.1',snapshot:(await start()).snapshot()}));}
 async function propose(input,principal){owner(principal);return serial(async()=>{const k=await start(),receipt=await k.propose(input.proposal,{expectedVersion:input.expectedVersion});preserveProposal(receipt);return receipt;});}
 async function change(input,principal,operation){owner(principal);if(input.confirmed!==true)throw new Error('Explicit owner confirmation required');return serial(async()=>{const k=await start(),before=k.snapshot(),result=operation==='adopt'?k.adopt(input.id,{authorized:true,expectedVersion:input.expectedVersion,allowBreaking:input.allowBreaking===true}):k.rollback(input.id,{authorized:true,expectedVersion:input.expectedVersion});try{persist(k);}catch(e){await k.restore(before,{authorized:true,expectedVersion:k.snapshot().activeVersion});throw e;}return result;});}
 async function execute(input,principal){owner(principal);return serial(async()=>{const k=await start();if(typeof input.source!=='string'||!input.source.trim()||input.source.length>12000)throw TypeError('Bounded WTL source required');const programme=k.compile(input.source,{version:input.version??k.snapshot().activeVersion});const result=await k.execute(programme,{bridges:Object.freeze({}),principal:null,maxOperations:1000});return {schema:'wayglass.kernel-custody/v0.1',programme,result};});}
 // Trusted internal callers get only the versioned compiler/executor, not
 // adoption authority. Each new compile takes the current retained version.
 async function runtime(){return serial(async()=>{const k=await start();return Object.freeze({compile:k.compile,execute:k.execute});});}
 return Object.freeze({inspect,propose,adopt:(x,p)=>change(x,p,'adopt'),rollback:(x,p)=>change(x,p,'rollback'),execute,runtime});
}
module.exports={createKernelCustody};
