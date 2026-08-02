import './hearthgate-arcsweep.css';

import { installBifrostRuntime } from './arcsweep-temporal-quantum/runtime.js';

export {
  BIFROST_BRIDGE_PACKET_SCHEMA,
  BIFROST_RECEIPT_SCHEMA,
  BIFROST_TEMPORAL_STATE_SCHEMA,
  BifrostTemporalError,
  PREMAQ_AXES,
  collapseRelease,
  createBifrostBridgePacket,
  evolveTemporalState,
  premaqToTemporalState,
  projectWorldState,
  validatePremaqPacket,
  validateTemporalState,
} from './arcsweep-temporal-quantum/engine.js';

export {
  BIFROST_BRIDGE_STORAGE_KEY,
  BIFROST_RUNTIME_VERSION,
  BIFROST_STATE_STORAGE_KEY,
  createArcsweepBifrostRuntime,
  installBifrostRuntime,
} from './arcsweep-temporal-quantum/runtime.js';

if (typeof window !== 'undefined' && !window.ARCSWEEP_BIFROST) {
  installBifrostRuntime(window);
}
