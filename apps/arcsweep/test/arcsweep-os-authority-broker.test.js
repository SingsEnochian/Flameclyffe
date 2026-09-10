import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthorityBroker } from '../src/os/authority-broker.js';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';

test('Steward authority leases are short-lived, scoped, actor-bound, and single-use', () => {
  let clock = Date.parse('2026-09-10T17:00:00.000Z');
  const broker = createAuthorityBroker({ now: () => clock, maxTtlMs: 5000 });
  const issued = broker.issue({
    actor_id: 'guide:alpha',
    authority: 'mutate',
    capability_ids: ['canon.promote'],
    ttl_ms: 2000,
  });

  assert.equal(issued.lease.status, 'active');
  assert.equal(issued.lease.authority, 'mutate');
  assert.equal('token' in issued.lease, false);

  const wrongActor = broker.resolve({
    token: issued.token,
    actor_id: 'guide:other',
    capability_id: 'canon.promote',
  });
  assert.equal(wrongActor.valid, false);
  assert.equal(wrongActor.reason, 'actor-mismatch');

  const wrongScope = broker.resolve({
    token: issued.token,
    actor_id: 'guide:alpha',
    capability_id: 'repo.write',
  });
  assert.equal(wrongScope.valid, false);
  assert.equal(wrongScope.reason, 'capability-out-of-scope');

  const accepted = broker.resolve({
    token: issued.token,
    actor_id: 'guide:alpha',
    capability_id: 'canon.promote',
  });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.authority, 'mutate');

  const replay = broker.resolve({
    token: issued.token,
    actor_id: 'guide:alpha',
    capability_id: 'canon.promote',
  });
  assert.equal(replay.valid, false);
  assert.equal(replay.reason, 'used-lease');

  const expiring = broker.issue({
    actor_id: 'guide:alpha',
    authority: 'admin',
    capability_ids: ['os.policy'],
    ttl_ms: 1000,
  });
  clock += 1500;
  assert.equal(broker.resolve({ token: expiring.token, actor_id: 'guide:alpha', capability_id: 'os.policy' }).reason, 'expired-lease');
});

test('privileged capability claims are capped unless the private broker resolves a valid lease', async () => {
  const broker = createAuthorityBroker();
  const bus = createEventBus();
  const registry = createCapabilityRegistry({
    bus,
    authorityResolver: ({ capability, context }) => {
      if (context.authority === 'read' || context.authority === 'operate') return { authority: context.authority };
      const lease = broker.resolve({
        token: context.authority_lease,
        actor_id: context.actor_id,
        capability_id: capability.capability_id,
      });
      return lease.valid
        ? { authority: lease.authority }
        : { authority: 'operate', reason: `authority-lease-${lease.reason}` };
    },
  });
  registry.registerService({ service_id: 'canon-test' });
  registry.registerCapability({
    capability_id: 'canon.promote',
    service_id: 'canon-test',
    authority: 'mutate',
    execute: () => ({ promoted: true }),
  });

  const forged = await registry.invoke('canon.promote', {}, {
    authority: 'mutate',
    actor_id: 'guide:alpha',
  });
  assert.equal(forged.status, 'rejected');
  assert.equal(forged.reason, 'authority-lease-unknown-lease');
  assert.equal(forged.resolved_authority, 'operate');

  const issued = broker.issue({
    actor_id: 'guide:alpha',
    authority: 'mutate',
    capability_ids: ['canon.promote'],
  });
  const approved = await registry.invoke('canon.promote', {}, {
    authority: 'mutate',
    actor_id: 'guide:alpha',
    authority_lease: issued.token,
  });
  assert.equal(approved.status, 'applied');
  assert.equal(approved.resolved_authority, 'mutate');
});

test('authority broker never grants privileged leases without explicit Steward approval semantics', () => {
  const broker = createAuthorityBroker();
  assert.throws(() => broker.issue({ actor_id: 'model', authority: 'mutate', capability_ids: ['x'], approved_by: 'model-runtime' }), /human Steward approval/);
  assert.throws(() => broker.issue({ actor_id: 'model', authority: 'operate', capability_ids: ['x'] }), /reserved for mutate\/admin/);
  assert.throws(() => broker.issue({ actor_id: 'model', authority: 'admin', capability_ids: [] }), /capability scope/);
});
