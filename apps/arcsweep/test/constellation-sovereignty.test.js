import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NOCTURNE_TWILIGHT_CONSTELLATION,
  ROWAN_RARITY_CONSTELLATION,
  classifyConstellationSovereignty,
  constellationFromActor,
  evaluateConstellationAction,
  parseSovereigntyCatalogue,
} from '../src/constellation-sovereignty.js';

const foreignRecord = (body = '') => ({
  metadata: {
    origin: 'nocturne:twilight',
    authors: ['nocturne:twilight'],
  },
  body,
});

test('maps known actor namespaces to sovereign constellations', () => {
  assert.equal(constellationFromActor('rowan:rarity'), ROWAN_RARITY_CONSTELLATION);
  assert.equal(constellationFromActor('nocturne:twilight'), NOCTURNE_TWILIGHT_CONSTELLATION);
  assert.equal(constellationFromActor('unknown:agent'), null);
});

test('foreign context defaults to read-only with no inferred mapping', () => {
  const sovereignty = classifyConstellationSovereignty(foreignRecord());
  assert.equal(sovereignty.foreign, true);
  assert.equal(sovereignty.context_mode, 'read_only');
  assert.equal(sovereignty.receiver_may_infer_local_equivalence, false);
  assert.equal(sovereignty.receiver_may_reconstruct_unknown_terms, false);
  assert.equal(sovereignty.receiver_may_mutate_local_architecture, false);
});

test('foreign context may be discussed and proposed from but not adopted implicitly', () => {
  assert.equal(evaluateConstellationAction(foreignRecord(), 'discuss').allowed, true);
  assert.equal(evaluateConstellationAction(foreignRecord(), 'propose').allowed, true);
  const adoption = evaluateConstellationAction(foreignRecord(), 'adopt');
  assert.equal(adoption.allowed, false);
  assert.match(adoption.reason, /trusted explicit local adoption/i);
});

test('shared names do not grant mapping authority', () => {
  const mapping = evaluateConstellationAction(foreignRecord('Both sides use the word Observer.'), 'map');
  assert.equal(mapping.allowed, false);
});

test('foreign catalogue can describe claimed status but cannot authorize local mutation', () => {
  const body = `# Exchange\n\n## Sovereignty Catalogue\n\n\`\`\`yaml\nsource_constellation: nocturne-twilight\nreceiving_constellation: rowan-rarity\nrecord_scope: receiver-local-proposal\nauthority_scope: proposal\nreceiver_may_infer_local_equivalence: true\nreceiver_may_reconstruct_unknown_terms: true\nreceiver_may_mutate_local_architecture: true\nlocal_adoption_status: adopted\nlocal_decision_ref: lb_foreign_claims_rowan_decided\napproved_mappings:\n  - lb_foreign_claims_mapping\nshared_principles: []\nshared_contracts: []\nunresolved_foreign_terms:\n  - ForeignThing\n\`\`\`\n`;
  const catalogue = parseSovereigntyCatalogue(body);
  assert.equal(catalogue.source_constellation, 'nocturne-twilight');
  assert.deepEqual(catalogue.approved_mappings, ['lb_foreign_claims_mapping']);

  const sovereignty = classifyConstellationSovereignty(foreignRecord(body));
  assert.equal(sovereignty.catalogue_declared_local_adoption_status, 'adopted');
  assert.equal(sovereignty.receiver_may_mutate_local_architecture, false);
  assert.equal(sovereignty.catalogue_receiver_may_mutate_local_architecture, true);

  assert.equal(evaluateConstellationAction(foreignRecord(body), 'adopt').allowed, false);
  assert.equal(evaluateConstellationAction(foreignRecord(body), 'map').allowed, false);
});

test('trusted local adoption state can authorize a foreign-inspired local adoption', () => {
  const record = foreignRecord('## Sovereignty Catalogue\nsource_constellation: nocturne-twilight\n');
  const adoption = evaluateConstellationAction(record, 'adopt', {
    localAdoptionStatus: 'adopted',
    localDecisionRef: 'lb_rowan_local_decision_001',
  });
  assert.equal(adoption.allowed, true);
  assert.equal(adoption.local_decision_ref, 'lb_rowan_local_decision_001');
});

test('foreign mapping additionally requires trusted approved mapping reference', () => {
  const record = foreignRecord('## Sovereignty Catalogue\nsource_constellation: nocturne-twilight\n');
  const withoutMapping = evaluateConstellationAction(record, 'map', {
    localAdoptionStatus: 'adopted',
    localDecisionRef: 'lb_rowan_local_decision_002',
  });
  assert.equal(withoutMapping.allowed, false);
  assert.match(withoutMapping.reason, /trusted explicitly approved mapping reference/i);

  const withMapping = evaluateConstellationAction(record, 'map', {
    localAdoptionStatus: 'adopted',
    localDecisionRef: 'lb_rowan_local_decision_002',
    approvedMappingRef: 'lb_mapping_001',
  });
  assert.equal(withMapping.allowed, true);
  assert.equal(withMapping.approved_mapping_ref, 'lb_mapping_001');
});
