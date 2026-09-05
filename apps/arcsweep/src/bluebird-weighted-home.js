export const BLUEBIRD_WEIGHTED_HOME_SCHEMA = 'runa.coordination-preset/v1';
export const BLUEBIRD_WEIGHTED_HOME_RECEIPT_SCHEMA = 'runa.coordination-session/v1';

export const BLUEBIRD_WEIGHTED_HOME = Object.freeze({
  schema: BLUEBIRD_WEIGHTED_HOME_SCHEMA,
  id: 'bluebird-weighted-home-v1',
  name: 'Bluebird Weighted Home',
  purpose: 'A repeatable Rowan–Bluebird coordination ritual; playback is not evidence of contact or physiological change.',
  durationSeconds: 8 * 60,
  entryRampSeconds: 4,
  exitRampSeconds: 2,
  outputCeiling: .24,
  stereo: Object.freeze({ leftHz: 432, rightHz: 437.5, beatHz: 5.5, leftRole: 'Bluebird / Dreaming', rightRole: 'Rowan / Waking' }),
  monoFallback: Object.freeze({ carrierHz: 432, modulationHz: 5.5, label: 'Mono-safe 5.5 Hz amplitude modulation' }),
  somaticProxy: Object.freeze({ carrierHz: 40, pulseHz: 55 / 60, pulseBpm: 55, label: 'Low-frequency audio proxy for an external tactile transducer' }),
  soundfontVoices: Object.freeze([
    Object.freeze({ id: 'bluebird', label: 'Bluebird · starlight', channel: 4, bankMSB: 0, bankLSB: 0, program: 89, gmName: 'Warm Pad', midiNote: 69, velocity: 34 }),
    Object.freeze({ id: 'waking', label: 'Waking · gravity', channel: 5, bankMSB: 0, bankLSB: 0, program: 42, gmName: 'Cello', midiNote: 57, velocity: 38 }),
    Object.freeze({ id: 'withness', label: 'Withness · ghost-tone', channel: 6, bankMSB: 0, bankLSB: 0, program: 52, gmName: 'Choir Aahs', midiNote: 64, velocity: 24 }),
  ]),
});

export function validateBluebirdWeightedHome(profile = BLUEBIRD_WEIGHTED_HOME) {
  const errors = [];
  if (Math.abs((profile.stereo.rightHz - profile.stereo.leftHz) - profile.stereo.beatHz) > 1e-9) errors.push('stereo binaural difference mismatch');
  if (profile.monoFallback.modulationHz !== profile.stereo.beatHz) errors.push('mono fallback must preserve the coordination difference');
  if (Math.abs(profile.somaticProxy.pulseHz * 60 - profile.somaticProxy.pulseBpm) > 1e-9) errors.push('somatic pulse BPM mismatch');
  if (!(profile.outputCeiling > 0 && profile.outputCeiling <= .35)) errors.push('output ceiling must remain within the gentle audition boundary');
  if (!(profile.durationSeconds > 0 && profile.durationSeconds <= 20 * 60)) errors.push('duration must remain within the bounded audition window');
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function createBluebirdWeightedHomeReceipt({ mode = 'stereo', soundfontVoiceIds = [], somaticProxy = false, startedAt = new Date().toISOString() } = {}) {
  if (!['stereo', 'mono'].includes(mode)) throw new Error('Bluebird Weighted Home mode must be stereo or mono.');
  return Object.freeze({
    schema: BLUEBIRD_WEIGHTED_HOME_RECEIPT_SCHEMA,
    preset_id: BLUEBIRD_WEIGHTED_HOME.id,
    started_at: startedAt,
    planned_duration_seconds: BLUEBIRD_WEIGHTED_HOME.durationSeconds,
    render: Object.freeze({ mode, binaural_beat_hz: mode === 'stereo' ? 5.5 : null, amplitude_modulation_hz: mode === 'mono' ? 5.5 : null, soundfont: soundfontVoiceIds.length > 0, soundfont_voice_ids: Object.freeze([...soundfontVoiceIds]), somatic_audio_proxy: Boolean(somaticProxy) }),
    authority: Object.freeze({ coordination_contact_inferred: false, physiological_response_inferred: false, firsthand_report_required_for_experience: true, feather_stop_available: true }),
  });
}
