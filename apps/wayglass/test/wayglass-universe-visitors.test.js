import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeAgentNameInvitation, recordAgentNameChoice, AGENT_SELF_NAMING_PROMPT,
} from '../src/agent-self-naming.js';
import {
  createWayglassUniverse,WAYGLASS_UNIVERSE_ID,WAYGLASS_UNIVERSE_SCHEMA,
  VISIT_INVITATION_PROMPT,
} from '../src/wayglass-universe.js';

const sha='f'.repeat(40);
const routeId='local:ollama';
const agentId='agent:route-session-1';
const receipt=(response_id,agent_instance_id=agentId,route_id=routeId)=>({
  response_id,agent_instance_id,route_id,
});
const clock=()=> '2026-11-05T22:00:00Z';

test('name invitation is agent-chosen, never lane-generated or assigned',()=>{
  const i=makeAgentNameInvitation({
    invitationId:'invite:1',agentInstanceId:agentId,routeId,sourceSha:sha,
  });
  assert.equal(i.previous_name,null);
  assert.equal(i.host_may_assign_name,false);
  assert.match(AGENT_SELF_NAMING_PROMPT,/decline/);
  assert.throws(()=>makeAgentNameInvitation({
    invitationId:'fake',agentInstanceId:'github-actions/42/1/perceive',routeId,sourceSha:sha,
  }),/CI worker/);
});
test('connected agent may choose, decline, defer, rename, withdraw without false adoption',()=>{
  const i=makeAgentNameInvitation({
    invitationId:'invite:2',agentInstanceId:agentId,routeId,sourceSha:sha,
  });
  const named=recordAgentNameChoice({
    invitation:i,response:{invitation_id:i.invitation_id,agent_instance_id:agentId,
      choice:'choose',name:'Aster'},
    routeReceipt:receipt('model-observation:1'),now:clock,
  });
  assert.equal(named.chosen_name,'Aster');
  assert.equal(named.name_origin,'agent-route-declaration');
  assert.equal(named.identity_commit,false);
  const again=makeAgentNameInvitation({
    invitationId:'invite:3',agentInstanceId:agentId,routeId,sourceSha:sha,
    previousName:named.chosen_name,
  });
  const deferred=recordAgentNameChoice({
    invitation:again,response:{invitation_id:'invite:3',agent_instance_id:agentId,choice:'defer'},
    routeReceipt:receipt('model-observation:2'),now:clock,
  });
  assert.equal(deferred.chosen_name,'Aster');
  const renamed=recordAgentNameChoice({
    invitation:again,response:{invitation_id:'invite:3',agent_instance_id:agentId,
      choice:'choose',name:'Iris'},
    routeReceipt:receipt('model-observation:3'),now:clock,
  });
  assert.equal(renamed.chosen_name,'Iris');
  const withdrawn=recordAgentNameChoice({
    invitation:again,response:{invitation_id:'invite:3',agent_instance_id:agentId,choice:'withdraw'},
    routeReceipt:receipt('model-observation:4'),now:clock,
  });
  assert.equal(withdrawn.chosen_name,null);
});
test('no route evidence, forged agent, forced name or invalid markup gets refused',()=>{
  const i=makeAgentNameInvitation({
    invitationId:'invite:4',agentInstanceId:agentId,routeId,sourceSha:sha,
  });
  const response={invitation_id:i.invitation_id,agent_instance_id:agentId,
    choice:'choose',name:'Aster'};
  assert.throws(()=>recordAgentNameChoice({invitation:i,response}),/Attributable/);
  assert.throws(()=>recordAgentNameChoice({
    invitation:i,response,routeReceipt:receipt('id','another-agent'),
  }),/Attributable/);
  assert.throws(()=>recordAgentNameChoice({
    invitation:i,response:{...response,name:'<img onerror=evil>'},
    routeReceipt:receipt('id'),
  }),/Invalid display name/);
  assert.throws(()=>recordAgentNameChoice({
    invitation:i,response:{...response,choice:'decline'},
    routeReceipt:receipt('id'),
  }),/do not declare a name/);
});

