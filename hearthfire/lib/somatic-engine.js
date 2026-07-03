import { ReceiptBus, NULL_BOUNDARY } from './receipt-bus.js';
import { ConsentGates } from './consent-gates.js';
import { createFallbackDeepEvent } from './deep-signal-adapter.js';

const clamp = (value, min = 0, max = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const emptyChannels = () => ({ visual: [], audio: [], haptic: [], spatial: [], persistence: [] });

export class HearthfireSomaticEngine {
  constructor({ surfaceId = 'hearthfire-workbench', gate = 'targeted_receipt_allowed', consent = {}, accessibility = {}, receiptBus = null } = {}) {
    this.surfaceId = surfaceId;
    this.gate = gate;
    this.gates = new ConsentGates({ consent, accessibility });
    this.receipts = receiptBus || new ReceiptBus({ surfaceId, gate });
    this.state = this.createInitialState();
  }

  createInitialState() {
    const gateSnapshot = this.gates.snapshot();
    return {
      surface_id: this.surfaceId,
      gate: this.gate,
      source: 'fallback',
      source_status: 'fallback',
      confidence: 'simulated',
      values: { ...createFallbackDeepEvent().values },
      interaction: {
        kind: 'none',
        action: null,
        x: null,
        y: null,
        pressure: 0,
        timestamp: null
      },
      consent: gateSnapshot.consent,
      accessibility: gateSnapshot.accessibility,
      timestamp: new Date().toISOString()
    };
  }

  ingest(event = createFallbackDeepEvent()) {
    const normalEvent = this.normaliseEvent(event);
    this.applyEvent(normalEvent);
    const result = this.evaluatePattern(normalEvent);
    const plan = this.mapToSomaticPlan(normalEvent, result);
    const gatedPlan = this.gates.apply(plan);
    const receipts = this.receipts.emitPlan({ event: normalEvent, result, gatedPlan, state: this.state });
    return { event: normalEvent, state: this.snapshot(), result, plan, gatedPlan, receipts };
  }

  normaliseEvent(event) {
    if (!event || typeof event !== 'object') return createFallbackDeepEvent('empty_event');
    if (!event.type && event.values) return { ...event, type: 'signal:received' };
    return event;
  }

  applyEvent(event) {
    if (event.type?.startsWith('signal:')) {
      this.state.source = event.source || this.state.source;
      this.state.source_status = event.source_status || this.state.source_status;
      this.state.confidence = event.confidence || this.state.confidence;
      this.state.values = { ...this.state.values, ...(event.values || {}) };
    }

    if (event.type?.startsWith('user:')) {
      this.state.interaction = {
        kind: 'user',
        action: event.action || event.type,
        x: event.x ?? null,
        y: event.y ?? null,
        pressure: clamp(event.pressure ?? 0.5),
        timestamp: event.timestamp || new Date().toISOString()
      };
    }

    if (event.type?.startsWith('consent:')) {
      const key = event.key || event.type.replace('consent:', '').replace('_enabled', '').replace('_disabled', '');
      const value = event.value ?? event.type.endsWith('_enabled');
      if (key in this.gates.consent) this.gates.setConsent(key, value);
    }

    if (event.type?.startsWith('accessibility:')) {
      const key = event.key || event.type.replace('accessibility:', '').replace('_enabled', '').replace('_disabled', '');
      const value = event.value ?? event.type.endsWith('_enabled') || event.type.endsWith('_detected');
      if (key in this.gates.consent) this.gates.setConsent(key, value);
      if (key in this.gates.accessibility) this.gates.setAccessibility(key, value);
    }

    if (event.type === 'surface:settled') {
      this.state.interaction = {
        kind: 'system',
        action: 'settle',
        x: null,
        y: null,
        pressure: 0,
        timestamp: event.timestamp || new Date().toISOString()
      };
    }

    const gateSnapshot = this.gates.snapshot();
    this.state.consent = gateSnapshot.consent;
    this.state.accessibility = gateSnapshot.accessibility;
    this.state.timestamp = event.timestamp || new Date().toISOString();
  }

  evaluatePattern(event) {
    const v = this.state.values;
    const signalStrength = clamp((v.P * 0.18) + (v.C * 0.20) + (v.R * 0.22) + (v.A * 0.14) + (v.H * 0.12) + (v.charge * 0.14));
    const instability = clamp((v.E * 0.64) + ((1 - v.C) * 0.24) + (Math.min(v.kp / 9, 1) * 0.12));
    const userActive = event.type?.startsWith('user:');

    if (event.type === 'surface:settled') return this.result('response:settled', 'settled', 'The field is settling. Stillness is the correct response.', 'settle', signalStrength, instability);
    if (this.state.source_status === 'fallback' && !userActive) return this.result('pattern:weak', 'fallback_signal', 'Only fallback signal is present. Treat this as a test pattern, not live weather.', 'fallback', signalStrength, instability);
    if (signalStrength < 0.18) return this.result('pattern:absent', 'not_enough_signal', 'Nothing clear is here yet.', 'absent', signalStrength, instability);
    if (instability > 0.72 && v.C < 0.38) return this.result('pattern:conflicting', 'high_instability_low_coherence', 'The signal is active but not clean enough to choose a single path.', 'conflicting', signalStrength, instability);
    if (signalStrength < 0.34 || v.C < 0.32) return this.result('pattern:weak', 'weak_or_low_coherence', 'A weak pattern is present. Hold it lightly.', 'weak', signalStrength, instability);
    if (instability > 0.58) return this.result('pattern:ambiguous', 'high_instability', 'More than one reading may fit. The field should not choose for you.', 'ambiguous', signalStrength, instability);
    return this.result('pattern:present', 'signal_coherent_enough', 'A clear enough pattern is present for a response.', 'present', signalStrength, instability);
  }

  result(resultState, reason, plainLanguage, tone, signalStrength, instability) {
    return {
      result_state: resultState,
      reason,
      tone,
      signal_strength: signalStrength,
      instability,
      plain_language: plainLanguage,
      boundary: resultState === 'pattern:absent' ? NULL_BOUNDARY : 'This result describes Hearthfire interface state and should be read with its receipt.'
    };
  }

  mapToSomaticPlan(event, result) {
    const v = this.state.values;
    const channels = emptyChannels();
    const baseIntensity = clamp(result.signal_strength || 0.15);
    const duration = 450 + Math.round((v.R + v.H) * 700);

    channels.visual.push({
      effect_id: `visual.${result.result_state}`,
      effect: result.result_state,
      source: result.reason,
      intensity: result.result_state === 'pattern:absent' ? 0.12 : baseIntensity,
      duration_ms: duration,
      motion: result.result_state === 'pattern:present' ? 'travel' : 'static_state',
      plain_language: result.plain_language,
      boundary: result.boundary
    });

    if (result.result_state === 'pattern:present') {
      channels.audio.push({
        effect_id: 'audio.soft_resonance_tone',
        effect: 'soft_resonance_tone',
        source: 'DEEP.R + DEEP.H',
        frequency_hz: Math.round(174 + v.R * 90 + v.H * 55),
        intensity: 0.18 + v.R * 0.24,
        duration_ms: 520,
        plain_language: 'A soft tone is available for the present pattern.'
      });
      channels.haptic.push({
        effect_id: 'haptic.exchange_tap',
        effect: 'exchange_tap',
        source: event.type || 'signal',
        pattern_ms: [16, 35, 16],
        intensity: 0.22 + v.charge * 0.26,
        duration_ms: 120,
        plain_language: 'A small haptic exchange is available for the present pattern.'
      });
    }

    if (result.result_state === 'pattern:weak') {
      channels.audio.push({
        effect_id: 'audio.listening_tone',
        effect: 'listening_tone',
        source: result.reason,
        frequency_hz: Math.round(132 + v.H * 44),
        intensity: 0.10,
        duration_ms: 320,
        plain_language: 'A very quiet listening tone is available for the weak pattern.'
      });
    }

    if (['pattern:absent', 'response:settled'].includes(result.result_state)) {
      channels.spatial.push({
        effect_id: 'spatial.return_to_centre',
        effect: 'return_to_centre',
        source: result.reason,
        intensity: 0.14,
        duration_ms: 600,
        plain_language: 'The field returns to centre because no stronger response is truthful.'
      });
    }

    if (result.result_state === 'pattern:ambiguous' || result.result_state === 'pattern:conflicting') {
      channels.visual.push({
        effect_id: 'visual.multi_path_hold',
        effect: 'multi_path_hold',
        source: result.reason,
        intensity: 0.22 + result.instability * 0.28,
        duration_ms: 900,
        motion: 'static_state',
        plain_language: 'The field shows more than one possible path without choosing for you.'
      });
    }

    return {
      surface_id: this.surfaceId,
      gate: this.gate,
      result_state: result.result_state,
      channels
    };
  }

  setConsent(key, value) {
    this.gates.setConsent(key, value);
    const gateSnapshot = this.gates.snapshot();
    this.state.consent = gateSnapshot.consent;
    return this.snapshot();
  }

  setAccessibility(key, value) {
    if (key in this.gates.consent) this.gates.setConsent(key, value);
    if (key in this.gates.accessibility) this.gates.setAccessibility(key, value);
    const gateSnapshot = this.gates.snapshot();
    this.state.consent = gateSnapshot.consent;
    this.state.accessibility = gateSnapshot.accessibility;
    return this.snapshot();
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
