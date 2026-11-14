import { createWorld } from './worlds.js';
import { compileWorldseed } from './worldseed.js';
import { forkWorldFromSeed } from './worldseed-fork.js';

export const TIMELINE_ORIGINAL_SCHEMA = 'wayglass.timeline-original/v0.1';
export const TIMELINE_ALTERED_SCHEMA = 'wayglass.timeline-altered/v0.1';
export const TIMELINE_CHANGE_SCHEMA = 'wayglass.timeline-introduced-change/v0.1';
export const TIMELINE_RIPPLE_SCHEMA = 'wayglass.altered-timeline-ripple/v0.1';
const MODES = new Set(['replace','insert','omit']);
const RIPPLE_LEVELS = ['near','middle','far','echo'];
const copy = value => structuredClone(value);
const str = (value, label, max=600) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      /[\u0000-\u0008\u000e-\u001f]/u.test(value)) throw new TypeError('Invalid '+label);
  return value.trim();
};
const refs = values => [...new Set((Array.isArray(values)?values:[])
  .filter(value=>typeof value==='string'&&value.trim())
  .map(value=>str(value,'source reference',300)))];
const day = value => {
  const v=str(value,'date',10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      Number.isNaN(Date.parse(v)) ||
      new Date(v).toISOString().slice(0,10)!==v)
    throw new TypeError('Timeline date must be a real ISO calendar day (YYYY-MM-DD)');
  return v;
};

export function createTimelineOriginal({
  worldId='scenario-laboratory',worldName='Scenario Laboratory',parentWorld=null,
  events=[],sourceRefs=['owner:local-what-if'],at=new Date().toISOString(),
}={}) {
  const world=parentWorld ? copy(parentWorld) : createWorld(str(worldId,'world ID',120),at);
  world.id=str(world.id,'world ID',120);
  world.name=str(parentWorld?.name||worldName,'world name',180);
  if(!parentWorld)world.kind='Owner-authored experimental scenario';
  if(!Array.isArray(events)||!events.length||events.length>64)
    throw new RangeError('Original timeline requires 1–64 events');
  const seen=new Set();
  const entries=events.map((event,index)=>{
    const id=str(event?.id||'event-'+(index+1),'event ID',120);
    if(seen.has(id))throw new TypeError('Duplicate timeline event ID');
    seen.add(id);
    return {
      id, at:day(event?.at), title:str(event?.title,'original event',1600),
      source_refs:refs(event?.source_refs||sourceRefs),
      classification:'owner-supplied-unverified',
    };
  });
  if(entries.some(event=>!event.source_refs.length))
    throw new TypeError('Source references required for each original event');
  entries.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
  return {
    schema:TIMELINE_ORIGINAL_SCHEMA,version:1,
    world, events:entries, source_refs:refs(sourceRefs),created_at:at,
    assertion:'owner-authored scenario, not a verified Waking World history',
    canon_commit:false,model_dispatch:false,
  };
}

export function validateWyrdruneRipple(score) {
  if(score?.schema!==TIMELINE_RIPPLE_SCHEMA||score.mode!=='hypothetical'||
     score.confirmed!==true||score.reversible!==true||
     score.requires_explicit_choice!==true||
     score.probability_claimed!==false||score.inferred_events!==0||
     !Array.isArray(score.levels)||score.levels.length!==RIPPLE_LEVELS.length)
    throw new TypeError('Verified native Wyrdrune ripple score required');
  const levels=score.levels.map((level,i)=>{
    const expected=RIPPLE_LEVELS[i],value=level?.intensity;
    if(level?.id!==expected||typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)
      throw new TypeError('Invalid Wyrdrune ripple level: '+expected);
    return {id:expected,label:str(level.label,'ripple label',80),intensity:value};
  });
  if(!levels.every((level,i)=>i===0||level.intensity<=levels[i-1].intensity))
    throw new TypeError('Ripple strengths must not amplify without an authored mechanism');
  return levels;
}

