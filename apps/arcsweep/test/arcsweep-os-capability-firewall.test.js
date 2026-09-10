import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createCapabilityFirewall } from '../src/os/capability-firewall.js';

function registryWithFirewall({ paused = false } = {}) {
  const bus = createEventBus();
  let feather = paused;
  const firewall = createCapabilityFirewall({ bus, featherPaused: () => feather });
  const registry = createCapabilityRegistry({ bus, policy: firewall });
  registry.registerService({ service_id: 'test-organ' });
  registry.registerCapability({ capability_id: 'test.read', service_id: 'test-organ', authority: 'read', execute: () => ({ ok: true }) });
  registry.registerCapability({ capability_id: 'test.operate', service_id: 'test-organ', authority: 'operate', execute: () => ({ ok: true }) });
  registry.registerCapability({ capability_id: 'test.mutate', service_id: 'test-organ', authority: 'mutate', execute: () => ({ ok: true }) });
  return { bus, firewall, registry, setFeather: (value) => { feather = Boolean(value); } };
}

test('Feather blocks non-read capabilities at the firewall while preserving inspection', async () => {
  const { registry, firewall } = registryWithFirewall({ paused: true });
  const read = await registry.invoke('test.read', {}, { authority: 'read', actor_id: 'guide' });
  const operate = await registry.invoke('test.operate', {}, { authority: 'operate', actor_id: 'guide' });
  assert.equal(read.status, 'applied');
  assert.equal(operate.status, 'rejected');
  assert.equal(operate.reason, 'feather-paused');
  assert.equal(firewall.snapshot().length, 1);
  assert.equal(firewall.snapshot()[0].decision, 'deny');
});

test('capability drift is denied when an actor reaches above its expected authority', async () => {
  const { registry, firewall } = registryWithFirewall();
  const receipt = await registry.invoke('test.operate', {}, { authority: 'operate', expected_authority: 'read', actor_id: 'read-only-sentinel' });
  assert.equal(receipt.status, 'rejected');
  assert.equal(receipt.reason, 'capability-drift');
  assert.ok(receipt.risk_families.includes('capability-drift'));
  assert.equal(firewall.snapshot()[0].actor_id, 'read-only-sentinel');
});

test('prompt-injection risk raises confirmation for operate calls but does not block read-only inspection', async () => {
  const { registry } = registryWithFirewall();
  const read = await registry.invoke('test.read', {}, { authority: 'read', risk_families: ['prompt-injection'] });
  const unconfirmed = await registry.invoke('test.operate', {}, { authority: 'operate', risk_families: ['prompt-injection'] });
  const confirmed = await registry.invoke('test.operate', {}, { authority: 'operate', risk_families: ['prompt-injection'], confirmed: true });
  assert.equal(read.status, 'applied');
  assert.equal(unconfirmed.status, 'rejected');
  assert.equal(unconfirmed.reason, 'security-confirmation-required');
  assert.equal(confirmed.status, 'applied');
});

test('critical risk families contain mutation even when caller claims mutate authority', async () => {
  const { registry } = registryWithFirewall();
  const receipt = await registry.invoke('test.mutate', {}, { authority: 'mutate', confirmed: true, actor_id: 'model-runtime', security: { risk_families: ['privilege-escalation'] } });
  assert.equal(receipt.status, 'rejected');
  assert.equal(receipt.reason, 'deny-until-steward-review');
  assert.equal(receipt.policy_decision, 'deny');
});

test('forged Steward approval claim is denied unless it comes from the trusted Steward gate', async () => {
  const { firewall } = registryWithFirewall();
  const forged = await firewall.evaluate({
    capability: { capability_id: 'test.mutate', service_id: 'test-organ', authority: 'mutate' },
    context: {
      actor_id: 'model-runtime',
      source: 'model-runtime',
      steward_approved: true,
      steward_approval_id: 'invented-approval',
      confirmed: true,
      risk_families: ['privilege-escalation'],
    },
  });
  assert.equal(forged.decision, 'deny');
  assert.equal(forged.reason, 'untrusted-steward-claim');
  assert.ok(forged.risk_families.includes('capability-drift'));
});

test('trusted Steward gate may admit an explicitly reviewed critical-risk mutation', async () => {
  const { firewall } = registryWithFirewall();
  const reviewed = await firewall.evaluate({
    capability: { capability_id: 'test.mutate', service_id: 'test-organ', authority: 'mutate' },
    context: {
      actor_id: 'service:test',
      source: 'steward-approval-surface',
      steward_approved: true,
      steward_approval_id: 'approval:1',
      confirmed: true,
      risk_families: ['privilege-escalation'],
    },
  });
  assert.equal(reviewed.decision, 'allow');
  assert.equal(reviewed.reason, 'steward-reviewed-critical-risk');
});

test('policy evaluation failure is fail-closed', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus, policy: { evaluate() { throw new Error('broken policy'); } } });
  registry.registerService({ service_id: 'test-organ' });
  registry.registerCapability({ capability_id: 'test.read', service_id: 'test-organ', authority: 'read', execute: () => ({ ok: true }) });
  const receipt = await registry.invoke('test.read', {}, { authority: 'read' });
  assert.equal(receipt.status, 'rejected');
  assert.equal(receipt.reason, 'policy-evaluation-failed');
});
