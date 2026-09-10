import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createCapabilityFirewall } from '../src/os/capability-firewall.js';
import { createAuthorityBroker } from '../src/os/authority-broker.js';
import { createStewardApprovalQueue } from '../src/os/steward-approval.js';

function harness() {
  const bus = createEventBus();
  const broker = createAuthorityBroker();
  const firewall = createCapabilityFirewall({ bus });
  const registry = createCapabilityRegistry({
    bus,
    policy: firewall,
    authorityResolver: ({ capability, context }) => {
      if (['read', 'operate'].includes(context.authority || 'read')) return { authority: context.authority || 'read' };
      const lease = broker.resolve({
        token: context.authority_lease,
        actor_id: context.actor_id || context.source || 'unknown',
        capability_id: capability.capability_id,
      });
      return lease.valid ? { authority: lease.authority } : { authority: 'operate', reason: `authority-lease-${lease.reason}` };
    },
  });
  let mutations = 0;
  registry.registerService({ service_id: 'test-mutator' });
  registry.registerCapability({
    capability_id: 'test.mutate',
    service_id: 'test-mutator',
    authority: 'mutate',
    requires_confirmation: true,
    validate: (input) => Boolean(input?.value),
    execute: () => { mutations += 1; return { changed: true }; },
  });
  const approvals = createStewardApprovalQueue({
    broker,
    invoke: (capabilityId, input, context) => registry.invoke(capabilityId, input, context),
    getCapability: (capabilityId) => registry.getCapability(capabilityId),
    bus,
  });
  return { bus, broker, firewall, registry, approvals, mutations: () => mutations };
}

test('privileged action cannot resolve without a trusted human action', async () => {
  const h = harness();
  const request = h.approvals.publicApi.request({
    actor_id: 'service:test',
    capability_id: 'test.mutate',
    summary: 'Apply one bounded test mutation.',
    input: { value: 'secret-value' },
  });
  await assert.rejects(
    h.approvals.resolveTrusted({ request_id: request.request_id, decision: 'approve', trusted: false }),
    /trusted human action/,
  );
  assert.equal(h.mutations(), 0);
  assert.equal(h.approvals.publicApi.get(request.request_id).status, 'pending');
});

test('trusted Steward action mints a private one-use lease and immediately consumes it', async () => {
  const h = harness();
  const request = h.approvals.publicApi.request({
    actor_id: 'service:test',
    capability_id: 'test.mutate',
    summary: 'Apply one bounded test mutation after reviewing a critical security flag.',
    input: { value: 'secret-value' },
    security_flags: ['privilege-escalation'],
    evidence_refs: ['receipt:security-1'],
    dissent: ['witness:test requested explicit review'],
    rollback_plan_summary: 'Restore the prior synthetic counter value.',
  });
  const resolved = await h.approvals.resolveTrusted({
    request_id: request.request_id,
    decision: 'approve',
    trusted: true,
  });
  assert.equal(resolved.status, 'approved-applied');
  assert.equal(resolved.execution.status, 'applied');
  assert.equal(h.mutations(), 1);
  assert.equal(h.broker.snapshot().length, 1);
  assert.equal(h.broker.snapshot()[0].status, 'used');
  const publicText = JSON.stringify(h.approvals.publicApi.list());
  assert.equal(publicText.includes('secret-value'), false);
  assert.equal(publicText.includes('authority-token'), false);
  assert.ok(h.firewall.snapshot().some((item) => item.decision === 'allow-reviewed' && item.steward_approval_id === request.request_id));
});

test('Steward rejection never mints authority or executes the capability', async () => {
  const h = harness();
  const request = h.approvals.publicApi.request({
    actor_id: 'service:test',
    capability_id: 'test.mutate',
    summary: 'Mutation that should be rejected.',
    input: { value: 'nope' },
  });
  const resolved = await h.approvals.resolveTrusted({ request_id: request.request_id, decision: 'reject', trusted: true });
  assert.equal(resolved.status, 'rejected');
  assert.equal(h.mutations(), 0);
  assert.equal(h.broker.snapshot().length, 0);
});
