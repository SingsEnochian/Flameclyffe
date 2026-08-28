import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  chooseDurableWorkspaceSnapshot,
  durableStateRichness,
  isProbablyFreshDefaultState,
} from '../src/durable-workspace-state.js';

function defaultState(updatedAt = '2026-08-28T20:00:00.000Z') {
  return {
    version: '0.3.0',
    worlds: [{ id: 'world-default', name: 'Unassigned World', createdAt: updatedAt, updatedAt }],
    activeWorldId: 'world-default',
    scripts: [{ id: 'script-default', name: 'First DR Script', updatedAt }],
    continuity: [],
    manifestations: [],
    feedbackCycles: [],
    records: {},
    provenance: { updatedAt },
  };
}

function savedHouseState(updatedAt = '2026-08-28T19:00:00.000Z') {
  return {
    version: '0.3.0',
    worlds: [
      { id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World', wakingWorld: { schema: 'arcsweep.waking-world/v1' }, createdAt: '2026-08-20T20:49:26.216Z', updatedAt },
      { id: 'terra-aeterna', name: 'Terra Aeterna', kind: 'Desired Reality', createdAt: '2026-06-06T09:03:15.153Z', updatedAt },
    ],
    activeWorldId: 'terra-prime',
    scripts: [{ id: 'script-ta', name: 'Terra Aeterna', updatedAt }],
    continuity: [{ id: 'continuity-1', title: 'Saved thread' }],
    manifestations: [],
    feedbackCycles: [{ id: 'feedback-1' }],
    records: { notes: [{ id: 'note-1' }] },
    provenance: { updatedAt },
  };
}

test('a newly generated local default can never overwrite a richer durable House copy', () => {
  const local = defaultState('2026-08-28T21:00:00.000Z');
  const cloud = savedHouseState('2026-08-28T19:00:00.000Z');
  const choice = chooseDurableWorkspaceSnapshot({ localState: local, cloudState: cloud, cloudUpdatedAt: '2026-08-28T19:00:00.000Z' });
  assert.equal(isProbablyFreshDefaultState(local), true);
  assert.equal(isProbablyFreshDefaultState(cloud), false);
  assert.equal(choice.source, 'cloud');
  assert.equal(choice.reason, 'protect-cloud-from-fresh-default');
  assert.equal(choice.state.worlds.some((world) => world.name === 'Terra Prime'), true);
});

test('real local work beats an empty/default cloud seed', () => {
  const local = savedHouseState('2026-08-28T21:00:00.000Z');
  const cloud = defaultState('2026-08-28T22:00:00.000Z');
  const choice = chooseDurableWorkspaceSnapshot({ localState: local, cloudState: cloud });
  assert.equal(choice.source, 'local');
  assert.equal(choice.reason, 'protect-local-from-fresh-default');
});

test('once both sides contain real work, the newer persisted copy wins', () => {
  const local = savedHouseState('2026-08-28T18:00:00.000Z');
  const cloud = savedHouseState('2026-08-28T20:00:00.000Z');
  cloud.continuity.push({ id: 'continuity-2', title: 'Newer cloud receipt' });
  const choice = chooseDurableWorkspaceSnapshot({ localState: local, cloudState: cloud, cloudUpdatedAt: '2026-08-28T20:00:00.000Z' });
  assert.equal(choice.source, 'cloud');
  assert.equal(choice.reason, 'cloud-newer');
  assert.ok(durableStateRichness(cloud) > durableStateRichness(local));
});

test('durable workspace reconciliation runs before Arcsweep main state hydration', async () => {
  const bootstrap = await readFile(new URL('../src/main-bootstrap.js', import.meta.url), 'utf8');
  const durableImport = bootstrap.indexOf("import('./durable-workspace-state.js')");
  const mainImport = bootstrap.indexOf("import('./main.js')");
  assert.ok(durableImport >= 0 && mainImport > durableImport);
  assert.match(bootstrap, /Checking the durable House copy/);
});
