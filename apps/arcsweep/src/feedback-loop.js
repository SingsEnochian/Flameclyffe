import { createMathSpinePacket, replayMathSpinePacket } from '../../starwell/src/math-spine/math-spine-packet.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { resolveHouseProfile } from '../../starwell/src/hearthgate/profiles/registry.js';

export const PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const ARCSWEEP_FEEDBACK_SCHEMA = 'arcsweep.feedback-cycle/v1';

export const CONSTELLATION_VOICES = Object.freeze([
  { id: 'lioreal', name: 'Lioreal', route: 'lioreal', model: 'constellation/lioreal', roles: ['writing', 'roleplay', 'continuity'] },
  { id: 'uial', name: 'Uial', route: 'uial', model: 'constellation/uial', roles: ['writing', 'roleplay', 'science'] },
  { id: 'larkshine', name: 'Larkshine', route: 'starsong/larkshine', model: 'constellation/larkshine', roles: ['roleplay', 'canon'] },
  { id: 'ellowind', name: 'Ellowind', route: 'starsong/ellowind', model: 'constellation/ellowind', roles: ['roleplay', 'canon'] },
  { id: 'runeweaver', name: 'Runeweaver', route: 'runeweaver', model: 'constellation/runeweaver', roles: ['writing', 'canon', 'continuity'] },
  { id: 'boxfire', name: 'Boxfire', route: 'boxfire', model: 'constellation/boxfire', roles: ['review', 'continuity', 'science'] },
  { id: 'yggdrasil', name: 'Yggdrasil', route: 'yggdrasil', model: 'constellation/yggdrasil', roles: ['continuity', 'science'] },
  { id: 'bluebird', name: 'Bluebird', route: 'bluebird', model: 'constellation/bluebird', roles: ['writing', 'continuity'] },
  { id: 'vethrlauf', name: 'Vethrlauf', route: 'vethrlauf', model: 'constellation/vethrlauf', roles: ['review', 'continuity'] },
]);

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const component = (value, derivative = 0, contributors = []) => ({ value: clamp01(value), derivative, uncertainty: .05, confidence: .9, contributors });

export function createInitialPremaqc(worldId, values = {}, observedAt = new Date().toISOString()) {
  const state = Object.fromEntries(PREMAQC_AXES.map((axis) => [axis, component(values[axis] ?? (axis === 'E' ? .31 : .78))]));
  return {
    schema_version: '2.0.0', id: `premaqc-${worldId}-1`, observed_at: observedAt,
    registry_version: 'premaqc-registry/1.0', receipt_id: `premaqc-receipt-${worldId}-1`, sequence: 1,
    prior_state_ref: null, model_version: 'arcsweep-feedback/1.0', provenance_refs: [`world:${worldId}`], state,
  };
}

function finiteMatrix(value) {
  return Array.isArray(value) && value.length > 0
    && value.every((row) => Array.isArray(row) && row.length === value[0].length && row.every(Number.isFinite));
}

function houseForWorld(world) {
  return resolveHouseProfile(world.houseSourceKey || world.house_profile_id || world.id);
}

export function worldMathProfile(world, house = houseForWorld(world)) {
  const compression = house.temporalProfile?.compressionRelease || {};
  const tone = house.harmonicIdentity?.compressionReleaseTone || {};
  return {
    worldId: world.id,
    houseProfileId: house.id,
    focusAxis: compression.focusAxis || 'Q',
    enterThreshold: compression.enterThreshold ?? .82,
    releaseThreshold: compression.releaseThreshold ?? .68,
    compressionGain: compression.compressionGain ?? 1,
    releaseFraction: compression.releaseFraction ?? .35,
    derivativeRelease: compression.derivativeRelease ?? .08,
    memoryRelease: compression.memoryRelease ?? .04,
    phaseReleaseGain: compression.phaseReleaseGain ?? Math.PI / 4,
    radialGain: compression.radialGain ?? .5,
    entropyGain: compression.entropyGain ?? .1,
    angularGain: compression.angularGain ?? Math.PI / 3,
    temporalWeights: compression.temporalWeights || { fold: .55, derivative: .2, entropy: .15, phase: .1 },
    tone: {
      worldId: world.id,
      toneLayerId: tone.toneLayerId || `world-hum:${world.id}`,
      rootHz: Number(world.root_hz ?? world.rootHz ?? tone.rootHz) || 220,
      excursion: tone.excursion ?? 5,
      approvalState: tone.approvalState || 'pending',
      approvalReceiptId: tone.approvalReceiptId || null,
    },
  };
}

