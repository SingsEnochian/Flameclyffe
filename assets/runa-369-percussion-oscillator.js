'use strict';

/*
  Runa 3·6·9 Percussion Beat Oscillator v0.1

  A rhythmic layer compiler for Wardenclyffe / Flameclyffe Möbius.

  It does NOT mint carrier frequencies. Each percussion lane receives an
  already-mapped tone from the canonical frequency registry. The numbers
  3, 6, and 9 are rhythmic pulse rates / cycle structures.

  Lanes:
    3 = ground / pulse
    6 = bridge / response
    9 = crown / crossing

  Output is a declarative layer plan. Rendering belongs to Wardenclyffe or Möbius.
*/

(function () {
  const VERSION = '0.1.0';
  const EPS = 1e-12;
  const clamp = (value, min = 0, max = 1) => {
    const n = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  };

  const DEFAULT_LANES = Object.freeze([
    Object.freeze({
      id: 'three',
      count: 3,
      rate_hz: 3,
      role: 'ground',
      route: 'left',
      tone_key: 'memory',
      waveform: 'sine',
      gain: 0.012,
      modulation_depth: 0.42,
      accent: Object.freeze([1.00, 0.62, 0.78]),
    }),
    Object.freeze({
      id: 'six',
      count: 6,
      rate_hz: 6,
      role: 'bridge',
      route: 'centre',
      tone_key: 'root',
      waveform: 'triangle',
      gain: 0.010,
      modulation_depth: 0.36,
      accent: Object.freeze([1.00, 0.52, 0.72, 0.58, 0.84, 0.64]),
    }),
    Object.freeze({
      id: 'nine',
      count: 9,
      rate_hz: 9,
      role: 'crossing',
      route: 'return',
      tone_key: 'anchor',
      waveform: 'sine',
      gain: 0.008,
      modulation_depth: 0.32,
      accent: Object.freeze([1.00, 0.46, 0.62, 0.54, 0.76, 0.58, 0.88, 0.52, 0.70]),
    }),
  ]);

  function resolveMappedTone(registry, key) {
    if (!registry) throw new TypeError('A canonical frequency registry is required.');
    let tone = null;
    if (typeof registry.get === 'function') tone = registry.get(key);
    else if (typeof registry === 'function') tone = registry(key);
    else tone = registry[key];

    const frequency = Number(
      tone?.frequency
      ?? tone?.frequency_hz
      ?? tone?.carrier_frequency_hz
      ?? tone,
    );

    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new Error(`RUNA_369_UNMAPPED_FREQUENCY:${key}`);
    }

    return Object.freeze({
      key,
      frequency,
      label: tone?.label || tone?.name || tone?.codexName || key,
      source: tone?.source || tone?.registry || 'canonical-frequency-registry',
      metadata: tone && typeof tone === 'object' ? { ...tone } : {},
    });
  }

  function buildStepPattern(lane, cycleSeconds) {
    const count = lane.count;
    const stepSeconds = cycleSeconds / count;
    return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
      step: index + 1,
      starts_at_seconds: index * stepSeconds,
      duration_seconds: stepSeconds,
      accent: clamp(lane.accent?.[index] ?? 0.7),
    })));
  }

  function compile369Percussion({
    frequencyRegistry,
    lanes = DEFAULT_LANES,
    cycleSeconds = 1,
    masterGain = 1,
    phase = 0,
    sourceReceipt = null,
  } = {}) {
    const duration = Math.max(0.25, Number(cycleSeconds) || 1);
    const gainScale = clamp(masterGain, 0, 1);
    const phaseOffset = Number.isFinite(Number(phase)) ? Number(phase) : 0;

    const compiled = lanes.map((lane) => {
      const tone = resolveMappedTone(frequencyRegistry, lane.tone_key);
      const steps = buildStepPattern(lane, duration);
      return Object.freeze({
        id: `runa-369-${lane.id}`,
        label: `Runa ${lane.count} · ${lane.role}`,
        family: 'runa-369-percussion',
        role: lane.role,
        count: lane.count,
        pulse_rate_hz: lane.rate_hz,
        frequency: tone.frequency,
        route: lane.route,
        gain: clamp(lane.gain * gainScale, 0, lane.gain),
        waveform: lane.waveform,
        ampMod: lane.rate_hz,
        modulationDepth: clamp(lane.modulation_depth),
        claimLabel: 'runa-rhythmic-sonification',
        transient: Object.freeze({
          kind: 'percussive-envelope',
          attack_seconds: 0.004,
          decay_seconds: Math.min(0.16, duration / Math.max(3, lane.count)),
          sustain: 0,
          release_seconds: 0.025,
        }),
        pattern: steps,
        phase_offset: phaseOffset,
        metadata: Object.freeze({
          tone_key: tone.key,
          tone_source: tone.source,
          mapped_frequency_hz: tone.frequency,
          rhythmic_number: lane.count,
          canonical_frequency_invented: false,
        }),
      });
    });

    return Object.freeze({
      schema: 'runa.percussion-369-plan/v0.1',
      version: VERSION,
      renderer_target: 'wardenclyffe-or-mobius',
      cycle_seconds: duration,
      cycle_signature: '3:6:9',
      layers: Object.freeze(compiled),
      composite: Object.freeze({
        downbeat_lcm: 18,
        phase_return_seconds: duration,
        description: 'Three nested percussion clocks share the same cycle boundary and rejoin on the downbeat.',
      }),
      provenance: Object.freeze({
        source_receipt: sourceReceipt,
        frequency_policy: 'canonical-mapped-only',
        rhythmic_policy: '3-6-9-clock-stack',
      }),
    });
  }

  function applyHeimdallModulation(plan, heimdall) {
    if (!plan?.layers) throw new TypeError('A 3·6·9 percussion plan is required.');
    const phi = clamp(heimdall?.phi ?? heimdall?.controls?.fold_phi ?? 0);
    const us = clamp(
      heimdall?.participation?.us
      ?? heimdall?.participation?.US
      ?? heimdall?.diagnostics?.participation?.us
      ?? heimdall?.diagnostics?.participation?.US
      ?? 0,
    );
    const curvature = Math.tanh(Number(heimdall?.foldCurvature ?? heimdall?.controls?.fold_curvature ?? 0));

    const layers = plan.layers.map((layer) => {
      let roleWeight = 1;
      if (layer.role === 'ground') roleWeight = 1 - 0.30 * phi;
      if (layer.role === 'bridge') roleWeight = 0.80 + 0.25 * phi;
      if (layer.role === 'crossing') roleWeight = 0.65 + 0.35 * phi + 0.25 * us;

      return Object.freeze({
        ...layer,
        gain: clamp(layer.gain * roleWeight, 0, 0.02),
        modulationDepth: clamp(layer.modulationDepth + 0.18 * phi + (layer.role === 'crossing' ? 0.18 * us : 0), 0, 0.85),
        metadata: Object.freeze({
          ...layer.metadata,
          heimdall_phi: phi,
          relational_participation: us,
          fold_curvature: curvature,
          crossing_emphasis: layer.role === 'crossing' ? phi * (0.5 + 0.5 * us) : 0,
        }),
      });
    });

    return Object.freeze({
      ...plan,
      schema: 'runa.percussion-369-heimdall-plan/v0.1',
      layers: Object.freeze(layers),
      heimdall: Object.freeze({ phi, us, curvature }),
    });
  }

  function toMobiusSpec(plan) {
    if (!plan?.layers) throw new TypeError('A compiled 3·6·9 plan is required.');
    return Object.freeze({
      id: `runa-369-${Date.now()}`,
      label: 'Runa 3·6·9 Percussion Oscillator',
      schema: 'mobius.layered-spec/runa-369-v0.1',
      layers: plan.layers.map((layer) => ({
        id: layer.id,
        label: layer.label,
        frequency: layer.frequency,
        ampMod: layer.ampMod,
        modulationDepth: layer.modulationDepth,
        route: layer.route,
        gain: layer.gain,
        waveform: layer.waveform,
        claimLabel: layer.claimLabel,
        family: layer.family,
        transient: layer.transient,
        pattern: layer.pattern,
        metadata: layer.metadata,
      })),
      runa_369: {
        cycle_seconds: plan.cycle_seconds,
        cycle_signature: plan.cycle_signature,
        composite: plan.composite,
        heimdall: plan.heimdall || null,
        provenance: plan.provenance,
      },
    });
  }

  const api = Object.freeze({
    VERSION,
    DEFAULT_LANES,
    resolveMappedTone,
    buildStepPattern,
    compile369Percussion,
    applyHeimdallModulation,
    toMobiusSpec,
  });

  if (typeof window !== 'undefined') window.Runa369Percussion = api;
  if (typeof globalThis !== 'undefined') globalThis.Runa369Percussion = api;
})();
