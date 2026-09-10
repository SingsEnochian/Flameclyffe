export const ARCSWEEP_OS_VERSION = '0.1.0-alpha.6';
export const ARCSWEEP_OS_SCHEMA = 'arcsweep.os-manifest/v1';

export const ARCSWEEP_OS_MANIFEST = Object.freeze({
  schema: ARCSWEEP_OS_SCHEMA,
  version: ARCSWEEP_OS_VERSION,
  stage: 'kernel-capability-context-cyberimmune-foundation',
  authority: Object.freeze({
    modelRuntime: 'house-runtime',
    browserState: 'hearthfire',
    orchestration: 'arcsweep-os-kernel',
    stewardship: 'human-steward',
  }),
  repair: Object.freeze({
    maximumAutomaticAttemptsPerFault: 1,
    maximumAutomaticRepairsPerService: 3,
    sourceCodeMutation: 'pr-mediated',
    rollbackRequired: true,
  }),
  governance: Object.freeze({
    weightedAdvisoryInput: true,
    dissentPreserved: true,
    weightedSignalGrantsAuthority: false,
    securityEvidenceGrantsAuthority: false,
    stewardReviewForGovernanceChange: true,
  }),
  security: Object.freeze({
    capabilityFirewall: true,
    failClosedPolicyEvaluation: true,
    featherBlocksNonReadCapabilities: true,
    criticalRiskMutationPolicy: 'deny-until-steward-review',
    privilegedAuthority: 'scoped-short-lived-steward-lease',
    authorityLeaseTokensExposedInDiagnostics: false,
    autonomousOffensiveAction: false,
  }),
  contracts: Object.freeze({
    contextCapsule: 'arcsweep.context-capsule/v1',
    contextState: 'arcsweep.os-context-state/v1',
    eventReceipt: 'arcsweep.os-event-receipt/v1',
    health: 'arcsweep.service-health/v1',
    repairReceipt: 'arcsweep.repair-receipt/v1',
    checkpoint: 'arcsweep.checkpoint/v1',
    diagnostics: 'arcsweep.os-diagnostics/v1',
    service: 'arcsweep.os-service/v1',
    capability: 'arcsweep.os-capability/v1',
    capabilityReceipt: 'arcsweep.os-capability-receipt/v1',
    authorityLease: 'arcsweep.authority-lease/v1',
    securityTripwire: 'arcsweep.security-tripwire/v1',
    stewardDeliberation: 'arcsweep.steward-deliberation/v1',
    cybersecurityIntelligence: 'arcsweep.cybersecurity-intelligence/v1',
    cybersecuritySeed: 'arcsweep.cybersecurity-seed/v1',
  }),
});
