'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { createToneStore } = require('../lib/tone-store');
test('Tone Lab requires consent and clamps duration and volume', async () => {
  const store = createToneStore({ dataDir: await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tone-lab-')) });
  await assert.rejects(store.record({ presetId: 'dreaming' }), /explicit-consent-required/);
  const session = await store.record({ presetId: 'dreaming', consent: true, durationSeconds: 9999, volume: 1, audioEnabled: true, response: { comfort: 'comfortable', groundedness: .8 } });
  assert.equal(session.durationSeconds, 600); assert.equal(session.volume, 0.25); assert.equal(session.classification, 'user-authored sensory response'); assert.equal(session.schema, 'hearthgate.tone-response-ledger/v1'); assert.equal(session.state.stateLabel, 'grounded'); assert.equal(session.percept.schema, 'observer.percept/tone-v1'); assert.equal((await store.list()).sessions.length, 1);
  const custom = await store.savePreset({ name: 'Quiet Rain', frequencyHz: 90, overtoneHz: 180, maxVolume: 9, warnings: ['User-authored patch.'] });
  assert.equal(custom.audio.frequencyHz, 90); assert.equal(custom.maxVolume, .35); assert.equal((await store.presets()).length, 6);
  const profiles = await store.profiles(); assert.equal(profiles.profiles.some(p => p.id === 'baha-hearing-aid'), true);
  const saved = await store.saveProfiles({ profiles: [{ name: 'Custom', volumeCeiling: 9, frequencyMinHz: 1, frequencyMaxHz: 99999 }] }); assert.equal(saved.profiles[0].volumeCeiling, .35); assert.equal(saved.profiles[0].frequencyMinHz, 20); assert.equal(saved.profiles[0].frequencyMaxHz, 16000);
  const consent = await store.saveConsentProfile({ profileId: 'rowan', stopWords: ['Stop', 'Feather', 'Icarus'], maxSessionMinutes: 2, healthFlags: ['tinnitus', 'made-up'] });
  assert.deepEqual(consent.stopWords, ['stop', 'feather', 'icarus']); assert.equal(consent.audioEnabledByDefault, false); assert.deepEqual(consent.healthFlags, ['tinnitus']);
  const blocked = await store.preflight({ presetId: 'dreaming', profileId: 'rowan', durationSeconds: 999, consent: false });
  assert.equal(blocked.allowed, false); assert.equal(blocked.reasons.includes('explicit-consent-required'), true); assert.equal(blocked.limits.durationSeconds, 120);
});
