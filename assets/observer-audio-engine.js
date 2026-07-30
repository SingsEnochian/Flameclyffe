'use strict';

/*
  Observer Audio Engine v2
  Maps a validated PREMAQ observation state into bounded, inspectable audio controls.
  Audio output is a projection, never evidence. Every mapping is deterministic for the
  same input packet, registry version, calibration profile, and engine version.
*/

(function () {
  const ENGINE_VERSION = '2.0.0';
  const DIMENSIONS = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const lerp = (a, b, t) => a + (b - a) * clamp(t);
  const expMap = (min, max, t) => min * Math.pow(max / min, clamp(t));

  const DEFAULT_CALIBRATION = Object.freeze({
    id: 'observer-audio-default',
    version: '1.0.0',
    carrierMinHz: 90,
    carrierMaxHz: 444,
    beatMinHz: 1.5,
    beatMaxHz: 12,
    pulseMinHz: 0.1,
    pulseMaxHz: 8,
    brightnessMinHz: 400,
    brightnessMaxHz: 6000,
    masterMin: 0.03,
    masterMax: 0.16,
    smoothingSeconds: 0.08,
    maxDerivative: 1
  });

  function readComponent(packet, key) {
    const component = packet?.state?.[key] || {};
    return {
      value: clamp(component.value),
      derivative: Math.max(-1, Math.min(1, Number(component.derivative) || 0)),
      uncertainty: clamp(component.uncertainty ?? packet?.uncertainty?.[key] ?? 0),
      confidence: clamp(component.confidence ?? packet?.confidence?.[key] ?? 1)
    };
  }

  function validatePremaq(packet) {
    if (!packet || typeof packet !== 'object') throw new TypeError('PREMAQ packet is required.');
    if (!packet.state || typeof packet.state !== 'object') throw new TypeError('PREMAQ packet.state is required.');
    for (const key of DIMENSIONS) {
      if (!packet.state[key]) throw new TypeError(`PREMAQ component ${key} is required.`);
    }
    return true;
  }

  function projectPremaqToAudio(packet, calibration = DEFAULT_CALIBRATION) {
    validatePremaq(packet);
    const c = { ...DEFAULT_CALIBRATION, ...calibration };
    const P = readComponent(packet, 'P');
    const C = readComponent(packet, 'C');
    const R = readComponent(packet, 'R');
    const E = readComponent(packet, 'E');
    const M = readComponent(packet, 'M');
    const A = readComponent(packet, 'A');
    const Q = readComponent(packet, 'Q');

    const confidenceMean = DIMENSIONS.reduce((sum, key) => sum + readComponent(packet, key).confidence, 0) / DIMENSIONS.length;
    const uncertaintyMean = DIMENSIONS.reduce((sum, key) => sum + readComponent(packet, key).uncertainty, 0) / DIMENSIONS.length;
    const derivativeEnergy = Math.sqrt(DIMENSIONS.reduce((sum, key) => {
      const d = readComponent(packet, key).derivative;
      return sum + d * d;
    }, 0) / DIMENSIONS.length);

    const carrierHz = expMap(c.carrierMinHz, c.carrierMaxHz, 0.45 * P.value + 0.35 * C.value + 0.20 * Q.value);
    const beatHz = lerp(c.beatMinHz, c.beatMaxHz, 0.55 * R.value + 0.25 * M.value + 0.20 * derivativeEnergy);
    const pulseHz = lerp(c.pulseMinHz, c.pulseMaxHz, 0.60 * M.value + 0.40 * Math.abs(M.derivative));
    const filterHz = expMap(c.brightnessMinHz, c.brightnessMaxHz, 0.65 * A.value + 0.35 * C.value);
    const stereoWidth = clamp(0.15 + 0.70 * R.value - 0.35 * uncertaintyMean);
    const returnGain = clamp(0.01 + 0.08 * E.value * confidenceMean, 0, 0.09);
    const master = lerp(c.masterMin, c.masterMax, clamp(0.45 * P.value + 0.35 * Q.value + 0.20 * confidenceMean));
    const phaseInvertReturn = E.value > 0.5;

    return Object.freeze({
      schema_version: '1.0.0',
      engine_version: ENGINE_VERSION,
      source_premaq_id: packet.id || null,
      source_registry_version: packet.registry_version || null,
      calibration: { id: c.id, version: c.version },
      classification: 'projected',
      controls: {
        carrier_hz: carrierHz,
        left_hz: carrierHz - beatHz / 2,
        right_hz: carrierHz + beatHz / 2,
        beat_hz: beatHz,
        pulse_hz: pulseHz,
        filter_hz: filterHz,
        stereo_width: stereoWidth,
        return_gain: returnGain,
        master_gain: master,
        phase_invert_return: phaseInvertReturn,
        smoothing_seconds: c.smoothingSeconds
      },
      diagnostics: {
        confidence_mean: confidenceMean,
        uncertainty_mean: uncertaintyMean,
        derivative_energy: derivativeEnergy
      },
      provenance: {
        method: 'deterministic-calibrated-transfer',
        input_class: 'observation-state',
        output_class: 'audio-projection'
      }
    });
  }

  class ObserverAudioEngine {
    constructor({ bus, calibration } = {}) {
      if (!bus) throw new TypeError('A MobiusAudioBus-compatible bus is required.');
      this.bus = bus;
      this.calibration = { ...DEFAULT_CALIBRATION, ...(calibration || {}) };
      this.lastProjection = null;
    }

    project(packet) {
      this.lastProjection = projectPremaqToAudio(packet, this.calibration);
      return this.lastProjection;
    }

    async render(packet, { duration } = {}) {
      const projection = this.project(packet);
      await this.bus.ensure();
      const controls = projection.controls;
      this.bus.setMaster(controls.master_gain);
      this.bus.setPhaseInverted(controls.phase_invert_return);
      if (duration != null) this.bus.setDuration(duration);
      this.bus.tone({ frequency: controls.left_hz, route: 'left', gain: 0.035, type: 'sine', duration });
      this.bus.tone({ frequency: controls.right_hz, route: 'right', gain: 0.035, type: 'sine', duration });
      return projection;
    }

    receipt() {
      if (!this.lastProjection) return null;
      return {
        receipt_type: 'audio-projection',
        created_at: new Date().toISOString(),
        engine_version: ENGINE_VERSION,
        projection: this.lastProjection
      };
    }
  }

  window.ObserverAudioMath = Object.freeze({
    ENGINE_VERSION,
    DEFAULT_CALIBRATION,
    validatePremaq,
    projectPremaqToAudio,
    ObserverAudioEngine
  });
})();
