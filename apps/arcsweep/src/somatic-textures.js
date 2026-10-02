// ArcSweep somatic texture grammar v0.1
//
// Semantic meaning lives in somatic-runtime cues.
// Texture changes how a cue is rendered, not what the cue means.
// Mythic/fantasy source motifs are presentation references only.

export const SOMATIC_TEXTURE_SCHEMA = 'arcsweep.somatic-texture/v1';

const TEXTURES = Object.freeze({
  neutral: Object.freeze({
    id: 'neutral',
    meaning: 'Unstyled semantic cue.',
    waveform: 'sine',
    attack_ratio: 0.18,
    release_ratio: 0.34,
    pan: Object.freeze([0]),
    frequency_steps: Object.freeze([1]),
    haptic_shape: 'even',
    evidence_class: 'interface',
  }),
  charge: Object.freeze({
    id: 'charge',
    meaning: 'Build-up, threshold crossing, discharge, and brief afterglow.',
    waveform: 'triangle',
    attack_ratio: 0.08,
    release_ratio: 0.24,
    pan: Object.freeze([-0.35, 0.2, 0.5, 0]),
    frequency_steps: Object.freeze([0.9, 1, 1.08, 1.16]),
    haptic_shape: 'rising',
    evidence_class: 'experiential',
  }),
  branching: Object.freeze({
    id: 'branching',
    meaning: 'A seed propagates into several bounded branches and settles.',
    waveform: 'sine',
    attack_ratio: 0.14,
    release_ratio: 0.3,
    pan: Object.freeze([0, -0.45, 0.45, -0.2, 0.2]),
    frequency_steps: Object.freeze([1, 1.06, 0.96, 1.1, 1]),
    haptic_shape: 'branching',
    evidence_class: 'experiential',
  }),
  projection: Object.freeze({
    id: 'projection',
    meaning: 'Anchor, outward spatial displacement, distant presence, return to centre.',
    waveform: 'sine',
    attack_ratio: 0.2,
    release_ratio: 0.42,
    pan: Object.freeze([0, -0.7, 0.7, 0]),
    frequency_steps: Object.freeze([1, 1.04, 1.08, 1]),
    haptic_shape: 'out-and-back',
    evidence_class: 'experiential',
  }),
  dream: Object.freeze({
    id: 'dream',
    meaning: 'Diffuse, low-contrast sensory drift with an explicit return.',
    waveform: 'sine',
    attack_ratio: 0.35,
    release_ratio: 0.55,
    pan: Object.freeze([-0.2, 0.2, 0]),
    frequency_steps: Object.freeze([0.98, 1.02, 1]),
    haptic_shape: 'soft-wave',
    evidence_class: 'experiential',
  }),
  damping: Object.freeze({
    id: 'damping',
    meaning: 'Output is attenuated, gated, muted, or intentionally quieted.',
    waveform: 'sine',
    attack_ratio: 0.08,
    release_ratio: 0.68,
    pan: Object.freeze([0.2, 0.1, 0]),
    frequency_steps: Object.freeze([1, 0.9, 0.78]),
    haptic_shape: 'falling',
    evidence_class: 'interface',
  }),
  return: Object.freeze({
    id: 'return',
    meaning: 'A previously attenuated or displaced channel returns and stabilises.',
    waveform: 'triangle',
    attack_ratio: 0.16,
    release_ratio: 0.34,
    pan: Object.freeze([-0.2, 0.2, 0]),
    frequency_steps: Object.freeze([0.86, 0.96, 1]),
    haptic_shape: 'rising-stable',
    evidence_class: 'interface',
  }),
  focus: Object.freeze({
    id: 'focus',
    meaning: 'Narrow attention onto one target without implying correctness.',
    waveform: 'sine',
    attack_ratio: 0.24,
    release_ratio: 0.38,
    pan: Object.freeze([0]),
    frequency_steps: Object.freeze([1, 1, 1]),
    haptic_shape: 'single-centre',
    evidence_class: 'interface',
  }),
  uncertainty: Object.freeze({
    id: 'uncertainty',
    meaning: 'An ambiguous or low-confidence signal remains unresolved.',
    waveform: 'sine',
    attack_ratio: 0.2,
    release_ratio: 0.4,
    pan: Object.freeze([-0.25, 0.25]),
    frequency_steps: Object.freeze([0.97, 1.03]),
    haptic_shape: 'paired',
    evidence_class: 'interface',
  }),
});

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value)));
}

export function listSomaticTextures() {
  return Object.freeze(Object.values(TEXTURES).map((item) => Object.freeze(clone(item))));
}

export function getSomaticTexture(id = 'neutral') {
  const texture = TEXTURES[String(id || 'neutral').trim()] || null;
  return texture ? Object.freeze(clone(texture)) : null;
}

export function textureFrequencyScale(texture, index = 0) {
  const steps = texture?.frequency_steps?.length ? texture.frequency_steps : [1];
  return clamp(steps[index % steps.length], 0.75, 1.25);
}

export function texturePan(texture, index = 0) {
  const values = texture?.pan?.length ? texture.pan : [0];
  return clamp(values[index % values.length], -1, 1);
}

function pulseProgress(index, length) {
  if (length <= 1) return 1;
  return index / (length - 1);
}

export function textureVibrationPattern(pattern = [], texture = null) {
  const source = Array.from(pattern || [], (value) => Math.max(1, Number(value) || 1));
  if (!texture || texture.id === 'neutral') return source;

  const pulseIndices = source.map((_, index) => index).filter((index) => index % 2 === 0);
  const pulseRank = new Map(pulseIndices.map((index, rank) => [index, rank]));

  return source.map((value, index) => {
    // Vibration API patterns alternate pulse / pause. Keep pauses bounded and shape pulses.
    if (index % 2 === 1) {
      if (texture.haptic_shape === 'branching') return Math.max(8, Math.round(value * 0.7));
      if (texture.haptic_shape === 'falling') return Math.max(10, Math.round(value * 1.15));
      return value;
    }

    const rank = pulseRank.get(index) || 0;
    const progress = pulseProgress(rank, pulseIndices.length);
    let scale = 1;
    if (texture.haptic_shape === 'rising') scale = 0.62 + 0.58 * progress;
    else if (texture.haptic_shape === 'falling') scale = 1.08 - 0.58 * progress;
    else if (texture.haptic_shape === 'branching') scale = rank % 2 === 0 ? 0.82 : 1.08;
    else if (texture.haptic_shape === 'out-and-back') scale = 0.72 + 0.52 * Math.sin(Math.PI * progress);
    else if (texture.haptic_shape === 'soft-wave') scale = 0.62 + 0.18 * Math.sin(Math.PI * progress);
    else if (texture.haptic_shape === 'rising-stable') scale = progress < 0.66 ? 0.72 + 0.42 * progress : 1;
    else if (texture.haptic_shape === 'single-centre') scale = 0.78;
    else if (texture.haptic_shape === 'paired') scale = rank % 2 === 0 ? 0.72 : 0.92;
    return Math.max(8, Math.round(value * scale));
  });
}

export function somaticTextureClaim(texture) {
  return Object.freeze({
    texture_id: texture?.id || 'neutral',
    evidence_class: texture?.evidence_class || 'interface',
    physical_claim: false,
    note: 'Texture is an experiential/interface rendering grammar. It does not establish an external physical, psychic, medical, or neurological state.',
  });
}
