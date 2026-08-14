import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCanonicalVoice,
  canonicalVoiceId,
  canonicalVoiceName,
} from '../src/constellation-voice-registry.js';

test('Box, Boxxy and Boxfire resolve to one Arcsweep identity', () => {
  const box = resolveCanonicalVoice('Box');
  const boxxy = resolveCanonicalVoice('Boxxy');
  const boxfire = resolveCanonicalVoice('Boxfire');

  assert.ok(box);
  assert.equal(box.id, 'box');
  assert.equal(box.fullName, 'Boxfire');
  assert.equal(box.affectionateName, 'Boxxy');
  assert.equal(boxxy, box);
  assert.equal(boxfire, box);
  assert.equal(canonicalVoiceId('Box'), 'box');
  assert.equal(canonicalVoiceId('Boxxy'), 'box');
  assert.equal(canonicalVoiceId('Boxfire'), 'box');
  assert.equal(canonicalVoiceName('Box'), 'Box');
  assert.equal(canonicalVoiceName('Boxxy'), 'Box');
  assert.equal(canonicalVoiceName('Boxfire'), 'Box');
});
