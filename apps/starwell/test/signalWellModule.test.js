import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildSignalSessionExport,
  makeCandidate,
  makeDemoSignalPoints,
} from '../src/components/signal-well/signalWellModel.js';

const manifest = JSON.parse(readFileSync(
  new URL('../public/modules/signal-well.module.json', import.meta.url),
  'utf8',
));

test('Signal Well is bundled in the installable as the core radio-sifting module', () => {
  assert.equal(manifest.moduleId, 'signal-well');
  assert.equal(manifest.delivery, 'bundled-core');
  assert.equal(manifest.enabledByDefault, true);
  assert.equal(manifest.route, '/starwell/signal-well/');
  assert.equal(manifest.entrypoint, 'signal-well/index.html');
});

test('Signal Well preserves source data and appends human classifications', () => {
  assert.equal(manifest.storage.mode, 'local-first');
  assert.equal(manifest.storage.rawImmutable, true);
  assert.equal(manifest.storage.annotationsAppendOnly, true);

  const points = makeDemoSignalPoints(8, 8);
  const candidate = makeCandidate({
    timeStart: 1,
    timeEnd: 3,
    frequencyStart: 19.8,
    frequencyEnd: 20.2,
  });
  const receipt = buildSignalSessionExport({
    source: { name: 'test.csv', kind: 'local', byteLength: 128 },
    points,
    candidates: [candidate],
  });

  assert.equal(receipt.source.rawImmutable, true);
  assert.equal(receipt.provenance.annotationsAppendOnly, true);
  assert.equal(receipt.provenance.automatedClassification, false);
  assert.equal(receipt.provenance.reviewer, 'human-led');
});

test('Signal Well exposes an adapter contract without forcing hardware into the core installer', () => {
  assert.equal(manifest.extensionContract.apiVersion, '0.1.0');
  assert.equal(manifest.extensionContract.discoveryDirectory, 'modules/signal-well/adapters');
  assert.deepEqual(manifest.extensionContract.bundledAdapters, []);
  assert.ok(manifest.extensionContract.adapterKinds.includes('radio-hardware'));
  assert.ok(manifest.extensionContract.adapterKinds.includes('telescope-archive'));
  assert.ok(manifest.plannedAdapters.includes('radio-jove-live'));
  assert.ok(manifest.plannedAdapters.includes('filterbank-hdf5-fits'));
});
