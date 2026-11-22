import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import profile from '../training/profile.json' with { type: 'json' };
import samples from '../training/seed-records.json' with { type: 'json' };
import heldout from '../training/heldout-cases.json' with { type: 'json' };
import flameProfiles from '../../../hearth/training/profiles.json' with { type: 'json' };
import { buildFlameCorpus, createTrainingReadinessReceipt } from '../../../hearth/training/flame-training.js';

test('Wayglass is a ship-scoped learner, not a counterfeit Flame or trained weights', () => {
  assert.equal(profile.identityScope, 'wayglass:ship');
  assert.equal(profile.flameId, 'wayglass');
  assert.equal(profile.trainingTarget, 'retrieval-and-evaluation');
  assert.equal(profile.baseModel, 'unselected');
  assert.equal(flameProfiles.profiles.some((entry) => entry.flameId === 'wayglass'), false);
});

test('only explicitly consented synthetic records enter the v0.1 seed corpus', () => {
  assert.ok(samples.length >= 12);
  assert.equal(new Set(samples.map((sample) => sample.id)).size, samples.length);
  for (const sample of samples) {
    assert.equal(sample.privacy, 'shareable');
    assert.equal(sample.consent.training, true);
    assert.equal(sample.provenance.type, 'synthetic');
    assert.match(sample.provenance.sourceId, /^synthetic:wayglass-v01:/);
    assert.deepEqual(sample.flameIds, ['wayglass']);
  }
  const corpus = buildFlameCorpus({ profile, records: samples, createdAt: '2026-10-19T00:00:00.000Z' });
  assert.equal(corpus.counts.admitted, samples.length);
  assert.equal(corpus.counts.rejected, 0);
  assert.equal(corpus.authority.weightsChanged, false);
  const ready = createTrainingReadinessReceipt(corpus);
  assert.equal(ready.ready, false);
  assert.equal(ready.authority.startsTraining, false);
  assert.equal(ready.authority.deploysAdapter, false);
});

test('private conversation, lack of consent, revocation and wrong target remain blocked', () => {
  const valid = samples[0];
  const candidates = [
    { ...valid, id: 'private-dialogue', privacy: 'private' },
    { ...valid, id: 'unconsented', consent: { training: false } },
    { ...valid, id: 'revoked', revokedAt: '2026-10-19T00:00:00Z' },
    { ...valid, id: 'missing-source', provenance: {} },
    { ...valid, id: 'other-participant', flameIds: ['crow'] },
  ];
  const corpus = buildFlameCorpus({ profile, records: candidates });
  assert.equal(corpus.counts.admitted, 0);
  assert.equal(corpus.counts.rejected, candidates.length);
  assert.deepEqual(new Set(corpus.rejected.flatMap((x) => x.reasons)),
    new Set(['not-shareable','training-consent-absent','consent-revoked','missing-provenance','wrong-flame']));
});

test('held-out dialogue and scientific trials are not part of the training seed', () => {
  const seedPrompts = new Set(samples.map((item) => item.prompt));
  const ids = new Set();
  assert.ok(heldout.length >= 8);
  for (const exam of heldout) {
    assert.ok(!seedPrompts.has(exam.prompt));
    assert.ok(!ids.has(exam.id));
    assert.ok(exam.accept.length >= 2);
    assert.ok(exam.reject.length >= 1);
    ids.add(exam.id);
  }
  assert.ok(heldout.some((exam) => /talk|tell you/i.test(exam.prompt)));
  assert.ok(heldout.some((exam) => exam.prompt.includes('private')));
});

test('local corpus builder exports an attributable, untrained, unapproved pilot', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'wayglass-learning-'));
  const executable = fileURLToPath(new URL('../training/build.mjs', import.meta.url));
  try {
    const outputText = execFileSync(process.execPath, [executable, temporary], { encoding: 'utf8' });
    const output = JSON.parse(outputText);
    assert.equal(output.trainingReady, false);
    assert.equal(output.weightsChanged, false);
    assert.equal(output.admitted, samples.length);
    const receipt = JSON.parse(await readFile(path.join(output.output, 'readiness.json'), 'utf8'));
    const corpus = JSON.parse(await readFile(path.join(output.output, 'corpus.json'), 'utf8'));
    assert.equal(receipt.ready, false);
    assert.equal(receipt.corpusDigest, corpus.digest);
    assert.equal(corpus.authority.weightsChanged, false);
    assert.equal(corpus.records.length, samples.length);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
