import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ASPECT_HOUSE_ACTIVITY_MARKER,
  aspectActivitySnapshot,
  recordAspectActivity,
  recordCoalitionComplete,
  recordCoalitionStarted,
} from '../src/aspect-mesh-house-activity.js';

const at = Date.parse('2026-09-25T01:00:00.000Z');

test('Aspect House activity records named aspect turns without flattening authorship', () => {
  const saved = recordAspectActivity({
    traceId: 'trace-live-1',
    sender: { aspectId: 'mapper' },
    kind: 'proposal',
    body: 'Try the existing House transport before inventing another one.',
  }, at);

  assert.equal(saved.aspectId, 'mapper');
  assert.equal(saved.name, 'Mapper');
  assert.equal(saved.kind, 'proposal');
  assert.match(saved.preview, /existing House transport/);

  const snapshot = aspectActivitySnapshot(at + 1000);
  assert.ok(snapshot.active.some((item) => item.aspectId === 'mapper' && item.traceId === 'trace-live-1'));
});

test('coalition lifecycle is visible while working and remains briefly as returned history', () => {
  recordCoalitionStarted({
    traceId: 'trace-coalition-1',
    coalition: {
      id: 'coalition-1',
      purpose: 'Look for a surprising route.',
      members: ['mapper', 'critic', 'narrative'],
    },
  }, at + 2000);

  let snapshot = aspectActivitySnapshot(at + 3000);
  const working = snapshot.coalitions.find((item) => item.traceId === 'trace-coalition-1');
  assert.equal(working.state, 'working');
  assert.deepEqual(working.members, ['mapper', 'critic', 'narrative']);

  recordCoalitionComplete({ traceId: 'trace-coalition-1' }, at + 4000);
  snapshot = aspectActivitySnapshot(at + 5000);
  const returned = snapshot.coalitions.find((item) => item.traceId === 'trace-coalition-1');
  assert.equal(returned.state, 'complete');
});

test('stale aspect activity ages out rather than pretending to be live forever', () => {
  recordAspectActivity({
    traceId: 'trace-old',
    sender: { aspectId: 'witness' },
    kind: 'observation',
    body: 'Old observation.',
  }, at);

  const snapshot = aspectActivitySnapshot(at + 181_000);
  assert.ok(!snapshot.recent.some((item) => item.traceId === 'trace-old'));
});

test('House sidecar pack includes the Aspect Mesh activity surface', () => {
  const bootstrap = fs.readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /\.\/aspect-mesh-house-activity\.js/);
  assert.equal(ASPECT_HOUSE_ACTIVITY_MARKER, 'aspect-mesh-house-activity/v0.2');
});
