import test from 'node:test';
import assert from 'node:assert/strict';

import { enterWayglassWorld, leaveWayglassWorld, invokeWayglassRoute } from '../src/route-client.js';

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
  };
}

test('browser world-entry client posts the crossing contract to the server', async () => {
  const seen = [];
  const result = await enterWayglassWorld({
    worldId: 'wayglass:test-world',
    participantId: 'rowan:test',
    routeId: 'local:ollama',
    waygateManifest: { schema: 'wayglass.waygate/v0.1', waygate_id: 'wg:test', world_id: 'wayglass:test-world' },
    continuationPacket: { schema: 'wayglass.continuation-packet/v0.1', packet_id: 'cp:test' },
    embodiment: { body_id: 'browser-1', body_class: 'host-os', keyboard: true },
    fetchImpl: async (url, options) => {
      seen.push({ url, options });
      return response(200, { schema: 'wayglass.world-entry/v0.1', status: 'entered', entered: true });
    },
  });

  assert.equal(result.entered, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, '/api/v1/wayglass/kernel/enter');
  assert.equal(seen[0].options.method, 'POST');
  const payload = JSON.parse(seen[0].options.body);
  assert.equal(payload.world_id, 'wayglass:test-world');
  assert.equal(payload.participant_id, 'rowan:test');
  assert.equal(payload.route_id, 'local:ollama');
  assert.equal(payload.embodiment.body_id, 'browser-1');
});

test('browser world-entry client preserves a 409 blocking receipt for inspection', async () => {
  const blocked = {
    schema: 'wayglass.world-entry/v0.1',
    status: 'blocked-continuation',
    entered: false,
    blocked_by: ['participant-mismatch'],
  };

  const result = await enterWayglassWorld({
    worldId: 'wayglass:test-world',
    participantId: 'someone-else',
    waygateManifest: { schema: 'wayglass.waygate/v0.1' },
    fetchImpl: async () => response(409, blocked),
  });

  assert.deepEqual(result, blocked);
});

test('browser world-entry client throws transport or malformed-request failures', async () => {
  await assert.rejects(() => enterWayglassWorld({
    worldId: 'wayglass:test-world',
    participantId: 'rowan:test',
    waygateManifest: {},
    fetchImpl: async () => response(400, { error: 'waygate_manifest required.' }),
  }), /waygate_manifest required/);
});

