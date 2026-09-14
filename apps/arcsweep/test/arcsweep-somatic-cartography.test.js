import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KELYRAN_SOMATIC_PROFILE,
  SOMATIC_COURSE_SCHEMA,
  SOMATIC_RECEIPT_SCHEMA,
  calculateSomaticCourse,
  createSomaticReceipt,
  createSomaticState,
  createSomaticStore,
  createSomaticTarget,
} from '../src/os/somatic-cartography.js';

const fixedNow = () => new Date('2026-09-14T01:00:00.000Z');

test('builds a deterministic Kelyran embodied-glyph course', () => {
  const state = createSomaticState({
    world_id: 'kelyran',
    continuity_packet_id: 'braid:001',
    channels: {
      posture: { mode: 'resting-seated' },
      haptic: { bpm: 0 },
      movement: { hands: 'available' },
    },
    provenance: {
      posture: 'user',
      haptic: 'device',
      movement: 'device',
    },
  }, { now: fixedNow });

  const target = createSomaticTarget({
    target_id: 'kelyran:meda:embodied',
    desired: {
      posture: 'writing',
      rhythm_bpm: 55,
      haptic_pattern: 'pulse.single.soft',
      gesture_id: 'glyph.meda',
    },
    constraints: { seated_only: true },
    arrival_conditions: ['cadence-established', 'posture-ready', 'gesture-ready', 'embodied-glyph'],
  });

  const first = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow });
  const second = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow });

  assert.equal(first.schema, SOMATIC_COURSE_SCHEMA);
  assert.equal(first.course_id, second.course_id);
  assert.equal(first.world_id, 'kelyran');
  assert.deepEqual(first.steps.map((step) => step.transition), [
    'unpaced → rhythmic',
    'resting-seated → writing',
    'hands-available → tracing-ready',
    'tracing-ready → embodied-glyph',
  ]);
  assert.deepEqual(first.steps.map((step) => step.capabilities), [
    ['runa.haptic.start'],
    ['somatic.cue'],
    ['glyphforge.gesture.cue'],
    ['glyphforge.trace.arm', 'runa.audio.play', 'runa.haptic.pattern'],
  ]);
  assert.deepEqual(first.steps[3].cue, {
    gesture_id: 'glyph.meda',
    phoneme: 'me-da',
    semantic_id: 'kelyran:meda',
    haptic_pattern: 'pulse.arc.55',
    bpm: 55,
  });
});

test('preserves custom target arrival conditions as observation steps', () => {
  const state = createSomaticState({
    world_id: 'kelyran',
    channels: { posture: { mode: 'resting-seated' } },
    provenance: { posture: 'user' },
  }, { now: fixedNow });
  const target = createSomaticTarget({
    target_id: 'kelyran:writing:comfort',
    desired: { posture: 'writing' },
    arrival_conditions: ['comfort-confirmed'],
  });

  const course = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow });
  assert.deepEqual(course.steps.map((step) => step.arrival_condition), ['cadence-established', 'posture-ready', 'comfort-confirmed']);
  assert.deepEqual(course.steps.at(-1).capabilities, ['somatic.observe-hold']);
});

test('rejects a somatic profile for the wrong active world', () => {
  const state = createSomaticState({ world_id: 'terra-aeterna' }, { now: fixedNow });
  const target = createSomaticTarget({ target_id: 'test', desired: {}, arrival_conditions: [] });
  assert.throws(
    () => calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow }),
    /does not match active world/,
  );
});

test('receipts and stores observed somatic transitions', () => {
  const state = createSomaticState({
    world_id: 'kelyran',
    channels: { movement: { hands: 'available' } },
    provenance: { movement: 'device' },
  }, { now: fixedNow });
  const target = createSomaticTarget({
    target_id: 'kelyran:meda:embodied',
    desired: { gesture_id: 'glyph.meda' },
    arrival_conditions: ['embodied-glyph'],
  });
  const course = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow });
  const receipt = createSomaticReceipt({
    course,
    step: 1,
    status: 'observed',
    observed_state_id: 'somatic-state:next',
    capability_receipt_ids: ['cap:1'],
  }, { now: fixedNow });
  const store = createSomaticStore({ initialState: state });
  store.appendReceipt(receipt);

  assert.equal(receipt.schema, SOMATIC_RECEIPT_SCHEMA);
  assert.equal(store.snapshot().receipts.length, 1);
  assert.equal(store.snapshot().receipts[0].observed_state_id, 'somatic-state:next');
});

test('receipt identity includes capability evidence', () => {
  const state = createSomaticState({ world_id: 'kelyran' }, { now: fixedNow });
  const target = createSomaticTarget({ target_id: 'kelyran:hold', desired: {}, arrival_conditions: ['target-held'] });
  const course = calculateSomaticCourse({ state, target, profile: KELYRAN_SOMATIC_PROFILE }, { now: fixedNow });
  const first = createSomaticReceipt({ course, step: 1, status: 'applied', capability_receipt_ids: ['cap:1'] }, { now: fixedNow });
  const second = createSomaticReceipt({ course, step: 1, status: 'applied', capability_receipt_ids: ['cap:2'] }, { now: fixedNow });
  assert.notEqual(first.receipt_id, second.receipt_id);
});

test('somatic store isolates stored state from caller and reader mutations', () => {
  const state = createSomaticState({
    world_id: 'kelyran',
    channels: { posture: { mode: 'resting-seated' } },
    provenance: { posture: 'user' },
  }, { now: fixedNow });
  const store = createSomaticStore();
  store.write(state);

  const readState = store.read();
  readState.channels.posture.mode = 'standing';

  assert.equal(store.read().channels.posture.mode, 'resting-seated');
});
