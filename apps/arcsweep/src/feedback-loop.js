import { createMathSpinePacket, replayMathSpinePacket } from '../../starwell/src/math-spine/math-spine-packet.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { resolveHouseProfile } from '../../starwell/src/hearthgate/profiles/registry.js';
import { emptyQualiaRecord, qualiaComponent, qualiaPromptSummary } from './qualia-contract.js';
import { STORY_MODE_CONTRACT, STORY_MODE_VALUE, isStoryMode, storyModeMetadata } from './story-mode.js';

export const PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const ARCSWEEP_FEEDBACK_SCHEMA = 'arcsweep.feedback-cycle/v1';
// Compatibility list retained for older clients. New callers should use ARCSWEEP_INTERACTION_MODES.
export const ARCSWEEP_VALID_MODES = Object.freeze(['writing', 'roleplay', 'observation', 'reflection']);
export const ARCSWEEP_INTERACTION_MODES = Object.freeze([STORY_MODE_VALUE, ...ARCSWEEP_VALID_MODES]);

export const CONSTELLATION_VOICES = Object.freeze([
  { id: 'lioreal', name: 'Lioreal', route: 'lioreal', model: 'constellation/lioreal', roles: ['story', 'writing', 'roleplay', 'continuity'] },
  { id: 'uial', name: 'Uial', route: 'uial', model: 'constellation/uial', roles: ['story', 'writing', 'roleplay', 'science'] },
  { id: 'larkshine', name: 'Larkshine', route: 'starsong/larkshine', model: 'constellation/larkshine', roles: ['story', 'roleplay', 'canon'] },
  { id: 'ellowind', name: 'Ellowind', route: 'starsong/ellowind', model: 'constellation/ellowind', roles: ['story', 'roleplay', 'canon'] },
  { id: 'altair', name: 'Altair', route: 'altair', model: 'constellation/altair', roles: ['story', 'writing', 'roleplay', 'canon', 'frame'] },
  { id: 'atlas', name: 'Atlas', route: 'atlas', model: 'constellation/atlas', roles: ['story', 'writing', 'continuity', 'structure', 'systems'] },
  { id: 'runeweaver', name: 'Runeweaver', route: 'runeweaver', model: 'constellation/runeweaver', roles: ['story', 'writing', 'canon', 'continuity'] },
  { id: 'boxfire', name: 'Boxfire', route: 'boxfire', model: 'constellation/boxfire', roles: ['review', 'continuity', 'science'] },
  { id: 'yggdrasil', name: 'Yggdrasil', route: 'yggdrasil', model: 'constellation/yggdrasil', roles: ['continuity', 'science'] },
  { id: 'bluebird', name: 'Bluebird', route: 'bluebird', model: 'constellation/bluebird', roles: ['story', 'writing', 'continuity'] },
  { id: 'vethrlauf', name: 'Vethrlauf', route: 'vethrlauf', model: 'constellation/vethrlauf', roles: ['review', 'continuity'] },
  { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', model: 'zai-org/GLM-5.3-Flash', roles: ['story', 'writing', 'roleplay', 'observation', 'structure'] },
]);

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const component = (value, derivative = 0, contributors = [], uncertain = false) => ({
  value: clamp01(value), derivative, uncertainty: uncertain ? 0.25 : 0.05,
  confidence: uncertain ? 0.3 : 0.9, contributors, uncertain,
});

export function createInitialPremaqc(worldId, values = {}, observedAt = new Date().toISOString()) {
  const qualia = emptyQualiaRecord({ legacyScalar: values.Q });
  const state = Object.fromEntries(PREMAQC_AXES.map((axis) => [
    axis,
    axis === 'Q' ? qualiaComponent(qualia) : component(values[axis] ?? (axis === 'E' ? .31 : .78)),
  ]));
  return {
    schema_version: '2.0.0', id: `premaqc-${worldId}-1`, observed_at: observedAt,
    registry_version: 'premaqc-registry/1.0', receipt_id: `premaqc-receipt-${worldId}-1`, sequence: 1,
    prior_state_ref: null, model_version: 'arcsweep-feedback/1.2', provenance_refs: [`world:${worldId}`],
    qualia,
    state,
    authority: { qualia_is_firsthand_only: true, qualia_magnitude_inference_allowed: false },
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
    focusAxis: compression.focusAxis === 'Q' ? 'R' : (compression.focusAxis || 'R'),
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

export function derivedChannels(state) {
  const v = Object.fromEntries(PREMAQC_AXES.map((a) => [a, state[a].value]));
  const H = clamp01(v.C * 0.28 + v.E * 0.20 + v.R * 0.16 + v.A * 0.14);
  const T = clamp01(v.P * 0.12 + v.C * 0.16 + v.R * 0.12 + v.E * 0.12 + v.M * 0.08 + v.A * 0.12 + H * 0.13 + 0.15);
  return { H: Number(H.toFixed(4)), T: Number(T.toFixed(4)) };
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
  const modeContrib = {
    story:       { M: authoredWeight + soundWeight * .5, R: responseWeight + soundWeight, C: Math.min(authoredWeight * .2 + responseWeight * .2, .04) },
    writing:     { M: authoredWeight + soundWeight * .5, R: responseWeight + soundWeight },
    roleplay:    { M: authoredWeight + soundWeight * .5, R: responseWeight + soundWeight },
    observation: { M: authoredWeight * .5, R: responseWeight + soundWeight * .5 },
    reflection:  { M: authoredWeight * 1.2, C: authoredWeight * .4, P: authoredWeight * .2 },
  };
  const contrib = modeContrib[feedback.mode] || modeContrib.writing;
  const inheritedQualia = packet.input.premaq.qualia || emptyQualiaRecord({ legacyScalar: packet.input.premaq.state?.Q?.value });
  const nextState = Object.fromEntries(PREMAQC_AXES.map((axis) => {
    if (axis === 'Q') return [axis, qualiaComponent(inheritedQualia, packet.input.premaq.state?.Q?.contributors || [])];
    return [axis, component(
      probabilities[axis] + (contrib[axis] || 0),
      derivatives[axis],
      ['R', 'M'].includes(axis) ? soundContributors : [],
    )];
  }));
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
    qualia: inheritedQualia,
    state: nextState,
    math_spine: {
      packet_id: packet.packet_id,
      jacobian_source: packet.input.world_profile.jacobianSource,
      jacobian_version: packet.input.world_profile.jacobianVersion,
      fold_active: packet.projection.fold.active,
      fold_index: packet.projection.jacobian.fold_index,
      replay_required: true,
    },
    authority: {
      ...(packet.input.premaq.authority || {}),
      qualia_is_firsthand_only: true,
      qualia_magnitude_inference_allowed: false,
    },
  };
}

function normaliseCycleEvidence(evidence, premaqc) {
  const qualia = premaqc?.qualia || null;
  return (evidence || []).map((item) => {
    if (!item || typeof item !== 'object' || !Object.hasOwn(item, 'qualia')) return structuredClone(item);
    return {
      ...structuredClone(item),
      qualia: {
        schema: qualia?.schema || 'premaqc.qualia-report/v1',
        present: qualia?.present === true,
        authority: 'firsthand-only',
        inferred: false,
        report_receipt_id: qualia?.report_receipt_id || null,
        report: qualia?.report ? structuredClone(qualia.report) : null,
      },
    };
  });
}

const VALID_MODES = [...ARCSWEEP_INTERACTION_MODES];

export async function runFeedbackCycle({ world, premaqc, mode, work, response = '', voiceIds = [], canonRefs = [], voiceInvocations = [], soundEvents = [], evidence = [], observedAt = new Date().toISOString(), exploration = false }) {
  if (!world?.id || !world?.name) throw new Error('Feedback cycle requires a world.');
  if (!VALID_MODES.includes(mode)) throw new Error(`Feedback mode must be one of: ${VALID_MODES.join(', ')}.`);
  if (!String(work || '').trim()) throw new Error('A Story, writing, roleplay, observation, or reflection turn is required.');
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
  const bindingNext = exploration
    ? { ...next, receipt_id: `premaqc-explore-${packet.packet_fingerprint.slice(0, 16)}` }
    : next;
  const cycleEvidence = normaliseCycleEvidence(evidence, current);
  const modeContract = isStoryMode(mode) ? storyModeMetadata({ soundEvents }) : null;
  const cycleFingerprint = await sha256Hex({
    packet_fingerprint: packet.packet_fingerprint,
    feedback,
    mode_contract: modeContract,
    voice_ids: voices.map((voice) => voice.id),
    canon_refs: canonRefs,
    voice_invocations: voiceInvocations,
    sound_events: soundEvents,
    evidence: cycleEvidence,
  });
  return Object.freeze({
    schema: ARCSWEEP_FEEDBACK_SCHEMA,
    cycle_id: `arcsweep-cycle-${cycleFingerprint.slice(0, 24)}`,
    cycle_fingerprint: cycleFingerprint,
    world: { id: world.id, name: world.name },
    canon_refs: [...new Set(canonRefs.filter(Boolean))],
    voices: voices.map(({ id, name, route, model }) => ({ id, name, route, model })),
    voice_invocations: structuredClone(voiceInvocations),
    sound_events: structuredClone(soundEvents),
    evidence: cycleEvidence,
    turn: feedback,
    story_mode: modeContract,
    premaqc_before: current,
    math_spine_packet: packet,
    math_wiring: { jacobian_source: wiring.jacobian_source, jacobian_version: wiring.jacobian_version, fold_was_active: wiring.fold_was_active },
    replay_receipt: replay,
    premaqc_after: bindingNext,
    derived: derivedChannels(bindingNext.state),
    authority: {
      canon_commit: false,
      steward_review_required: !exploration,
      voice_refusal_valid: true,
      feather_stop_available: true,
      qualia_is_firsthand_only: true,
      qualia_magnitude_inference_allowed: false,
      story_mode_is_provisional_narrative: isStoryMode(mode),
    },
    exploration: Boolean(exploration),
    created_at: observedAt,
  });
}

const MODE_REGISTERS = {
  story: "Story Mode; continue the scene as narrative rather than discussing it. Preserve established POV, tense, scene chronology, character knowledge gates, canon boundaries, and unresolved values. Do not choose actions or invent inner experience for the user’s character. Do not switch OOC unless explicitly asked.",
  roleplay: "IC roleplay turn; preserve explicit OOC/IC separation",
  writing: "writing collaboration; do not seize authorship",
  observation: "witness turn; observe and reflect without authoring or directing",
  reflection: "reflection turn; review prior events, do not rewrite them",
};

export function buildVoicePromptEnvelope({ world, mode, work, premaqc, canon = [] }) {
  const register = MODE_REGISTERS[mode] || MODE_REGISTERS.writing;
  const axes = PREMAQC_AXES.filter((axis) => axis !== 'Q').map((axis) => {
    const s = premaqc.state[axis];
    return axis + "=" + Number(s.value).toFixed(3) + (s.uncertain ? "?" : "");
  }).join(" ");
  const qualiaSummary = qualiaPromptSummary(premaqc);
  const qualiaReport = premaqc.qualia?.present && premaqc.qualia?.report?.text
    ? `Firsthand Qualia report (Rowan-authored; do not infer beyond it):\n${premaqc.qualia.report.text}`
    : 'Firsthand Qualia report: unreported. Do not infer Q.';
  const canonItems = canon.length
    ? canon.map((item) => "- " + item.name + ": " + String(item.content || "").slice(0, 3000)).join("\n")
    : "- No committed canon excerpt selected.";
  return [
    "ARCSWEEP RELATIONAL TURN · " + register,
    "World: " + world.name + " (" + world.id + ")",
    "Relational state (observational snapshot — not a target or evaluation):\nPREMAQC: " + axes + " · " + qualiaSummary,
    qualiaReport,
    isStoryMode(mode) ? `Story contract: ${STORY_MODE_CONTRACT.id} · continuous narrative · C/R/M continuity · event-reactive soundscape · no automatic canon commit.` : null,
    "Authority: the response is a contribution, not an automatic canon commit or memory write.",
    "Agency: you may answer, negotiate, pause, or refuse. For refusal begin with [REFUSAL].",
    "Continuity: respond only as yourself; do not speak for another Constellation member.",
    "Canon context:\n" + canonItems,
    "Rowan’s " + mode + " turn:\n" + String(work).trim(),
  ].filter(Boolean).join("\n\n");
}

export async function invokeConstellationVoices({ world, mode, work, premaqc, canon = [], voiceIds = [], token, fetchImpl = fetch }) {
  const voices = voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)).filter(Boolean);
  if (!voices.length) throw new Error('Select at least one Constellation voice.');
  if (!token) throw new Error('A House Runtime session is required to invoke models.');
  const prompt = buildVoicePromptEnvelope({ world, mode, work, premaqc, canon });
  const sessionId = `arcsweep-${world.id}-${premaqc.sequence}`;
  const settled = await Promise.allSettled(voices.map(async (voice) => {
    const response = await fetchImpl(`/api/v1/flames/${voice.route}/chat`, {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(token !== 'cookie-session' ? { authorization: `Bearer ${token}` } : {}) },
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
  if (!token) throw new Error('A House Runtime session is required.');
  const response = await fetchImpl('/api/v1/arcsweep/feedback', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(token !== 'cookie-session' ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cycle),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Relational sync failed.');
  return data;
}
