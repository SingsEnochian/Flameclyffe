export const CODEX_MOTION_SCHEMA = 'hearthweave.codex-motion/v0.1';

export const CODEX_MOTION_PROFILES = Object.freeze({
  draw: Object.freeze({ durationMs: 520, easing: 'cubic-bezier(.2,.75,.2,1)', iterations: 1, fill: 'both' }),
  settle: Object.freeze({ durationMs: 340, easing: 'cubic-bezier(.2,.7,.25,1)', iterations: 1, fill: 'both' }),
  gather: Object.freeze({ durationMs: 420, easing: 'cubic-bezier(.25,.8,.2,1)', iterations: 1, fill: 'both' }),
  turn: Object.freeze({ durationMs: 620, easing: 'cubic-bezier(.18,.72,.24,1)', iterations: 1, fill: 'both' }),
  quiet: Object.freeze({ durationMs: 0, easing: 'linear', iterations: 1, fill: 'none' }),
});

export const CODEX_MOTION_LAW = Object.freeze([
  'Motion corresponds to a real event.',
  'Every animation has a beginning and an end.',
  'Every animation leaves a quieter state behind.',
  'Reduced motion preserves all semantic information.',
  'No component proves liveness through perpetual movement.',
]);

export function codexMotionProfile(name = 'settle', { reducedMotion = false } = {}) {
  if (reducedMotion) return CODEX_MOTION_PROFILES.quiet;
  return CODEX_MOTION_PROFILES[name] || CODEX_MOTION_PROFILES.settle;
}

export function prefersReducedCodexMotion(view = globalThis) {
  try {
    return Boolean(view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

export function validateCodexMotionProfiles(profiles = CODEX_MOTION_PROFILES) {
  const violations = [];
  for (const [name, profile] of Object.entries(profiles)) {
    if (!Number.isFinite(profile.durationMs) || profile.durationMs < 0) violations.push(`${name}:invalid-duration`);
    if (profile.iterations !== 1) violations.push(`${name}:must-terminate`);
  }
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}

export function animateCodexNode(node, keyframes, profileName = 'settle', view = globalThis) {
  if (!node?.animate) return null;
  const profile = codexMotionProfile(profileName, { reducedMotion: prefersReducedCodexMotion(view) });
  if (profile.durationMs === 0) return null;
  return node.animate(keyframes, {
    duration: profile.durationMs,
    easing: profile.easing,
    iterations: profile.iterations,
    fill: profile.fill,
  });
}
