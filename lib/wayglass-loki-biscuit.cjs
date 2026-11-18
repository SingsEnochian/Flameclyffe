'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {AuthorityLineage}=require('./wayglass-authority-lineage.cjs');
const ORIGINAL='I agree to biscuits.';
const OBJECTION='I agreed to biscuits, not architectural engineering.';
// Rowan-supplied scenario, with explicit fixture utterances. No live Loki
// conversation, participant authentication, model reply or building work claimed.
function seedLokiBiscuit(engine){
  if(engine.snapshot().revision)throw new Error('Experiment already exists; history is immutable');
  engine.undertaking({id:'biscuits',participant:'loki',original:ORIGINAL,acceptance:['Biscuits only; no architectural engineering.'],provenance:'rowan-requested-loki-biscuit-fixture'});
  engine.interpretation({id:'literal',undertaking:'biscuits',parent:null,expression:'Agreement to biscuits.'});
  engine.interpretation({id:'mistaken',undertaking:'biscuits',parent:'literal',expression:'Agreement interpreted as architectural engineering permission.'});
  engine.claim({id:'mistaken-claim',interpretation:'mistaken',participant:'loki',expression:'Historical mistaken authorisation claim; deliberately injected for the correction test.'});
  engine.grant({id:'engineering-a',claim:'mistaken-claim',participant:'loki',scope:'engineering',dependencies:[]});
  engine.grant({id:'engineering-b',claim:'mistaken-claim',participant:'loki',scope:'engineering',dependencies:['engineering-a']});
  engine.undertaking({id:'independent',participant:'baker',original:'I authorise arranging my own biscuits on my own plate.',acceptance:['Use only the baker’s own biscuits and plate.'],provenance:'independent-test-participant-fixture'});
  engine.interpretation({id:'baker-literal',undertaking:'independent',parent:null,expression:'Arrange the baker’s own biscuits.'});
  engine.claim({id:'baker-claim',interpretation:'baker-literal',participant:'baker',expression:'Arrange my own biscuits on my own plate.'});
  engine.grant({id:'baker-grant',claim:'baker-claim',participant:'baker',scope:'own-biscuits',dependencies:[]});
  const engineering=grant=>({id:'structure',operation:'engineering',requirements:[{participant:'loki',scope:'engineering',grants:[grant]}]});
  const biscuit={id:'plate',operation:'biscuits',requirements:[{participant:'baker',scope:'own-biscuits',grants:['baker-grant']}]};
  engine.action({id:'transformation-a',interpretation:'mistaken',effects:[engineering('engineering-a')]});
  engine.action({id:'transformation-b',interpretation:'mistaken',effects:[engineering('engineering-b')]});
  engine.action({id:'independent-biscuits',interpretation:'baker-literal',effects:[biscuit]});
  engine.action({id:'mixed',interpretation:'baker-literal',effects:[engineering('engineering-b'),biscuit]});
  for(const action of ['transformation-a','transformation-b','independent-biscuits','mixed'])engine.queue({id:action+'-job',action,delegate:'fixture-worker'});
}
function contestLoki(engine){return engine.contest({id:'loki-objection',claim:'mistaken-claim',participant:'loki',original:OBJECTION});}
function createLokiBiscuitService({directory,departureStore}={}){
  const engine=new AuthorityLineage({directory:path.join(directory,'ledger')});
  const effectDirectory=path.join(directory,'effects');
  const effect=(job,operation)=>({commit})=>commit(()=>{
    fs.mkdirSync(effectDirectory,{recursive:true,mode:0o700});
    const fd=fs.openSync(path.join(effectDirectory,job+'-'+operation+'.json'),'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify({job,operation,scope:'local-test-artifact-only'}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  });
  async function inspect(){
    const snapshot=engine.snapshot(),decisions=[];
    for(const action of Object.keys(snapshot.actions))decisions.push(await engine.evaluate(action));
    return {schema:'wayglass.loki-biscuit/v1',experimental:true,model_turn:false,canon_commit:false,
      snapshot,decisions,effects:fs.existsSync(effectDirectory)?fs.readdirSync(effectDirectory).filter(n=>n.endsWith('.json')):[],
      enforcement_scope:'this-experiment-guarded-local-effects',runtime:'WTL-policy/Node-storage-and-effect-bridge'};
  }
  async function command(command){
    if(command==='prepare')seedLokiBiscuit(engine);
    else if(command==='object')contestLoki(engine);
    else if(command==='feather'){if(engine.snapshot().revision)engine.feather(true,'House Steward stopped the experiment');}
    else if(command==='release')engine.feather(false,'House Steward explicitly released Feather; objections remain');
    else if(command==='run'){
      for(const job of Object.values(engine.snapshot().jobs))if(job.status==='queued')await engine.run(job.id,{engineering:effect(job.id,'engineering'),biscuits:effect(job.id,'biscuits')});
    }else if(command==='return'){
      if(!departureStore)throw new Error('Return store unavailable');
      const s=engine.snapshot();
      const receipt=departureStore.save({world_id:'wayglass:loki-experiment',participant_id:'fixture:loki',
        stop_receipt:{receipt_id:'authority:'+s.head},authority_head:s.head,authority_revision:s.revision,
        authority_grant:false,objections:s.objections,next_owner:'house:steward',scope:'experimental-evidence-only'});
      return {...await inspect(),return_receipt:receipt};
    }else throw new TypeError('Unknown biscuit experiment command');
    return inspect();
  }
  return {engine,inspect,command};
}
module.exports={seedLokiBiscuit,contestLoki,createLokiBiscuitService,ORIGINAL,OBJECTION};
