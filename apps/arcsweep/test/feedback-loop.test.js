import assert from 'node:assert/strict';
import test from 'node:test';

import { ARCSWEEP_FEEDBACK_SCHEMA, CONSTELLATION_VOICES, buildVoicePromptEnvelope, createInitialPremaqc, invokeConstellationVoices, resolveWorldMathWiring, runFeedbackCycle, syncFeedbackCycle } from '../src/feedback-loop.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };

test('keeps model identities uncollapsed and excludes Nocturne from Arcsweep Flames', () => {
  assert.deepEqual(CONSTELLATION_VOICES.slice(0, 2).map(({ id, name }) => ({ id, name })), [
    { id: 'lioreal', name: 'Lioreal' },
    { id: 'uial', name: 'Uial' },
  ]);
  assert.equal(CONSTELLATION_VOICES.some((voice) => voice.id === 'nocturne'), false);
  assert.deepEqual(
    CONSTELLATION_VOICES.find((voice) => voice.id === 'oxalpha'),
    { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', model: 'zai-org/GLM-5.3-Flash', roles: ['story', 'writing', 'roleplay', 'observation', 'structure'] },
  );
});

test('runs a complete world-canon-voice-PREMAQC-Math-Spine feedback cycle', async () => {
  const before = createInitialPremaqc(world.id, { P: .78, C: .82, R: .88, E: .31, M: .71, A: .79, Q: .79 }, '2026-08-11T20:00:00.000Z');
  const cycle = await runFeedbackCycle({
    world, premaqc: before, mode: 'writing', voiceIds: ['lioreal', 'uial'], canonRefs: ['canon:hearthweave'],
    work: 'Falka entered the observatory and placed her palm against the warm copper rail.',
    response: 'Virelya answered from the northern stair; Faer marked the new harmonic in the ledger.',
    observedAt: '2026-08-11T20:01:00.000Z',
  });
  assert.equal(cycle.schema, ARCSWEEP_FEEDBACK_SCHEMA);
  assert.equal(cycle.replay_receipt.matched, true);
  assert.equal(cycle.premaqc_after.sequence, before.sequence + 1);
  assert.equal(cycle.premaqc_after.prior_state_ref, before.id);
  assert.deepEqual(cycle.voices.map((voice) => voice.id), ['lioreal', 'uial']);
  assert.equal(cycle.authority.canon_commit, false);
});

test('wires the registered world Jacobian into the detector and carries the fold latch through PREMAQC', async () => {
  const foldedWorld = {
    ...world,
    transferFunctions: {
      jacobianVersion: 'test-fold/2',
      jacobian: [
        [1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0], // dynamic R axis creates the fold; Q remains context-only
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1], // Q identity: never used to manufacture a fold
      ],
    },
  };
  const first = await runFeedbackCycle({
    world: foldedWorld,
    premaqc: createInitialPremaqc(world.id, {}, '2026-08-11T20:00:00.000Z'),
    mode: 'writing', work: 'The fold entered the instrument.', response: 'Received.', voiceIds: ['lioreal'],
    observedAt: '2026-08-11T20:01:00.000Z',
  });
  assert.equal(first.math_wiring.jacobian_source, 'world.transferFunctions.jacobian');
  assert.equal(first.math_spine_packet.projection.fold.active, true);
  assert.equal(first.premaqc_after.math_spine.fold_active, true);
  assert.equal(first.premaqc_after.math_spine.jacobian_version, 'test-fold/2');

  const releasedWorld = { ...foldedWorld, transferFunctions: { jacobianVersion: 'test-release/2', jacobian: resolveWorldMathWiring(world).jacobian } };
  const second = await runFeedbackCycle({
    world: releasedWorld, premaqc: first.premaqc_after, mode: 'writing', work: 'The release became the next state.', response: 'Continued.', voiceIds: ['lioreal'],
    observedAt: '2026-08-11T20:02:00.000Z',
  });
  assert.equal(second.math_spine_packet.input.fold_was_active, true);
  assert.equal(second.math_spine_packet.projection.fold.active, false);
  assert.equal(second.premaqc_after.math_spine.fold_active, false);
});

