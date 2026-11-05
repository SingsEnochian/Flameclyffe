import {
  validatePremaqPacket,
  premaqToTemporalState,
  evolveTemporalState,
} from '../../starwell/src/arcsweep-temporal-quantum/engine.js';
import { compressRelease } from '../../starwell/src/arcsweep-temporal-quantum/compression-release.js';

// A typed, opt-in bridge to the actual Bifröst mathematical engine.
// No PREMAQ values are inferred from prose. A measured/approved packet is required.
export async function runWayglassBifrost({ premaqPacket, evolution = {}, compression = {} } = {}) {
  if (premaqPacket == null) return {
    status: 'not-executed',
    reason: 'No PREMAQ v2 packet supplied; prose is not a measured quantum state.'
  };
  validatePremaqPacket(premaqPacket);
  const initial = premaqToTemporalState(premaqPacket);
  const evolved = evolveTemporalState(initial, evolution);
  const result = compressRelease(evolved, compression);
  return {
    status: 'executed',
    formalism: 'bifrost-temporal-compression-release',
    backend: 'arcsweep-temporal-quantum',
    source_receipt_id: premaqPacket.receipt_id,
    initial_state_id: initial.state_id,
    evolved_state_id: evolved.state_id,
    output: result,
  };
}
