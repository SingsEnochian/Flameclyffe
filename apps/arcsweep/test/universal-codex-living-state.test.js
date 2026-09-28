import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectEnvelope } from '../src/aspects/aspect-message-bus.js';
import { createCodexLivingState, createCollectiveClaim } from '../src/universal-codex-living-state.js';

function envelope(id, aspectId, kind, body, extras = {}) {
  return createAspectEnvelope({
    id,
    traceId: 'trace-1',
    sender: { aspectId, invocationId: `invoke-${aspectId}` },
    kind,
    body,
    ...extras,
  });
}

test('AspectEnvelope ingestion preserves author and trace context', () => {
  const codex = createCodexLivingState();
  const result = codex.ingestEnvelope(envelope('m1', 'mapper', 'observation', 'There are two routes.'));
  assert.equal(result.author, 'mapper');
  assert.deepEqual(result.contextRefs, ['trace-1']);
});

test('challenge envelopes become durable dissent instead of anonymous consensus', () => {
  const codex = createCodexLivingState();
  const base = codex.ingestEnvelope(envelope('m1', 'maker', 'proposal', 'Use route A.'));
  const dissent = codex.ingestEnvelope(envelope('m2', 'critic', 'challenge', 'Route A loses reload state.', {
    stateRefs: [base.id],
    evidenceRefs: ['receipt:reload'],
  }));
  assert.equal(dissent.author, 'critic');
  assert.equal(dissent.target, base.id);
  assert.equal(codex.snapshot().dissents.length, 1);
});

test('plural retrieval keeps a minority challenge and an open question visible', () => {
  const codex = createCodexLivingState();
  const base = codex.ingestEnvelope(envelope('a', 'maker', 'proposal', 'A'));
  codex.ingestEnvelope(envelope('b', 'mapper', 'observation', 'B'));
  codex.ingestEnvelope(envelope('c', 'continuity', 'observation', 'C'));
  codex.ingestEnvelope(envelope('d', 'critic', 'challenge', 'Counterexample', { stateRefs: [base.id] }));
  codex.ingestEnvelope(envelope('e', 'narrative', 'question', 'What if D?'));
  const result = codex.retrieve({ limit: 4 });
  assert.ok(result.some((x) => x.schema === 'universal-codex.dissent/v0.1'));
  assert.ok(result.some((x) => x.kind === 'question'));
});

test('compression can be released back into its attributed source territory', () => {
  const codex = createCodexLivingState();
  const a = codex.ingestEnvelope(envelope('a', 'mapper', 'observation', 'A'));
  const b = codex.ingestEnvelope(envelope('b', 'critic', 'observation', 'B'));
  const map = codex.compress({ author: 'continuity', summary: 'A and B remain distinct.', sourceRefs: [a.id, b.id] });
  const released = codex.release(map.id);
  assert.deepEqual(released.sources.map((x) => x.author), ['mapper', 'critic']);
});

test('exploratory envelopes enter Wild Garden and mature without becoming canon', () => {
  const codex = createCodexLivingState();
  const wild = codex.ingestEnvelope(envelope('w1', 'narrative', 'thought', 'A singing memory tree.'), { exploratory: true });
  assert.equal(wild.status, 'wild');
  let current = wild;
  for (const status of ['interesting', 'investigated', 'challenged', 'demonstrated', 'candidate']) {
    current = codex.matureWildGarden(current.id, status);
  }
  assert.equal(current.status, 'candidate');
  assert.equal(codex.snapshot().canon.length, 0);
  const promoted = codex.promoteWildGarden(current.id, { authorityRef: 'codex-authority:rowan', challenged: true });
  assert.equal(promoted.canonical, true);
});

test('Wild Garden cannot skip maturity states', () => {
  const codex = createCodexLivingState();
  const wild = codex.ingestEnvelope(envelope('w1', 'narrative', 'thought', 'Odd flower.'), { exploratory: true });
  assert.throws(() => codex.matureWildGarden(wild.id, 'candidate'), /one step/i);
});

test('collective claims preserve dissent rather than manufacturing system belief', () => {
  const claim = createCollectiveClaim({
    claim: 'Route A is preferable.',
    supporters: ['mapper', 'maker'],
    dissenters: ['critic'],
    abstentions: ['narrative'],
    evidenceRefs: ['receipt:1'],
  });
  assert.deepEqual(claim.dissenters, ['critic']);
  assert.equal(claim.unanimous, false);
  assert.equal(claim.systemBelief, false);
});

test('Witness receipts make state transitions replayable without private reasoning', () => {
  const codex = createCodexLivingState();
  const entry = codex.ingestEnvelope(envelope('a', 'mapper', 'observation', 'Observed.'));
  const map = codex.compress({ author: 'continuity', summary: 'Observed.', sourceRefs: [entry.id] });
  codex.release(map.id);
  const events = codex.snapshot().receipts.map((r) => r.event);
  assert.deepEqual(events, ['contribution-ingested', 'compression-created', 'compression-released']);
});
