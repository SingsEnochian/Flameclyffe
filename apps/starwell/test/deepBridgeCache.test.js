import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRIDGE_PULSE_URL,
  DEEP_FIELD_CACHE_CONTRACT,
  fetchBridgeDeepSnapshot,
  parseBridgePulsePayload,
  resolveDeepCacheUrl,
} from '../src/lib/deepBridge.js';

const CAPTURED_AT = new Date('2026-09-02T03:21:00.000Z');

function fieldCachePayload() {
  return {
    version: DEEP_FIELD_CACHE_CONTRACT,
    generated_at: '2026-09-02T03:20:22.161Z',
    weather: { sky: 'Night' },
    space_weather: {
      kp: { value: 0.67 },
      solar_wind: { bz: -2, bt: 4, speed: 383 },
    },
    moon: { illumination: 73.8 },
    field: {
      P: 0.49,
      C: 0.43,
      R: 0.72,
      E: 0.7,
      M: 0.74,
      A: 0.52,
      H: 0.51,
      T: 0.59,
      dpdt: 0.72,
    },
  };
}

test('published STARWELL builds resolve DEEP beside their asset directory', () => {
  assert.equal(
    resolveDeepCacheUrl({
      baseUrl: '/Flameclyffe/starwell-react-lab/',
      location: 'https://singsenochian.github.io/Flameclyffe/starwell-react-lab/',
    }),
    'https://singsenochian.github.io/Flameclyffe/starwell-react-lab/data/deep-current.json',
  );
  assert.equal(
    resolveDeepCacheUrl({
      baseUrl: './',
      moduleUrl: 'file:///opt/starwell/assets/deepBridge.js',
    }),
    'file:///opt/starwell/data/deep-current.json',
  );
  assert.doesNotMatch(BRIDGE_PULSE_URL, /-bridge-pulse/);
});

test('STARWELL adapts the shared field cache with explicit provenance', () => {
  const snapshot = parseBridgePulsePayload(fieldCachePayload(), {
    capturedAt: CAPTURED_AT,
    url: 'https://example.test/data/deep-current.json',
    idFactory: () => 'field-cache',
  });

  assert.equal(snapshot.observed_at, '2026-09-02T03:20:22.161Z');
  assert.equal(snapshot.source.kind, 'deep-field-cache-http');
  assert.equal(snapshot.source.contract, DEEP_FIELD_CACHE_CONTRACT);
  assert.equal(snapshot.source.contract_key, 'field-cache');
  assert.equal(snapshot.state.P, 0.49);
  assert.equal(snapshot.state.moonIllum, 73.8);
  assert.equal(snapshot.state.kp, 0.67);
  assert.equal(snapshot.state.bz, -2);
  assert.equal(snapshot.state.sky, 'night');
  assert.equal(snapshot.state.charge, 0.51);
  assert.equal(snapshot.state.dphi, 0);
  assert.equal(snapshot.warnings.includes('STATIC_FIELD_CACHE_ADAPTER'), true);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'state.charge'), true);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'state.dphi'), true);
});

test('STARWELL fetches the static cache without touching the retired bridge', async () => {
  const calls = [];
  const snapshot = await fetchBridgeDeepSnapshot({
    preferActivePacket: false,
    url: 'https://singsenochian.github.io/Flameclyffe/starwell-react-lab/data/deep-current.json',
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() { return fieldCachePayload(); },
      };
    },
    clock: () => CAPTURED_AT,
    idFactory: () => 'fetched-field-cache',
  });

  assert.deepEqual(calls, [
    'https://singsenochian.github.io/Flameclyffe/starwell-react-lab/data/deep-current.json',
  ]);
  assert.equal(snapshot.state.R, 0.72);
  assert.equal(snapshot.source.kind, 'deep-field-cache-http');
});
