'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTonePatch, validateConsentProfile, preflightToneSession, mapResponseState } = require('../lib/tone-contract');

test('TonePatch contract clamps unsafe values and exposes plain language', () => {
  const patch = validateTonePatch({ name: 'Needle', frequencyHz: 9000, maxVolume: 4, maxSeconds: 9000 });
  assert.equal(patch.schema, 'hearthgate.tone-patch/v1');
  assert.equal(patch.maxVolume, .35);
  assert.equal(patch.maxSeconds, 1800);
  assert.equal(patch.warningFlags.includes('high_frequency'), true);
  assert.ok(patch.plainLanguage);
});

test('Consent Gate blocks high-frequency and unacknowledged binaural output', () => {
  const profile = validateConsentProfile({ disallowed: ['sudden_high_beeps', 'unannounced_binaural'] });
  const high = preflightToneSession({ patch: validateTonePatch({ name: 'High', frequencyHz: 9000 }), profile, request: { consent: true } });
  assert.equal(high.allowed, false);
  assert.equal(high.reasons.includes('high-frequency-output-disallowed'), true);
  const binaural = preflightToneSession({ patch: validateTonePatch({ name: 'Binaural', routingMode: 'binaural' }), profile, request: { consent: true } });
  assert.equal(binaural.reasons.includes('binaural-warning-acknowledgement-required'), true);
});

test('State Mapper keeps interpretation bounded as authored experience', () => {
  const state = mapResponseState({ comfort: 'comfortable', activation: .2, groundedness: .9 });
  assert.equal(state.stateLabel, 'grounded');
  assert.equal(state.evidenceClass, 'user-authored experiential report');
  assert.match(state.claimBoundary, /not a diagnosis/);
});