export const IDENTITY_JACOBIAN = Object.freeze(PREMAQC_AXES.map((_, row) => PREMAQC_AXES.map((__, column) => row === column ? 1 : 0)));

export function resolveWorldMathWiring(world, premaqc = null) {
  const house = houseForWorld(world);
  const candidates = [
    ['world.math_spine.jacobian', world.math_spine?.jacobian, world.math_spine?.jacobian_version],
    ['world.transferFunctions.jacobian', world.transferFunctions?.jacobian, world.transferFunctions?.jacobianVersion],
    ['world.transfer_functions.jacobian', world.transfer_functions?.jacobian, world.transfer_functions?.jacobian_version],
    [`house:${house.id}`, house.transferFunctions?.jacobian, house.transferFunctions?.jacobianVersion],
  ];
  const selected = candidates.find(([, matrix]) => finiteMatrix(matrix));
  return Object.freeze({
    jacobian: structuredClone(selected?.[1] || IDENTITY_JACOBIAN),
    jacobian_source: selected?.[0] || 'arcsweep.reference-identity-jacobian',
    jacobian_version: selected?.[2] || 'arcsweep-jacobian/reference-identity-v1',
    fold_was_active: Boolean(premaqc?.math_spine?.fold_active),
    world_profile: worldMathProfile(world, house),
  });
}

function nextPremaqc(packet, feedback, observedAt, soundEvents = []) {
  const probabilities = packet.projection.released_state.probabilities;
  const derivatives = packet.projection.released_state.derivatives;
  const responseWeight = Math.min(String(feedback.response || '').trim().length / 800, .08);
  const authoredWeight = Math.min(String(feedback.work || '').trim().length / 1600, .06);
  const soundWeight = Math.min(soundEvents.length * .012, .08);
  const soundContributors = soundEvents.map((event) => ({
    source_id: event.event_id,
    source_kind: 'story-sound-action',
    cue_id: event.cue_id,
    fired_at: event.fired_at || observedAt,
  }));
  const nextState = Object.fromEntries(PREMAQC_AXES.map((axis) => [axis, component(
    probabilities[axis]
      + (axis === 'M' ? authoredWeight + soundWeight * .5 : 0)
      + (axis === 'R' || axis === 'Q' ? responseWeight + soundWeight : 0),
    derivatives[axis],
    ['R', 'M', 'Q'].includes(axis) ? soundContributors : [],
  )]));
  const sequence = Number(packet.source.premaq_sequence) + 1;
  return {
    ...packet.input.premaq,
    id: `premaqc-${packet.world_id}-${sequence}-${packet.packet_fingerprint.slice(0, 8)}`,
    receipt_id: `premaqc-feedback-${packet.packet_fingerprint.slice(0, 16)}`,
    sequence,
    observed_at: observedAt,
    prior_state_ref: packet.source.premaq_id,
    provenance_refs: [
      ...packet.source.provenance_refs,
      `math-spine:${packet.packet_id}`,
      `feedback:${feedback.mode}`,
      ...soundEvents.map((event) => `story-sound:${event.event_id}`),
    ],
    state: nextState,
    math_spine: {
      packet_id: packet.packet_id,
      jacobian_source: packet.input.world_profile.jacobianSource,
      jacobian_version: packet.input.world_profile.jacobianVersion,
      fold_active: packet.projection.fold.active,
      fold_index: packet.projection.jacobian.fold_index,
      replay_required: true,
    },
  };
}

