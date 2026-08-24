import './premaq-shokz-feather-stop-bridge.js';
import { PREMAQC_NAMING_LAW } from './premaqc-contract.js';

export const PREMAQC_FEATHER_STOP_BRIDGE_SCHEMA = 'hearthgate.premaqc-shokz-feather-stop-bridge/v1';
export const PREMAQC_FEATHER_STOP_BRIDGE = Object.freeze({
  schema: PREMAQC_FEATHER_STOP_BRIDGE_SCHEMA,
  vocabulary: PREMAQC_NAMING_LAW.canonical,
  legacy_bridge_path: 'src/premaq-shokz-feather-stop-bridge.js',
  legacy_status: PREMAQC_NAMING_LAW.legacy_status,
  authority: Object.freeze({
    global_stop: true,
    qualia_sonified: false,
    physical_claim: false,
  }),
});
