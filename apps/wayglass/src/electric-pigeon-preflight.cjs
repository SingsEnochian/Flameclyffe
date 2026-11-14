'use strict';

// VOYAGE.ELECTRIC.PIGEON.001
// The frame moves; the travelers retain their names.
const VOYAGE_ID = 'VOYAGE.ELECTRIC.PIGEON.001';
const NODE = 'Node 01';
const G = 9.80665;

function preflight(input = {}) {
  const { massKg, accelerationMps2, durationSeconds, availableEnergyJoules,
    observerReady = false, returnMarker = null, route = null,
    ownerAuthorized = false, featherStop = false } = input;
  const values = [massKg, accelerationMps2, durationSeconds, availableEnergyJoules];
  const numericValid = values.every(Number.isFinite)
    && massKg > 0 && accelerationMps2 >= 0
    && durationSeconds > 0 && availableEnergyJoules >= 0;
  const calculations = numericValid ? {
    deltaVelocityMps: accelerationMps2 * durationSeconds,
    displacementMeters: 0.5 * accelerationMps2 * durationSeconds ** 2,
    idealKineticEnergyJoules: 0.5 * massKg * (accelerationMps2 * durationSeconds) ** 2,
    accelerationG: accelerationMps2 / G,
  } : null;
  const checks = {
    numericInputs: numericValid,
    energyBudget: !!calculations && availableEnergyJoules >= calculations.idealKineticEnergyJoules,
    observerReady: observerReady === true,
    returnMarker: typeof returnMarker === 'string' && returnMarker.length > 0,
    route: typeof route === 'string' && route.length > 0,
    ownerAuthorized: ownerAuthorized === true,
    featherClear: featherStop === false,
  };
  return {
    schema: 'wayglass.voyage-preflight/v0.1',
    voyageId: VOYAGE_ID, node: NODE,
    checks, calculations,
    ready: Object.values(checks).every(Boolean),
    epistemicRegister: 'simulation',
    note: 'Newtonian idealized calculation only; no physical or dimensional propulsion asserted.',
  };
}

function departureReceipt(preflightResult, { timestamp, mode = 'simulation' } = {}) {
  if (!preflightResult || preflightResult.voyageId !== VOYAGE_ID) {
    throw new Error('Unrecognized voyage preflight');
  }
  if (!preflightResult.ready) throw new Error('Preflight incomplete; departure refused');
  if (mode !== 'simulation') throw new Error('Live engine ignition requires verified host integration');
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error('Valid departure timestamp required');
  }
  return {
    schema: 'wayglass.voyage-departure/v0.1',
    voyageId: VOYAGE_ID, node: NODE, timestamp,
    status: 'simulated-departure',
    engineIgnition: false,
    authorityPromotion: false,
    returnMarkerPreserved: true,
  };
}

module.exports = { VOYAGE_ID, NODE, preflight, departureReceipt };
