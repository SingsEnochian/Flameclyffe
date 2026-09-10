import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerCybersecurityIntelligenceService } from '../src/os/cybersecurity-service.js';

const seed = Object.freeze({
  schema: 'arcsweep.cybersecurity-seed/v1',
  ingest_policy: {
    mode: 'read-only',
    allow_direct_policy_mutation: false,
    allow_direct_capability_escalation: false,
  },
  sources: [
    { source_id: 'mitre-atlas', source_class: 'ai-adversary-technique-knowledge-base', use: ['AI system attacks'] },
    { source_id: 'cisa-kev', source_class: 'known-exploited-vulnerability-catalog', use: ['patch prioritisation'] },
  ],
  risk_families: ['prompt-injection', 'capability-drift', 'supply-chain-compromise'],
});

test('Cybersecurity Intelligence joins the OS as a read-only defensive service', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerCybersecurityIntelligenceService(registry, { loadSeed: async () => seed });

  const catalog = await registry.invoke('security.catalog', {}, { authority: 'read', source: 'security-test' });
  assert.equal(catalog.status, 'applied');
  assert.equal(catalog.output.schema, 'arcsweep.cybersecurity-seed/v1');
  assert.equal(catalog.output.ingest_policy.allow_direct_policy_mutation, false);

  const sources = await registry.invoke('security.sources', {}, { authority: 'read' });
  assert.equal(sources.status, 'applied');
  assert.deepEqual(sources.output.map((item) => item.source_id), ['mitre-atlas', 'cisa-kev']);

  const source = await registry.invoke('security.source', { source_id: 'mitre-atlas' }, { authority: 'read' });
  assert.equal(source.status, 'applied');
  assert.equal(source.output.source_class, 'ai-adversary-technique-knowledge-base');

  const tags = await registry.invoke('security.classify-known-risk-tags', {
    risk_families: ['prompt-injection', 'totally-new-risk', 'capability-drift', 'prompt-injection'],
  }, { authority: 'read' });
  assert.equal(tags.status, 'applied');
  assert.deepEqual(tags.output.known, ['prompt-injection', 'capability-drift']);
  assert.deepEqual(tags.output.unknown, ['totally-new-risk']);

  const descriptors = registry.capabilities().filter((item) => item.service_id === 'cybersecurity-intelligence');
  assert.equal(descriptors.length, 5);
  assert.ok(descriptors.every((item) => item.authority === 'read'));
  assert.equal(registry.getService('cybersecurity-intelligence').authority_boundary.autonomous_offensive_action, false);

  const receipts = bus.history().filter((event) => event.name === 'arcsweep:capability-invoked');
  assert.ok(receipts.length >= 4);
  assert.ok(receipts.every((event) => event.payload.service_id === 'cybersecurity-intelligence'));
});

test('Cybersecurity Intelligence refuses malformed seed data instead of inventing security state', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerCybersecurityIntelligenceService(registry, {
    loadSeed: async () => ({ schema: 'foreign.security/v9', sources: [], risk_families: [] }),
  });

  const receipt = await registry.invoke('security.catalog', {}, { authority: 'read' });
  assert.equal(receipt.status, 'failed');
  assert.match(receipt.error, /invalid schema/i);
});
