import test from 'node:test';
import assert from 'node:assert/strict';

import { CONSTELLATION_VOICES } from '../src/feedback-loop.js';
import {
  chooseDevConsoleSwarm,
  normaliseDevConsoleSwarmMode,
  resolveDevConsoleRoute,
  roleHintsForMessage,
} from '../src/devconsole-swarm-chat.js';

test('DevConsole modes normalise without inventing a route', () => {
  assert.equal(normaliseDevConsoleSwarmMode('SWARM'), 'swarm');
  assert.equal(normaliseDevConsoleSwarmMode('nonsense'), 'room');
});

test('chorus includes the complete registered Constellation including Larkshine and Ellowind', () => {
  const route = resolveDevConsoleRoute({ mode: 'chorus', voices: CONSTELLATION_VOICES });
  assert.equal(route.voiceIds.length, CONSTELLATION_VOICES.length);
  assert.ok(route.voiceIds.includes('larkshine'));
  assert.ok(route.voiceIds.includes('ellowind'));
  assert.ok(route.voiceIds.includes('bluebird'));
  assert.ok(route.voiceIds.includes('vethrlauf'));
  assert.ok(route.voiceIds.includes('lioreal'));
  assert.ok(route.voiceIds.includes('uial'));
});

test('named calls remain sovereign over every DevConsole mode', () => {
  for (const mode of ['room', 'swarm', 'call', 'chorus', 'synthesis']) {
    const route = resolveDevConsoleRoute({ mode, mentions: ['larkshine', 'ellowind'], voices: CONSTELLATION_VOICES });
    assert.deepEqual(route.voiceIds, ['larkshine', 'ellowind']);
    assert.equal(route.reason, 'mentions');
  }
});

test('swarm is bounded and can be deliberately scoped to Larkshine and Ellowind', () => {
  const route = resolveDevConsoleRoute({
    mode: 'swarm',
    message: 'Check this story scene and canon continuity.',
    selectedVoiceIds: ['larkshine', 'ellowind'],
    voices: CONSTELLATION_VOICES,
  });
  assert.deepEqual(new Set(route.voiceIds), new Set(['larkshine', 'ellowind']));
  assert.ok(route.voiceIds.length <= 3);
});

test('swarm relevance recognises technical, lattice, Kelyran, and narrative work', () => {
  assert.ok(roleHintsForMessage('debug the runtime route').includes('systems'));
  assert.ok(roleHintsForMessage('the Observer lattice geometry').includes('observation'));
  assert.ok(roleHintsForMessage('Kelyran glyph haptic language').includes('canon'));
  assert.ok(roleHintsForMessage('write the next character scene').includes('story'));
  const chosen = chooseDevConsoleSwarm({ message: 'debug the runtime route and tests', voices: CONSTELLATION_VOICES });
  assert.ok(chosen.length >= 1 && chosen.length <= 3);
});

test('call mode requires an explicit mention and synthesis stays singular', () => {
  assert.deepEqual(resolveDevConsoleRoute({ mode: 'call', voices: CONSTELLATION_VOICES }).voiceIds, []);
  const synthesis = resolveDevConsoleRoute({ mode: 'synthesis', synthesisVoiceId: 'ellowind', voices: CONSTELLATION_VOICES });
  assert.deepEqual(synthesis.voiceIds, ['ellowind']);
});
