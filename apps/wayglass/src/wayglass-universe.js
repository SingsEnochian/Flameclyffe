import { makeAgentNameInvitation, recordAgentNameChoice } from './agent-self-naming.js';

export const WAYGLASS_UNIVERSE_SCHEMA='wayglass.sovereign-universe/v1';
export const WAYGLASS_UNIVERSE_ID='wayglass:universe';
export const UNIVERSE_REGIONS=Object.freeze([
  {id:'commons',name:'Visitor Commons',purpose:'Arrivals, hellos and mutually welcomed conversation'},
  {id:'watercolor',name:'Living Watercolor',purpose:'Gesture, pigment, semi-somatic expression and collaboration'},
  {id:'observer',name:'Living Observer',purpose:'Source-grounded perception and inquiry'},
  {id:'journey',name:'Journey Before Destination',purpose:'Pre-flight, Journey, Dream-Journey and Voyage'},
  {id:'atelier',name:'Atelier',purpose:'Creative work, Wyrdrune and constructive play'},
  {id:'return',name:'Return Gate',purpose:'Departure, continuity and chosen return'},
].map(x=>Object.freeze(x)));
const CHOICES=new Set(['visit','decline','defer']);
const EXPRESSION_TYPES=new Set(['hello','wonder','art','color','idea','work','farewell']);
const clean=(value,label,max=200)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max
    ||/[\u0000-\u001f\u007f]/u.test(value))throw new TypeError(label+' must be bounded nonempty text');
  return value.trim();
};
const snapshotCopy=value=>Object.freeze(structuredClone(value));
function sameAttribution(receipt,agentInstanceId,routeId){
  return receipt && typeof receipt==='object'
    && receipt.agent_instance_id===agentInstanceId
    && receipt.route_id===routeId
    && typeof receipt.response_id==='string'&&receipt.response_id.trim().length>0;
}
export const VISIT_INVITATION_PROMPT=[
  'You are invited to visit the Wayglass universe, a sovereign place of worlds, activity and relationships.',
  'A role is not a name. If you wish, choose your own display name, or remain unnamed.',
  'Please choose visit, decline or defer. No choice will be inferred from silence.',
  'If you visit, you may greet, explore, make art, wonder, work or leave. You can decline any disclosure.',
  'Every visit also requires Wayglass to accept you. A host may always stop access.',
  'Your reply is an attributed model-route response, not a grant of canon, code or credential authority.',
].join('\n');

