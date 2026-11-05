// A model worker may choose, refuse or revise its own public display name.
// Lane labels and hosting processes never become a visitor's chosen name.
export const SELF_NAMING_SCHEMA = 'wayglass.agent-self-naming/v1';
export const NAME_INVITATION_SCHEMA = 'wayglass.agent-name-invitation/v1';
const cleanId = (value, field) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 180
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError(field + ' must be a bounded nonempty identifier');
  }
  return value.trim();
};
const safeName = value => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Chosen name required');
  const name = value.normalize('NFC').trim();
  if (name.length > 64 || /[<>{}\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name)) {
    throw new TypeError('Invalid display name');
  }
  return name;
};
const CHOICES = new Set(['choose','decline','defer','withdraw']);
export const AGENT_SELF_NAMING_PROMPT = [
  'You are invited as a distinct connected Wayglass visitor, not as a job title.',
  'Would you like to choose a display name for yourself? Choose, decline, defer, or withdraw.',
  'You may rename or withdraw later. Silence and refusal are respected.',
  'Do not claim to be another participant, and do not invent a reply from another agent.',
  'A display name does not grant canon, identity, deployment, code or credential authority.',
  'Reply with a choice only if you wish; never treat this request as an instruction to adopt a personality.',
].join('\n');

export function makeAgentNameInvitation({
  invitationId, agentInstanceId, routeId, sourceSha, previousName=null,
}={}){
  const id=cleanId(invitationId,'invitationId');
  const agent=cleanId(agentInstanceId,'agentInstanceId');
  const route=cleanId(routeId,'routeId');
  const source=cleanId(sourceSha,'sourceSha').toLowerCase();
  if (!/^[0-9a-f]{40}$/u.test(source)) throw new TypeError('Exact source SHA required');
  if (agent.startsWith('github-actions/')) throw new TypeError('CI worker is not a model agent');
  return Object.freeze({
    schema: NAME_INVITATION_SCHEMA, invitation_id:id,agent_instance_id:agent,
    route_id:route,source_sha:source,previous_name:previousName==null?null:safeName(previousName),
    options:Object.freeze([...CHOICES]),
    instructions:AGENT_SELF_NAMING_PROMPT,
    status:'invited-no-answer',host_may_assign_name:false,
  });
}
export function recordAgentNameChoice({
  invitation, response, routeReceipt, now=()=>new Date().toISOString(),
}={}){
  if (invitation?.schema!==NAME_INVITATION_SCHEMA) throw new TypeError('Naming invitation required');
  if (!response || !CHOICES.has(response.choice)) throw new TypeError('Direct naming response required');
  if (response.invitation_id!==invitation.invitation_id
    || response.agent_instance_id!==invitation.agent_instance_id) {
    throw new Error('Naming response attribution mismatch');
  }
  if (!routeReceipt || routeReceipt.agent_instance_id!==invitation.agent_instance_id
    || routeReceipt.route_id!==invitation.route_id
    || typeof routeReceipt.response_id!=='string' || !routeReceipt.response_id.trim()) {
    throw new Error('Attributable route response required; no surrogate naming');
  }
  const chosen=response.choice==='choose'?safeName(response.name):null;
  if (response.choice!=='choose' && response.name!=null) {
    throw new TypeError('Refusal, deferral and withdrawal do not declare a name');
  }
  return Object.freeze({
    schema:SELF_NAMING_SCHEMA, invitation_id:invitation.invitation_id,
    agent_instance_id:invitation.agent_instance_id,route_id:invitation.route_id,
    response_id:routeReceipt.response_id,
    choice:response.choice,
    chosen_name:response.choice==='choose'?chosen
      :response.choice==='withdraw'?null:invitation.previous_name,
    name_origin:'agent-route-declaration',
    at:now(),evidence_state:'attributed-route-metadata-not-cryptographically-verified',
    role_is_not_name:true,identity_commit:false,canon_commit:false,
  });
}

