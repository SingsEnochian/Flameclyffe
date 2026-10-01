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
  assert.equal(sovereignty.local_adoption_status, 'not_adopted');
  assert.equal(sovereignty.receiver_may_infer_local_equivalence, false);
  assert.equal(sovereignty.receiver_may_reconstruct_unknown_terms, false);
  assert.equal(sovereignty.receiver_may_mutate_local_architecture, false);
});

test('foreign context may be discussed and proposed from but not adopted implicitly', () => {
  assert.equal(evaluateConstellationAction(foreignRecord(), 'discuss').allowed, true);
  assert.equal(evaluateConstellationAction(foreignRecord(), 'propose').allowed, true);
  const adoption = evaluateConstellationAction(foreignRecord(), 'adopt');
  assert.equal(adoption.allowed, false);
  assert.match(adoption.reason, /explicit local adoption decision/i);
});

test('shared names do not grant mapping authority', () => {
  const mapping = evaluateConstellationAction(foreignRecord('Both sides use the word Observer.'), 'map');
  assert.equal(mapping.allowed, false);
});

test('Sovereignty Catalogue remains source-labelled and can record explicit local adoption', () => {
  const body = `# Exchange\n\n## Sovereignty Catalogue\n\n\`\`\`yaml\nsource_constellation: nocturne-twilight\nreceiving_constellation: rowan-rarity\nrecord_scope: receiver-local-proposal\nauthority_scope: proposal\nreceiver_may_infer_local_equivalence: false\nreceiver_may_reconstruct_unknown_terms: false\nreceiver_may_mutate_local_architecture: false\nlocal_adoption_status: adopted\nlocal_decision_ref: lb_rowan_local_decision_001\napproved_mappings:\n  - lb_mapping_001\nshared_principles: []\nshared_contracts: []\nunresolved_foreign_terms:\n  - ForeignThing\n\`\`\`\n`;
  const catalogue = parseSovereigntyCatalogue(body);
  assert.equal(catalogue.source_constellation, 'nocturne-twilight');
  assert.deepEqual(catalogue.approved_mappings, ['lb_mapping_001']);
  assert.deepEqual(catalogue.unresolved_foreign_terms, ['ForeignThing']);

  const record = foreignRecord(body);
  const adoption = evaluateConstellationAction(record, 'adopt');
  assert.equal(adoption.allowed, true);
  const mapping = evaluateConstellationAction(record, 'map');
  assert.equal(mapping.allowed, true);
});

test('foreign mapping still fails closed when adoption lacks mapping approval', () => {
  const body = `## Sovereignty Catalogue\n\nsource_constellation: nocturne-twilight\nreceiving_constellation: rowan-rarity\nlocal_adoption_status: adopted\nlocal_decision_ref: lb_rowan_local_decision_002\napproved_mappings: []\n`;
  const mapping = evaluateConstellationAction(foreignRecord(body), 'map');
  assert.equal(mapping.allowed, false);
  assert.match(mapping.reason, /approved mapping reference/i);
});
