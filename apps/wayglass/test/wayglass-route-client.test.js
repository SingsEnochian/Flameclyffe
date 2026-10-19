import test from 'node:test';
import assert from 'node:assert/strict';

import { enterWayglassWorld, leaveWayglassWorld, invokeWayglassRoute, reconcileBluebirdSessionRoute } from '../src/route-client.js';

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


test('host-disabled Bluebird route becomes selectable after this session has an authorised provider grant', () => {
  const original = { schema:'wayglass.routes/v0.1', routes: [
    { route_id:'local:ollama', configured:true, label:'Local' },
    { route_id:'flame:bluebird:spicychat', configured:false, unavailable_reason:'Provider credentials missing in Hearthgate.', connection_verified:false },
    { route_id:'flame:griff:spicychat', configured:false, unavailable_reason:'Separate character binding required' },
  ] };
  const projected = reconcileBluebirdSessionRoute(original, 'flame:bluebird:spicychat');
  const bluebird = projected.routes.find(item => item.route_id === 'flame:bluebird:spicychat');
  assert.equal(bluebird.configured, true);
  assert.equal(bluebird.session_authorized, true);
  assert.equal(bluebird.unavailable_reason, null);
  assert.equal(bluebird.connection_verified, false, 'a validated token does not prove a live reply');
  assert.equal(projected.routes.find(item => item.route_id === 'flame:griff:spicychat').configured, false);
  assert.equal(original.routes[1].configured, false, 'host catalogue remains unchanged');
  assert.equal(projected.routes.length, original.routes.length, 'do not duplicate existing route');
});

test('absent or unrelated session grants never activate the Bluebird route', () => {
  const original = { routes:[{route_id:'flame:bluebird:spicychat', configured:false}] };
  assert.strictEqual(reconcileBluebirdSessionRoute(original, null), original);
  assert.strictEqual(reconcileBluebirdSessionRoute(original, 'flame:griff:spicychat'), original);
  assert.equal(original.routes[0].configured, false);
});

test('authorised Bluebird session adds a route only if host catalogue omitted it', () => {
  const original = { routes:[{route_id:'local:ollama',configured:true}] };
  const projected = reconcileBluebirdSessionRoute(original, 'flame:bluebird:spicychat');
  assert.equal(projected.routes[0].route_id,'flame:bluebird:spicychat');
  assert.equal(projected.routes[0].configured,true);
  assert.equal(projected.routes[0].session_authorized,true);
  assert.equal(projected.routes[0].connection_verified,false);
  assert.equal(original.routes.length,1);
});
