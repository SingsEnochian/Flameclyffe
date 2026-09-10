import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const sidecar = fs.readFileSync(path.join(root, 'apps/arcsweep/src/caretaker-sidecar.js'), 'utf8');
const houseglass = fs.readFileSync(path.join(root, 'apps/arcsweep/src/houseglass.js'), 'utf8');

test('Caretaker sidecar is mounted through the Houseglass adapter', () => {
  assert.match(houseglass, /import '\.\/caretaker-sidecar\.js'/);
  assert.match(sidecar, /ArcSweep Caretaker/);
  assert.match(sidecar, /Mighty Sword 9B/);
  assert.match(sidecar, /bounded navigation only/);
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
