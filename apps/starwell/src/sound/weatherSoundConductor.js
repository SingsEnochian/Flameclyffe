import { createYggdrasilSoundProposal } from './yggdrasilSoundPlanner.js';

export const WEATHER_SOUND_BANDS = Object.freeze({
  hush: 'hush',
  drizzle: 'drizzle',
  rain: 'rain',
  shimmer: 'shimmer',
  tide: 'tide',
  rootPulse: 'root-pulse',
  purrfield: 'purrfield',
});

const TEXT_PATCH_HINTS = Object.freeze([
  { pattern: /\b(rain|mist|water|sea|loch|shore|tide|wave|river)\b/i, patchId: 'lochflame_still', band: WEATHER_SOUND_BANDS.tide },
  { pattern: /\b(grove|purr|cushion|cat|kitten|leaf|moss|flower|garden)\b/i, patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield },
  { pattern: /\b(rune|runa|altar|shrine|bell|glass|temple)\b/i, patchId: 'runa_gateway_432', band: WEATHER_SOUND_BANDS.shimmer },
  { pattern: /\b(ygg|root|branch|gate|threshold|tree|seed|room)\b/i, patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse },
  { pattern: /\b(stop|feather|plain pass|quiet|pause|safe|help)\b/i, patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush },
]);

const ROOM_PATCH_HINTS = Object.freeze({
  shrine: { patchId: 'runa_gateway_432', band: WEATHER_SOUND_BANDS.shimmer },
  grove: { patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield },
  gallery: { patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.shimmer },
  lab: { patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse },
  instrument: { patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse },
  playfield: { patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield },
});

export function resolveTextSoundSignal(text = '') {
  const value = String(text ?? '');
  const trimmed = value.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const punctuation = (value.match(/[!?;:.,]/g) ?? []).length;
  const lineBreaks = (value.match(/\n/g) ?? []).length;
  const revisions = (value.match(/\b(revise|edit|again|fix|change|redo|patch)\b/gi) ?? []).length;
  const hushTerms = (value.match(/\b(quiet|soft|pause|stop|safe|rest|plain pass|feather)\b/gi) ?? []).length;
  const creationTerms = (value.match(/\b(make|grow|build|room|seed|create|draw|write|sing)\b/gi) ?? []).length;

  return {
    empty: trimmed.length === 0,
    characters: value.length,
    words,
    punctuation,
    lineBreaks,
    revision: clamp01((revisions + punctuation * 0.05) / 4),
    creation: clamp01((creationTerms + words / 80) / 3),
    hush: clamp01((hushTerms + (words === 0 ? 1 : 0)) / 3),
    density: clamp01((words / 120) + (lineBreaks * 0.04)),
  };
}

export function resolveEnvironmentSoundSignal(node = {}, environment = {}) {
  const roomKind = environment.roomKind ?? node?.kind ?? 'room';
  const biome = environment.biome ?? node?.theme?.biome ?? 'velvet-twilight';
  const palette = environment.palette ?? node?.theme?.palette ?? 'moon-gold-blackwood';
  const motion = environment.motion ?? node?.theme?.motion ?? 'safe';
  const roomId = environment.roomId ?? node?.id ?? 'templehouse';
  const shared = Boolean(environment.shared ?? node?.access?.shared ?? false);

  return {
    roomId,
    roomKind,
    biome,
    palette,
    motion,
    shared,
    isGrove: roomKind === 'grove' || /grove|moss|leaf|garden/i.test(`${biome} ${palette}`),
    isWater: /water|sea|shore|loch|blue|tide/i.test(`${biome} ${palette} ${roomId}`),
    isShrine: roomKind === 'shrine' || /shrine|altar|rune|glass/i.test(`${biome} ${palette} ${roomId}`),
    isThreshold: roomKind === 'instrument' || /gate|threshold|root|ygg/i.test(`${biome} ${palette} ${roomId}`),
  };
}

export function chooseWeatherSoundPatch({ textSignal, environmentSignal, inputWeather = {}, accessibility = {} } = {}) {
  if (accessibility.plainPassDefault || accessibility.sensoryQuiet || textSignal?.hush > 0.4) {
    return { patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush, reason: 'quiet-or-plain-pass' };
  }

  for (const hint of TEXT_PATCH_HINTS) {
    if (hint.pattern.test(String(textSignal?.rawText ?? ''))) {
      return { patchId: hint.patchId, band: hint.band, reason: 'text-hint' };
    }
  }

  const embodiment = inputWeather.embodiment ?? {};
  if (environmentSignal?.isWater) return { patchId: 'lochflame_still', band: WEATHER_SOUND_BANDS.tide, reason: 'environment-water' };
  if (environmentSignal?.isGrove) return { patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield, reason: 'environment-grove' };
  if (environmentSignal?.isShrine) return { patchId: 'runa_gateway_432', band: WEATHER_SOUND_BANDS.shimmer, reason: 'environment-shrine' };
  if (environmentSignal?.isThreshold) return { patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse, reason: 'environment-threshold' };
  if ((embodiment.creation ?? 0) > 0.5) return { patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse, reason: 'creation-weather' };
  if ((embodiment.revision ?? 0) > 0.35) return { patchId: 'safe_gateway_369', band: WEATHER_SOUND_BANDS.rain, reason: 'revision-weather' };
  if ((embodiment.exploration ?? 0) > 0.45) return { patchId: 'safe_gateway_369', band: WEATHER_SOUND_BANDS.drizzle, reason: 'exploration-weather' };

  return { patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush, reason: 'default-stillness' };
}

export function createWeatherSoundProposal({
  text = '',
  node = {},
  inputWeather = {},
  environment = {},
  accessibility = {},
  requester = 'presence:yggdrasil',
} = {}) {
  const baseTextSignal = resolveTextSoundSignal(text);
  const textSignal = { ...baseTextSignal, rawText: String(text ?? '') };
  const environmentSignal = resolveEnvironmentSoundSignal(node, environment);
  const choice = chooseWeatherSoundPatch({ textSignal, environmentSignal, inputWeather, accessibility });
  const proposal = createYggdrasilSoundProposal({
    patchId: choice.patchId,
    roomId: environmentSignal.roomId,
    requester,
    reason: `weather-sound:${choice.reason}`,
  });

  return {
    ...proposal,
    weatherSound: {
      proposalOnly: true,
      band: choice.band,
      patchReason: choice.reason,
      textSignal: summarizeTextSignal(textSignal),
      environmentSignal,
      inputWeather: {
        embodiment: inputWeather.embodiment ?? {},
        worldResponse: inputWeather.worldResponse ?? {},
      },
      modulation: {
        suggestedGainScale: 0,
        suggestedMotionScale: accessibility.reducedMotion ? 0 : clamp01(inputWeather.worldResponse?.motionScale ?? 0),
        suggestedDensity: accessibility.sensoryQuiet ? 0.08 : clamp01((inputWeather.worldResponse?.fireflyDensity ?? 0) + textSignal.density * 0.25),
        appliedToPlayback: false,
      },
      safety: {
        playbackEnabled: false,
        mayAutoplay: false,
        mayChangeVolume: false,
        mayBypassConsent: false,
        plainPassAvailable: true,
      },
    },
  };
}

function summarizeTextSignal(textSignal) {
  return {
    empty: textSignal.empty,
    characters: textSignal.characters,
    words: textSignal.words,
    punctuation: textSignal.punctuation,
    lineBreaks: textSignal.lineBreaks,
    revision: textSignal.revision,
    creation: textSignal.creation,
    hush: textSignal.hush,
    density: textSignal.density,
  };
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}
