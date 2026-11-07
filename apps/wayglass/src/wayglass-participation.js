// Bind a proposed local participation choice to a returned host route observation.
// Catalogue metadata selects a route; it never establishes owner authentication,
// participant identity, permission to execute code, or durable acceptance.
export const PARTICIPATION_SCHEMA='wayglass.participation-invitation/v1';
export const PARTICIPATION_EVIDENCE_SCHEMA='wayglass.participation-evidence/v1';
const DECISIONS=new Set(['accept','deny','defer']);
const MAX_OUTPUT=12000;
const text=(value,name,max=180)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/u.test(value))throw new TypeError('Invalid '+name);
 return value;
};
const freeze=value=>{
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
};
function checkInvitation(invitation){
 if(invitation?.schema!==PARTICIPATION_SCHEMA)throw new TypeError('Participation invitation required');
 const keys=new Set(['schema','invitation_id','session_id','participant_id','proposal_id','source_sha']);
 if(Object.keys(invitation).length!==keys.size||Object.keys(invitation).some(key=>!keys.has(key)))throw new TypeError('Unsupported invitation field');
 for(const key of ['invitation_id','session_id','participant_id','proposal_id'])text(invitation[key],key);
 if(typeof invitation.source_sha!=='string'||!/^[a-f0-9]{40}$/u.test(invitation.source_sha))throw new TypeError('Exact source SHA required');
 return invitation;
}
export function makeWayglassParticipationInvitation({invitationId,sessionId,participantId,sourceSha,proposalId,proposal}={}){
 const invitation={schema:PARTICIPATION_SCHEMA,invitation_id:text(invitationId,'invitation ID'),
  session_id:text(sessionId,'session ID'),participant_id:text(participantId,'participant ID'),
  proposal_id:text(proposalId,'proposal ID'),source_sha:typeof sourceSha==='string'?sourceSha.toLowerCase():sourceSha};
 checkInvitation(invitation);
 if(typeof proposal!=='string'||!proposal.trim()||proposal.length>6000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(proposal))throw new TypeError('Invalid proposal');
 const proposalText=proposal;
 const example={invitation_id:invitation.invitation_id,session_id:invitation.session_id,
  participant_id:invitation.participant_id,proposal_id:invitation.proposal_id,source_sha:invitation.source_sha,
  decision:'defer',reason:'Your own optional explanation.'};
 return freeze({invitation,input:[
  'Wayglass: you are invited to consider this specific local proposal. You may accept, deny or defer.',
  'Your own answer is required. Silence, prose, an unavailable route or an invalid structured answer leaves the question open.',
  'A choice records a local proposal response only. It does not deploy code, grant credentials, commit identity or canon, or author another participant\'s choice.',
  'Source revision: '+invitation.source_sha+'. Proposal: '+invitation.proposal_id+'.',
  'Proposal supplied for your consideration:\n'+proposalText,
  'If you wish to record a decision, return exactly one wayglass-participation fenced JSON block. Copy every binding field below exactly, choose accept, deny or defer, and optionally give your own reason. The example decision is a placeholder, not your answer.',
  '```wayglass-participation\n'+JSON.stringify(example,null,2)+'\n```',
 ].join('\n\n')});
}
function bindTurn(invitation,expectedRoute,turn){
 if(!expectedRoute||typeof expectedRoute!=='object')throw new TypeError('Expected host catalogue route required');
 for(const key of ['route_id','provider','model'])text(expectedRoute[key],'expected '+key);
 if(turn?.schema!=='wayglass.route-turn/v0.1')throw new TypeError('Actual Wayglass route turn required');
 for(const key of ['route_id','provider','model'])if(turn[key]!==expectedRoute[key])throw new Error('Returned route attribution mismatch: '+key);
 if(typeof turn.output!=='string'||!turn.output.trim()||turn.output.length>MAX_OUTPUT)throw new TypeError('Bounded route output required');
 const observation=turn.observation,receipt=turn.receipt;
 if(observation?.schema!=='wayglass.model-observation/v0.1'||observation.source?.kind!=='model-route')throw new TypeError('Host model observation required');
 text(observation.observation_id,'observation ID');
 if(!receipt||receipt.observation_id!==observation.observation_id)throw new Error('Observation reference mismatch');
 if(receipt.session_id!==invitation.session_id||observation.interaction?.session_id!==invitation.session_id)throw new Error('Response session mismatch');
 for(const key of ['route_id','provider','model'])if(observation.source[key]!==turn[key])throw new Error('Observation source mismatch: '+key);
 if(observation.content?.output!==turn.output)throw new Error('Observation output mismatch');
 const providerId=receipt.response_id??null;
 if(providerId!==null)text(providerId,'provider response ID');
 if(receipt.completed_at!=null)text(receipt.completed_at,'completion timestamp',48);
 if(receipt.surface_id!=null)text(receipt.surface_id,'surface ID');
 if((observation.source.response_id??null)!==providerId)throw new Error('Provider response reference mismatch');
 if(turn.kernel_preflight&&(turn.kernel_preflight.status!=='ready-for-route'||turn.kernel_preflight.route_id!==expectedRoute.route_id))throw new Error('Kernel route preflight mismatch');
 return {route_id:turn.route_id,provider:turn.provider,model:turn.model,
  provider_response_id:providerId,host_observation_id:observation.observation_id,
  session_id:receipt.session_id,completed_at:receipt.completed_at??null,
  surface_id:receipt.surface_id??null};
}
function structuredDecision(output,invitation){
 const blocks=[...output.matchAll(/^```wayglass-participation[ \t]*\r?\n([\s\S]*?)^```[ \t]*(?=\r?$)/gm)];
 if(blocks.length!==1)return {decision:null,status:'unresolved',reason:blocks.length?'ambiguous-structured-decisions':'no-structured-decision'};
 let value;
 try{value=JSON.parse(blocks[0][1]);}catch{return {decision:null,status:'unresolved',reason:'invalid-decision-json'};}
 if(!value||typeof value!=='object'||Array.isArray(value))return {decision:null,status:'unresolved',reason:'invalid-decision-object'};
 const allowed=new Set(['invitation_id','session_id','participant_id','proposal_id','source_sha','decision','reason']);
 if(Object.keys(value).some(key=>!allowed.has(key)))return {decision:null,status:'unresolved',reason:'unsupported-decision-field'};
 for(const key of ['invitation_id','session_id','participant_id','proposal_id','source_sha']){
  if(value[key]!==invitation[key])return {decision:null,status:'unresolved',reason:'decision-binding-mismatch:'+key};
 }
 if(!DECISIONS.has(value.decision))return {decision:null,status:'unresolved',reason:'unsupported-decision'};
 if(value.reason!=null&&(typeof value.reason!=='string'||value.reason.length>2000))return {decision:null,status:'unresolved',reason:'invalid-decision-reason'};
 return {decision:value.decision,status:'explicit-route-decision',reason:value.reason??null};
}
export function bindWayglassParticipationResponse({invitation,expectedRoute,turn}={}){
 checkInvitation(invitation);
 const source=bindTurn(invitation,expectedRoute,turn);
 return freeze({schema:PARTICIPATION_EVIDENCE_SCHEMA,
  invitation:structuredClone(invitation),source,output:turn.output,
  ...structuredDecision(turn.output,invitation),
  evidence_state:'host-route-observation-not-identity-or-auth-verification',
  participant_binding:'invitation-and-structured-response-fields',
  owner_authenticated:false,identity_commit:false,canon_commit:false,
  program_commit:false,durable_acceptance:false,network_executed_by_adapter:false,
 });
}
