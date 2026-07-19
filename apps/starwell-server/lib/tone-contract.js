'use strict';

const crypto = require('crypto');

const STOP_WORDS = Object.freeze(['stop', 'feather', 'icarus']);
const DISALLOWED_DEFAULTS = Object.freeze(['sudden_high_beeps', 'unannounced_binaural']);
const HEALTH_FLAGS = new Set(['migraine_risk', 'tinnitus', 'fatigue', 'sensory_overload', 'vertigo']);

function clamp(value, fallback, min, max) {
  const parsed = Number(value);
  return Math.max(min, Math.min(Number.isFinite(parsed) ? parsed : fallback, max));
}

function cleanStrings(value, fallback = [], max = 20) {
  return (Array.isArray(value) ? value : fallback).map(String).map(item => item.trim().toLowerCase()).filter(Boolean).slice(0, max);
}

function validateTonePatch(input = {}, existing = {}) {
  const source = { ...existing, ...input };
  const id = String(source.id || source.name || crypto.randomUUID()).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || crypto.randomUUID();
  const frequencyHz = clamp(source.frequencyHz ?? source.audio?.frequencyHz, 174, 20, 16000);
  const overtoneHz = clamp(source.overtoneHz ?? source.audio?.overtoneHz, frequencyHz * 2, 20, 16000);
  const maxSeconds = clamp(source.maxSeconds, 600, 5, 1800);
  const maxVolume = clamp(source.maxVolume, 0.2, 0, 0.35);
  const defaultSeconds = clamp(source.defaultSeconds, Math.min(60, maxSeconds), 5, maxSeconds);
  const defaultVolume = clamp(source.defaultVolume, Math.min(0.05, maxVolume), 0, maxVolume);
  const warnings = (Array.isArray(source.warnings) ? source.warnings : []).map(String).map(item => item.trim()).filter(Boolean).slice(0, 10);
  const binaural = source.binaural === true || source.routingMode === 'binaural';
  const suddenHighBeep = source.suddenHighBeep === true || frequencyHz >= 6000 || overtoneHz >= 6000;
  return {
    id,
    schema: 'hearthgate.tone-patch/v1',
    name: String(source.name || 'Untitled patch').slice(0, 100),
    description: String(source.description || '').slice(0, 1000),
    plainLanguage: String(source.plainLanguage || source.description || 'A user-configurable sound and haptic patch.').slice(0, 1000),
    visual: String(source.visual || '').slice(0, 400),
    frequencyHz,
    overtoneHz,
    defaultSeconds,
    maxSeconds,
    defaultVolume,
    maxVolume,
    hapticPattern: (Array.isArray(source.hapticPattern || source.haptics?.pattern) ? (source.hapticPattern || source.haptics.pattern) : [30, 150, 30]).map(Number).filter(Number.isFinite).map(value => clamp(value, 0, 0, 2000)).slice(0, 20),
    intensity: ['gentle', 'moderate', 'intense'].includes(source.intensity) ? source.intensity : 'gentle',
    routingMode: ['standard', 'binaural', 'haptic', 'both'].includes(source.routingMode) ? source.routingMode : 'standard',
    binauralIntegrity: ['protected', 'unlocked', 'none'].includes(source.binauralIntegrity) ? source.binauralIntegrity : (binaural ? 'protected' : 'none'),
    warningFlags: [...new Set([...(Array.isArray(source.warningFlags) ? source.warningFlags.map(String) : []), ...(binaural ? ['binaural'] : []), ...(suddenHighBeep ? ['high_frequency'] : [])])].slice(0, 20),
    warnings,
    custom: source.custom === true,
    updatedAt: source.updatedAt || new Date().toISOString()
  };
}

