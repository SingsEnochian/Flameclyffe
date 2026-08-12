import assert from 'node:assert/strict';
import test from 'node:test';
import { buildObservation, createHandler } from '../../../netlify/functions/field-current.mjs';

const inputs = {
  weather: { current: { time: '2026-08-12T12:00', pressure_msl: 1018, is_day: 1, cloud_cover: 20, precipitation: 0, relative_humidity_2m: 60, wind_speed_10m: 8, weather_code: 1 } },
  kpRows: [{ Kp: 2, time_tag: 'now' }], magRows: [['now', null, null, '-2', null, null, '5']], plasmaRows: [['now', '4', '420']],
};

test('live observation remains source evidence and does not manufacture Qualia', () => {
  const value = buildObservation(inputs, new Date('2026-08-12T12:00:00Z'));
  assert.equal(value.version, 'deep-observer-live-v1');
  assert.equal(value.source.transport, 'live Netlify function');
  assert.equal(value.field.Q, undefined);
  assert.ok(value.field.R > 0);
});

test('field endpoint accepts GET only', async () => {
  const handler = createHandler({ fetchImpl: async () => { throw new Error('not called'); } });
  assert.equal((await handler({ httpMethod: 'POST' })).statusCode, 405);
});
