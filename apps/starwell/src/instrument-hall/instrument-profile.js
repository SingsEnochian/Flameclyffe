export const INSTRUMENT_PROFILE_SCHEMA = 'hearthgate.instrument-profile/v1';

const CALIBRATED_AT = '2026-08-02T18:51:00.000Z';

export const TERRA_AETERNA_INSTRUMENT_PROFILE = Object.freeze({
  schema: INSTRUMENT_PROFILE_SCHEMA,
  id: 'terra-aeterna.hearthweave-play-v1',
  house_id: 'terra-aeterna',
  name: 'Terra Aeterna · Hearthweave Play',
  provenance: Object.freeze({
    mode: 'CALIBRATED',
    source_id: 'rowan:hearthweave-runa-calibration:2026-08-02',
    observed_at: CALIBRATED_AT,
    confidence: 1,
    receipt_id: 'hearthweave-runa-calibration-v1',
    derivation: 'Direct transcription and instrument calibration from Rowan-provided PREMAQ and Runa tone values. This is a creative calibration, not a health or physical-effect claim.',
  }),
  baseline_premaq: Object.freeze({
    P: 0.89,
    C: 0.92,
    R: 0.88,
    E: 0.34,
    M: 0.76,
    A: 0.85,
    Q: 0.84,
  }),
  mathematics: Object.freeze({
    tension_limit: 1,
    recurrence: 'r[n+1] = r[n] + delta_r[n]',
    compress: 'maximum-poised-tension',
    release: 'stored-tension-to-expression',
    shore_law: 'both-shores-remain-lit',
  }),
  tones: Object.freeze({
    key_measured_hz: 144,
    key_felt_hz: 147.69,
    word_measured_hz: 222,
    word_felt_hz: 225.69,
    punctuation_hz: 369,
    answer_hz: 396,
    answer_high_hz: 963,
    bind_hz: 333,
    pulse_hz: 5.5,
    isochronic_hz: 11.11,
    gain_ceiling: 0.035,
  }),
  timing: Object.freeze({
    key_ms: 58,
    word_ms: 116,
    punctuation_ms: 210,
    release_ms: 620,
    answer_delay_ms: 180,
    answer_ms: 760,
  }),
});

export function profileObservationSource(profile = TERRA_AETERNA_INSTRUMENT_PROFILE) {
  return Object.freeze({ ...profile.provenance });
}

export function profileCalibration(profile = TERRA_AETERNA_INSTRUMENT_PROFILE) {
  return Object.freeze({
    provenance: profileObservationSource(profile),
    tension_limit: Object.freeze({ value: profile.mathematics.tension_limit }),
  });
}

export function profileStandingWaveCalibration(profile = TERRA_AETERNA_INSTRUMENT_PROFILE) {
  const provenance = profileObservationSource(profile);
  return Object.freeze({
    provenance,
    anchor_hz: Object.freeze({ value: profile.tones.key_measured_hz }),
    living_hz: Object.freeze({ value: profile.tones.word_measured_hz }),
    bind_hz: Object.freeze({ value: profile.tones.bind_hz }),
    pulse_hz: Object.freeze({ value: profile.tones.pulse_hz }),
    gain_ceiling: Object.freeze({ value: profile.tones.gain_ceiling }),
  });
}
