export const RUNESHELL_PREFS_KEY = 'arcsweep.runeshell.native/v1';

export const RUNESHELL_DEFAULTS = Object.freeze({
  enabled: true,
  typing: true,
  incoming: true,
  presence: true,
  intensity: 'normal',
  respectReducedMotion: true,
});

const INTENSITIES = new Set(['quiet', 'normal', 'bright']);

export function normaliseRuneShellPrefs(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.freeze({
    enabled: input.enabled !== false,
    typing: input.typing !== false,
    incoming: input.incoming !== false,
    presence: input.presence !== false,
    intensity: INTENSITIES.has(input.intensity) ? input.intensity : RUNESHELL_DEFAULTS.intensity,
    respectReducedMotion: input.respectReducedMotion !== false,
  });
}

export function runeShellParticleBudget(intensity = 'normal') {
  if (intensity === 'quiet') return 1;
  if (intensity === 'bright') return 5;
  return 3;
}

export function shouldAnimateRuneShell(prefs, reducedMotion = false) {
  const value = normaliseRuneShellPrefs(prefs);
  return value.enabled && !(value.respectReducedMotion && reducedMotion);
}

export function runeShellEventKind(detail = {}) {
  const state = String(detail.state || '').toLowerCase();
  if (state === 'speaking') return 'voice';
  if (state === 'thinking' || state === 'waking') return 'wake';
  if (state === 'ready') return 'ready';
  if (state === 'error' || state === 'degraded') return 'warning';
  return 'ambient';
}
