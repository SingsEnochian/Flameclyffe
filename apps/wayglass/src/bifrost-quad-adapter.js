import {
  PREMAQC_AXES,
  PREMAQC_AUTHORITY,
  PREMAQC_DYNAMIC_AXES,
  PREMAQC_NAMING_LAW,
} from '../../starwell/src/premaqc-contract.js';
import {
  createMathSpinePacket,
  replayMathSpinePacket,
  MATH_SPINE_VERSION,
} from '../../starwell/src/math-spine/math-spine-packet.js';

// PREMAQC observation is the only mathematical input. The old temporal engine
// remains an implementation detail inside the governing Hearthgate v1.8 Math Spine.
// Q is a report-presence bit, not an evolved amplitude or an inferred experience.
export function validateQuadPremaqc(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new TypeError('Accepted PREMAQC observation packet is required.');
  }
  if (PREMAQC_NAMING_LAW.canonical !== 'PREMAQC'
    || PREMAQC_AXES.join(',') !== 'P,C,R,E,M,A,Q'
    || PREMAQC_DYNAMIC_AXES.join(',') !== 'P,C,R,E,M,A'
    || PREMAQC_AUTHORITY.qualia_is_firsthand_only !== true) {
    throw new Error('Hearthgate PREMAQC authority contract mismatch.');
  }
  if (packet.schema_version !== '2.0.0') throw new TypeError('PREMAQC v2 schema_version required.');
  for (const axis of PREMAQC_DYNAMIC_AXES) {
    const component = packet.state?.[axis];
    if (!Number.isFinite(component?.value) || !Number.isFinite(component?.derivative)) {
      throw new TypeError('PREMAQC dynamic axis ' + axis + ' requires finite values.');
    }
  }
  const q = packet.state?.Q;
  const report = packet.qualia;
  if (!q || ![0, 1].includes(q.value) || q.derivative !== 0
    || report?.schema !== 'premaqc.qualia-report/v1'
    || report?.authority !== 'firsthand-only' || report?.inferred !== false
    || typeof report?.present !== 'boolean' || Number(report.present) !== q.value
    || (report.present && (!report.report || typeof report.report !== 'object'))) {
    throw new TypeError('PREMAQC Q must match a firsthand-only Qualia report presence bit.');
  }
  return structuredClone(packet);
}

export async function runWayglassBifrost({
  premaqcPacket = null, premaqPacket = null, jacobian = null, worldProfile = null,
  worldId = null, revokedRefs = [], foldWasActive = false, evolution = {},
} = {}) {
  if (premaqcPacket && premaqPacket && premaqcPacket !== premaqPacket) {
    throw new TypeError('Supply one PREMAQC observation packet, not conflicting aliases.');
  }
  const packet = premaqcPacket || premaqPacket;
  if (!packet) return {
    status: 'not-executed',
    vocabulary: 'PREMAQC',
    reason: 'No accepted PREMAQC observation; text is not measured state.',
  };
  const accepted = validateQuadPremaqc(packet);
  if (accepted.provenance_refs?.some(ref => revokedRefs.includes(ref))) {
    return { status: 'blocked', vocabulary: 'PREMAQC',
      reason: 'PREMAQC observation contains revoked provenance.' };
  }
  if (!jacobian || !worldProfile) return {
    status: 'not-executed',
    vocabulary: 'PREMAQC',
    reason: 'A measured Jacobian and an approved world mathematics profile are required.',
  };
  if (worldId && worldProfile.worldId !== worldId) {
    throw new TypeError('PREMAQC Math Spine world profile does not match the crossing world.');
  }
  const mathPacket = await createMathSpinePacket({
    premaq: accepted, jacobian, worldProfile, foldWasActive, evolution,
  });
  const replay = await replayMathSpinePacket(mathPacket);
  if (!replay.matched) throw new Error('Math Spine deterministic replay failed.');
  return {
    status: 'executed',
    vocabulary: PREMAQC_NAMING_LAW.canonical,
    spine_version: MATH_SPINE_VERSION,
    backend: 'hearthgate.math-spine-packet/v1',
    packet_id: mathPacket.packet_id,
    source_receipt_id: accepted.receipt_id,
    packet_fingerprint: mathPacket.packet_fingerprint,
    source_fingerprint: mathPacket.source_fingerprint,
    replay_verified: true,
    qualia_evolved: false,
    output: mathPacket.projection,
    persistence: 'not-persisted',
  };
}
