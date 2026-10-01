import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESENCE_UNKNOWN,
  createPresence,
  createPresenceLineageReceipt,
  projectPresence,
  rebindPresenceProvider,
  setPresenceParticipation,
  teardownPresence,
} from '../src/presence-fabric.js';

test('identity persists while separate surfaces receive separate presences', () => {
  const web = createPresence({ identityId: 'lioreal', sessionId: 'web-1', surface: 'web' });
  const house = projectPresence(web, { surface: 'house-commons', sessionId: 'house-1' });
  assert.equal(web.identity_id, house.identity_id);
  assert.notEqual(web.presence_id, house.presence_id);
  assert.notEqual(web.session_id, house.session_id);
  assert.equal(Object.isFrozen(house), true);
  assert.equal(Object.isFrozen(house.provider_binding), true);
});

test('provider rebind preserves identity, presence, surface, and session', () => {
  const before = createPresence({ identityId: 'atlas', presenceId: 'p-1', sessionId: 's-1', surface: 'api' });
  const after = rebindPresenceProvider(before, { providerId: 'openai', modelId: 'gpt-5', bindingId: 'route-1' });
  assert.equal(after.identity_id, before.identity_id);
  assert.equal(after.presence_id, before.presence_id);
  assert.equal(after.surface, before.surface);
  assert.equal(after.session_id, before.session_id);
  assert.equal(after.provider_binding.model_id, 'gpt-5');
});

test('participation mode is bounded state, not authority', () => {
  const active = setPresenceParticipation(createPresence({ identityId: 'cosmo', sessionId: 's-1' }), 'active');
  assert.equal(active.participation_mode, 'active');
  assert.equal(Object.hasOwn(active, 'authority_grants'), false);
  assert.throws(() => setPresenceParticipation(active, 'overlord'), /participation mode/);
});

test('unknown surface and provider are explicit UNKNOWN values', () => {
  const presence = createPresence({ identityId: 'vesper', sessionId: 's-1', surface: 'holodeck' });
  assert.equal(presence.surface, PRESENCE_UNKNOWN);
  assert.equal(presence.provider_binding.provider_id, PRESENCE_UNKNOWN);
  assert.equal(presence.provider_binding.model_id, PRESENCE_UNKNOWN);
});

test('teardown emits credential-free lineage receipt and preserves continuity', () => {
  const presence = createPresence({ identityId: 'solara', sessionId: 's-1', continuityRef: 'thread-7' });
  const receipt = teardownPresence(presence, { reason: 'surface-closed' });
  assert.equal(receipt.schema, 'arcsweep.presence-lineage-receipt/v1');
  assert.equal(receipt.action, 'torn-down');
  assert.equal(receipt.after, null);
  assert.equal(receipt.before.identity_id, 'solara');
  assert.equal(receipt.before.continuity_ref, 'thread-7');
  assert.equal(receipt.authority_grants.length, 0);
  assert.equal(Object.hasOwn(receipt, 'api_key'), false);
  assert.equal(Object.hasOwn(receipt, 'token'), false);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(createPresenceLineageReceipt({ action: 'surface-projected', after: presence }).action, 'surface-projected');
});

test('identity and session are required', () => {
  assert.throws(() => createPresence({ sessionId: 's-1' }), /identityId/);
  assert.throws(() => createPresence({ identityId: 'atlas' }), /sessionId/);
});
