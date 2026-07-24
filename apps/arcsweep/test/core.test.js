import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReturnRecord,
  calculateDrElapsed,
  calculateRatio,
  formatDuration,
  validateImportedState,
} from '../src/core.js';

test('calculates the configured DR-to-waking ratio', () => {
  assert.equal(calculateRatio(60, 10080), 168);
});

test('projects elapsed DR time from a waking interval', () => {
  const start = '2026-07-23T20:00:00.000Z';
  const end = '2026-07-23T20:01:00.000Z';
  assert.equal(calculateDrElapsed(start, end, 60, 10080), 10_080_000);
});

test('formats a duration without hiding days', () => {
  assert.equal(formatDuration(90_061_000), '1d 1h 1m 1s');
});

test('builds a return record without changing the supplied state', () => {
  const state = {
    settings: {
      crLabel: 'Waking World',
      drLabel: 'Terra Aeterna',
      crMinutes: 60,
      drMinutes: 120,
      returnAnchor: 'Notch',
    },
    session: {
      active: true,
      startedAt: '2026-07-23T20:00:00.000Z',
      targetWorld: 'Terra Aeterna',
      intention: 'Visit the Hearthroom',
    },
  };
  const record = buildReturnRecord(state, '2026-07-23T20:10:00.000Z');
  assert.equal(record.targetWorld, 'Terra Aeterna');
  assert.equal(record.returnAnchor, 'Notch');
  assert.equal(record.elapsedCr, 600_000);
  assert.equal(record.elapsedDr, 1_200_000);
  assert.equal(state.session.active, true);
});

test('rejects malformed imported collections', () => {
  assert.throws(() => validateImportedState({ scripts: {} }), /scripts must be an array/);
});
