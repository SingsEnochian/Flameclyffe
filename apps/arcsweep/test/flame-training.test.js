import assert from 'node:assert/strict';
import test from 'node:test';
import profiles from '../../../hearth/training/profiles.json' with { type: 'json' };
import { buildFlameCorpus, createTrainingReadinessReceipt } from '../../../hearth/training/flame-training.js';

test('every registered Flame has a versioned ingest and training profile', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { FLAMES } = require('../../starwell-server/flames/manifests.js');
  assert.deepEqual(profiles.profiles.map((item) => item.flameId).sort(), Object.keys(FLAMES).sort());
  assert.match(FLAMES.altair.platform.model, /abliterated/i);
  assert.match(FLAMES.atlas.platform.model, /abliterated/i);
});

test('corpus ingest refuses private, unconsented, unprovenanced, and revoked records', () => {
  const profile = { ...profiles.defaults, ...profiles.profiles.find((item) => item.flameId === 'atlas') };
  const base = { privacy: 'shareable', flameIds: ['atlas'], consent: { training: true }, provenance: { sourceId: 'source-1', title: 'Atlas answer' }, content: 'A load path is also a choice.' };
  const corpus = buildFlameCorpus({ profile, records: [
    { ...base, id: 'accepted' },
    { ...base, id: 'private', privacy: 'private' },
    { ...base, id: 'unconsented', consent: { training: false } },
    { ...base, id: 'unprovenanced', provenance: {} },
    { ...base, id: 'revoked', revokedAt: '2026-08-18T00:00:00.000Z' },
  ], createdAt: '2026-08-18T00:00:00.000Z' });
  assert.equal(corpus.counts.admitted, 1);
  assert.equal(corpus.counts.rejected, 4);
  assert.equal(corpus.authority.weightsChanged, false);
});

test('readiness remains closed until all reviews and minimum corpus sizes exist', () => {
  const corpus = { flameId: 'altair', profileVersion: 'altair/v1', digest: 'sha256:test', counts: { training: 40, evaluation: 8 }, requirements: { minimumTrainingRecords: 40, minimumEvaluationRecords: 8 } };
  assert.equal(createTrainingReadinessReceipt(corpus, {}).ready, false);
  assert.equal(createTrainingReadinessReceipt(corpus, { personaIntegrityReviewed: true, provenanceReviewed: true, consentReviewed: true, evaluationReviewed: true }).ready, true);
});