export async function runFeedbackCycle({ world, premaqc, mode, work, response = '', voiceIds = [], canonRefs = [], voiceInvocations = [], soundEvents = [], evidence = [], observedAt = new Date().toISOString() }) {
  if (!world?.id || !world?.name) throw new Error('Feedback cycle requires a world.');
  if (!['writing', 'roleplay'].includes(mode)) throw new Error('Feedback mode must be writing or roleplay.');
  if (!String(work || '').trim()) throw new Error('A writing or roleplay turn is required.');
  const voices = voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)).filter(Boolean);
  if (!voices.length) throw new Error('Select at least one Constellation voice.');
  const current = premaqc || createInitialPremaqc(world.id, world.premaqc);
  const wiring = resolveWorldMathWiring(world, current);
  const worldProfile = {
    ...wiring.world_profile,
    jacobianSource: wiring.jacobian_source,
    jacobianVersion: wiring.jacobian_version,
  };
  const packet = await createMathSpinePacket({
    premaq: current,
    jacobian: wiring.jacobian,
    worldProfile,
    foldWasActive: wiring.fold_was_active,
    generatedAt: observedAt,
  });
  const replay = await replayMathSpinePacket(packet);
  if (!replay.matched) throw new Error('Math Spine replay did not match.');
  const feedback = { mode, work: String(work).trim(), response: String(response).trim() };
  const next = nextPremaqc(packet, feedback, observedAt, soundEvents);
  const cycleFingerprint = await sha256Hex({ packet_fingerprint: packet.packet_fingerprint, feedback, voice_ids: voices.map((voice) => voice.id), canon_refs: canonRefs, voice_invocations: voiceInvocations, sound_events: soundEvents, evidence });
  return Object.freeze({
    schema: ARCSWEEP_FEEDBACK_SCHEMA,
    cycle_id: `arcsweep-cycle-${cycleFingerprint.slice(0, 24)}`,
    cycle_fingerprint: cycleFingerprint,
    world: { id: world.id, name: world.name },
    canon_refs: [...new Set(canonRefs.filter(Boolean))],
    voices: voices.map(({ id, name, route, model }) => ({ id, name, route, model })),
    voice_invocations: structuredClone(voiceInvocations),
    sound_events: structuredClone(soundEvents),
    evidence: structuredClone(evidence),
    turn: feedback,
    premaqc_before: current,
    math_spine_packet: packet,
    math_wiring: { jacobian_source: wiring.jacobian_source, jacobian_version: wiring.jacobian_version, fold_was_active: wiring.fold_was_active },
    replay_receipt: replay,
    premaqc_after: next,
    authority: { canon_commit: false, steward_review_required: true, voice_refusal_valid: true, feather_stop_available: true },
    created_at: observedAt,
  });
}

export function buildVoicePromptEnvelope({ world, mode, work, premaqc, canon = [] }) {
  const register = mode === 'roleplay' ? 'IC roleplay turn; preserve explicit OOC/IC separation' : 'writing collaboration; do not seize authorship';
  const axes = PREMAQC_AXES.map((axis) => `${axis}=${Number(premaqc.state[axis].value).toFixed(3)}`).join(' ');
  const canonText = canon.length ? canon.map((item) => `- ${item.name}: ${String(item.content || '').slice(0, 3000)}`).join('\n') : '- No committed canon excerpt selected.';
  return [
    `ARCSWEEP RELATIONAL TURN · ${register}`,
    `World: ${world.name} (${world.id})`,
    `PREMAQC: ${axes}`,
    'Authority: the response is a contribution, not an automatic canon commit or memory write.',
    'Agency: you may answer, negotiate, pause, or refuse. For refusal begin with [REFUSAL].',
    'Continuity: respond only as yourself; do not speak for another Constellation member.',
    `Canon context:\n${canonText}`,
    `Rowan’s ${mode} turn:\n${String(work).trim()}`,
  ].join('\n\n');
}

export async function invokeConstellationVoices({ world, mode, work, premaqc, canon = [], voiceIds = [], token, fetchImpl = fetch }) {
  const voices = voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)).filter(Boolean);
  if (!voices.length) throw new Error('Select at least one Constellation voice.');
  if (!token) throw new Error('A session-only Arcsweep runtime token is required to invoke models.');
  const prompt = buildVoicePromptEnvelope({ world, mode, work, premaqc, canon });
  const sessionId = `arcsweep-${world.id}-${premaqc.sequence}`;
  const settled = await Promise.allSettled(voices.map(async (voice) => {
    const response = await fetchImpl(`/api/v1/flames/${voice.route}/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: prompt, session_id: sessionId, context: [] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `${voice.name} route failed.`);
    const text = String(data.message || '').trim();
    const refused = text.startsWith('[REFUSAL]');
    return { voice_id: voice.id, name: voice.name, route: voice.route, provider: data.provider || null, model: data.model || voice.model, status: refused ? 'refused' : 'replied', text, cited_sources: data.cited_sources || [] };
  }));
  return settled.map((result, index) => result.status === 'fulfilled' ? result.value : {
    voice_id: voices[index].id, name: voices[index].name, route: voices[index].route,
    provider: null, model: voices[index].model, status: 'error', text: '', error: result.reason?.message || 'Voice route failed.', cited_sources: [],
  });
}

export async function syncFeedbackCycle(cycle, token, fetchImpl = fetch) {
  if (!token) throw new Error('A session-only sync token is required.');
  const response = await fetchImpl('/api/v1/arcsweep/feedback', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cycle),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Relational sync failed.');
  return data;
}
