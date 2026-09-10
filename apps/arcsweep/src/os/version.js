export const ARCSWEEP_OS_VERSION = '0.1.0-alpha.1';
export const ARCSWEEP_OS_SCHEMA = 'arcsweep.os-manifest/v1';

export const ARCSWEEP_OS_MANIFEST = Object.freeze({
  schema: ARCSWEEP_OS_SCHEMA,
  version: ARCSWEEP_OS_VERSION,
  stage: 'kernel-foundation',
  authority: Object.freeze({
    modelRuntime: 'house-runtime',
    browserState: 'hearthfire',
    orchestration: 'arcsweep-os-kernel',
  }),
  repair: Object.freeze({
    maximumAutomaticAttemptsPerFault: 1,
    maximumAutomaticRepairsPerService: 3,
    sourceCodeMutation: 'pr-mediated',
    rollbackRequired: true,
  }),
  contracts: Object.freeze({
    contextCapsule: 'arcsweep.context-capsule/v1',
    eventReceipt: 'arcsweep.os-event-receipt/v1',
    health: 'arcsweep.service-health/v1',
    repairReceipt: 'arcsweep.repair-receipt/v1',
    checkpoint: 'arcsweep.checkpoint/v1',
    diagnostics: 'arcsweep.os-diagnostics/v1',
  }),
});