function validateConsentProfile(input = {}, existing = {}) {
  const source = { ...existing, ...input };
  return {
    schema: 'hearthgate.tone-consent-profile/v1',
    profileId: String(source.profileId || source.profile_id || existing.profileId || 'default').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
    stopWords: [...new Set(cleanStrings(source.stopWords || source.stop_words, existing.stopWords || STOP_WORDS))],
    maxSessionMinutes: clamp(source.maxSessionMinutes ?? source.max_session_minutes, existing.maxSessionMinutes || 12, 1, 30),
    maxGainDb: clamp(source.maxGainDb ?? source.max_gain_db, existing.maxGainDb ?? -20, -80, -6),
    disallowed: [...new Set(cleanStrings(source.disallowed, existing.disallowed || DISALLOWED_DEFAULTS))],
    healthFlags: [...new Set(cleanStrings(source.healthFlags || source.health_flags, existing.healthFlags || []).filter(flag => HEALTH_FLAGS.has(flag)))],
    plainPassAvailable: source.plainPassAvailable !== false && source.plain_pass_available !== false,
    audioEnabledByDefault: false,
    hapticsEnabledByDefault: false,
    updatedAt: new Date().toISOString()
  };
}

function preflightToneSession({ patch, profile, request = {} }) {
  const reasons = [];
  const warnings = [...patch.warnings];
  const requestedSeconds = clamp(request.durationSeconds, patch.defaultSeconds, 0, patch.maxSeconds);
  const profileSeconds = profile.maxSessionMinutes * 60;
  const durationSeconds = Math.min(requestedSeconds, profileSeconds);
  const volume = Math.min(clamp(request.volume, patch.defaultVolume, 0, patch.maxVolume), patch.maxVolume);
  if (request.consent !== true) reasons.push('explicit-consent-required');
  if (profile.disallowed.includes('unannounced_binaural') && patch.routingMode === 'binaural' && request.acknowledgedBinaural !== true) reasons.push('binaural-warning-acknowledgement-required');
  if (profile.disallowed.includes('sudden_high_beeps') && patch.warningFlags.includes('high_frequency')) reasons.push('high-frequency-output-disallowed');
  if (profile.healthFlags.includes('tinnitus') && patch.warningFlags.includes('high_frequency')) warnings.push('Your tinnitus safety profile flags this patch for additional caution.');
  if (profile.healthFlags.includes('migraine_risk') && patch.intensity === 'intense') warnings.push('Your migraine-risk profile flags intense patches for additional caution.');
  return {
    schema: 'hearthgate.tone-preflight/v1',
    allowed: reasons.length === 0,
    reasons,
    warnings: [...new Set(warnings)],
    limits: { durationSeconds, volume, maxGainDb: profile.maxGainDb },
    stopWords: profile.stopWords,
    plainPassAvailable: profile.plainPassAvailable,
    boundary: 'Sound and haptics remain off until direct user action. Feather, Icarus, and Stop halt all Tone Lab output.'
  };
}

function mapResponseState(response = {}) {
  const comfort = String(response.comfort || 'not recorded').toLowerCase();
  const activation = clamp(response.activation, 0.5, 0, 1);
  const valence = clamp(response.valence, 0.5, 0, 1);
  const groundedness = clamp(response.groundedness, 0.5, 0, 1);
  const stopped = response.stoppedByUser === true || ['uncomfortable', 'distressed', 'stop'].includes(comfort);
  return {
    schema: 'hearthgate.tone-state/v1',
    comfort,
    activation,
    valence,
    groundedness,
    stateLabel: stopped ? 'stopped-or-uncomfortable' : activation > 0.7 ? 'activated' : groundedness > 0.65 ? 'grounded' : 'mixed-or-unresolved',
    evidenceClass: 'user-authored experiential report',
    claimBoundary: 'This state describes a reported experience; it is not a diagnosis, proof of cause, or medical measurement.'
  };
}

function serializeTonePercept(session) {
  return {
    schema: 'observer.percept/tone-v1',
    perceptId: `tone:${session.id}`,
    observedAt: session.endedAt,
    source: { instrument: 'Hearthgate Tone Engine Lab', patchId: session.patchId, sessionId: session.id },
    raw: { durationSeconds: session.durationSeconds, volume: session.volume, audioEnabled: session.audioEnabled, hapticsEnabled: session.hapticsEnabled, stoppedByUser: session.stoppedByUser },
    symbolic: { state: session.state.stateLabel, imagery: session.response.imagery, emotion: session.response.emotion },
    provenance: session.provenance,
    boundaries: [session.state.claimBoundary, 'Raw settings, authored response, and symbolic interpretation remain distinct.']
  };
}

module.exports = { STOP_WORDS, DISALLOWED_DEFAULTS, validateTonePatch, validateConsentProfile, preflightToneSession, mapResponseState, serializeTonePercept };
