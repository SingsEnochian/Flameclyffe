import { createWayglassOrgan } from './organ-registry.js';
import { createWayglassObservation } from './living-observer-model.js';
import { createWayglassVoiceBoundary, WAYGLASS_VOICE_BOUNDARY_SCHEMA } from './voice-boundary.js';
import {
  createPresence,
  rebindPresenceProvider,
  createPresenceLineageReceipt,
  PRESENCE_SCHEMA,
  PRESENCE_LINEAGE_RECEIPT_SCHEMA,
} from '../../arcsweep/src/presence-fabric.js';
import {
  worldseedBraidSnapshot,
  WORLDSEED_BRAID_SCHEMA,
  CANON_CARRY_RECEIPT_SCHEMA,
  CANON_SEED_RECEIPT_SCHEMA,
} from '../../arcsweep/src/worldseed-braid.js';
import {
  listSomaticCues,
  getSomaticCue,
  emitSomaticCue,
  stopSomaticCue,
  SOMATIC_CUE_SCHEMA,
  SOMATIC_RECEIPT_SCHEMA,
} from '../../arcsweep/src/somatic-runtime.js';

export const presenceOrgan = createWayglassOrgan({
  organ_id: 'wayglass.organ.presence-nervous-system',
  lineage: ['arcsweep:presence-fabric', 'arcsweep:cognitive-provider'],
  maturity: 'FUNCTIONAL',
  capabilities: ['presence.create', 'presence.provider-rebind', 'presence.lineage-receipt'],
  authority_ceiling: ['observe', 'bind-provider-substrate'],
  receipt_schemas: [PRESENCE_SCHEMA, PRESENCE_LINEAGE_RECEIPT_SCHEMA],
  continuity_hooks: ['presence-lineage-reference'],
  evidence: ['apps/arcsweep/test/astra-vertical-slice.test.js'],
  adapter: { createPresence, rebindPresenceProvider, createPresenceLineageReceipt },
});

export const memoryOrgan = createWayglassOrgan({
  organ_id: 'wayglass.organ.memory-flight-recorder',
  lineage: ['arcsweep:records-room', 'arcsweep:replay-continuity-recall', 'arcsweep:worldseed-braid'],
  maturity: 'FUNCTIONAL',
  capabilities: ['worldseed.snapshot', 'record.replay-reference', 'canon-carry.inspect'],
  authority_ceiling: ['observe', 'retrieve', 'replay', 'propose-canon-carry'],
  receipt_schemas: [WORLDSEED_BRAID_SCHEMA, CANON_CARRY_RECEIPT_SCHEMA, CANON_SEED_RECEIPT_SCHEMA, 'arcsweep.worldseed-braid-replay-receipt/v1'],
  continuity_hooks: ['record-reference', 'replay-receipt-reference', 'worldseed-fingerprint-reference'],
  evidence: ['04_FEATURE_VERIFICATION_MATRIX.md', 'apps/arcsweep/test/rooms.test.js'],
  adapter: { worldseedBraidSnapshot },
});

export const sensoriumOrgan = createWayglassOrgan({
  organ_id: 'wayglass.organ.sensorium',
  lineage: ['arcsweep:somatic-runtime'],
  maturity: 'FUNCTIONAL',
  capabilities: ['somatic.cue.list', 'somatic.cue.inspect', 'somatic.cue.emit', 'somatic.cue.stop'],
  authority_ceiling: ['render-local-feedback', 'stop-active-feedback'],
  receipt_schemas: [SOMATIC_CUE_SCHEMA, SOMATIC_RECEIPT_SCHEMA],
  embodiment_hooks: ['redetect-output-capabilities-on-return'],
  evidence: ['apps/arcsweep/src/somatic-runtime.js'],
  adapter: { listSomaticCues, getSomaticCue, emitSomaticCue, stopSomaticCue },
});

export const livingObserverOrgan = createWayglassOrgan({
  organ_id: 'wayglass.organ.living-observer',
  lineage: ['starwell:deep-observer', 'wayglass:material-field'],
  maturity: 'PARTIAL',
  capabilities: ['observation.sample', 'observation.visualise', 'observation.export', 'observation.prepare-llm-context', 'interior.persist', 'interior.reflect', 'interior.dream', 'interior.complex-phase', 'wonder.complexify', 'self-development.propose'],
  authority_ceiling: ['observe-local-ui', 'render-local-feedback', 'propose-user-reviewed-model-input', 'propose-self-development'],
  receipt_schemas: ['wayglass.observer-reading/v1','wayglass.observer-projection/v1','wayglass.observer-interior/v0.2','wayglass.observer-self-development/v0.1'],
  embodiment_hooks: ['local-motion-preference','explicit-local-audio'],
  evidence: ['apps/wayglass/test/wayglass-living-observer.test.js'],
  adapter: { createWayglassObservation },
});

// A real consent/halt controller with a mockable transport seam, NOT a live
// StepAudio session, microphone binding, or verified external connection.
export const voiceConsentOrgan = createWayglassOrgan({
  organ_id: 'wayglass.organ.voice-consent-gate',
  lineage: ['wayglass:voice-boundary', 'stepfun:stepaudio-3-realtime-research'],
  maturity: 'PARTIAL',
  capabilities: ['voice.consent.scope', 'voice.feather.halt', 'voice.disconnect', 'voice.transcript.observe-unreviewed'],
  authority_ceiling: ['gate-local-audio-transfer', 'halt-local-capture', 'observe-transcript-proposals'],
  receipt_schemas: [WAYGLASS_VOICE_BOUNDARY_SCHEMA, 'wayglass.voice-transcript-observation/v0.1'],
  embodiment_hooks: ['reconfirm-microphone-consent-on-return', 'fall-back-to-text-if-voice-unavailable'],
  evidence: ['apps/wayglass/test/wayglass-voice-boundary.test.js', 'docs/wayglass/STEPFUN_PROVIDER_AND_AUDIO_2026-10-08.md'],
  adapter: { createWayglassVoiceBoundary },
});

export const FIRST_WAYGLASS_ORGANS = Object.freeze([presenceOrgan, memoryOrgan, sensoriumOrgan, livingObserverOrgan, voiceConsentOrgan]);
