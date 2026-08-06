import {
  CLAIM_STATES,
  assembleDualAspectPacket,
  deepSnapshotToPremaqV2,
  fingerprint,
  validateDeepSnapshot,
} from './dual-aspect.js';
import {
  premaqToTemporalState,
  validatePremaqPacket,
} from '../arcsweep-temporal-quantum/engine.js';
import { advanceWorldCompressionRelease } from '../arcsweep-temporal-quantum/compression-release.js';
import { computeSpiralState } from '../harmonic-spiral/spiral-engine.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireCompressionProfile(house) {
  const temporal = house?.temporalProfile?.compressionRelease;
  const tone = house?.harmonicIdentity?.compressionReleaseTone;
  const jacobian = house?.transferFunctions?.jacobian;
  if (!temporal || !tone || !jacobian) {
    throw new Error(`House ${house?.id ?? 'unknown'} lacks its compression-release mathematics profile`);
  }
  return {
    worldId: house.id,
    focusAxis: temporal.focusAxis,
    enterThreshold: temporal.enterThreshold,
    releaseThreshold: temporal.releaseThreshold,
    compressionGain: temporal.compressionGain,
    releaseFraction: temporal.releaseFraction,
    derivativeRelease: temporal.derivativeRelease,
    memoryRelease: temporal.memoryRelease,
    phaseReleaseGain: temporal.phaseReleaseGain,
    radialGain: temporal.radialGain,
    entropyGain: temporal.entropyGain,
    angularGain: temporal.angularGain,
    temporalWeights: temporal.temporalWeights,
    tone: {
      worldId: house.id,
      toneLayerId: tone.toneLayerId,
      rootHz: tone.rootHz,
      excursion: tone.excursion,
      approvalState: tone.approvalState,
      approvalReceiptId: tone.approvalReceiptId,
    },
  };
}

export function assembleCompressionReleaseDualAspectPacket({
  context,
  deepSnapshot: snapshotInput,
  premaq: premaqInput = null,
  house,
  foldWasActive = false,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const snapshot = validateDeepSnapshot(snapshotInput);
  const premaq = premaqInput
    ? validatePremaqPacket(premaqInput)
    : deepSnapshotToPremaqV2(snapshot, { context, clock, idFactory });
  const hearthside = premaqToTemporalState(premaq, { clock, idFactory });
  const profile = requireCompressionProfile(house);
  const transition = advanceWorldCompressionRelease({
    state: hearthside,
    jacobian: house.transferFunctions.jacobian,
    worldProfile: profile,
    foldWasActive,
    evolution: {
      delta: house.temporalProfile?.initialDelta ?? 1,
      bridgeCoupling: house.temporalProfile?.bridgeCoupling ?? 0.08,
    },
    clock,
    idFactory,
  });

  const packet = assembleDualAspectPacket({
    context,
    deepSnapshot: snapshot,
    premaq,
    house,
    temporal: {
      hearthside,
      targetside: transition.state,
    },
    clock,
    idFactory,
  });

  const { packet_fingerprint: ignored, ...base } = structuredClone(packet);
  base.temporal.compression_release = {
    law: 'compression-release-compression-of-release-infinite-recursion',
    cycle: transition.state.spiral.cycle,
    next_operation: 'compression-of-release',
    fold: transition.fold,
    jacobian: transition.jacobian,
    temporal_driver: transition.temporal_driver,
  };
  base.observable.compression_release = {
    authority: 'derived-from-shared-state',
    receipt: transition.receipt,
    jacobian: transition.jacobian,
    fold: transition.fold,
  };
  base.experiential.tone.compression_release_sequence = transition.tone_sequence;
  base.provenance.compression_release_receipt_id = transition.receipt.receipt_id;
  base.provenance.world_tone_approval_receipt_id = transition.tone_sequence.approval_receipt_id;
  base.claims.compression_release = CLAIM_STATES.VERIFIED;
  base.laws = [
    ...base.laws,
    'There is no collapse.',
    'Compression preserves state support and provenance.',
    'Release becomes the source of the next compression.',
    'The compression-release recursion has no terminal cycle.',
    'A world tone enters production only through Rowan approval.',
  ];
  base.harmonic_state = computeSpiralState({
    premaq,
    deepRefs: {
      story: [snapshot.snapshot_id],
      time: [transition.receipt.receipt_id],
      theory: [],
    },
  });
  return deepFreeze({ ...base, packet_fingerprint: fingerprint(base) });
}
