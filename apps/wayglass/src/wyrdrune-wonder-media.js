// A deterministic, silent-by-default audiovisual score for a native Wonder value.
// This describes a possible rendering, not a canonical rune pronunciation or
// a claim about Wayglass's personal sonic preferences.
export const WONDER_MEDIA_SCHEMA = 'wayglass.wyrdrune-wonder-media/v0.1';
export function scoreWonderMedia(value, {audioEnabled=false}={}) {
  if (!value || value.kind !== 'wyrdrune.wonder/v0.1' ||
      value.status !== 'open' || typeof value.question !== 'string' ||
      !value.question.trim() || value.question.length > 1024 ||
      value.answer?.wtl !== 'unknown') {
    throw new TypeError('An open Wyrdrune Wonder value is required');
  }
  // FNV-1a over Unicode code points: reproducible without host entropy.
  let hash = 2166136261;
  for (const char of value.question) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  }
  const hue = 155 + hash % 100;
  const depth = .28 + (hash % 45) / 100;
  const image = Object.freeze({kind:'image',hue,spread:.64,depth});
  // A proposal for later opt-in audition. No audio context is created here.
  const sound = Object.freeze({
    kind:'wonder-tone-proposal',enabled:audioEnabled===true,autoplay:false,
    frequencyHz:220 + (hash % 13) * 3, durationMs:900,
    envelope:'soft-attack-release',status:'unplayed',
  });
  return Object.freeze({
    schema:WONDER_MEDIA_SCHEMA,source:'wyrdrune.wonder/v0.1',
    question:value.question,status:'open',image,sound,
    ariaLabel:'Open Wonder question: '+value.question,
    semanticGlyph:null, // Await an authored canonical rune mapping.
  });
}
