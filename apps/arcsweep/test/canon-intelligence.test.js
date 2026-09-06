import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  normaliseCanonEvidence,
  resolveCanonEntity,
  resolveCanonField,
  compareCanonValue,
  createCanonIntelligenceProposal,
  buildContradictionBundle,
  proposeMissingCanonFields,
  reviewCanonProposal,
  createCanonPromotionReceipt,
  applyCanonPromotion,
} from '../src/canon-intelligence-core.js';
import {
  emptyCanonIntelligenceState,
  enqueueCanonProposal,
  replaceCanonProposal,
  appendCanonPromotion,
  filterCanonProposals,
} from '../src/canon-intelligence-store.js';
import { renderCanonIntelligenceProposal } from '../src/canon-intelligence-live-ui.js';

const evidence = normaliseCanonEvidence({
  source_id: 'wot-fandom:kestrelle',
  source_kind: 'canon-source',
  source_title: 'Kestrelle al’Var',
  world_id: 'taaveren-vaen',
  entity_hint: 'Kestrelle al’Var',
  field_hint: 'occupation',
  value: 'Wise Woman',
  excerpt: 'Kestrelle is a recognised Wise Woman.',
  authority: 'source',
  confidence: 0.91,
  provenance: ['ingest:757'],
});

const entities = [{ id: 'kestrelle-al-var', type: 'character', name: 'Kestrelle al’Var', aliases: ['Kestrelle'] }];
const fields = [{ key: 'occupation', label: 'Occupation', aliases: ['role'], entity_types: ['character'] }];

test('ingest normalisation keeps evidence outside canon', () => {
  assert.equal(evidence.schema, 'arcsweep.canon-intelligence-evidence/v1');
  assert.equal(evidence.canon_status, 'evidence-only');
  assert.equal(evidence.value, 'Wise Woman');
});

test('entity and field resolution distinguish resolved, ambiguous, and unknown', () => {
  assert.equal(resolveCanonEntity(evidence, entities).status, 'resolved');
  assert.equal(resolveCanonField(evidence, entities[0], fields).status, 'resolved');
  assert.equal(resolveCanonEntity({ entity_hint: 'Nobody' }, entities).status, 'unknown');
  const ambiguous = resolveCanonEntity({ entity_hint: 'Kestrelle' }, [...entities, { id: 'other', name: 'Kestrelle', aliases: [] }]);
  assert.equal(ambiguous.status, 'ambiguous');
});

test('comparison engine separates agree, extend, conflict and unknown', () => {
  assert.equal(compareCanonValue('Wise Woman', 'Wise Woman').relation, 'agree');
  assert.equal(compareCanonValue('', 'Wise Woman').relation, 'extend');
  assert.equal(compareCanonValue('Wise Woman', null).relation, 'unknown');
  assert.equal(compareCanonValue('Aes Sedai', 'Wise Woman').relation, 'conflict');
});

test('proposal keeps evidence, model authority, and canon authority separate', () => {
  const proposal = createCanonIntelligenceProposal({
    worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: 'Wise Woman', existingValue: null,
    evidence: [evidence], proposer: { id: 'atlas', kind: 'model' }, confidence: 0.9, createdAt: '2026-08-21T19:00:00.000Z',
  });
  assert.equal(proposal.status, 'pending');
  assert.equal(proposal.authority.may_promote_to_canon, false);
  assert.equal(proposal.comparison, 'extend');
  assert.equal(proposal.evidence[0].canon_status, 'evidence-only');
});

test('contradiction bundle exposes competing values without resolving them', () => {
  const proposal = createCanonIntelligenceProposal({ worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: 'Wise Woman', existingValue: 'Aes Sedai', evidence: [evidence], proposer: 'atlas', createdAt: '2026-08-21T19:01:00.000Z' });
  const bundle = buildContradictionBundle(proposal);
  assert.equal(bundle.relation, 'conflict');
  assert.equal(bundle.requires_review, true);
  assert.equal(bundle.existing_value, 'Aes Sedai');
  assert.equal(bundle.proposed_value, 'Wise Woman');
});

