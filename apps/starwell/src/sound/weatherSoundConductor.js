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

export const WEATHER_SCENE_MIX_PROFILES = Object.freeze({
  templehouse: Object.freeze({ patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush, crossfadeMs: 1800, densityCap: 0.28, motionCap: 0.16 }),
  shrine: Object.freeze({ patchId: 'runa_gateway_432', band: WEATHER_SOUND_BANDS.shimmer, crossfadeMs: 2400, densityCap: 0.34, motionCap: 0.18 }),
  yggGate: Object.freeze({ patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse, crossfadeMs: 2600, densityCap: 0.32, motionCap: 0.2 }),
  grove: Object.freeze({ patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield, crossfadeMs: 3200, densityCap: 0.42, motionCap: 0.2 }),
  water: Object.freeze({ patchId: 'lochflame_still', band: WEATHER_SOUND_BANDS.tide, crossfadeMs: 3600, densityCap: 0.38, motionCap: 0.18 }),
  gallery: Object.freeze({ patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.shimmer, crossfadeMs: 2200, densityCap: 0.24, motionCap: 0.12 }),
  lab: Object.freeze({ patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse, crossfadeMs: 1600, densityCap: 0.3, motionCap: 0.16 }),
  playfield: Object.freeze({ patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield, crossfadeMs: 2200, densityCap: 0.45, motionCap: 0.24 }),
  default: Object.freeze({ patchId: 'safe_gateway_369', band: WEATHER_SOUND_BANDS.drizzle, crossfadeMs: 2400, densityCap: 0.3, motionCap: 0.14 }),
});

const TEXT_PATCH_HINTS = Object.freeze([
  { pattern: /\b(rain|mist|water|sea|loch|shore|tide|wave|river)\b/i, patchId: 'lochflame_still', band: WEATHER_SOUND_BANDS.tide },
  { pattern: /\b(grove|purr|cushion|cat|kitten|leaf|moss|flower|garden)\b/i, patchId: 'dreaming_grove_purrfield', band: WEATHER_SOUND_BANDS.purrfield },
  { pattern: /\b(rune|runa|altar|shrine|bell|glass|temple)\b/i, patchId: 'runa_gateway_432', band: WEATHER_SOUND_BANDS.shimmer },
  { pattern: /\b(ygg|root|branch|gate|threshold|tree|seed|room)\b/i, patchId: 'yggdrasil_root_breath', band: WEATHER_SOUND_BANDS.rootPulse },
  { pattern: /\b(stop|feather|plain pass|quiet|pause|safe|help)\b/i, patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush },
]);

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
  const combined = `${roomKind} ${biome} ${palette} ${roomId}`;
  const isGrove = roomKind === 'grove' || /grove|moss|leaf|garden/i.test(combined);
  const isWater = /water|sea|shore|loch|blue|tide/i.test(combined);
  const isShrine = roomKind === 'shrine' || /shrine|altar|rune|glass/i.test(combined);
  const isThreshold = roomKind === 'instrument' || /gate|threshold|root|ygg/i.test(combined);
  const sceneKey = resolveSceneKey({ roomKind, roomId, biome, palette, isGrove, isWater, isShrine, isThreshold });

  return {
    roomId,
    roomKind,
    sceneKey,
    biome,
    palette,
    motion,
    shared,
    isGrove,
    isWater,
    isShrine,
    isThreshold,
  };
}

export function resolveSceneMixProfile(sceneKey = 'default') {
  return WEATHER_SCENE_MIX_PROFILES[sceneKey] ?? WEATHER_SCENE_MIX_PROFILES.default;
}

export function chooseWeatherSoundPatch({ textSignal, environmentSignal, inputWeather = {}, accessibility = {} } = {}) {
  if (accessibility.plainPassDefault || accessibility.sensoryQuiet || textSignal?.hush > 0.4) {
    return { ...WEATHER_SCENE_MIX_PROFILES.templehouse, patchId: 'north_star_still', band: WEATHER_SOUND_BANDS.hush, reason: 'quiet-or-plain-pass' };
  }

  for (const hint of TEXT_PATCH_HINTS) {
    if (hint.pattern.test(String(textSignal?.rawText ?? ''))) {
      return { ...resolveSceneMixProfile(environmentSignal?.sceneKey), patchId: hint.patchId, band: hint.band, reason: 'text-hint' };
    }
  }

  const embodiment = inputWeather.embodiment ?? {};
  if ((embodiment.creation ?? 0) > 0.5) return { ...WEATHER_SCENE_MIX_PROFILES.yggGate, reason: 'creation-weather' };
  if ((embodiment.revision ?? 0) > 0.35) return { ...WEATHER_SCENE_MIX_PROFILES.default, band: WEATHER_SOUND_BANDS.rain, reason: 'revision-weather' };
  if ((embodiment.exploration ?? 0) > 0.45) return { ...WEATHER_SCENE_MIX_PROFILES.default, reason: 'exploration-weather' };

  const sceneProfile = resolveSceneMixProfile(environmentSignal?.sceneKey);
  return { ...sceneProfile, reason: `scene:${environmentSignal?.sceneKey ?? 'default'}` };
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
  const futureSceneMix = createFutureSceneMixPlan({ choice, inputWeather, textSignal, accessibility });

  return {
    ...proposal,
    weatherSound: {
      proposalOnly: true,
      band: choice.band,
      patchReason: choice.reason,
      sceneKey: environmentSignal.sceneKey,
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
      futureSceneMix,
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

function createFutureSceneMixPlan({ choice, inputWeather = {}, textSignal = {}, accessibility = {} }) {
  const worldResponse = inputWeather.worldResponse ?? {};
  return {
    appliesWhenSoundIsUserEnabled: true,
    activeInV0: false,
    sceneReactive: true,
    crossfadeMs: choice.crossfadeMs,
    targetBand: choice.band,
    targetPatchId: choice.patchId,
    suggestedDensity: accessibility.sensoryQuiet ? 0.08 : Math.min(choice.densityCap, clamp01((worldResponse.fireflyDensity ?? 0) + textSignal.density * 0.25)),
    suggestedMotion: accessibility.reducedMotion ? 0 : Math.min(choice.motionCap, clamp01(worldResponse.motionScale ?? 0)),
    suggestedGain: 0,
    guardrails: {
      requiresExplicitSoundOn: true,
      noAutoplay: true,
      featherStopAlwaysAvailable: true,
      plainPassReturnsHush: true,
      neverStoresTranscript: true,
    },
  };
}

function resolveSceneKey({ roomKind, roomId, biome, palette, isGrove, isWater, isShrine, isThreshold }) {
  if (roomId === 'templehouse' || /hearth|templehouse/i.test(`${biome} ${palette} ${roomId}`)) return 'templehouse';
  if (isShrine) return 'shrine';
  if (isWater) return 'water';
  if (isGrove) return roomKind === 'playfield' ? 'playfield' : 'grove';
  if (isThreshold) return 'yggGate';
  if (roomKind === 'gallery') return 'gallery';
  if (roomKind === 'lab') return 'lab';
  if (roomKind === 'playfield') return 'playfield';
  return 'default';
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
