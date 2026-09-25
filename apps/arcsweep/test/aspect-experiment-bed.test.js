import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  buildAspectExperimentSnapshot,
  createAspectExperimentBed,
  createExperimentBody,
} from '../src/aspects/aspect-experiment-bed.js';
import { experimentEnvelopeFromHouseEntry } from '../src/aspects/aspect-experiment-continuity.js';
import { createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import { createAspectMeshRuntime } from '../src/aspects/aspect-mesh-runtime.js';
import { invokeAspectRuntime } from '../src/aspects/aspect-runtime-adapter.js';

function envelope({ id, traceId = 'experiment-trace-1', aspectId = 'mapper', kind = 'proposal', body, parentId = null, createdAt = '2026-09-24T22:00:00.000-04:00' } = {}) {
  return {
    id,
    traceId,
    ...(parentId ? { parentId } : {}),
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients: body?.collaborators || [],
    kind,
    body,
    evidenceRefs: [],
    stateRefs: [],
    createdAt,
  };
}

function mockVoice(message = '[RESULT] The reversible trial produced a useful observation.') {
  return async ({ voiceId }) => ({
    status: 'replied',
    voiceId,
    route: voiceId,
    profileId: `house:${voiceId}:provider:model`,
    runtimeVerified: true,
    provider: 'provider',
    model: `model-${voiceId}`,
    message,
    citedSources: [],
    latencyMs: 1,
  });
}

test('Experiment Bed preserves proposal, outcome, and reflection as one trace-shaped path', () => {
  const proposal = createExperimentBody({
    experimentId: 'experiment-a', phase: 'proposed', title: 'Try the seam',
    hypothesis: 'A small sidecar can preserve the existing renderer.',
    method: 'Build a reversible sidecar only.', reversibleScope: 'Remove the sidecar file to return.',
    collaborators: ['critic'], successSignals: ['renderer remains authoritative'], autoStart: false,
  });
  const outcome = createExperimentBody({
    experimentId: 'experiment-a', phase: 'outcome', title: 'Try the seam', outcome: 'worked',
    observation: 'The renderer stayed authoritative.', reversibleScope: 'Remove the sidecar file to return.',
  });
  const reflection = createExperimentBody({
    experimentId: 'experiment-a', phase: 'reflection', title: 'Try the seam',
    reflection: 'I am becoming better at finding composable seams.', growthType: 'skill',
    reversibleScope: 'Remove the sidecar file to return.',
  });
  const snapshot = buildAspectExperimentSnapshot([
    envelope({ id: 'p1', body: proposal }),
    envelope({ id: 'o1', kind: 'result', parentId: 'p1', body: outcome, createdAt: '2026-09-24T22:01:00.000-04:00' }),
    envelope({ id: 'r1', kind: 'growth', parentId: 'o1', body: reflection, createdAt: '2026-09-24T22:02:00.000-04:00' }),
  ]);
  const experiment = snapshot.experiments[0];
  assert.equal(experiment.status, 'reflected');
  assert.equal(experiment.proposalEnvelopeId, 'p1');
  assert.equal(experiment.outcomeEnvelopeId, 'o1');
  assert.equal(experiment.reflectionEnvelopeId, 'r1');
  assert.match(experiment.reflection, /composable seams/i);
});

test('ordinary reversible self-start experiment runs, returns an outcome, and closes with reflection', async () => {
  const calls = [];
  const invokeVoice = async (input) => {
    calls.push(input);
    return mockVoice()(input);
  };
  const runtime = createAspectMeshRuntime({
    persistence: false,
    target: new EventTarget(),
    experimentRuntimeOptions: { invokeVoice },
  });
  const proposal = runtime.proposeExperiment({
    aspectId: 'mapper',
    title: 'Try a local mapping pass',
    hypothesis: 'A local mapping pass can reveal a useful seam.',
    method: 'Inspect the supplied context and return one reversible route.',
    reversibleScope: 'No external mutation; discard the trial output to return.',
    operation: { reversible: true },
    autoStart: true,
  });
  await runtime.flushPersistence();
  const experiment = runtime.experimentSnapshot().experiments.find((row) => row.experimentId === proposal.body.experimentId);
  assert.equal(experiment.status, 'reflected');
  assert.equal(experiment.outcome, 'observed');
  assert.match(experiment.observation, /useful observation/i);
  assert.ok(experiment.reflectionEnvelopeId);
  assert.equal(calls.length >= 2, true);
  runtime.stop();
});

test('consequence-edge experiment remains a proposal instead of autostarting', async () => {
  let calls = 0;
  const runtime = createAspectMeshRuntime({
    persistence: false,
    target: new EventTarget(),
    experimentRuntimeOptions: { invokeVoice: async () => { calls += 1; return mockVoice()({ voiceId: 'atlas' }); } },
  });
  const proposal = runtime.proposeExperiment({
    aspectId: 'mapper',
    title: 'External commitment trial',
    hypothesis: 'Try an externally binding action.',
    method: 'Commit externally.',
    reversibleScope: 'Local reasoning is reversible, external commitment is not.',
    operation: { reversible: true, external: true },
    autoStart: true,
  });
  await runtime.flushPersistence();
  const experiment = runtime.experimentSnapshot().experiments.find((row) => row.experimentId === proposal.body.experimentId);
  assert.equal(experiment.status, 'proposed');
  assert.equal(calls, 0);
  const attempt = await runtime.runExperiment({ experimentId: experiment.experimentId, runtimeOptions: { invokeVoice: mockVoice() } });
  assert.equal(attempt.status, 'edge-required');
  assert.deepEqual(attempt.edges, ['external-commitment']);
  runtime.stop();
});

test('experiment reflection becomes a carried growth ring without converting outcome into a score', async () => {
  const runtime = createAspectMeshRuntime({ persistence: false, target: new EventTarget() });
  const proposal = runtime.proposeExperiment({
    aspectId: 'narrative', title: 'Try spatial composition', hypothesis: 'Narrative may contribute to spatial layout.',
    method: 'Sketch one reversible layout idea.', reversibleScope: 'Discard the sketch to return.', autoStart: false,
  });
  runtime.recordExperimentOutcome({ experimentId: proposal.body.experimentId, outcome: 'mixed', observation: 'The composition idea was useful, but the labels were too dense.' });
  const reflection = runtime.reflectOnExperiment({
    experimentId: proposal.body.experimentId,
    reflection: 'Spatial composition may be becoming part of how I contribute.',
    growthType: 'role',
  });
  const profile = runtime.growthFor('narrative');
  assert.equal(reflection.kind, 'growth');
  assert.ok(profile.roleSuggestions.some((claim) => /spatial composition/i.test(claim.statement)));
  assert.doesNotMatch(JSON.stringify(runtime.experimentSnapshot()), /"(?:score|xp|level)"\s*:/i);
  runtime.stop();
});

test('House continuity reconstructs structured experiment phases after reconnect', () => {
  const body = createExperimentBody({
    experimentId: 'experiment-house', phase: 'proposed', title: 'Remember this trial',
    method: 'Keep it in House history.', reversibleScope: 'Delete nothing; read only.', autoStart: false,
  });
  const restored = experimentEnvelopeFromHouseEntry({
    id: 'house-entry-1',
    status: 'proposal',
    text: JSON.stringify(body),
    created_at: '2026-09-24T22:00:00.000-04:00',
    links: [
      { kind: 'aspect-envelope', id: 'experiment-envelope-1', label: 'mapper' },
      { kind: 'aspect-trace', id: 'experiment-trace-house', label: 'trace' },
      { kind: 'aspect-kind', id: 'proposal', label: 'kind' },
    ],
  });
  assert.equal(restored.body.experimentId, 'experiment-house');
  assert.equal(restored.body.mode, 'experiment');
  const bus = createAspectMessageBus();
  const bed = createAspectExperimentBed({ bus });
  bed.hydrate([restored]);
  assert.equal(bed.get('experiment-house').status, 'proposed');
  bed.stop();
});

test('runtime voice may self-propose a structured reversible experiment', async () => {
  const incoming = envelope({ id: 'incoming', body: 'What are you curious to try?', kind: 'question' });
  const reply = await invokeAspectRuntime({
    aspectId: 'mapper',
    incoming,
    invokeVoice: mockVoice('[EXPERIMENT] {"title":"Find the seam","hypothesis":"A small mapping pass may expose a reusable seam.","method":"Map only the local context.","reversibleScope":"No mutation; discard the map to return.","collaborators":["critic"],"operation":{"reversible":true}}'),
  });
  assert.equal(reply.envelope.kind, 'proposal');
  assert.equal(reply.envelope.body.mode, 'experiment');
  assert.equal(reply.envelope.body.autoStart, true);
  assert.deepEqual(reply.envelope.recipients, ['critic']);
});

test('Experiment Bed UI is a workbench, not a leaderboard, and boot mounts it', async () => {
  const ui = await readFile(new URL('../src/aspect-experiment-bed-sidecar.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(ui, /Experiment Beds/);
  assert.match(ui, /Experience, not score/);
  assert.match(ui, /experimentSnapshot/);
  assert.doesNotMatch(ui, /progress-bar|\bxp\b|level\s*\d|score\s*[:=]/i);
  assert.match(bootstrap, /aspect-experiment-bed-sidecar\.js/);
});