import * as legacy from './two-shore-premaq-gate.js';
import {
  PREMAQC_CONTEXT_ONLY_AXES,
  PREMAQC_DYNAMIC_AXES,
  TWO_SHORE_PREMAQC_GATE_SCHEMA,
  TWO_SHORE_PREMAQC_ORIGIN_SCHEMA,
  canonicalisePremaqcEnvelope,
} from './premaqc-contract.js';

export * from './two-shore-premaq-gate.js';

export { TWO_SHORE_PREMAQC_GATE_SCHEMA };
export const TWO_SHORE_PREMAQC_GATE_PLAN_KEY = 'hearthgate:two-shore-premaqc-gate-plan:v1';
export const TWO_SHORE_PREMAQC_GATE_LIVE_KEY = 'hearthgate:two-shore-premaqc-live-calibration:v1';
export const PREMAQC_GATE_DYNAMIC_AXES = PREMAQC_DYNAMIC_AXES;
export const PREMAQC_GATE_CONTEXT_ONLY_AXES = PREMAQC_CONTEXT_ONLY_AXES;

export function calibrateEarthPrimePremaqc(options = {}) {
  const calibration = legacy.calibrateEarthPrimePremaq(options);
  return canonicalisePremaqcEnvelope({
    ...calibration,
    schema: TWO_SHORE_PREMAQC_ORIGIN_SCHEMA,
    vocabulary: 'PREMAQC',
    dynamic_axes: [...PREMAQC_DYNAMIC_AXES],
    context_only_axes: [...PREMAQC_CONTEXT_ONLY_AXES],
    qualia_sonified: false,
    legacy_schema: calibration.schema,
  }, { schema: TWO_SHORE_PREMAQC_ORIGIN_SCHEMA });
}

export function buildPremaqcShoreState(calibration, options = {}) {
  return legacy.buildShoreState(calibration, options);
}

export const PREMAQC_TWO_SHORE_AUTHORITY = Object.freeze({
  schema: TWO_SHORE_PREMAQC_GATE_SCHEMA,
  vocabulary: 'PREMAQC',
  dynamic_axes: [...PREMAQC_DYNAMIC_AXES],
  context_only_axes: [...PREMAQC_CONTEXT_ONLY_AXES],
  qualia_compression_focus_allowed: false,
  qualia_sonified: false,
  unsupported_or_ungranted_fields_remain_unknown: true,
  external_physical_gate_claimed: false,
});
