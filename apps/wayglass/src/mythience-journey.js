// A traveller's in-session Mythience continuity is opt-in, not automatic.
// This is a local preview ledger, never an authoritative world/canon ledger.
export const MYTHIENCE_JOURNEY_SCHEMA='wayglass.mythience-journey/v0.1';
const SEEDS=Object.freeze({crossings:0,attunement:0.5,charge:1});
const copy=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw new Error(message);};
const bounded=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
function checkedCarry(carry){
  if(!carry||!Number.isSafeInteger(carry.crossings)||carry.crossings<0||
    !bounded(carry.attunement)||!bounded(carry.charge))
    fail('Wyrdrune returned invalid carried state');
  return {crossings:carry.crossings,attunement:carry.attunement,charge:carry.charge};
}
export function createMythienceJourney(){
  let travellerId=null,seeds=copy(SEEDS),history=[],abilities=[],lineage=[],pending=null,revision=0;
  function snapshot(){
    return copy({schema:MYTHIENCE_JOURNEY_SCHEMA,traveller_id:travellerId,
      seeds,history,abilities,lineage,pending,revision,scope:'in-session-preview-only',
      physical_crossing:false,canon_adopted:false});
  }
  function offer(result,{traveller_id,expected_revision}={}){
    if(expected_revision!==undefined&&expected_revision!==revision)fail('Stale encounter proposal: journey changed');
    if(typeof traveller_id!=='string'||!traveller_id.trim())fail('Traveller identity required');
    if((travellerId&&travellerId!==traveller_id)||(pending&&pending.traveller_id!==traveller_id))
      fail('This journey belongs to another traveller. Start a new journey first.');
    if(!result||!['candidate-returned','denied'].includes(result.status))
      fail('Unrecognised Wyrdrune proposal');
    if(result.status==='denied'){pending=null;revision++;return snapshot();}
    const c=result.candidate;
    if(!c||c.traveller_id!==traveller_id||typeof result.input_hash!=='string'||
      !/^[0-9a-f]{64}$/.test(result.input_hash)||!Array.isArray(result.phase_receipts)||result.phase_receipts.length!==8||
      !result.phase_receipts.every((receipt,index)=>receipt&&typeof receipt==='object'&&
        !Array.isArray(receipt)&&receipt.phase===index))
      fail('Wyrdrune candidate has incomplete identity or provenance');
    if(c.parents!==undefined&&!Array.isArray(c.parents))
      fail('Hybrid parent provenance must be a pair');
    const kind=Array.isArray(c.parents)?'hybrid':'crossing';
    if(!bounded(c.expression)||!c.ability&&!c.parents)
      fail('Candidate is missing translated ability');
    if(typeof result.source_hash!=='string'||!result.source_hash.trim())
      fail('Wyrdrune source provenance is required');
    const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(v);
    if(kind==='crossing'){
      if(!validId(c.from)||!validId(c.to)||!c.ability||
        !validId(c.ability.id)||!validId(c.ability.origin_universe)||
        !validId(c.ability.modality)||c.from===c.to)
        fail('Crossing identity or ability provenance is incomplete');
    }else{
      if(!validId(c.id)||!validId(c.destination_universe)||c.parents.length!==2||
        c.parents.some(a=>!validId(a.id)||!validId(a.origin_universe)))
        fail('Hybrid identity or parent provenance is incomplete');
    }
    if(kind==='hybrid'){
      if(c.parents.length!==2||(c.parents[0].id===c.parents[1].id&&c.parents[0].origin_universe===c.parents[1].origin_universe)||
        !abilities.some(a=>a.id===c.parents[0].id&&a.origin_universe===c.parents[0].origin_universe)||
        !abilities.some(a=>a.id===c.parents[1].id&&a.origin_universe===c.parents[1].origin_universe))
        fail('Hybrid parents are not in this traveller\'s carried lineage');
    }
    const carry=checkedCarry(result.carry);
    if(kind==='crossing'&&carry.crossings!==seeds.crossings+1)
      fail('Crossing sequence does not follow this traveller\'s Return anchor');
    if(kind==='hybrid'&&carry.crossings!==seeds.crossings)
      fail('Hybrid cannot silently advance crossing count');
    if(carry.charge>seeds.charge)fail('Candidate cannot mint charge');
    const experienceId='experience:'+result.input_hash.slice(0,32);
    if(history.some(h=>h.id===experienceId))fail('This encounter has already been carried');
    revision++;
    pending={kind,traveller_id,experience_id:experienceId,source_hash:result.source_hash,
      input_hash:result.input_hash,carry,candidate:copy(c)};
    return snapshot();
  }
  function carry({expected_revision}={}){
    if(expected_revision!==undefined&&expected_revision!==revision)fail('Stale carry: journey changed');
    if(!pending)fail('No proposed encounter to carry');
    const p=pending,c=p.candidate;
    if(travellerId&&travellerId!==p.traveller_id)fail('Traveller identity mismatch');
    const destination=p.kind==='hybrid'?c.destination_universe:c.to;
    const origin=p.kind==='hybrid'?c.parents[0].origin_universe:c.from;
    const ability=p.kind==='hybrid'
      ?{id:c.id,origin_universe:destination,modality:'hybrid',expression:c.expression}
      :{id:c.ability.id,origin_universe:c.ability.origin_universe,
        modality:c.ability.modality,expression:c.expression};
    if(history.some(h=>h.id===p.experience_id))fail('Duplicate encounter');
    const nextHistory=[...history,{id:p.experience_id,origin_universe:origin,
      destination_universe:destination,expression:c.expression}].slice(-32);
    const nextAbilities=[...abilities,ability].slice(-32);
    const nextLineage=[...lineage,{experience_id:p.experience_id,kind:p.kind,
      source_hash:p.source_hash,input_hash:p.input_hash,traveller_id:p.traveller_id,
      parent_refs:p.kind==='hybrid'?c.parents.map(x=>({id:x.id,origin_universe:x.origin_universe})):[],
      ability:copy(ability)}].slice(-32);
    travellerId=p.traveller_id;seeds=copy(p.carry);history=nextHistory;
    abilities=nextAbilities;lineage=nextLineage;pending=null;revision++;
    return snapshot();
  }
  function discard(){pending=null;revision++;return snapshot();}
  function reset(){
    travellerId=null;seeds=copy(SEEDS);history=[];abilities=[];lineage=[];pending=null;revision++;
    return snapshot();
  }
  return Object.freeze({snapshot,offer,carry,discard,reset});
}

// One tab-local journey shared by ship rooms. Never stored, exported or canonised implicitly.
let shipJourney=null;
export function wayglassMythienceJourney(){
  if(!shipJourney)shipJourney=createMythienceJourney();
  return shipJourney;
}
