/**
 * Nikola station / single-tool witness.
 * Thin, user-invoked adapter around the EXISTING Math Spine instrument.
 * This is a synthetic computational experiment, not a sensor reading,
 * live provider/model response, identity claim, or permanent receipt store.
 */
import {
  createNikolaSpiral,
  advanceNikolaSpiral,
  replayNikolaSpiral,
  NIKOLA_SPIRAL_RECEIPT_SCHEMA,
} from '../../starwell/src/math-spine/nikola-upward-spiral.js';

export const NIKOLA_STATION_WITNESS_SCHEMA = 'wayglass.nikola-station-tool-witness/v1';

export async function runNikolaStationWitness() {
  const initial = await createNikolaSpiral({
    baseline: { stiffness: 12, stiffness_unit: 'N/m', mass: 3, mass_unit: 'kg' },
    frequencyRatio: 1.5,
    source: { id: 'synthetic-frequency', family: 'synthetic-frequency-family', kind: 'synthetic' },
  });
  const packet = await advanceNikolaSpiral(initial, {
    measurement: { kind: 'stiffness', value: 24, unit: 'N/m' },
    source: { id: 'synthetic-k-independent-0', family: 'synthetic-measurement-family-0', kind: 'synthetic' },
  });
  const replay = await replayNikolaSpiral(packet);
  const receipt = packet.rounds.at(-1);
  if (replay.matched !== true || replay.rounds !== 1 ||
      replay.origin_fingerprint !== initial.origin_fingerprint ||
      replay.head_fingerprint !== packet.head_fingerprint ||
      receipt?.schema !== NIKOLA_SPIRAL_RECEIPT_SCHEMA ||
      receipt.status !== 'admitted' ||
      receipt.from_fingerprint !== initial.origin_fingerprint ||
      receipt.fingerprint !== packet.head_fingerprint) {
    throw new Error('Nikola station: canonical Math Spine receipt failed deterministic replay');
  }
  return Object.freeze({
    schema: NIKOLA_STATION_WITNESS_SCHEMA,
    tool_id: 'nikola-upward-spiral',
    execution: 'browser-local-canonical-math-spine',
    source_class: 'synthetic',
    authority: 'explicit-owner-click-local-computation-only',
    receipt,
    replay,
    projection: packet.projection,
    physical_observation_verified: false,
    provider_invoked: false,
    persistently_committed: false,
  });
}