test('browser departure client posts resumable stop state to the server', async () => {
  const seen = [];
  const result = await leaveWayglassWorld({
    worldId: 'wayglass:test-world',
    participantId: 'rowan:test',
    routeId: 'local:ollama',
    reason: 'rest',
    embodiment: { body_id: 'browser-1', body_class: 'host-os' },
    identityDeclarations: [{ entity_id: 'rowan:test', declaration: 'self-declared participant' }],
    relationshipState: [{ with: 'rarity:test', state: 'collaborating' }],
    activeWork: [{ work_id: 'wayglass:return-engine', state: 'in-progress' }],
    unresolvedWonderQuestions: ['What survives the crossing?'],
    provenanceRefs: ['receipt:session-test'],
    stopPoint: 'Ready to cross.',
    nextOwner: 'rarity:test',
    alternatives: [{ id: 'route-a', state: 'open' }],
    fetchImpl: async (url, options) => {
      seen.push({ url, options });
      return response(201, {
        schema: 'wayglass.departure/v0.1',
        status: 'stopped',
        continuation_packet: { packet_id: 'continuation:test' },
      });
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(seen[0].url, '/api/v1/wayglass/kernel/leave');
  assert.equal(seen[0].options.method, 'POST');
  const payload = JSON.parse(seen[0].options.body);
  assert.equal(payload.world_id, 'wayglass:test-world');
  assert.equal(payload.participant_id, 'rowan:test');
  assert.equal(payload.stop_point, 'Ready to cross.');
  assert.equal(payload.next_owner, 'rarity:test');
  assert.deepEqual(payload.unresolved_wonder_questions, ['What survives the crossing?']);
});


test('browser provider request serialises explicit StepFun transfer confirmation only when true', async () => {
  const seen = [];
  async function fetchImpl(url, options) {
    seen.push({ url, payload: JSON.parse(options.body) });
    return response(200, { output: 'Synthetic.' });
  }
  await invokeWayglassRoute({ routeId: 'stepfun:flash', input: 'Synthetic.', externalProviderConsent: false, fetchImpl });
  await invokeWayglassRoute({ routeId: 'stepfun:step5', input: 'Synthetic.', externalProviderConsent: true, fetchImpl });
  assert.equal(seen[0].url, '/api/v1/wayglass/respond');
  assert.equal(seen[0].payload.external_provider_consent, false);
  assert.equal(seen[1].payload.external_provider_consent, true);
  assert.equal(seen[1].payload.route_id, 'stepfun:step5');
});


test('Wyrdrune writing score sends declared participants and text only through the scoring route', async () => {
  const { scoreWyrdruneStory } = await import('../src/route-client.js');
  let sent;
  const score=await scoreWyrdruneStory({
    text:'Water and wind',affinity:0.6,turns:2,
    participants:[{id:'participant:author'},{id:'route:local'}],
    fetchImpl:async(url,options)=>{
      sent={url,options};
      return response(200,{schema:'wayglass.wyrdrune-story-soundscape/v0.1',status:'scored',model_invoked:false,audio_started:false});
    },
  });
  assert.equal(sent.url,'/api/v1/wayglass/wyrdrune/story-soundscape');
  assert.equal(JSON.parse(sent.options.body).affinity,0.6);
  assert.equal(JSON.parse(sent.options.body).participants.length,2);
  assert.equal(score.model_invoked,false);
});

test('full-spectrum browser transport sends only bounded event scalars', async()=>{
  const { scoreWyrdruneSpectrum } = await import('../src/route-client.js');
  let sent;
  const input={event_id:'ui-1',kind:'gesture',strength:.6,motion:.2,continuity:.8,intent:.7,
    affinity:.5,phase:.1,source_ref:'wayglass:ui-events'};
  const response=await scoreWyrdruneSpectrum([input],async(url,options)=>{
    sent={url,options};
    return {ok:true,async json(){return {schema:'wayglass.full-spectrum/v0.1',count:1}}};
  });
  assert.equal(sent.url,'/api/v1/wayglass/wyrdrune/full-spectrum');
  assert.deepEqual(JSON.parse(sent.options.body).events,[input]);
  assert.equal(response.count,1);
});


test('Atlas route transports bounded scale values, not world names or narrative',async()=>{
 const {scoreWyrdruneAtlas}=await import('../src/route-client.js');
 let seen;
 const scales={instant:.4,room:.5,world:.6,universe:.7,affinity:.3,phase:.1,
  counts:{instant:1,room:2,world:3,universe:4}};
 await scoreWyrdruneAtlas(scales,async(url,options)=>{
  seen={url,options};return response(200,{schema:'wayglass.resonance-atlas/v0.1'});
 });
 assert.equal(seen.url,'/api/v1/wayglass/wyrdrune/resonance-atlas');
 assert.deepEqual(JSON.parse(seen.options.body),{scales});
 assert.equal(seen.options.method,'POST');
});


test('native learning transports typed numeric inputs only unless a model reflection was offered',async()=>{
 const {executeWyrdruneLearning}=await import('../src/route-client.js');
 let recorded;
 const learning={
   atlas:{coherence:.7,interference:.3,bloom:.6,granulation:.5,flow:.7},
   interior:{energy:.4,curiosity:.5,uncertainty:.6,coherence:.6,previous_resonance:.7},
   source:{event_id:'ui-session-1',atlas_input_hash:'a'.repeat(64),atlas_program_hash:'b'.repeat(64)},
   reflection:null,
 };
 await executeWyrdruneLearning(learning,async(url,options)=>{
   recorded={url,options};
   return response(200,{schema:'wayglass.wyrdrune-living-learning/v0.1'});
 });
 assert.equal(recorded.url,'/api/v1/wayglass/wyrdrune/living-learning');
 assert.equal(recorded.options.method,'POST');
 assert.deepEqual(JSON.parse(recorded.options.body),{learning});
 assert.equal(JSON.stringify(recorded.options.body).includes('private_question'),false);
});


test('native voice invitation requests Wayglass-authored WTL, en-GB and optional image/sound',async()=>{
 const {inviteWayglassVoice}=await import('../src/route-client.js');
 let called;
 await inviteWayglassVoice({prompt:'What if?',channels:{image:true,sound:false},
   fetchImpl:async(url,options)=>{
     called={url,options};
     return response(200,{schema:'wayglass.native-wyrdrune-voice/v0.1'});
   }});
 assert.equal(called.url,'/api/v1/wayglass/wyrdrune/native-voice');
 assert.equal(called.options.method,'POST');
 assert.deepEqual(JSON.parse(called.options.body),{
   prompt:'What if?',channels:{image:true,sound:false},
 });
});
