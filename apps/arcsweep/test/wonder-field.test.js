import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WONDER_FIELD_GUIDE_LAWS,
  createCueConstellation,
  createFieldDetectionTrace,
  createFieldState,
  createPossibilityField,
  createTemporalReplay,
  createThoughtField,
  createTransductionTrace,
  wonderClaimLane,
} from '../src/wonder-field.js';

test('possibility fields preserve alternatives until explicit selection', () => {
  const field = createPossibilityField([
    { id: 'a', summary: 'first mechanism', lane: 'hypothesis' },
    { id: 'b', summary: 'second mechanism', lane: 'analogy' },
  ]);
  assert.equal(field.status, 'unresolved');
  assert.equal(field.alternatives_preserved, true);
  assert.equal(field.candidates.length, 2);

  const selected = createPossibilityField(field.candidates, {
    selectedId: 'b',
    selectionReason: 'new discriminating evidence',
  });
  assert.equal(selected.status, 'selected');
  assert.equal(selected.selected_id, 'b');
  assert.equal(selected.candidates.length, 2);
});

test('transduction traces preserve the full translation chain', () => {
  const trace = createTransductionTrace({
    source: 'infrared radiation',
    interaction: 'sensor absorption',
    signal: 'voltage samples',
    representation: 'false-colour image',
    interpretation: 'warm surface',
  });
  assert.deepEqual(trace.stages.map((stage) => stage.stage), [
    'source',
    'interaction',
    'signal',
    'representation',
    'interpretation',
  ]);
  assert.equal(trace.rule, 'source != signal != representation != interpretation');
});

test('thought fields organize without deleting captured nodes', () => {
  const field = createThoughtField([
    { id: 'quiet', text: 'weak signal worth preserving', state: 'incubating' },
    { id: 'now', text: 'action for today', state: 'active' },
  ]);
  assert.equal(field.nodes.length, 2);
  assert.equal(field.deletion_count, 0);
});

test('field state represents conditions rather than preselecting final form', () => {
  const field = createFieldState({
    medium: 'spatial interface',
    dimensions: ['x', 'y', 'z', 'time'],
    constraints: ['reachable by one hand'],
    attractors: ['active object'],
    boundaries: ['room'],
    barriers: ['threshold'],
    environment: { coupling: 'low-noise' },
  });
  assert.equal(field.medium, 'spatial interface');
  assert.ok(field.dimensions.includes('time'));
  assert.ok(field.barriers.includes('threshold'));
  assert.equal(field.environment.coupling, 'low-noise');
  assert.match(field.heuristic, /control conditions/);
});

test('cue constellations keep semantic meaning separate from replaceable channels', () => {
  const cue = createCueConstellation({
    semanticId: 'uncertainty',
    meaning: 'this claim remains unresolved',
    audio: { interval: 'minor-second' },
    haptic: { pattern: 'double-soft' },
  });
  assert.equal(cue.semantic_id, 'uncertainty');
  assert.equal(cue.mapping_is_meaning, false);
  assert.ok(cue.channels.audio);
  assert.ok(cue.channels.haptic);
});

test('temporal replay keeps sequence rather than flattening process to one state', () => {
  const replay = createTemporalReplay([
    { t: 2, phase: 'fall', value: 0 },
    { t: 0, phase: 'rise', value: 1 },
    { t: 1, phase: 'peak', value: 2 },
  ], { source: 'pulse' });
  assert.equal(replay.replayable, true);
  assert.deepEqual(replay.samples.map((sample) => sample.t), [0, 1, 2]);
  assert.equal(replay.temporal_order_preserved, true);
});

test('claim lanes and guide laws include frontier and non-flattening distinctions', () => {
  assert.equal(wonderClaimLane('active-research').authority, 'research-frontier');
  assert.equal(wonderClaimLane('mythic').authority, 'mythic-interpretation');
  assert.ok(WONDER_FIELD_GUIDE_LAWS.some((law) => /WONDER FIRST/.test(law)));
  assert.ok(WONDER_FIELD_GUIDE_LAWS.some((law) => /Time is part of the state/.test(law)));
});


test('field detection distinguishes unseen structure from unsupported assertion', () => {
  const trace = createFieldDetectionTrace({
    source: 'charged source',
    field: { kind: 'electric', local_strength: 'measured' },
    predictedBehavior: ['test charge deflects'],
    detector: 'calibrated field probe',
    observations: ['probe response repeats at the same location'],
    inference: 'a field model explains the observed force pattern',
    claimLane: 'established-science',
  });
  assert.equal(trace.direct_visibility_required, false);
  assert.equal(trace.claim_lane, 'established-science');
  assert.match(trace.rule, /hidden != imaginary/);
});
