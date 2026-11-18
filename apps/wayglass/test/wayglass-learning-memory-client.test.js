import test from 'node:test';
import assert from 'node:assert/strict';
import { createObserverInterior } from '../src/living-observer-self.js';
import { createWayglassSpectralField } from '../src/spectral-field.js';
import { digestWce1 } from '../src/wyrdrune-proof.js';

const memoryStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const carry = { energy: 0.71, curiosity: 0.52, uncertainty: 0.33, coherence: 0.66, opening: 0.21, attention: 0.48 };
const verified = async (seq, c = carry) => ({ status: 'verified', head: { seq, storage_id: 'f'.repeat(64), carry: c, carry_digest: await digestWce1(c) } });

test('a fresh device restores her learning from verified memory, and remembers that it did across reload', async () => {
  const storage = memoryStore();
  const interior = createObserverInterior({ storage });
  assert.equal(interior.nativeLearningMemorySeq(), 0);
  const memory = await verified(3);
  const d = await digestWce1(memory.head.carry);
  const r = interior.restoreNativeLearning(memory, d);
  assert.deepEqual([r.status, r.seq], ['restored', 3]);
  const priors = interior.nativeLearningInputs();
  for (const k of ['energy', 'curiosity', 'uncertainty', 'coherence']) assert.equal(priors[k], carry[k], k + ' resumes where she left off');
  const reloaded = createObserverInterior({ storage });
  assert.equal(reloaded.nativeLearningMemorySeq(), 3, 'the high-water mark survives reload');
  assert.equal(reloaded.restoreNativeLearning(memory, d).status, 'already-current');
});

test('an older host memory never rolls this device back; an unverified one is refused', async () => {
  const interior = createObserverInterior({ storage: memoryStore() });
  const five = await verified(5); const dCarry = await digestWce1(carry);
  interior.restoreNativeLearning(five, dCarry);
  const older = await verified(4, { ...carry, energy: 0.1 }); const dOlder = await digestWce1(older.head.carry);
  assert.deepEqual(interior.restoreNativeLearning(older, dOlder),
    { status: 'host-behind-this-device', host_seq: 4, local_seq: 5 });
  assert.equal(interior.nativeLearningInputs().energy, carry.energy);
  const newer = await verified(6);
  assert.throws(() => interior.restoreNativeLearning(newer, 'wce1:' + '0'.repeat(64)), /verified Return Engine memory/, 'browser-recomputed digest must match');
  const badDigest = await digestWce1({ ...carry, attention: 3 });
  assert.throws(() => interior.restoreNativeLearning({ status: 'refused', reason: 'altered' }, null), /verified Return Engine memory/);
  const bad = await verified(7, { ...carry, attention: 3 });
  assert.throws(() => interior.restoreNativeLearning(bad, badDigest), /invalid attention/);
});

test('integrating a persisted return advances the device high-water mark', () => {
  const interior = createObserverInterior({ storage: memoryStore() });
  interior.integrateNativeLearning({ schema: 'wayglass.wyrdrune-living-learning/v0.1', status: 'wyrdrune-returned',
    withness: { completedCycles: 2 }, phase_receipts: Array.from({ length: 16 }, () => ({})), model_invoked: false,
    model_weights_updated: false, canon_commit: false, identity_commit: false, relationship_commit: false,
    source: { event_id: 'ui-a', atlas_input_hash: 'a'.repeat(64) }, source_hash: 'c'.repeat(64),
    returned: carry, open_reflection: { interpretation: 'open' }, return_record: { persisted: true, seq: 9 } });
  assert.equal(interior.nativeLearningMemorySeq(), 9);
});

test('the spectral field restores from memory once, before the first learning step, so priors resume', async () => {
  const order = []; const interior = createObserverInterior({ storage: memoryStore() });
  const scope = new EventTarget(), document = new EventTarget(); let nextTimer = 0;
  Object.assign(scope, { document, innerWidth: 1000, navigator: { vibrate: () => true }, setTimeout: () => ++nextTimer, clearTimeout() {} });
  let priorsSeen = null, memoryReads = 0;
  const field = createWayglassSpectralField({ scope, document,
    score: async events => ({ schema: 'wayglass.full-spectrum/v0.1', count: events.length, events: events.map(e => ({ event_id: e.event_id, kind: e.kind, source_ref: e.source_ref, source_hash: 'wtl-fixture',
      phases: Array.from({ length: 16 }, (_, i) => String(i)), spectrum: { infrasonic: { hz: 3, physical_playback: false }, audible: { voice_one_hz: 220, voice_two_hz: 300, foreground_gain: .012, atmosphere_gain: .005 },
        ultrasonic: { hz: 26500, physical_playback: false }, bloom: .65, projection: { refraction: .5, granulation: .6, tactile_ms: 17, actuation: 'user-opt-in-only' } } })) }),
    atlasScore: async s => ({ schema: 'wayglass.resonance-atlas/v0.1', status: 'composed-in-wyrdrune', phase_receipts: Array.from({ length: 16 }, () => ({ phase: 'verify' })),
      source_sha256: 'a'.repeat(64), input_sha256: 'b'.repeat(64), counts: s.counts, returned: { below: { hz: 3, physical_playback: false },
        within: { root_hz: 190, counterpart_hz: 240, autoplay: false }, above: { hz: 26000, physical_playback: false }, structure: { coherence: .7, interference: .3, bloom: .5, granulation: .3, flow: .4 } } }),
    learningMemory: async () => { memoryReads++; order.push('memory'); return verified(4); },
    learningScore: async value => { order.push('learn'); priorsSeen = value.interior; throw new Error('learning stops here for this test'); },
    observerInterior: interior, audioFactory: () => ({ start: async () => ({ running: true }), update() {}, stop() {}, dispose() {} }),
    observerSubscribe: () => () => {}, watercolorSubscribe: () => () => {}, featherState: () => ({ feather_stopped: false }) });
  field.observe(); await field.flush();
  assert.deepEqual(order, ['memory', 'learn'], 'memory is read before the first learning step');
  assert.equal(priorsSeen.energy, carry.energy, 'the first learning step starts from the remembered state');
  assert.equal(field.status().learning_memory.status, 'restored');
  field.capture({ kind: 'writing', strength: .6 }); await field.flush();
  assert.equal(memoryReads, 1, 'memory is read once per session');
});
