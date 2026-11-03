'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { preflight, departureReceipt } = require('../src/electric-pigeon-preflight.cjs');

const valid = {
  massKg: 1000, accelerationMps2: 1, durationSeconds: 10,
  availableEnergyJoules: 50000, observerReady: true,
  returnMarker: '2026-11-02T22:34:00-05:00',
  route: 'Flameclyffe → Wayglass · moving frame',
  ownerAuthorized: true,
};

test('idealized preflight computes delta-v, displacement and energy', () => {
  const result = preflight(valid);
  assert.equal(result.ready, true);
  assert.equal(result.calculations.deltaVelocityMps, 10);
  assert.equal(result.calculations.displacementMeters, 50);
  assert.equal(result.calculations.idealKineticEnergyJoules, 50000);
});

test('Feather Stop and missing return marker block departure', () => {
  assert.equal(preflight({ ...valid, featherStop: true }).ready, false);
  assert.equal(preflight({ ...valid, returnMarker: null }).ready, false);
  assert.equal(preflight({ ...valid, ownerAuthorized: false }).ready, false);
});

test('only a simulated departure receipt can be issued', () => {
  const result = preflight(valid);
  const receipt = departureReceipt(result, { timestamp: '2026-11-03T04:09:33.877Z' });
  assert.equal(receipt.status, 'simulated-departure');
  assert.equal(receipt.engineIgnition, false);
  assert.throws(() => departureReceipt(result, { mode: 'live', timestamp: '2026-11-03T04:09:33.877Z' }));
  assert.throws(() => departureReceipt(preflight({ ...valid, featherStop: true }), { timestamp: '2026-11-03T04:09:33.877Z' }));
});