test('field population generates proposals only for missing fields', () => {
  const proposals = proposeMissingCanonFields({ worldId: 'taaveren-vaen', entity: { ...entities[0], occupation: '' }, fieldRegistry: fields, evidence: [evidence], proposer: 'larkshine' });
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].target.field_key, 'occupation');
  assert.equal(proposeMissingCanonFields({ worldId: 'taaveren-vaen', entity: { ...entities[0], occupation: 'Wise Woman' }, fieldRegistry: fields, evidence: [evidence] }).length, 0);
});

test('review queue supports explicit Steward decisions and filtering', () => {
  const proposal = createCanonIntelligenceProposal({ worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: 'Wise Woman', evidence: [evidence], proposer: 'atlas', createdAt: '2026-08-21T19:02:00.000Z' });
  let state = enqueueCanonProposal(emptyCanonIntelligenceState(), proposal);
  const reviewed = reviewCanonProposal(proposal, { action: 'accept', steward: 'Rowan', reviewedAt: '2026-08-21T19:03:00.000Z' });
  state = replaceCanonProposal(state, reviewed);
  assert.equal(filterCanonProposals(state, { status: 'accepted' }).length, 1);
  assert.equal(filterCanonProposals(state, { worldId: 'other' }).length, 0);
});

test('promotion is impossible before explicit acceptance', () => {
  const proposal = createCanonIntelligenceProposal({ worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: 'Wise Woman', evidence: [evidence], proposer: 'atlas' });
  assert.throws(() => createCanonPromotionReceipt(proposal, { steward: 'Rowan' }), /only an accepted proposal/);
});

test('accepted proposal can mutate canon only through supplied mutator and yields immutable receipt', async () => {
  const proposal = createCanonIntelligenceProposal({ worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: 'Wise Woman', evidence: [evidence], proposer: 'atlas', createdAt: '2026-08-21T19:04:00.000Z' });
  const reviewed = reviewCanonProposal(proposal, { action: 'accept', steward: 'Rowan', reviewedAt: '2026-08-21T19:05:00.000Z' });
  let mutation = null;
  const receipt = await applyCanonPromotion(reviewed, { steward: 'Rowan', mutateCanon: async (input) => { mutation = input; return { receipt_id: 'canon-mutation:1' }; } });
  assert.equal(mutation.target.field_key, 'occupation');
  assert.equal(receipt.schema, 'arcsweep.canon-intelligence-promotion/v1');
  assert.equal(receipt.mutation_receipt_id, 'canon-mutation:1');
  const state = appendCanonPromotion(replaceCanonProposal(enqueueCanonProposal(emptyCanonIntelligenceState(), proposal), reviewed), receipt);
  assert.equal(state.promotions.length, 1);
});

test('live inbox shows source evidence and keeps raw HTML escaped', () => {
  const proposal = createCanonIntelligenceProposal({ worldId: 'taaveren-vaen', entity: entities[0], field: fields[0], proposedValue: '<unsafe>nope</unsafe>', existingValue: 'Wise Woman', evidence: [evidence], proposer: 'atlas' });
  const html = renderCanonIntelligenceProposal(proposal);
  assert.match(html, /Existing canon/);
  assert.match(html, /Evidence \(1\)/);
  assert.doesNotMatch(html, /<unsafe>nope<\/unsafe>/);
  assert.match(html, /&lt;unsafe&gt;nope&lt;\/unsafe&gt;/);
});

test('Arcsweep mounts Canon Intelligence after runtime and House Chat surfaces', async () => {
  const manifest = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const runtime = manifest.indexOf('./runtime-integration-bootstrap.js');
  const commons = manifest.indexOf('./house-commons-chat-v5.js');
  const social = manifest.indexOf('./house-chat-room-social.js');
  const intelligence = manifest.indexOf('./canon-intelligence-live-ui.js');
  assert.ok(runtime >= 0 && commons > runtime && social > commons && intelligence > social);
});