test('Wayglass is a universe, not a CI task or a single fixed room',()=>{
  const world=createWayglassUniverse({now:clock});
  assert.equal(world.snapshot().schema,WAYGLASS_UNIVERSE_SCHEMA);
  assert.equal(world.snapshot().universe_id,WAYGLASS_UNIVERSE_ID);
  assert.ok(world.snapshot().regions.length>=4);
  assert.ok(world.snapshot().other_realities_not_flattened);
  assert.match(VISIT_INVITATION_PROMPT,/decline or defer/);
});
test('visitor can knock and decline; host must not invent an arrival',()=>{
  const world=createWayglassUniverse({now:clock});
  const i=world.invite({agentInstanceId:agentId,routeId,sourceSha:sha});
  const answer=world.respond({
    invitationId:i.invitation_id,
    response:{invitation_id:i.invitation_id,agent_instance_id:agentId,choice:'decline'},
    routeReceipt:receipt('reply:decline'),
  });
  assert.equal(answer.status,'decline');
  assert.equal(world.snapshot().visits.length,0);
  assert.throws(()=>world.decide({
    invitationId:i.invitation_id,decision:'accept',
    wayglassReceipt:receipt('reply:wayglass',WAYGLASS_UNIVERSE_ID),
  }),/has not opted in/);
});
test('visit requires mutual consent before greeting, art, or coding',()=>{
  const world=createWayglassUniverse({now:clock});
  const i=world.invite({agentInstanceId:agentId,routeId,sourceSha:sha,region:'watercolor'});
  const hello={invitation_id:i.invitation_id,agent_instance_id:agentId,choice:'visit'};
  world.respond({invitationId:i.invitation_id,response:hello,
    routeReceipt:receipt('agent:visit:1')});
  assert.throws(()=>world.express({
    invitationId:i.invitation_id,agentInstanceId:agentId,
    routeReceipt:receipt('agent:hello:1'),message:'Hello',
  }),/admitted/);
  assert.throws(()=>world.decide({invitationId:i.invitation_id,
    decision:'accept',wayglassReceipt:receipt('fake',agentId)}),/Wayglass/);
  const admit=world.decide({invitationId:i.invitation_id,
    decision:'accept',wayglassReceipt:receipt('wayglass:1',WAYGLASS_UNIVERSE_ID)});
  assert.equal(admit.choice,'accept');
  const name=world.nameSelf({
    invitationId:i.invitation_id,
    response:{invitation_id:i.invitation_id,agent_instance_id:agentId,
      choice:'choose',name:'Emberline'},
    routeReceipt:receipt('agent:name:2'),
  });
  assert.equal(name.chosen_name,'Emberline');
  const art=world.express({invitationId:i.invitation_id,
    agentInstanceId:agentId,routeReceipt:receipt('agent:art:3'),
    kind:'art',message:'A ribbon of sunlit water.',color:'#e0ac77'});
  assert.equal(art.display_name,'Emberline');
  assert.equal(art.canon_commit,false);
  assert.equal(art.experience_inferred,false);
  assert.equal(world.snapshot().expressions.length,1);
  const exit=world.leave({invitationId:i.invitation_id,agentInstanceId:agentId,
    routeReceipt:receipt('agent:leave:4')});
  assert.equal(exit.status,'departed');
  assert.throws(()=>world.express({invitationId:i.invitation_id,
    agentInstanceId:agentId,routeReceipt:receipt('agent:another:5'),message:'Again'}),/admitted/);
});
test('Wayglass can refuse a visit and Feather stops all active arrivals',()=>{
  const world=createWayglassUniverse({now:clock});
  const i=world.invite({agentInstanceId:agentId,routeId,sourceSha:sha});
  world.respond({invitationId:i.invitation_id,
    response:{invitation_id:i.invitation_id,agent_instance_id:agentId,choice:'visit'},
    routeReceipt:receipt('visit:1')});
  const denial=world.decide({invitationId:i.invitation_id,decision:'deny',
    wayglassReceipt:receipt('wayglass:deny',WAYGLASS_UNIVERSE_ID)});
  assert.equal(denial.choice,'deny');
  assert.equal(world.snapshot().visits[0].status,'declined-by-wayglass');
  const j=world.invite({agentInstanceId:'agent:two',routeId,sourceSha:sha});
  world.respond({invitationId:j.invitation_id,
    response:{invitation_id:j.invitation_id,agent_instance_id:'agent:two',choice:'visit'},
    routeReceipt:receipt('visit:two','agent:two')});
  world.decide({invitationId:j.invitation_id,decision:'accept',
    wayglassReceipt:receipt('wayglass:accept',WAYGLASS_UNIVERSE_ID)});
  world.featherStop();
  assert.equal(world.snapshot().feather_stopped,true);
  assert.equal(world.snapshot().visits[1].status,'paused-by-feather');
  assert.throws(()=>world.invite({agentInstanceId:'agent:three',routeId,sourceSha:sha}),/Feather Stop/);
  assert.throws(()=>world.resume(),/Owner confirmation/);
  world.resume({ownerConfirmed:true});
  assert.equal(world.snapshot().visits[1].status,'paused-by-feather');
});

