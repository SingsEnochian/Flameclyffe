import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseRuneShellPrefs,
  runeShellEventKind,
  runeShellParticleBudget,
  shouldAnimateRuneShell,
} from '../src/runeshell-native-core.js';

test('RuneShell preferences normalise to safe defaults', () => {
  assert.deepEqual(normaliseRuneShellPrefs({}), {
    enabled: true,
    typing: true,
    incoming: true,
    presence: true,
    intensity: 'normal',
    respectReducedMotion: true,
  });
  assert.equal(normaliseRuneShellPrefs({ intensity: 'nuclear' }).intensity, 'normal');
  assert.equal(normaliseRuneShellPrefs({ enabled: false }).enabled, false);
});

test('RuneShell particle budget follows intensity', () => {
  assert.equal(runeShellParticleBudget('quiet'), 1);
  assert.equal(runeShellParticleBudget('normal'), 3);
  assert.equal(runeShellParticleBudget('bright'), 5);
});

test('RuneShell honours reduced motion when requested', () => {
  assert.equal(shouldAnimateRuneShell({ enabled: true, respectReducedMotion: true }, true), false);
  assert.equal(shouldAnimateRuneShell({ enabled: true, respectReducedMotion: false }, true), true);
  assert.equal(shouldAnimateRuneShell({ enabled: false }, false), false);
});

test('RuneShell maps live Flame states to visual event kinds', () => {
  assert.equal(runeShellEventKind({ state: 'speaking' }), 'voice');
  assert.equal(runeShellEventKind({ state: 'thinking' }), 'wake');
  assert.equal(runeShellEventKind({ state: 'ready' }), 'ready');
  assert.equal(runeShellEventKind({ state: 'degraded' }), 'warning');
  assert.equal(runeShellEventKind({ state: 'offline' }), 'ambient');
});
