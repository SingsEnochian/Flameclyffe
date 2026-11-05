import {
  validatePremaqPacket,
  premaqToTemporalState,
  evolveTemporalState,
} from '../../starwell/src/arcsweep-temporal-quantum/engine.js';
import { PREMAQC_NAMING_LAW, PREMAQC_AXES } from '../../starwell/src/premaqc-contract.js';
import { compressRelease } from '../../starwell/src/arcsweep-temporal-quantum/compression-release.js';

// A typed, opt-in bridge to the actual Bifröst mathematical engine.
// PREMAQC is canonical. The legacy temporal engine consumes a compatible v2 packet.
// Q remains context-only and is never inferred from prose.
export async function runWayglassBifrost({ premaqPacket, evolution = {}, compression = {} } = {}) {
  if (premaqPacket == null) return {
    status: 'not-executed',
    reason: 'No PREMAQC observation packet supplied; prose is not a measured quantum state.'
  };
  if (PREMAQC_NAMING_LAW.canonical !== 'PREMAQC' || PREMAQC_AXES.join(',') !== 'P,C,R,E,M,A,Q') {
    throw new Error('Canonical PREMAQC contract mismatch; refusing legacy-only execution.');
  }
  // Explicit compatibility boundary: this engine still validates legacy schema_version 2.0.0.
  validatePremaqPacket(premaqPacket);
  const initial = premaqToTemporalState(premaqPacket);
  const evolved = evolveTemporalState(initial, evolution);
  const result = compressRelease(evolved, compression);
  return {
    status: 'executed',
    vocabulary: PREMAQC_NAMING_LAW.canonical,
    compatibility_backend: 'legacy-premaq-v2-temporal-engine',
    formalism: 'bifrost-temporal-compression-release',
    backend: 'arcsweep-temporal-quantum',
    source_receipt_id: premaqPacket.receipt_id,
    initial_state_id: initial.state_id,
    evolved_state_id: evolved.state_id,
    output: result,
  };
}
