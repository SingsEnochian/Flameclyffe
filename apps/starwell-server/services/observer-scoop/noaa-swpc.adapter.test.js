'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isoTime,
  parseSolarWindMag,
  parseSolarWindSpeed,
  parsePlanetaryK,
  parseGoesXray,
  payloadHash,
} = require('./noaa-swpc.adapter');

test('isoTime treats NOAA timestamps without a suffix as UTC', () => {
  assert.equal(isoTime('2026-07-26T00:00:00'), '2026-07-26T00:00:00.000Z');
});

test('solar-wind magnetic summary becomes separate Bt and Bz packets', () => {
  const packets = parseSolarWindMag(
    [{ bt: 4, bz_gsm: -1, time_tag: '2026-07-26T03:22:00Z' }],
    'noaa-swpc-solar-wind-mag-summary',
  );

  assert.equal(packets.length, 2);
  assert.deepEqual(
    packets.map((packet) => [packet.metric_key, packet.numeric_value, packet.unit]),
    [
      ['solar_wind_bt_nt', 4, 'nT'],
      ['solar_wind_bz_gsm_nt', -1, 'nT'],
    ],
  );
  assert.equal(packets[0].provenance.classification, 'recorded');
  assert.equal(packets[0].access_level, 'private');
});

test('solar-wind speed summary normalizes proton speed', () => {
  const packets = parseSolarWindSpeed(
    [{ proton_speed: 521, time_tag: '2026-07-26T03:22:00Z' }],
    'noaa-swpc-solar-wind-speed-summary',
  );

  assert.equal(packets.length, 1);
  assert.equal(packets[0].metric_key, 'solar_wind_speed_km_s');
  assert.equal(packets[0].numeric_value, 521);
});

test('planetary K row produces Kp, running-a, and station-count packets', () => {
  const packets = parsePlanetaryK(
    [{ time_tag: '2026-07-26T00:00:00', Kp: 1.67, a_running: 6, station_count: 8 }],
    'noaa-swpc-planetary-k-index',
  );

  assert.equal(packets.length, 3);
  assert.deepEqual(
    Object.fromEntries(packets.map((packet) => [packet.metric_key, packet.numeric_value])),
    { planetary_kp: 1.67, planetary_a_running: 6, kp_station_count: 8 },
  );
});

test('GOES X-ray rows preserve energy channel and satellite', () => {
  const packets = parseGoesXray(
    [{ time_tag: '2026-07-26T03:20:00Z', satellite: 19, flux: 2.5e-7, energy: '0.1-0.8nm' }],
    'noaa-goes-primary-xray-6h',
  );

  assert.equal(packets.length, 1);
  assert.equal(packets[0].metric_key, 'goes_xray_flux_w_m2:0.1-0.8nm');
  assert.equal(packets[0].station_code, 'GOES-19');
  assert.equal(packets[0].unit, 'W/m^2');
});

test('payload hashes are stable across object key order', () => {
  assert.equal(payloadHash({ a: 1, b: 2 }), payloadHash({ b: 2, a: 1 }));
});

test('invalid source shapes fail visibly instead of becoming empty success', () => {
  assert.throws(
    () => parseSolarWindMag({ bt: 4 }, 'noaa-swpc-solar-wind-mag-summary'),
    /expected an array/,
  );
});
