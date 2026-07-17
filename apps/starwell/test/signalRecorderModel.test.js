import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecordingReceipt,
  buildSnapshotRecord,
  chooseRecorderMimeType,
  makeRecordingSessionId,
} from '../src/components/signal-well/signalRecorderModel.js';

const source = {
  id: 'radio-jove-live',
  name: 'Radio JOVE Live Observatory',
  provider: 'NASA Radio JOVE Project / K4LED',
  availability: 'live',
  cadence: 'continuous',
  families: ['jovian', 'solar'],
  frequencyLabel: '16–24 MHz',
  officialUrl: 'https://radiojove.gsfc.nasa.gov/',
  openUrl: 'https://example.test/live',
  recordModes: ['display-media'],
};

test('recorder chooses the first supported WebM profile', () => {
  const fakeRecorder = {
    isTypeSupported(value) {
      return value === 'video/webm;codecs=vp8,opus';
    },
  };
  assert.equal(chooseRecorderMimeType(fakeRecorder), 'video/webm;codecs=vp8,opus');
});

test('recording session ids are UTC timestamp based and filesystem friendly', () => {
  const id = makeRecordingSessionId(new Date('2026-07-17T19:00:01.250Z'));
  assert.equal(id, 'signal-session-2026-07-17T19-00-01-250Z');
});

test('snapshot records retain source, endpoint, status, body, and byte count', () => {
  const snapshot = buildSnapshotRecord({
    sourceId: 'noaa-solar-radio-flux',
    endpoint: 'https://services.swpc.noaa.gov/json/solar-radio-flux.json',
    capturedAt: '2026-07-17T19:00:00.000Z',
    status: 200,
    body: '[{"flux":100}]',
  });
  assert.equal(snapshot.sourceId, 'noaa-solar-radio-flux');
  assert.equal(snapshot.status, 200);
  assert.ok(snapshot.byteLength > 0);
  assert.equal(snapshot.error, null);
});

test('recording receipt binds media, selected sources, snapshots, and local provenance', () => {
  const snapshot = buildSnapshotRecord({
    sourceId: 'noaa-solar-radio-flux',
    endpoint: 'https://services.swpc.noaa.gov/json/solar-radio-flux.json',
    capturedAt: '2026-07-17T19:00:00.000Z',
    status: 200,
    body: '[]',
  });
  const receipt = buildRecordingReceipt({
    sessionId: 'signal-session-test',
    selectedSources: [source],
    startedAt: '2026-07-17T19:00:00.000Z',
    endedAt: '2026-07-17T19:01:00.000Z',
    durationMs: 60000,
    media: {
      filename: 'signal-session-test.webm',
      mimeType: 'video/webm',
      byteLength: 1024,
      sha256: 'abc123',
      captureMode: 'display-media-with-audio-requested',
    },
    snapshots: [snapshot],
    notes: 'whole array',
  });

  assert.equal(receipt.datasetKind, 'signal_well_live_recording');
  assert.equal(receipt.selectedSources[0].id, 'radio-jove-live');
  assert.equal(receipt.media.sha256, 'abc123');
  assert.equal(receipt.snapshots.length, 1);
  assert.equal(receipt.provenance.localOnly, true);
  assert.equal(receipt.provenance.captureInitiatedByHuman, true);
});
