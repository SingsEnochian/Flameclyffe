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

const radioJoveAdapter = JSON.parse(readFileSync(
  new URL('../public/modules/signal-well/adapters/radio-jove-live.adapter.json', import.meta.url),
  'utf8',
));

test('Signal Well is bundled in the installable as the core radio-sifting module', () => {
  assert.equal(manifest.moduleId, 'signal-well');
  assert.equal(manifest.version, '0.2.0');
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

test('Signal Well bundles Radio JOVE and the source-array recorder while keeping specialist hardware optional', () => {
  assert.equal(manifest.extensionContract.apiVersion, '0.1.0');
  assert.equal(manifest.extensionContract.discoveryDirectory, 'modules/signal-well/adapters');
  assert.deepEqual(manifest.extensionContract.bundledAdapters, ['radio-jove-live']);
  assert.ok(manifest.capabilities.includes('live-observatory-readings'));
  assert.ok(manifest.capabilities.includes('signal-source-array'));
  assert.ok(manifest.capabilities.includes('display-media-recording'));
  assert.ok(manifest.capabilities.includes('timed-json-snapshots'));
  assert.ok(manifest.capabilities.includes('live-recording-receipt'));
  assert.equal(manifest.sourceArray.defaultSelection, 'all');
  assert.equal(manifest.sourceArray.machineSnapshotCadenceSeconds, 60);
  assert.ok(manifest.extensionContract.adapterKinds.includes('radio-hardware'));
  assert.ok(manifest.extensionContract.adapterKinds.includes('telescope-archive'));
  assert.ok(manifest.extensionContract.adapterKinds.includes('event-feed'));
  assert.ok(manifest.plannedAdapters.includes('filterbank-hdf5-fits'));

  assert.equal(radioJoveAdapter.adapterId, 'radio-jove-live');
  assert.equal(radioJoveAdapter.kind, 'live-stream');
  assert.equal(radioJoveAdapter.delivery, 'bundled');
  assert.equal(radioJoveAdapter.enabledByDefault, true);
  assert.equal(radioJoveAdapter.observation.spectrographFrequencyMinMHz, 16);
  assert.equal(radioJoveAdapter.observation.spectrographFrequencyMaxMHz, 24);
  assert.equal(radioJoveAdapter.observation.audioCenterMHz, 20.1);
});
