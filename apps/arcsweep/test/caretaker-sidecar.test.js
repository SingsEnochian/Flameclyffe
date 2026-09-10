import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  currentCaretakerWorld,
  persistCaretakerReceiptLocal,
} from '../src/caretaker-sidecar.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const sidecar = fs.readFileSync(path.join(root, 'apps/arcsweep/src/caretaker-sidecar.js'), 'utf8');
const houseglass = fs.readFileSync(path.join(root, 'apps/arcsweep/src/houseglass.js'), 'utf8');
const sidecarBootstrap = fs.readFileSync(path.join(root, 'apps/arcsweep/src/sidecar-bootstrap.js'), 'utf8');
const mainBootstrap = fs.readFileSync(path.join(root, 'apps/arcsweep/src/main-bootstrap.js'), 'utf8');

test('Caretaker is mounted through the guarded sidecar bootstrap and stays out of Safe Boot core', () => {
  assert.doesNotMatch(houseglass, /caretaker-sidecar\.js/);
  assert.match(sidecarBootstrap, /'\.\/caretaker-sidecar\.js'/);
  assert.match(sidecarBootstrap, /import\.meta\.glob\([\s\S]*caretaker-sidecar\.js/);
  assert.match(mainBootstrap, /if \(!safeBoot\)[\s\S]*import\('\.\/sidecar-bootstrap\.js'\)/);
  assert.match(sidecar, /ArcSweep Caretaker/);
  assert.match(sidecar, /Mighty Sword 9B/);
  assert.match(sidecar, /bounded navigation only/);
});

test('Caretaker reads the actual active runtime World instead of guessing from DOM order', async () => {
  const world = await currentCaretakerWorld(async () => ({
    active_world_id: 'terra-aeterna',
    identity_anchor: { world_id: 'terra-aeterna' },
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
  }));
  assert.deepEqual(world, { id: 'terra-aeterna', name: 'Terra Aeterna' });
  assert.match(sidecar, /readActiveRuntimeWorldContext/);
  assert.doesNotMatch(sidecar, /querySelector\('\[data-world-id\]/);
});

test('Caretaker executes navigation through actual room buttons and verifies the observed room', () => {
  assert.match(sidecar, /button\[data-room\]/);
  assert.match(sidecar, /button\.click\(\)/);
  assert.match(sidecar, /observedRoom === target/);
  assert.match(sidecar, /status: observedRoom === target \? 'navigated' : 'not-observed'/);
});

test('Caretaker keeps a bounded local replay trail until Runtime Braid persistence is added', () => {
  assert.match(sidecar, /arcsweep\.caretaker\.receipts\.v0\.1/);
  assert.match(sidecar, /local-replayable/);
  assert.match(sidecar, /slice\(0, 60\)/);
  assert.match(sidecar, /arcsweep:caretaker-receipt/);
});

test('receipt storage failure preserves an already executed action as visible non-durable proof', () => {
  const receipt = {
    schema: 'arcsweep.caretaker-receipt/v0.1',
    status: 'applied',
    persistence: 'not-yet-durable',
    plan: { reply: 'Glyph Forge is this way.', actions: [{ type: 'navigate', target: 'glyph-forge' }] },
    action_results: [{ action: { type: 'navigate', target: 'glyph-forge' }, status: 'applied' }],
  };
  const storage = {
    getItem: () => '[]',
    setItem: () => { throw new Error('quota full'); },
  };
  const result = persistCaretakerReceiptLocal(receipt, storage);
  assert.equal(result.status, 'applied');
  assert.equal(result.action_results[0].status, 'applied');
  assert.equal(result.persistence, 'not-yet-durable');
  assert.match(result.storage_error, /quota full/);
});
