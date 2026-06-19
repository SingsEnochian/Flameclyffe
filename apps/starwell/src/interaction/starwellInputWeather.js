export const INPUT_WEATHER_DEFAULTS = Object.freeze({
  source: Object.freeze({
    typing: Object.freeze({ active: false, cadence: 0, pauseMs: 0, revision: 0 }),
    touch: Object.freeze({ active: false, gesture: 'none', pressure: 0 }),
    pointer: Object.freeze({ drift: 0, hoveringNodeId: null }),
    scroll: Object.freeze({ traversal: 0, direction: 'none' }),
    motion: Object.freeze({ enabled: false, tilt: Object.freeze({ x: 0, y: 0 }) }),
  }),
  embodiment: Object.freeze({
    presence: 0,
    creation: 0,
    revision: 0,
    exploration: 0,
    stillness: 1,
  }),
  worldResponse: Object.freeze({
    branchGrowth: 0,
    fireflyDensity: 0,
    rootGlow: 0,
    pulseSpeed: 0,
    motionScale: 0,
  }),
});

export function resolveInputWeather(input = {}, accessibility = {}) {
  const typingCadence = clamp01(input.typing?.cadence ?? 0);
  const pointerDrift = clamp01(input.pointer?.drift ?? 0);
  const revision = clamp01(input.typing?.revision ?? 0);
  const stillness = clamp01(input.idle?.stillness ?? 1 - Math.max(typingCadence, pointerDrift));
  const motionScale = accessibility.reducedMotion ? 0 : clamp01((typingCadence + pointerDrift) / 2);

  return {
    source: {
      ...INPUT_WEATHER_DEFAULTS.source,
      ...input,
    },
    embodiment: {
      presence: clamp01(Math.max(typingCadence, pointerDrift, 1 - stillness)),
      creation: typingCadence,
      revision,
      exploration: pointerDrift,
      stillness,
    },
    worldResponse: {
      branchGrowth: accessibility.reducedMotion ? 0.12 : typingCadence,
      fireflyDensity: accessibility.sensoryQuiet ? 0.08 : clamp01(typingCadence * 0.6 + pointerDrift * 0.4),
      rootGlow: clamp01(0.2 + revision * 0.5 + stillness * 0.2),
      pulseSpeed: accessibility.reducedMotion ? 0.2 : clamp01(0.25 + typingCadence * 0.75),
      motionScale,
    },
  };
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}
