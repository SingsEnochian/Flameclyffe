import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';
import { BUILT_IN_DOMAIN_CONTROL_PROFILES, runBidirectionalDomainSweep } from '../../arcsweep/src/domain-control-bench.js';
import { createDeepTheoryCandidateFromDomainSweep } from '../../arcsweep/src/deep-theory-bridge.js';

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

const schema = readJson('../../../starwell/deep-observer/schemas/deep-theory.schema.json');
const manifest = readJson('../../../starwell/deep-observer/datasets/deep-theory.dataset.json');
const example = readJson('../../../starwell/deep-observer/examples/deep-theory.example.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('DEEPTheory is distinct from Story and Time and forbids silent source rewriting', () => {
  assert.equal(schema.properties.dataset_kind.const, 'deep_theory');
  assert.deepEqual(manifest.parallel_to, ['DEEPStory', 'DEEPTime']);
  assert.equal(manifest.source_policy.raw_sources_immutable, true);
  assert.equal(manifest.source_policy.analyses_append_only, true);
  assert.equal(manifest.source_policy.silent_canonicalisation_forbidden, true);
  assert.equal(manifest.source_policy.cross_domain_numeric_equivalence_assumed, false);
});

test('example DEEPTheory record validates and keeps natural controls non-intentional', () => {
  const result = validateDeepTheoryRecord(example);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(example.models[0].control_semantics.a.intentional, false);
  assert.equal(example.models[0].control_semantics.b.intentional, false);
  assert.equal(example.models[0].physical_claim, false);
  assert.equal(example.review.human_review_required, true);
});

test('candidate findings must cite a declared immutable source', () => {
  const invalid = clone(example);
  invalid.findings[0].source_refs = ['missing-source'];
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.message.includes('Unknown source ref: missing-source')));
});

test('candidate records cannot silently skip human review or canon gate', () => {
  const invalid = clone(example);
  invalid.review.human_review_required = false;
  invalid.authority.canon_commit = true;
  const result = validateDeepTheoryRecord(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.path === 'review.human_review_required'));
  assert.ok(result.errors.some((entry) => entry.path === 'authority.canon_commit'));
});

test('Arcsweep domain sweep becomes a DEEPTheory candidate without manufacturing physical claims', async () => {
  const profile = BUILT_IN_DOMAIN_CONTROL_PROFILES.find((item) => item.profile_id === 'black-hole-star-lrd');
  const sweep = await runBidirectionalDomainSweep({
    profile,
    sweptControl: 'b',
    start: -0.6,
    end: 0.6,
    steps: 31,
    fixedControl: -1,
    generatedAt: '2026-08-14T13:35:00.000Z',
  });
  const candidate = await createDeepTheoryCandidateFromDomainSweep({ sweep, generatedAt: '2026-08-14T13:36:00.000Z' });
  const validation = validateDeepTheoryRecord(candidate.record);

  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.equal(candidate.record.status, 'candidate');
  assert.equal(candidate.record.authority.physical_claim, false);
  assert.equal(candidate.record.authority.canon_commit, false);
  assert.equal(candidate.record.models[0].control_semantics.b.intentional, false);
  assert.equal(candidate.record.source_refs[0].checksum, sweep.sweep_fingerprint);
  assert.equal(candidate.authority.human_review_required, true);
});
