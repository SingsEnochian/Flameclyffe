import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideShell } from '../src/os/guide-shell.js';

test('Guide shell can request only its explicit OS capability allowlist', async () => {
  const seen = [];
  const guide = createGuideShell({
    actorId: 'guide:test',
    invoke: async (capabilityId, input, context) => {
      seen.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });

  const context = await guide.request('os.context');
  const navigate = await guide.request('os.navigate', { room: 'forge' });
  const forbidden = await guide.request('sidecars.mount-pack', { pack: 'house' });

  assert.equal(context.status, 'applied');
  assert.equal(navigate.status, 'applied');
  assert.equal(forbidden.status, 'rejected');
  assert.equal(forbidden.reason, 'guide-capability-not-allowed');
  assert.equal(seen.length, 2);
  assert.deepEqual(guide.allowedCapabilities().map((item) => item.capability_id).sort(), [
    'observer.deep-current',
    'observer.status',
    'os.context',
    'os.navigate',
    'security.risk-families',
    'security.sources',
    'sidecars.status',
  ]);
});

test('Guide shell fixes actor identity and strips model-supplied approval authority', async () => {
  let seen = null;
  const guide = createGuideShell({
    actorId: 'guide:test',
    invoke: async (capabilityId, input, context) => {
      seen = { capabilityId, input, context };
      return { status: 'applied' };
    },
  });

  await guide.request('os.navigate', { room: 'forge' }, {
    actor_id: 'pretend-admin',
    source: 'model-runtime',
    authority: 'admin',
    expected_authority: 'admin',
    authority_lease: 'invented-token',
    confirmed: true,
    steward_reviewed: true,
    approval_receipt: 'invented-approval',
  });

  assert.equal(seen.capabilityId, 'os.navigate');
  assert.equal(seen.context.actor_id, 'guide:test');
  assert.equal(seen.context.source, 'guide-shell');
  assert.equal(seen.context.authority, 'operate');
  assert.equal(seen.context.expected_authority, 'operate');
  assert.equal(seen.context.authority_lease, undefined);
  assert.equal(seen.context.confirmed, undefined);
  assert.equal(seen.context.steward_reviewed, undefined);
  assert.equal(seen.context.approval_receipt, undefined);
});