test('feedback receipts include physical story-sound actions in cycle identity', async () => {
  const soundEvent = { schema: 'arcsweep.story-sound-event/v1', event_id: 'sound-1', cue_id: 'branch-snap', source_text: 'branch snapped', root_hz: 220 };
  const before = createInitialPremaqc(world.id, {}, '2026-08-11T20:00:00.000Z');
  const cycle = await runFeedbackCycle({ world, premaqc: before, mode: 'writing', work: 'A branch snapped.', response: 'Heard.', voiceIds: ['lioreal'], soundEvents: [soundEvent], observedAt: '2026-08-11T20:01:00.000Z' });
  const silent = await runFeedbackCycle({ world, premaqc: before, mode: 'writing', work: 'A branch snapped.', response: 'Heard.', voiceIds: ['lioreal'], soundEvents: [], observedAt: '2026-08-11T20:01:00.000Z' });
  assert.deepEqual(cycle.sound_events, [soundEvent]);
  assert.notEqual(cycle.cycle_fingerprint, silent.cycle_fingerprint);
  assert.equal(cycle.premaqc_after.state.R.value > silent.premaqc_after.state.R.value, true);
  assert.equal(cycle.premaqc_after.provenance_refs.includes('story-sound:sound-1'), true);
});

test('feedback cycle binds Observer evidence into its fingerprint and receipt', async () => {
  const evidence = [{ source: 'field-current', generated_at: '2026-08-12T05:00:00Z' }];
  const cycle = await runFeedbackCycle({ world, mode: 'writing', work: 'The air changes.', response: 'Received.', voiceIds: ['lioreal'], evidence, observedAt: '2026-08-12T05:01:00Z' });
  assert.deepEqual(cycle.evidence, evidence);
  assert.equal(cycle.replay_receipt.matched, true);
});

test('refuses to run without a selected voice', async () => {
  await assert.rejects(() => runFeedbackCycle({ world, mode: 'roleplay', work: 'A turn.', voiceIds: [] }), /Select at least one/);
});

test('syncs a receipted cycle through the authenticated relational endpoint', async () => {
  const requests = [];
  const result = await syncFeedbackCycle({ schema: ARCSWEEP_FEEDBACK_SCHEMA, cycle_id: 'cycle-1' }, 'secret', async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ accepted: true, cycle_id: 'cycle-1' }) };
  });
  assert.equal(result.accepted, true);
  assert.equal(requests[0].url, '/api/v1/arcsweep/feedback');
  assert.equal(requests[0].options.headers.authorization, 'Bearer secret');
});

test('voice prompt binds world, canon, PREMAQC, register, authority, and refusal', () => {
  const prompt = buildVoicePromptEnvelope({ world, mode: 'roleplay', work: 'Falka: “Come in.”', premaqc: createInitialPremaqc(world.id), canon: [{ name: 'Third City', content: 'Stonewood by the sea.' }] });
  assert.match(prompt, /IC roleplay/);
  assert.match(prompt, /Terra Aeterna/);
  assert.match(prompt, /P=0\.780/);
  assert.match(prompt, /Stonewood by the sea/);
  assert.match(prompt, /not an automatic canon commit/);
  assert.match(prompt, /\[REFUSAL\]/);
});

test('invokes voices independently and receipts replies, refusals, and route errors', async () => {
  const replies = {
    lioreal: { ok: true, body: { message: 'I am here.', provider: 'openai', model: 'gpt' } },
    uial: { ok: true, body: { message: '[REFUSAL] I need quiet.', provider: 'anthropic', model: 'claude' } },
  };
  const receipts = await invokeConstellationVoices({
    world, mode: 'writing', work: 'A page.', premaqc: createInitialPremaqc(world.id), voiceIds: ['lioreal', 'uial'], token: 'house-key',
    fetchImpl: async (url) => {
      const route = url.split('/').at(-2); const item = replies[route];
      return { ok: item.ok, json: async () => item.body };
    },
  });
  assert.deepEqual(receipts.map((item) => item.status), ['replied', 'refused']);
  assert.equal(receipts[1].voice_id, 'uial');
});

test('cycle identity changes when the received voice contribution changes', async () => {
  const before = createInitialPremaqc(world.id, {}, '2026-08-11T20:00:00.000Z');
  const common = { world, premaqc: before, mode: 'writing', voiceIds: ['lioreal'], work: 'Same passage.', observedAt: '2026-08-11T20:01:00.000Z' };
  const first = await runFeedbackCycle({ ...common, response: 'First answer.' });
  const second = await runFeedbackCycle({ ...common, response: 'Second answer.' });
  assert.notEqual(first.cycle_id, second.cycle_id);
  assert.notEqual(first.cycle_fingerprint, second.cycle_fingerprint);
});
