import assert from 'node:assert/strict';
import test from 'node:test';

import { findStorySoundCues, resolveWorldSoundfontMap, resolveWorldTone } from '../src/story-soundscape.js';
import { SYNAPTIC_HEARTFIELD_PROFILE, createHeartfieldReceipt, validateHeartfieldProfile } from '../src/synaptic-heartfield.js';

test('story language resolves to exact sound actions', () => {
  const text = 'A branch snapped behind her. Thunder rolled, and the bell rang.';
  const cues = findStorySoundCues(text);
  assert.deepEqual(cues.map((cue) => cue.cue_id), ['branch-snap', 'thunder', 'bell']);
  assert.equal(cues[0].text, 'branch snapped');
  assert.deepEqual(cues[0].source_span, undefined);
  assert.equal(text.slice(cues[0].start, cues[0].end), cues[0].text);
});

test('Synaptic Heartfield keeps binaural differences and modulation clocks mathematically distinct', () => {
  const validation = validateHeartfieldProfile();
  assert.equal(validation.valid, true);
  assert.equal(validation.byId['theta-core'].rightHz - validation.byId['theta-core'].leftHz, 4);
  assert.equal(validation.byId['alpha-theta-bridge'].rightHz - validation.byId['alpha-theta-bridge'].leftHz, 8);
  assert.equal(validation.byId['sub-heart'].modulationHz, 2.25);
  assert.equal(validation.byId['heart-phi'].modulationHz, 1.61803398875);
  assert.deepEqual(validation.byId['harmonic-field'].frequencies, [216,224,432,888,1110,1760,2880]);
});

test('Heartfield receipt never invents physiology or missing Qualia', () => {
  const receipt = createHeartfieldReceipt({ world: { id: 'waking-world', name: 'The Waking World' }, layerState: {}, startedAt: '2026-08-14T01:00:00.000Z' });
  assert.equal(receipt.profile_id, SYNAPTIC_HEARTFIELD_PROFILE.id);
  assert.equal(receipt.observation.qualia.present, false);
  assert.equal(receipt.observation.qualia.report, null);
  assert.equal(receipt.observation.physiology_measured, false);
  assert.equal(receipt.authority.physiological_response_inferred, false);
  assert.equal(receipt.authority.qualia_inferred, false);
  assert.equal(receipt.authority.firsthand_qualia_is_physiological_measurement, false);
});

test('Heartfield receipt carries the writer\'s qualitative account without turning it into a magnitude', () => {
  const receipt = createHeartfieldReceipt({ world: { id: 'terra', name: 'Terra Aeterna' }, qualia: .84, qualiaText: '  Warmth gathered behind the sternum; copper light widened.  ', layerState: {}, startedAt: '2026-08-14T01:00:00.000Z' });
  assert.equal(receipt.observation.qualia.present, true);
  assert.equal(receipt.observation.qualia.authority, 'firsthand-only');
  assert.equal(receipt.observation.qualia.inferred, false);
  assert.equal(receipt.observation.qualia.report.text, 'Warmth gathered behind the sternum; copper light widened.');
  assert.equal(receipt.observation.qualia.legacy_scalar, undefined);
  assert.equal(receipt.observation.physiology_measured, false);
});

test('a legacy Heartfield scalar without a report is retained only as unresolved metadata', () => {
  const receipt = createHeartfieldReceipt({ world: { id: 'terra', name: 'Terra Aeterna' }, qualia: .84, layerState: {} });
  assert.equal(receipt.observation.qualia.present, false);
  assert.equal(receipt.observation.qualia.legacy_scalar, .84);
});

test('Heartfield profile carries embodied entry controls and distinct evidence streams', () => {
  assert.equal(SYNAPTIC_HEARTFIELD_PROFILE.entry_ramp_seconds, 2.5);
  assert.equal(SYNAPTIC_HEARTFIELD_PROFILE.output_ceiling, .35);
  assert.match(SYNAPTIC_HEARTFIELD_PROFILE.claims.evidence, /distinct evidence streams/);
  assert.match(SYNAPTIC_HEARTFIELD_PROFILE.claims.physiological, /sensor channel/);
});

test('incremental cue search does not replay completed earlier phrases', () => {
  const text = 'A branch snapped. Then the fire crackled.';
  assert.deepEqual(findStorySoundCues(text, { fromIndex: 18 }).map((cue) => cue.cue_id), ['fire']);
});

test('world tone resolver carries established roots into the mixer', () => {
  assert.equal(resolveWorldTone({ id: 'house-world-terra-aeterna', houseSourceKey: 'terra-aeterna', name: 'Terra Aeterna' }).rootHz, 220);
  assert.equal(resolveWorldTone({ id: 'house-world-luna', houseSourceKey: 'luna' }).rootHz, 432);
  assert.equal(resolveWorldTone({ id: 'house-world-taveren-vaen', houseSourceKey: 'taveren-vaen' }).rootHz, 120);
  assert.equal(resolveWorldTone({ id: 'house-world-starsong', houseSourceKey: 'starsong' }).rootHz, 528);
});

test('Ta’veren Vaen maps Tavian, Kestrelle, the Dream, and Resonant Bonding to a reproducible SoundFont programme', () => {
  const map = resolveWorldSoundfontMap({ id: 'house-world-taveren-vaen', houseSourceKey: 'taveren-vaen' });
  assert.equal(map.id, 'taveren-vaen-greyspan-v1');
  assert.equal(map.tuning.rootHz, 120);
  assert.deepEqual(map.voices.map((voice) => voice.id), ['tavian', 'kestrelle', 'dream', 'greyspan', 'resonant-bonding', 'failure']);
  assert.equal(map.voices.find((voice) => voice.id === 'tavian').program, 42);
  assert.equal(map.voices.find((voice) => voice.id === 'kestrelle').program, 15);
  assert.equal(map.voices.find((voice) => voice.id === 'resonant-bonding').program, 48);
  assert.equal(resolveWorldSoundfontMap({ id: 'house-world-luna' }), null);
});
