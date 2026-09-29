import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NIKOLA_SINGING_PROFILE,
  createNikolaSingingIntent,
} from '../src/nikola-singing-profile.js';
import { createVoiceRouter } from '../src/voice-router.js';

test('singing profile remains separate from speech identity rendering', () => {
  assert.equal(NIKOLA_SINGING_PROFILE.identityId, 'nikola');
  assert.equal(NIKOLA_SINGING_PROFILE.engineIndependent, true);
  assert.equal(NIKOLA_SINGING_PROFILE.separateFromSpeechVoice, true);
  assert.equal(NIKOLA_SINGING_PROFILE.provenance.artistIdentityReproductionAllowed, false);
  assert.equal(NIKOLA_SINGING_PROFILE.renderingPolicy.requireOriginalOrAuthorizedBaseVoice, true);
});

test('DRM-blocked reference remains explicitly unresolved rather than fabricated', () => {
  assert.equal(NIKOLA_SINGING_PROFILE.provenance.currentReferenceStatus, 'metadata-only-drm-blocked');
  assert.match(NIKOLA_SINGING_PROFILE.provenance.currentReferenceNote, /cannot be decoded reliably/i);
});

test('singing intent requires a score and preserves mode-specific rendering hints', () => {
  const intent = createNikolaSingingIntent({
    text: 'The field answers when the second coil begins to sing.',
    scoreRef: 'memory://scores/nikola-calibration-01.musicxml',
    mode: 'wonder',
    tempoBpm: 72,
  });

  assert.equal(intent.voiceId, 'nikola-sing-v0.1');
  assert.equal(intent.identityId, 'nikola');
  assert.equal(intent.mode, 'wonder');
  assert.equal(intent.tempoBpm, 72);
  assert.ok(intent.renderHints.legato > intent.renderHints.grit);
});

test('generic voice router can issue a receipt for a singing adapter without changing identity', async () => {
  const intent = createNikolaSingingIntent({
    text: 'A current may wander, but resonance remembers the way home.',
    scoreRef: 'memory://scores/nikola-calibration-02.musicxml',
    mode: 'story-song',
  });

  const router = createVoiceRouter({
    adapters: {
      diffsinger: {
        render: async (received) => ({
          audioRef: 'memory://audio/nikola-singing-calibration.wav',
          durationMs: 4200,
          sampleRate: 44100,
          sourceTextPreserved: received.text === intent.text,
          receipt: { scoreRef: received.scoreRef, synthetic: true },
        }),
      },
    },
    defaultEngine: 'diffsinger',
  });

  const receipt = await router.render(intent);
  assert.equal(receipt.identityId, 'nikola');
  assert.equal(receipt.voiceId, 'nikola-sing-v0.1');
  assert.equal(receipt.engine, 'diffsinger');
  assert.equal(receipt.sourceTextPreserved, true);
  assert.equal(receipt.engineReceipt.synthetic, true);
});
