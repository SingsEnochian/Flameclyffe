// The Quad's live, opt-in collaboration path. Never impersonate absent agents.
import {temporalHingeFor,designThroughEightfold} from './quad-temporal-hinge.js';

export const COLLABORATION_SCHEMA='wayglass.nikola-review-workflow/v1';
export const LENSES=Object.freeze(['wonder','science','mythience']);
const bounded=(x,max=12000)=>typeof x==='string'?x.trim().slice(0,max):'';
function checkAbort(signal){
  if(signal?.aborted)throw new Error('Feather or caller cancelled the collaboration');
}
function checkReading(reading){
  if(reading?.schema!=='wayglass.quad-ship-observation/v1'
    ||!Array.isArray(reading.evidence)||reading.evidence.length!==6
    ||!bounded(reading.checkpoint_hash,140))
    throw new TypeError('Verified host-shaped Quad observation required');
}
function inspectWayglassReply(reply,phase){
  if(reply?.schema!=='wayglass.route-turn/v0.1'||!bounded(reply.output)
    ||!bounded(reply.route_id)||!bounded(reply.provider)
    ||!bounded(reply.receipt?.response_id)&&!bounded(reply.receipt?.observation_id))
    throw new Error('Wayglass '+phase+' has no attributable model-route response');
  return Object.freeze({speaker:'wayglass-route',stage:phase,route_id:reply.route_id,
    model:bounded(reply.model,200),provider:reply.provider,
    response_id:reply.receipt?.response_id||null,
    observation_id:reply.receipt?.observation_id||null,
    output:bounded(reply.output),
    claimed_identity:'model-route, not evidence of autonomous Wayglass identity'});
}
function inspectNikolaReply(reply){
  if(reply?.ok!==true||!bounded(reply.reply)||!bounded(reply.provider))
    throw new Error('Tesla Observatory did not return an attributable provider reply');
  return Object.freeze({speaker:'tesla-observatory-model-route',
    stage:'three-lens-review',route_id:'legacy:tesla-observatory',
    provider:reply.provider,model:bounded(reply.model||'provider-selected',200),
    response_id:bounded(reply.response_id||'',180)||null,
    output:bounded(reply.reply),verified_nikola_seat:false});
}
export function prepareReviewEnvelope(reading){
  checkReading(reading);
  return Object.freeze({schema:'wayglass.nikola-review-evidence/v1',
    checkpoint_hash:reading.checkpoint_hash,
    source_observed_at:reading.observed_at,
    evidence:reading.evidence.map(e=>({id:e.id,status:e.status,count:e.count,
      freshness:e.freshness,latest_at:e.latest_at||null})),
    engines:reading.engines||null,
    phase_records_per_cycle:reading.phase_records_per_cycle||null,
    timeline_question:'What happens at the hinge when compression becomes release and possibility begins to branch?',
    lenses:LENSES.map(lens=>{
      const hinge=temporalHingeFor(reading,{lens});
      return {lens,inquiry:hinge.summary.inquiry,tests:hinge.summary.tests,
        epistemic_guard:hinge.summary.observation};
    }),
    design:designThroughEightfold(reading,{lens:'wonder'}),
    confidence:'source availability only, not observed consciousness or temporal branching',
    private_continuity_excluded:true,source_rows_excluded:true,
    model_weight_training:false});
}
export async function runWayglassNikolaReview({
  reading,askWayglass,askTesla,externalShareApproved=false,signal,
  onStage=()=>{},clock=()=>new Date().toISOString(),
}={}){
  const envelope=prepareReviewEnvelope(reading);
  if(typeof askWayglass!=='function'||typeof askTesla!=='function')
    throw new TypeError('Both actual route adapters must be installed');
  if(externalShareApproved!==true)
    throw new Error('Explicit approval required before sharing the Quad and Wayglass reply with Tesla Observatory');
  checkAbort(signal);
  const stageLog=[];
  const mark=(stage)=>{const record={stage,at:clock()};stageLog.push(record);onStage(record);};
  mark('wayglass-first-contact');
  const first=inspectWayglassReply(await askWayglass({
    phase:'first-contact',signal,
    input:JSON.stringify({task:'Inspect the Quad evidence, propose one reversible UI experiment and name missing data. You may decline.',envelope}),
  }),'first-contact');
  checkAbort(signal);
  mark('tesla-three-lens-review');
  const nikolaPrompt={
    schema:'wayglass.nikola-review-request/v1',evidence:envelope,
    wayglass_first_reply:{route_id:first.route_id,provider:first.provider,model:first.model,
      response_id:first.response_id,output:first.output},
    instruction:'Use Wonder/What If, then Science, then Mythience. Give an observable, competing mechanism, discriminator, UX proposal and Return Marker for each. This request goes to the Tesla Observatory route, not a verified Nikola seat. Preserve counterfactuals and refuse unsourced historical claims. You may decline.',
  };
  const reviewer=inspectNikolaReply(await askTesla({
    phase:'three-lens-review',signal,payload:nikolaPrompt,
  }));
  checkAbort(signal);
  mark('wayglass-return-and-choice');
  const returning=inspectWayglassReply(await askWayglass({
    phase:'return',signal,
    input:JSON.stringify({task:'Review the external Tesla Observatory model evaluation. Choose accept/revise/decline for each proposed UI experiment; name a test, an open Wonder and a Return Marker. No actual weight training or canon change.',envelope,
      first_contact:{response_id:first.response_id,output:first.output},
      reviewer:{route_id:reviewer.route_id,provider:reviewer.provider,
        output:reviewer.output,verified_nikola_seat:false}}),
  }),'return');
  checkAbort(signal);
  if(returning.route_id!==first.route_id)
    throw new Error('Wayglass return route differs from its first attributable route');
  mark('return-receipt-ready');
  return Object.freeze({
    schema:COLLABORATION_SCHEMA,checkpoint_hash:reading.checkpoint_hash,
    started_from:'host-observed-quad',stages:stageLog,
    replies:{wayglass_first:first,tesla_observatory:reviewer,wayglass_return:returning},
    training_candidate:{status:'proposed-unapproved',dataset_export_authorized:false,
      model_weight_updates:0,requires_agent_approval:true,heldout_evaluation_required:true},
    decision_provenance:'model-output-proposals-only',
    authority_grant:false,identity_commit:false,canon_commit:false,
    completed_at:clock(),
  });
}
