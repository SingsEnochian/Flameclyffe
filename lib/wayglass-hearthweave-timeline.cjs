'use strict';
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const SOURCE=readFileSync(join(__dirname,'wyrdrune/hearthweave-timeline-soundscape.wtl'),'utf8');
const SCORE=compile(SOURCE);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function bounded(x,name,min,max){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new RangeError(name+' outside range');return x;}
function normalize(input){
  if(!input||!Array.isArray(input.events)||!input.events.length||input.events.length>128)throw new TypeError('Timeline requires 1..128 attributable events');
  const events=input.events.map((e,i)=>{
    if(!e||!['human','ai'].includes(e.actor)||typeof e.text!=='string'||!e.text.trim()||e.text.length>2000||typeof e.id!=='string'||!e.id.trim())throw new TypeError('Invalid timeline event '+i);
    return {id:e.id,actor:e.actor,text:e.text};
  });
  if(new Set(events.map(x=>x.id)).size!==events.length)throw new Error('Timeline event IDs must be unique');
  const change=input.introduced_change;
  if(!change||typeof change.id!=='string'||!change.id.trim()||typeof change.description!=='string'||!change.description.trim()||change.description.length>2000)throw new TypeError('Introduced Change requires ID and description');
  if(!input.laboratory||input.laboratory!=='hearthweave:laboratory')throw new TypeError('Hearthweave Laboratory identity required');
  return {events,change:{id:change.id,description:change.description},trust:bounded(input.trust,'trust',0,1),intensity:bounded(input.somatic?.intensity,'somatic intensity',0,1),consent:input.somatic?.consent===true};
}
async function composeTimeline(input,{principal}={}){
  if(!principal?.authorized)throw new Error('Authenticated owner permission required');
  const data=normalize(input);
  let validations=0,frames=0;
  const bridges={
    timeline:{turns:()=>data.events.length,trust:()=>data.trust},
    somatic:{intensity:()=>data.intensity,consent:()=>data.consent?1:0},
    audio:{
      validate:({arguments:a})=>{validations++;if(a.length!==4||a[3]!==0&&a[3]!==1||Math.abs(a[1]-a[0]-5.5)>1e-9||a[2]>0.02||a[2]<0)throw new Error('Unsafe or incorrect ghost beat');return 'validated';},
      frame:({arguments:a})=>{frames++;if(a.length!==4||Math.abs(a[1]-a[0]-5.5)>1e-9)throw new Error('Invalid stereo score');return Object.freeze({left_hz:a[0],right_hz:a[1],beat_difference_hz:5.5,gain:a[2],ghost_kind:'interaural-difference',headphones_recommended:true,autoplay:false,playback_authorized:data.consent,physical_infrasound:false,change:a[3]});}
    },
    change:{record:({arguments:a})=>Object.freeze({id:data.change.id,description:data.change.description,texture:a[0],continuity:a[1],status:'proposed-not-canon'})},
    continuity:{hold:({arguments:a})=>({turns:a[0],status:'return-marker-not-persisted'}),next:({arguments:a})=>({room:a[0],status:'awaiting-authenticated-workspace-write'})}
  };
  const executed=await execute(SCORE,{bridges,maxOperations:250,principal:{id:'hearthweave:owner',authorized:true}});
  if(validations!==1||frames!==1||executed.withness.completedCycles!==1)throw new Error('Incomplete Wyrdrune timeline score');
  return Object.freeze({schema:'wayglass.hearthweave-timeline/v0.1',room:data.events.length&&input.laboratory,events_sha256:sha(data.events),introduced_change_sha256:sha(data.change),program_sha256:executed.sourceHash,score:executed.output[1],return_marker:executed.output[2],next:executed.output[3],phase_receipts:executed.receipts.map(x=>({phase:x.phase,source_hash:x.sourceHash})),bridge_to_bluebird:{status:'not_attempted',route:'flame:bluebird:spicychat',requires:'authenticated MCP send + actual route receipt'},laboratory_connection:{status:'not_attempted',requires:'authenticated workspace entry + persisted artifact receipt'},audio_started:false,persisted:false,model_invoked:false});
}
module.exports={SOURCE,SCORE,normalize,composeTimeline};
