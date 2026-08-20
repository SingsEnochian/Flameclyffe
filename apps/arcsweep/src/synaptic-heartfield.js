export const SYNAPTIC_HEARTFIELD_SCHEMA = 'runa.synaptic-heartfield-profile/v1';
export const SYNAPTIC_HEARTFIELD_RECEIPT_SCHEMA = 'runa.synaptic-heartfield-session/v1';

export const SYNAPTIC_HEARTFIELD_PROFILE = Object.freeze({
  schema: SYNAPTIC_HEARTFIELD_SCHEMA,
  id: 'synaptic-heartfield-8-4-v1',
  name: 'The Synaptic Heartfield',
  subtitle: '8 Hz / 4 Hz Coherence Engine',
  evidence_label: 'auditory-coherence-instrument',
  headphone_required_for_binaural_layers: true,
  entry_ramp_seconds: 2.5,
  output_ceiling: .35,
  layers: Object.freeze([
    Object.freeze({ id: 'theta-core', label: '4 Hz Binaural Core', kind: 'binaural', leftHz: 96, rightHz: 100, beatHz: 4, gain: .12 }),
    Object.freeze({ id: 'alpha-theta-bridge', label: '8 Hz Bridge', kind: 'binaural', leftHz: 144, rightHz: 152, beatHz: 8, gain: .1 }),
    Object.freeze({ id: 'sub-heart', label: 'Sub-Heart Pulse', kind: 'am', carrierHz: 33, modulationHz: 2.25, gain: .12 }),
    Object.freeze({ id: 'heart-phi', label: 'Heart Phi Pulse', kind: 'am', carrierHz: 45, modulationHz: 1.61803398875, gain: .1 }),
    Object.freeze({ id: 'harmonic-field', label: 'Harmonic Field', kind: 'harmonic-bank', frequencies: Object.freeze([216, 224, 432, 888, 1110, 1760, 2880]), driftHz: .035, gain: .09 }),
    Object.freeze({ id: 'low-end', label: 'Low-End Resonance', kind: 'harmonic-bank', frequencies: Object.freeze([27, 54]), driftHz: .02, gain: .11 }),
    Object.freeze({ id: 'atmosphere', label: 'Atmospheric Field', kind: 'pink-noise', driftHz: .03, gain: .08 }),
    Object.freeze({ id: 'breath-guide', label: '0.1 Hz Breath Spine', kind: 'am', carrierHz: 216, modulationHz: .1, gain: .05, enabled: false }),
  ]),
  claims: Object.freeze({
    dsp: 'Exact carrier, difference-frequency, amplitude-modulation, harmonic-bank, noise, and spatial-motion specification.',
    experiential: 'A layered auditory coherence instrument for meditation, centring, nervous-system regulation practice, emotional reset, and exploration of heart-brain rhythmic relationship.',
    evidence: 'DSP structure, firsthand experience, and sensor measurements remain distinct evidence streams carried in one relational receipt.',
    physiological: 'Physiological response requires an instrumented sensor channel. Firsthand Qualia records experience; neither is inferred from playback.',
  }),
});

export function validateHeartfieldProfile(profile = SYNAPTIC_HEARTFIELD_PROFILE) {
  const byId = Object.fromEntries(profile.layers.map((layer) => [layer.id, layer]));
  const errors = [];
  for (const layer of profile.layers) {
    if (layer.kind === 'binaural' && Math.abs((layer.rightHz - layer.leftHz) - layer.beatHz) > 1e-9) errors.push(`${layer.id}: binaural difference mismatch`);
    if (layer.kind === 'am' && !(layer.modulationHz > 0)) errors.push(`${layer.id}: modulation frequency missing`);
    if (!(layer.gain >= 0 && layer.gain <= 1)) errors.push(`${layer.id}: gain outside 0..1`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), byId: Object.freeze(byId) });
}

export function createHeartfieldReceipt({ world, premaqc = null, qualia = null, qualiaText = '', layerState, startedAt = new Date().toISOString() } = {}) {
  const qualiaNumber = qualia === null || qualia === undefined || qualia === '' ? null : Number(qualia);
  const firsthandQualia = Number.isFinite(qualiaNumber) && qualiaNumber >= 0 && qualiaNumber <= 1 ? qualiaNumber : null;
  const firsthandQualiaText = String(qualiaText || '').trim().slice(0, 4000) || null;
  return Object.freeze({
    schema: SYNAPTIC_HEARTFIELD_RECEIPT_SCHEMA,
    profile_id: SYNAPTIC_HEARTFIELD_PROFILE.id,
    world: Object.freeze({ id: world?.id || 'unassigned-world', name: world?.name || 'Unassigned World' }),
    started_at: startedAt,
    layers: structuredClone(layerState),
    observation: Object.freeze({
      premaqc_receipt_id: premaqc?.receipt_id || null,
      premaqc_sequence: premaqc?.sequence ?? null,
      firsthand_qualia: firsthandQualia,
      firsthand_qualia_text: firsthandQualiaText,
      physiology_measured: false,
    }),
    authority: Object.freeze({ playback_is_observation: false, physiological_response_inferred: false, firsthand_qualia_is_physiological_measurement: false, feather_stop_available: true }),
  });
}