export function buildAlteredTimeline({
  original,branchId,changes,approved=false,featherStopped=false,
  at=new Date().toISOString(),
}={}) {
  if(featherStopped)throw new Error('Feather Stop: altered timeline is paused');
  if(approved!==true)throw new Error('An explicit local owner choice is required');
  if(original?.schema!==TIMELINE_ORIGINAL_SCHEMA || !original.world?.id)
    throw new TypeError('Original timeline required');
  const source=createTimelineOriginal({
    parentWorld:original.world,events:original.events,
    sourceRefs:original.source_refs,at:original.created_at,
  });
  if(!Array.isArray(changes)||changes.length<1||changes.length>32)
    throw new RangeError('Introduce 1–32 explicit changes');
  const childId=str(branchId,'altered branch ID',120);
  if(childId===source.world.id)throw new TypeError('Altered timeline must have a distinct world ID');
  const first=changes[0],firstTarget=source.events.find(e=>e.id===first?.target_id);
  if(!firstTarget)throw new TypeError('First change must identify an original event');
  const seed=compileWorldseed(source.world,[{
    id:'altered-timeline-baseline:'+source.world.id,
    worldId:source.world.id,title:'Immutable event ledger',seedType:'Inheritance Rule',
    status:'Germinating',mustSurvive:'Original events and original source references',
    mayChange:'Events in expressly chosen experimental descendants',
    sourceRefs:source.source_refs.join(', '),
    notes:JSON.stringify(source.events),
  }],at);
  const fork=forkWorldFromSeed({
    parentWorld:source.world,seed,childId,
    childName:source.world.name+' · Altered',mode:'experimental',
    branchPoint:firstTarget.at+' / '+firstTarget.id,
    reason:'Owner-directed counterfactual changes; no original event is overwritten',
    now:at,
  });
  const childEvents=copy(source.events),changeReceipts=[];
  let firstAlteredAt=null;
  for(const [index,change] of changes.entries()){
    const mode=change?.mode, targetId=str(change?.target_id,'branch-point event ID',120);
    if(!MODES.has(mode))throw new TypeError('Unsupported change operation');
    const targetSource=source.events.find(e=>e.id===targetId);
    if(!targetSource)throw new TypeError('Change must anchor to a source-world event');
    const ripple=validateWyrdruneRipple(change?.ripple);
    if(!Number.isFinite(change?.magnitude)||change.magnitude<0||change.magnitude>1)
      throw new RangeError('Change magnitude must be within 0..1');
    const eventTitle=mode==='omit'?'':str(change?.title,'new timeline event',1600);
    const reason=str(change?.reason||'Owner-authored alteration','change reason',700);
    const sourceRefs=refs(change.source_refs||['owner:local-what-if']);
    if(!sourceRefs.length)throw new TypeError('Altered change needs source attribution');
    const position=childEvents.findIndex(e=>e.id===targetId);
    if(position<0)throw new Error('Cannot alter or insert after an omitted event');
    if(firstAlteredAt===null||targetSource.at<firstAlteredAt)firstAlteredAt=targetSource.at;
    let resultId=targetId;
    const before=copy(childEvents[position]);
    if(mode==='omit')childEvents.splice(position,1);
    else if(mode==='replace'){
      childEvents[position]={...childEvents[position],title:eventTitle,
        classification:'altered-scenario',change_ref:childId+':change:'+(index+1)};
    }else{
      resultId=childId+':insert:'+(index+1);
      childEvents.splice(position+1,0,{
        id:resultId,at:targetSource.at,title:eventTitle,
        source_refs:sourceRefs,classification:'altered-scenario',
        change_ref:childId+':change:'+(index+1),
      });
    }
    changeReceipts.push({
      schema:TIMELINE_CHANGE_SCHEMA,
      receipt_id:childId+':change:'+(index+1),at:targetSource.at,
      mode, target_original_event_id:targetId,result_event_id:mode==='omit'?null:resultId,
      before,after:mode==='omit'?null:copy(childEvents.find(e=>e.id===resultId)),
      reason,source_refs:sourceRefs,
      ripple_horizons:ripple, magnitude:change.magnitude,
      wtl_source_sha256:str(change?.wtl_source_sha256,'WTL source hash',64),
      wtl_receipts:16,
      decision:'explicit-local-owner-choice',
      model_invoked:false,physical_timeline_changed:false,canon_commit:false,
    });
  }
  // After the earliest divergence, pre-existing future entries are conditional,
  // not statements that the altered future must follow the original chronology.
  const changedIds=new Set(changeReceipts.flatMap(r=>[r.target_original_event_id,r.result_event_id]));
  const alternate=childEvents.map(e=>({
    ...e,
    continuation_status:changedIds.has(e.id)?'deliberately-altered':
      e.at>=firstAlteredAt?'inherited-unverified-after-divergence':'shared-before-fork',
  }));
  const originalById=new Map(source.events.map(e=>[e.id,e]));
  const alteredById=new Map(alternate.map(e=>[e.id,e]));
  const removed=source.events.filter(e=>!alteredById.has(e.id)).map(e=>e.id);
  const added=alternate.filter(e=>!originalById.has(e.id)).map(e=>e.id);
  const replaced=source.events.filter(e=>alteredById.has(e.id)&&alteredById.get(e.id).title!==e.title)
    .map(e=>e.id);
  return {
    schema:TIMELINE_ALTERED_SCHEMA,version:1,branch_id:childId,
    original:source,altered:{world:fork.child,events:alternate},
    worldseed:{seed_fingerprint:seed.fingerprint,fork_receipt:fork.receipt},
    change_receipts:changeReceipts,
    comparison:{added,removed,replaced,open_future:alternate.filter(e=>e.continuation_status==='inherited-unverified-after-divergence').map(e=>e.id)},
    return_anchor:{parent_world_id:source.world.id,parent_seed_fingerprint:seed.fingerprint,
      original_event_ids:source.events.map(e=>e.id),altered_world_id:childId,created_at:at},
    status:'local-hypothetical-altered-branch',owner_authenticated:false,
    scope:'Wayglass browser sandbox only; no remote canon or real-world mutation',
    model_dispatch:false,external_effects:false,physical_timeline_changed:false,canon_commit:false,
  };
}

// Rebuild from the immutable original ledger. Drop the final change to undo;
// no inverse mutation of an original event or participant is ever required.
export function rewindAlteredTimeline(options) {
  const prior=options?.changes;
  if(!Array.isArray(prior)||prior.length<2)return null;
  return buildAlteredTimeline({...options,changes:prior.slice(0,-1)});
}
