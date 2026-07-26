'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generatePayloadHash,
  normalizeNOAAPayload,
  requireNormalizedPacket,
} = require('./normalization');

test('missing NOAA sentinel remains null instead of becoming a false zero', () => {
  const packet = normalizeNOAAPayload(
    { time_tag: '2026-07-26T04:30:00Z', proton_speed: -999.9 },
    'proton_speed',
    {
      sourceKey: 'noaa-swpc-solar-wind-speed-summary',
      metricKey: 'solar_wind_speed_km_s',
      unit: 'km/s',
    },
  );

  assert.equal(packet.numeric_value, null);
  assert.equal(packet.quality_state, 'missing');
  assert.deepEqual(packet.raw_value, { proton_speed: -999.9 });
});

test('absent NOAA value remains a traceable missing packet', () => {
  const packet = normalizeNOAAPayload(
    { time_tag: '2026-07-26T04:30:00Z' },
    'bt',
    {
      sourceKey: 'noaa-swpc-solar-wind-mag-summary',
      metricKey: 'solar_wind_bt_nt',
      unit: 'nT',
    },
  );

  assert.equal(packet.numeric_value, null);
  assert.equal(packet.quality_state, 'missing');
  assert.deepEqual(packet.raw_source_record, { time_tag: '2026-07-26T04:30:00Z' });
});

test('invalid timestamps fail visibly and retain the raw record', () => {
  const raw = { time_tag: 'not-a-time', bt: 5 };
  const packet = normalizeNOAAPayload(raw, 'bt', {
    sourceKey: 'noaa-swpc-solar-wind-mag-summary',
    metricKey: 'solar_wind_bt_nt',
  });

  assert.equal(packet.quality_state, 'rejected');
  assert.match(packet.error, /Invalid upstream timestamp/);
  assert.deepEqual(packet.raw_source_record, raw);
  assert.throws(() => requireNormalizedPacket(packet), /Invalid upstream timestamp/);
});

test('payload hash partitions otherwise identical metrics by source', () => {
  const base = {
    observedAt: '2026-07-26T04:30:00.000Z',
    metricKey: 'shared_metric',
    numericValue: 5,
    rawValue: { value: 5 },
  };

  assert.notEqual(
    generatePayloadHash({ ...base, sourceKey: 'feed-a' }),
    generatePayloadHash({ ...base, sourceKey: 'feed-b' }),
  );
});