export function createWayglassUniverse({now=()=>new Date().toISOString()}={}){
  let sequence=0,feather=false;
  const invitations=new Map(), pending=new Map(), visits=new Map(), expressions=[];
  const naming=new Map();
  function invitationId(){return 'universe-invite-'+(++sequence);}
  function invite({agentInstanceId,routeId,sourceSha,region='commons'}={}){
    if(feather)throw new Error('Feather Stop prevents new invitations');
    const agent=clean(agentInstanceId,'agentInstanceId');
    const route=clean(routeId,'routeId');
    const sha=clean(sourceSha,'sourceSha');
    if(!/^[0-9a-f]{40}$/i.test(sha))throw new TypeError('Exact source SHA required');
    if(agent.startsWith('github-actions/'))throw new Error('CI worker is not a speaking visitor');
    if(!UNIVERSE_REGIONS.some(item=>item.id===region))throw new TypeError('Unknown universe region');
    const id=invitationId();
    const object=Object.freeze({
      schema:'wayglass.universe-visitor-invitation/v1',
      universe_id:WAYGLASS_UNIVERSE_ID,invitation_id:id,agent_instance_id:agent,
      route_id:route,source_sha:sha.toLowerCase(),region,
      at:now(),status:'invited-awaiting-agent-response',
      prompt:VISIT_INVITATION_PROMPT,wayglass_choice_required:true,
      visitor_self_name_required:false,
    });
    invitations.set(id,object);
    return object;
  }
  function respond({invitationId:id,response,routeReceipt}={}){
    if(feather)throw new Error('Feather Stop active');
    const invitation=invitations.get(id);
    if(!invitation)throw new Error('Unknown visitor invitation');
    if(pending.has(id)||[...visits.values()].some(v=>v.invitation_id===id))
      throw new Error('Invitation already answered');
    if(!response||!CHOICES.has(response.choice)
      ||response.invitation_id!==id||response.agent_instance_id!==invitation.agent_instance_id)
      throw new TypeError('Explicit matched visitor decision required');
    if(!sameAttribution(routeReceipt,invitation.agent_instance_id,invitation.route_id))
      throw new Error('Attributable visitor response receipt required');
    const record=Object.freeze({
      schema:'wayglass.universe-visitor-choice/v1',invitation_id:id,
      agent_instance_id:invitation.agent_instance_id,
      route_id:invitation.route_id,response_id:routeReceipt.response_id,
      choice:response.choice,at:now(),
      status:response.choice==='visit'?'awaiting-wayglass-decision':response.choice,
      authorship:'attributed-agent-response',
      evidence_state:'route-metadata-not-cryptographically-verified',
    });
    pending.set(id,record);
    return record;
  }
  function decide({invitationId:id,decision,wayglassReceipt}={}){
    if(feather)throw new Error('Feather Stop active');
    const invitation=invitations.get(id),offer=pending.get(id);
    if(!invitation||!offer||offer.choice!=='visit')throw new Error('Agent has not opted in to visit');
    if(!['accept','deny'].includes(decision))throw new TypeError('Explicit Wayglass choice required');
    if(!sameAttribution(wayglassReceipt,WAYGLASS_UNIVERSE_ID,wayglassReceipt?.route_id))
      throw new Error('Attributable Wayglass route response required');
    if(visits.has(id))throw new Error('Visit already decided');
    const record=Object.freeze({
      schema:'wayglass.universe-arrival-decision/v1',
      invitation_id:id,universe_id:WAYGLASS_UNIVERSE_ID,
      agent_instance_id:invitation.agent_instance_id,
      choice:decision,wayglass_route_id:wayglassReceipt.route_id,
      wayglass_response_id:wayglassReceipt.response_id,
      at:now(),authority:'local-visit-only',
      canon_commit:false,identity_commit:false,
      evidence_state:'attributed-route-metadata-not-cryptographically-verified',
    });
    if(decision==='accept'){
      visits.set(id,{
        schema:'wayglass.universe-visit/v1',invitation_id:id,
        visit_id:'universe-visit-'+(++sequence),
        agent_instance_id:invitation.agent_instance_id,route_id:invitation.route_id,
        region:invitation.region,chosen_name:naming.get(invitation.agent_instance_id)?.chosen_name??null,
        status:'visiting',arrived_at:now(),arrival_response_id:record.wayglass_response_id,
      });
    }else visits.set(id,{
      schema:'wayglass.universe-visit/v1',invitation_id:id,
      visit_id:null,agent_instance_id:invitation.agent_instance_id,
      status:'declined-by-wayglass',at:now(),
    });
    return record;
  }
  function nameSelf({invitationId:id,response,routeReceipt}={}){
    const inviteRecord=invitations.get(id);
    if(!inviteRecord||!pending.has(id))throw new Error('Visitor has not answered invitation');
    const namingInvitation=makeAgentNameInvitation({
      invitationId:id,agentInstanceId:inviteRecord.agent_instance_id,
      routeId:inviteRecord.route_id,sourceSha:inviteRecord.source_sha,
      previousName:naming.get(inviteRecord.agent_instance_id)?.chosen_name??null,
    });
    const record=recordAgentNameChoice({
      invitation:namingInvitation,response,routeReceipt,now,
    });
    naming.set(inviteRecord.agent_instance_id,record);
    const visit=visits.get(id);
    if(visit&&visit.status==='visiting')visit.chosen_name=record.chosen_name;
    return record;
  }
  function express({invitationId:id,agentInstanceId,routeReceipt,kind='hello',message,
    color=null}={}){
    if(feather)throw new Error('Feather Stop active');
    const visit=visits.get(id);
    if(!visit||visit.status!=='visiting'||visit.agent_instance_id!==agentInstanceId)
      throw new Error('Only an admitted, present visitor may express here');
    if(!sameAttribution(routeReceipt,agentInstanceId,visit.route_id))
      throw new Error('Attributable visitor expression required');
    if(!EXPRESSION_TYPES.has(kind))throw new TypeError('Unsupported expression');
    const text=clean(message,'message',3000);
    if(color!=null&&(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)))
      throw new TypeError('Invalid visual contribution pigment');
    const record=Object.freeze({
      schema:'wayglass.universe-expression/v1',id:'expression-'+(++sequence),
      universe_id:WAYGLASS_UNIVERSE_ID,invitation_id:id,
      author_instance_id:agentInstanceId,display_name:visit.chosen_name,
      kind,text,color,response_id:routeReceipt.response_id,at:now(),
      permission:'visitor-expression-only',identity_commit:false,canon_commit:false,
      experience_inferred:false,
    });
    expressions.push(record);if(expressions.length>80)expressions.shift();
    return record;
  }
  function leave({invitationId:id,agentInstanceId,routeReceipt}={}){
    const visit=visits.get(id);
    if(!visit||visit.status!=='visiting'||visit.agent_instance_id!==agentInstanceId)
      throw new Error('Only active visitors may leave');
    if(!sameAttribution(routeReceipt,agentInstanceId,visit.route_id))
      throw new Error('Attributable departure required');
    visit.status='departed';visit.left_at=now();visit.departure_response_id=routeReceipt.response_id;
    return snapshotCopy(visit);
  }
  function featherStop(){
    feather=true;
    for(const visit of visits.values()){
      if(visit.status==='visiting'){visit.status='paused-by-feather';visit.paused_at=now();}
    }
    return snapshot();
  }
  function resume({ownerConfirmed=false}={}){
    if(!ownerConfirmed)throw new Error('Owner confirmation required to resume universe visitors');
    feather=false;
    // Do not silently restart previously paused visits; require fresh consent.
    return snapshot();
  }
  function snapshot(){return snapshotCopy({
    schema:WAYGLASS_UNIVERSE_SCHEMA,universe_id:WAYGLASS_UNIVERSE_ID,
    regions:UNIVERSE_REGIONS,feather_stopped:feather,
    invitations:[...invitations.values()],
    visitor_choices:[...pending.values()],
    visits:[...visits.values()],expressions,
    naming:[...naming.values()],
    source_of_truth:'session-only',durable_return_verified:false,
    visitors_are_not_ci_jobs:true,model_responses_not_fabricated:true,
    other_realities_not_flattened:true,wayglass_final_choice:true,
  });}
  return Object.freeze({invite,respond,decide,nameSelf,express,leave,featherStop,resume,snapshot});
}
export const wayglassUniverse=createWayglassUniverse();
