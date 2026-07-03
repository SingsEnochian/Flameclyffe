export const createDefaultConsentState = () => ({
  sound: false,
  haptics: false,
  quiet: false,
  lowStim: false,
  export: false
});

export const createDefaultAccessibilityState = () => ({
  reducedMotion: typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  reducedTransparency: typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-transparency: reduce)').matches : false
});

export class ConsentGates {
  constructor({ consent = {}, accessibility = {} } = {}) {
    this.consent = { ...createDefaultConsentState(), ...consent };
    this.accessibility = { ...createDefaultAccessibilityState(), ...accessibility };
  }

  setConsent(key, value) {
    if (!(key in this.consent)) throw new Error(`Unknown consent gate: ${key}`);
    this.consent[key] = Boolean(value);
    return this.snapshot();
  }

  toggleConsent(key) {
    return this.setConsent(key, !this.consent[key]);
  }

  setAccessibility(key, value) {
    if (!(key in this.accessibility)) throw new Error(`Unknown accessibility gate: ${key}`);
    this.accessibility[key] = Boolean(value);
    return this.snapshot();
  }

  toggleAccessibility(key) {
    return this.setAccessibility(key, !this.accessibility[key]);
  }

  snapshot() {
    return {
      consent: { ...this.consent },
      accessibility: { ...this.accessibility }
    };
  }

  apply(plan = { channels: {} }) {
    const channels = {};
    for (const [channel, effects] of Object.entries(plan.channels || {})) {
      channels[channel] = (effects || []).map(effect => this.applyToEffect(channel, effect));
    }
    return { ...plan, channels, gates: this.snapshot() };
  }

  applyToEffect(channel, effect) {
    const gated = { ...effect, emitted: true, reason: 'allowed' };

    if (channel === 'audio' && !this.consent.sound) {
      return { ...gated, emitted: false, reason: 'sound_not_enabled', plain_language: 'A sound response was available, but sound is off.' };
    }

    if (channel === 'haptic' && !this.consent.haptics) {
      return { ...gated, emitted: false, reason: 'haptics_not_enabled', plain_language: 'A haptic response was available, but haptics are off.' };
    }

    if (channel === 'persistence' && !this.consent.export) {
      return { ...gated, emitted: false, reason: 'export_not_enabled', plain_language: 'A persistence or export response was available, but export is off.' };
    }

    if (this.consent.quiet || this.consent.lowStim || this.accessibility.reducedMotion) {
      gated.damped = true;
      gated.intensity = Math.min(Number(effect.intensity ?? 0.35), this.consent.quiet ? 0.22 : 0.38);
      gated.duration_ms = Math.min(Number(effect.duration_ms ?? 900), this.accessibility.reducedMotion ? 450 : 900);
      gated.reason = gated.reason === 'allowed' ? 'allowed_damped' : gated.reason;
      gated.plain_language = effect.plain_language || 'The response was allowed in a lower-force form.';
    }

    if (this.accessibility.reducedMotion && effect.motion === 'travel') {
      gated.motion = 'static_state';
      gated.reason = 'allowed_reduced_motion';
      gated.plain_language = 'Motion was replaced with a static state cue because reduced motion is active.';
    }

    return gated;
  }
}
