import {
  inspectLanternbridgeRecord,
  USAGE_ACTIONS,
} from './lanternbridge-receiver.js';

export const LANTERNBRIDGE_INTEROP_RECEIPT_SCHEMA = 'arcsweep.lanternbridge-interoperability-receipt/v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

function normaliseAuthorityMap(authority) {
  const result = {};
  for (const action of USAGE_ACTIONS) {
    const value = authority?.[action];
    result[action] = typeof value === 'string'
      ? value
      : value?.authority ?? null;
  }
  return result;
}

export function normaliseArcSweepLanternbridgeInspection(inspection) {
  return freezeDeep({
    implementation: 'arcsweep',
    envelope_state: inspection?.recognition ?? null,
    protocol_identifier: inspection?.protocol ?? null,
    bridge_id: inspection?.bridge_id ?? null,
    type: inspection?.type ?? null,
    origin: inspection?.origin ?? null,
    authors: clone(inspection?.authors ?? null),
    response_signal: inspection?.response_signal ?? null,
    authority: normaliseAuthorityMap(inspection?.authority),
    runtime_capability: 'INSPECT_ONLY',
  });
}

export function normaliseProjectZeroLanternbridgeInspection(inspection) {
  const authorityByAction = {};
  for (const diagnostic of Array.isArray(inspection?.authority) ? inspection.authority : []) {
    if (!diagnostic || !USAGE_ACTIONS.includes(diagnostic.action)) continue;
    authorityByAction[diagnostic.action] = diagnostic.resolved ?? null;
  }

  const runtimeCapabilities = new Set(
    (Array.isArray(inspection?.authority) ? inspection.authority : [])
      .map((diagnostic) => diagnostic?.runtimeCapability)
      .filter(Boolean),
  );

  return freezeDeep({
    implementation: 'project-zero',
    envelope_state: inspection?.envelopeState ?? null,
    protocol_identifier: inspection?.protocolIdentifier ?? null,
    bridge_id: inspection?.metadata?.bridge_id ?? null,
    type: inspection?.metadata?.type ?? null,
    origin: inspection?.metadata?.origin ?? null,
    authors: clone(inspection?.metadata?.authors ?? null),
    response_signal: inspection?.metadata?.response_signal ?? null,
    authority: normaliseAuthorityMap(authorityByAction),
    runtime_capability: runtimeCapabilities.size === 1
      ? [...runtimeCapabilities][0]
      : runtimeCapabilities.size === 0
        ? null
        : 'MIXED',
  });
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function compareLanternbridgeDiagnostics(arcSweepDiagnostic, projectZeroDiagnostic) {
  const mismatches = [];
  const scalarFields = [
    'envelope_state',
    'protocol_identifier',
    'bridge_id',
    'type',
    'origin',
    'response_signal',
    'runtime_capability',
  ];

  for (const field of scalarFields) {
    if (arcSweepDiagnostic?.[field] !== projectZeroDiagnostic?.[field]) {
      mismatches.push({
        field,
        arcsweep: arcSweepDiagnostic?.[field] ?? null,
        project_zero: projectZeroDiagnostic?.[field] ?? null,
      });
    }
  }

  if (!sameJson(arcSweepDiagnostic?.authors ?? null, projectZeroDiagnostic?.authors ?? null)) {
    mismatches.push({
      field: 'authors',
      arcsweep: clone(arcSweepDiagnostic?.authors ?? null),
      project_zero: clone(projectZeroDiagnostic?.authors ?? null),
    });
  }

  for (const action of USAGE_ACTIONS) {
    const arcSweepAuthority = arcSweepDiagnostic?.authority?.[action] ?? null;
    const projectZeroAuthority = projectZeroDiagnostic?.authority?.[action] ?? null;
    if (arcSweepAuthority !== projectZeroAuthority) {
      mismatches.push({
        field: `authority.${action}`,
        arcsweep: arcSweepAuthority,
        project_zero: projectZeroAuthority,
      });
    }
  }

  return freezeDeep({
    matched: mismatches.length === 0,
    mismatches,
  });
}

export function buildLanternbridgeInteroperabilityReceipt({
  source,
  sourceRef = null,
  sourceSha256 = null,
  projectZeroInspection = null,
  observedAt = new Date().toISOString(),
} = {}) {
  if (typeof source !== 'string') {
    throw new TypeError('LANTERNBRIDGE_INTEROP: source must be a UTF-8 string');
  }

  const arcSweepInspection = inspectLanternbridgeRecord(source);
  const arcsweep = normaliseArcSweepLanternbridgeInspection(arcSweepInspection);
  const projectZero = projectZeroInspection
    ? normaliseProjectZeroLanternbridgeInspection(projectZeroInspection)
    : null;
  const comparison = projectZero
    ? compareLanternbridgeDiagnostics(arcsweep, projectZero)
    : freezeDeep({ matched: null, mismatches: [], status: 'AWAITING_PROJECT_ZERO_DIAGNOSTIC' });

  return freezeDeep({
    schema: LANTERNBRIDGE_INTEROP_RECEIPT_SCHEMA,
    observed_at: observedAt,
    source_declaration: {
      ref: sourceRef,
      sha256: sourceSha256,
      source_embedded: false,
    },
    arcsweep,
    project_zero: projectZero,
    comparison,
    downstream_actions_performed: [],
  });
}
