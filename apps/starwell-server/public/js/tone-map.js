/**
 * Tone Map — semantic layer between PREMAQ and DSP
 *
 * Translates the 7 PREMAQ axes into 11 perceptual qualities:
 *   warmth, brightness, distance, breath, movement, texture,
 *   weight, clarity, sparkle, grain, density
 *
 * The World Hum Engine reads these to shape filter cutoff, resonance,
 * oscillator detune, LFO rate, and reverb mix. Each world profile
 * determines which qualities it prioritises and how they map to DSP.
 *
 * Principle: describe semantics, not Hz. The compiler turns semantics into DSP.
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

/**
 * Derive tone qualities from a PREMAQ metrics object.
 * @param {{ P:number, C:number, R:number, E:number, M:number, A:number, Q:number }} premaq
 * @returns {{ warmth, brightness, distance, breath, movement, texture, weight, clarity, sparkle, grain, density }}
 */
function deriveToneMap(premaq) {
  const { P = 0.5, C = 0.5, R = 0.5, E = 0.5, M = 0.5, A = 0.5, Q = 0.5 } = premaq;

  return {
    // warmth: low-frequency presence, hearth quality, Q and Presence together
    warmth:    clamp(Q * 0.50 + P * 0.30 + (1 - E) * 0.20),

    // brightness: clarity in the high-end, Resolution and Agency drive this
    brightness: clamp(R * 0.40 + A * 0.30 + (1 - C) * 0.30),

    // distance: how far away the sound feels — low Presence, high Entropy recede
    distance:  clamp((1 - P) * 0.40 + E * 0.30 + (1 - M) * 0.30),

    // breath: how alive and respiratory the sound feels — low Entropy, high Presence
    breath:    clamp((1 - E) * 0.45 + P * 0.30 + C * 0.25),

    // movement: forward pull and animation — Momentum and Agency
    movement:  clamp(M * 0.50 + A * 0.30 + R * 0.20),

    // texture: roughness and grain — Entropy and low Coherence create texture
    texture:   clamp(E * 0.40 + (1 - C) * 0.35 + (1 - R) * 0.25),

    // weight: mass and gravitas — Compression and low Momentum
    weight:    clamp(C * 0.45 + (1 - M) * 0.30 + P * 0.25),

    // clarity: resolution and definition — Resolution and low Entropy
    clarity:   clamp(R * 0.50 + A * 0.25 + (1 - E) * 0.25),

    // sparkle: high-frequency shimmer — Qualia and Momentum together
    sparkle:   clamp(Q * 0.45 + R * 0.30 + M * 0.25),

    // grain: micro-texture and noise floor — Entropy and low Resolution
    grain:     clamp(E * 0.50 + (1 - R) * 0.30 + (1 - C) * 0.20),

    // density: how packed and full the spectrum feels — Compression and Presence
    density:   clamp(C * 0.50 + P * 0.30 + (1 - M) * 0.20),
  };
}

/**
 * Translate tone qualities to DSP parameter adjustments.
 * Returns modifiers to blend into the engine's base DSP values.
 *
 * @param {ReturnType<typeof deriveToneMap>} tone
 * @param {{ rootHz: number, filter: { baseHz: number } }} worldProfile
 */
function toneToDSP(tone, worldProfile) {
  const { warmth, brightness, distance, breath, movement, texture, weight, clarity, sparkle, grain, density } = tone;

  // Filter frequency: warmth pulls down, brightness pulls up, balanced
  const filterMod = (brightness - warmth) * worldProfile.filter.baseHz * 0.28;

  // Filter resonance (Q): grain sharpens it, clarity smooths it
  const filterQ = 0.8 + grain * 2.0 - clarity * 0.6;

  // Oscillator detune (cents): movement adds drift, weight anchors
  const detuneCents = movement * 4.5 - weight * 2.0;

  // LFO rate modifier: breath slows it (more breath = more patient)
  const lfoRateMod = 1.0 - breath * 0.45;

  // Reverb mix modifier: distance adds reverb, density reduces it
  const reverbMixMod = distance * 0.20 - density * 0.08;

  // Master gain modifier: sparkle adds air, weight compresses
  const gainMod = 1.0 + sparkle * 0.12 - weight * 0.06;

  return { filterMod, filterQ: Math.max(0.2, Math.min(8, filterQ)), detuneCents, lfoRateMod, reverbMixMod, gainMod };
}

// Export for browser use
window.ToneMap = { deriveToneMap, toneToDSP };
