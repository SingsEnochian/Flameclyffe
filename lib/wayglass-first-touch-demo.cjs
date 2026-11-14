'use strict';

// Authorised, bounded, deterministic-input demonstration. Never a claim that
// the FAA, Wayglass sensors, an actual model or a real-world universe was sampled.
const { runIntegratedVoyage } = require('./wayglass-integrated-voyage.cjs');
const MODES = Object.freeze(['repair', 'expand']);
function boundTouch(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError('Touch intensity must be a finite number from zero to one');
  }
  return value;
}
async function runFirstTouch({ principal, mode, touch, now = new Date(),
  feather = () => false } = {}) {
  if (!principal || principal.authorized !== true || principal.id !== 'house:steward')
    throw new Error('House Steward must be authenticated by the host');
  if (!MODES.includes(mode)) throw new TypeError('Choose an explicit Wyrdrune mode');
  const pressure = boundTouch(touch);
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new TypeError('A valid clock is required');
  const source = at => new Date(timestamp + at).toISOString();
  const repaired = mode === 'repair';
  const observation = {
    kind: 'simulation',
    source_ref: 'wayglass:first-touch:synthetic:baseline:' + mode,
    observed_at: source(0),
    network: repaired ? { p95_ms: 800, error_rate: .2 } : { p95_ms: 300, error_rate: .02 },
    intelligence: { success_rate: repaired ? .7 : .85 },
    fallback_independent: true,
  };
  const candidate = {
    kind: 'simulation',
    source_ref: 'wayglass:first-touch:synthetic:trial:' + mode,
    observed_at: source(1000),
    network: repaired ? { p95_ms: 480, error_rate: .05 } : { p95_ms: 250, error_rate: .01 },
    intelligence: { success_rate: repaired ? .85 : .90 },
    fallback_independent: true,
  };
  const configuration = repaired ? {
    infrastructure: { queue_capacity: 20, timeout_ms: 1450 },
    intelligence: { concurrency: 3, context_tokens: 1792 },
  } : {
    infrastructure: { queue_capacity: 28, timeout_ms: 1150 },
    intelligence: { concurrency: 5, context_tokens: 2176 },
  };
  const result = await runIntegratedVoyage({
    principal,
    world_id: 'wayglass:faepunk-first-touch-simulation',
    identity_declarations: [{ participant_id: principal.id,
      declaration: 'Authenticated host principal, participating in a synthetic Wayglass test only' }],
    next_owner: principal.id,
    stop_point: 'First Touch Wyrdrune simulation. Real telemetry, consent and deployment remain separate.',
    recorded_at: source(2000),
    feather,
    coevolution: {
      mode, seeds: {
        infrastructure: { queue_capacity: 24, timeout_ms: 1200 },
        intelligence: { concurrency: 4, context_tokens: 2048 },
      },
      observation, trial: { baseline: observation, candidate, configuration },
    },
    mythience: { request: {
      traveller_id: 'traveller:fictional-first-touch',
      origin_universe: 'universe:verdant-demo',
      destination_universe: 'universe:opal-demo',
      ability: { id: 'ability:responsive-light', origin_universe: 'universe:verdant-demo',
        modality: 'illustrated-simulation' },
      history: [], event_id: 'voyage:first-touch:' + mode,
      field: {
        intention: .72 + .22 * pressure, shifting: .85,
        porosity: .85, resonance: .87, compatibility: .92,
      },
      consent: { traveller: true, origin: true, destination: true },
    } },
  });
  return Object.freeze({
    ...result,
    demonstration: Object.freeze({
      schema: 'wayglass.first-touch-simulation/v0.1',
      source: 'synthetic-fixture',
      real_telemetry: false,
      live_ai_called: false,
      model_weights_modified: false,
      real_crossing: false,
      preview_only: true, mode, touch: pressure,
    }),
  });
}
module.exports = { MODES, runFirstTouch };
