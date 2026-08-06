import { SpiralEngineError, computeSpiralState, installSpiralState } from './spiral-engine.js';
import { adaptAll } from './spiral-adapters.js';

export const WIRE_VERSION = '0.1.0';
export const SPIRAL_STATE_SCHEMA = 'hearthgate/spiral-state/v1';

export class SpiralWireError extends Error {
  constructor(message, code = 'spiral-wire-error') {
    super(message);
    this.name = 'SpiralWireError';
    this.code = code;
  }
}

function requirePacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new SpiralWireError('DualAspectPacket must be a non-null object.', 'MISSING_PACKET');
  }
}

function requireHarmonicState(packet) {
  requirePacket(packet);
  if (!packet.harmonic_state || packet.harmonic_state.schema !== SPIRAL_STATE_SCHEMA) {
    throw new SpiralWireError(
      'Packet does not carry a valid harmonic_state. Call enrichPacketWithSpiralState first.',
      'MISSING_HARMONIC_STATE',
    );
  }
}

// Extract the PREMAQ packet from wherever it lives in a DualAspectPacket.
function extractPremaq(packet) {
  const premaq = packet.observable?.premaq;
  if (!premaq?.state) {
    throw new SpiralWireError(
      'DualAspectPacket.observable.premaq.state is required to compute a Spiral State.',
      'MISSING_PREMAQ',
    );
  }
  return premaq;
}

// Build receipt-ID-only deep refs from the packet. Sources never enter the engine as records.
function extractDeepRefs(packet) {
  const story = [];
  const time = [];
  const theory = [];

  const snapshotId = packet.observable?.deep_snapshot?.snapshot_id;
  if (typeof snapshotId === 'string' && snapshotId.length > 0) story.push(snapshotId);

  const crReceiptId = packet.provenance?.compression_release_receipt_id;
  if (typeof crReceiptId === 'string' && crReceiptId.length > 0) time.push(crReceiptId);

  // Carry any pre-declared theory receipt IDs (e.g. from a DEEPTheory binding added by the caller).
  const theoryIds = packet.provenance?.theory_receipt_ids;
  if (Array.isArray(theoryIds)) {
    for (const id of theoryIds) {
      if (typeof id === 'string' && id.length > 0) theory.push(id);
    }
  }

  return { story, time, theory };
}

/**
 * enrichPacketWithSpiralState
 *
 * Takes a sealed DualAspectPacket, computes a Spiral State from its PREMAQ and
 * receipt IDs, and returns a new packet with harmonic_state installed.
 *
 * The original packet is not mutated.
 *
 * Options:
 *   desiredState  — optional 7-axis target map for direction derivation
 *   worldProfile  — forwarded to computeSpiralState (reserved for future use)
 *   sharedState   — forwarded to computeSpiralState (reserved for future use)
 */
export function enrichPacketWithSpiralState(packet, {
  desiredState = null,
  worldProfile = null,
  sharedState = null,
} = {}) {
  requirePacket(packet);

  const premaq = extractPremaq(packet);
  const deepRefs = extractDeepRefs(packet);

  let spiralState;
  try {
    spiralState = computeSpiralState({ premaq, deepRefs, desiredState, worldProfile, sharedState });
  } catch (err) {
    if (err instanceof SpiralEngineError) {
      throw new SpiralWireError(
        `Spiral Engine failed during packet enrichment: ${err.message}`,
        `ENGINE_${err.code.toUpperCase().replace(/-/g, '_')}`,
      );
    }
    throw err;
  }

  return installSpiralState(packet, spiralState);
}

/**
 * readSubsystemBriefs
 *
 * Takes an enriched packet (must carry harmonic_state) and returns all six
 * subsystem-specific payloads via adaptAll.
 *
 * No subsystem reads DEEP directly. All subsystems read the same Spiral State.
 */
export function readSubsystemBriefs(packet) {
  requireHarmonicState(packet);
  return adaptAll(packet.harmonic_state);
}

/**
 * enrichAndBrief
 *
 * Convenience: enrich the packet with a Spiral State and return both the
 * enriched packet and all subsystem briefs in one call.
 */
export function enrichAndBrief(packet, options = {}) {
  const enriched = enrichPacketWithSpiralState(packet, options);
  const briefs = readSubsystemBriefs(enriched);
  return Object.freeze({ packet: enriched, briefs });
}
