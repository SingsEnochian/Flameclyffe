import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TERRA_PRIME_AI_THREAT_INTEL_SCHEMA,
  TERRA_PRIME_AI_THREAT_INTEL_UPDATE_ID,
  buildTerraPrimeAiThreatIntelUpdate,
} from '../src/terra-prime-ai-threat-intel-2026-09-11.js';

const RECEIVED_AT = '2026-09-11T15:30:00.000Z';

test('Anthropic threat-intel update emits four receipted Terra Prime observations', () => {
  const update = buildTerraPrimeAiThreatIntelUpdate({ receivedAt: RECEIVED_AT });

  assert.equal(update.length, 4);

  for (const entry of update) {
    assert.equal(entry.observation.world_id, 'earth_prime');
    assert.equal(entry.receipt.world_id, 'earth_prime');
    assert.equal(entry.receipt.observer_status, 'received');
    assert.equal(entry.observation.provenance.update_id, TERRA_PRIME_AI_THREAT_INTEL_UPDATE_ID);
    assert.equal(entry.observation.provenance.ingest_schema, TERRA_PRIME_AI_THREAT_INTEL_SCHEMA);
  }
});

test('threat intelligence routes through all three DEEP datasets', () => {
  const [threat] = buildTerraPrimeAiThreatIntelUpdate({ receivedAt: RECEIVED_AT });

  assert.equal(threat.observation.family, 'ai-language-pattern');
  assert.deepEqual(threat.observation.deep_routes, ['DEEPStory', 'DEEPTime', 'DEEPTheory']);
  assert.equal(threat.observation.classification, 'threat-intelligence-report');
  assert.ok(threat.observation.payload.harm_areas.includes('illicit distillation'));
  assert.match(threat.observation.payload.epistemic_status, /provider-reported/i);
});

test('capability evaluation stays task-scoped and science-routed', () => {
  const [, capability] = buildTerraPrimeAiThreatIntelUpdate({ receivedAt: RECEIVED_AT });

  assert.equal(capability.observation.family, 'science');
  assert.deepEqual(capability.observation.deep_routes, ['DEEPStory', 'DEEPTheory']);
  assert.match(capability.observation.payload.epistemic_status, /task-specific/i);
});

test('governance signal remains contingent rather than promoted to settled policy', () => {
  const [, , governance] = buildTerraPrimeAiThreatIntelUpdate({ receivedAt: RECEIVED_AT });

  assert.equal(governance.observation.family, 'human-world');
  assert.deepEqual(governance.observation.deep_routes, ['DEEPStory', 'DEEPTime']);
  assert.match(governance.observation.payload.epistemic_status, /contingent/i);
});

test('project implication captures future-facing provenance requirements', () => {
  const [, , , implication] = buildTerraPrimeAiThreatIntelUpdate({ receivedAt: RECEIVED_AT });

  assert.equal(implication.observation.family, 'project-observation');
  assert.deepEqual(implication.observation.deep_routes, ['DEEPStory', 'DEEPTime', 'DEEPTheory']);
  assert.equal(implication.observation.payload.status, 'adopt-as-forward-architecture-requirement');
  assert.ok(
    implication.observation.payload.design_requirements.some((requirement) =>
      requirement.includes('authenticated producer identity'),
    ),
  );
  assert.ok(
    implication.observation.payload.design_requirements.some((requirement) =>
      requirement.includes('Cross-provider routing'),
    ),
  );
});
