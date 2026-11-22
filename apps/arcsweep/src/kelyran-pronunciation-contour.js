export const KELYRAN_PRONUNCIATION_CONTOUR_SCHEMA = 'arcsweep.kelyran-pronunciation-contour/v0.1';
export const KELYRAN_AUDIBLE_GLYPH_CUE_SCHEMA = 'arcsweep.kelyran-audible-glyph-playback-cue/v0.1';
export const KELYRAN_AUDIBLE_GLYPH_PLAYBACK_RECEIPT_SCHEMA = 'arcsweep.kelyran-audible-glyph-playback-receipt/v0.1';

export const KELYRAN_CONTOURS = Object.freeze(['level', 'rising', 'falling', 'rise-fall']);

const STRESSED_UNITS = 1.25;
const UNSTRESSED_UNITS = 0.75;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function encodeList(values) {
  return values.map((value) => encodeURIComponent(String(value))).join(',');
}

function decodeList(value) {
  return String(value || '').split(',').filter(Boolean).map((part) => decodeURIComponent(part));
}

function stressIndex(lexeme, syllableCount) {
  const explicit = Number(lexeme?.stress_index);
  if (Number.isInteger(explicit) && explicit >= 0 && explicit < syllableCount) return explicit;

  const primary = Number(lexeme?.stress?.primarySyllable);
  const base = Number(lexeme?.stress?.indexBase ?? 1);
  if (Number.isInteger(primary) && Number.isInteger(base)) {
    const index = primary - base;
    if (index >= 0 && index < syllableCount) return index;
  }

  return Math.max(0, syllableCount - 2);
}

function readingFor(lexeme) {
  const phonemeKey = text(lexeme?.phoneme_key);
  if (phonemeKey) return { source: 'phoneme-key', reading: phonemeKey };

  const phonemes = Array.isArray(lexeme?.phonemes)
    ? lexeme.phonemes.map(text).filter(Boolean)
    : [];
  if (phonemes.length) return { source: 'phonemes', reading: phonemes.join('.') };

  const pronunciation = text(lexeme?.pronunciation);
  if (pronunciation) return { source: 'pronunciation-guide', reading: pronunciation };

  throw new Error('Kelyran Audible Glyph playback requires an explicit pronunciation guide, phoneme key, or phoneme sequence.');
}

function pronunciationSegments(lexeme, reading, syllables) {
  const explicit = Array.isArray(lexeme?.pronunciation_segments)
    ? lexeme.pronunciation_segments.map(text).filter(Boolean)
    : [];
  if (explicit.length === syllables.length) return explicit;

  const guideParts = reading.source === 'pronunciation-guide'
    ? reading.reading.split(/[-+]/).map(text).filter(Boolean)
    : [];
  if (guideParts.length === syllables.length) return guideParts;

  return syllables;
}

function durationUnits(lexeme, syllableCount, stressedIndex) {
  const explicit = Array.isArray(lexeme?.duration_units)
    ? lexeme.duration_units.map(Number)
    : [];
  if (explicit.length === syllableCount && explicit.every((value) => Number.isFinite(value) && value > 0)) {
    return explicit;
  }
  return Array.from({ length: syllableCount }, (_, index) => index === stressedIndex ? STRESSED_UNITS : UNSTRESSED_UNITS);
}

function contourRatios(shape, count) {
  if (count <= 0) return [];
  if (count === 1) {
    if (shape === 'rising') return [1.06];
    if (shape === 'falling') return [0.94];
    return [1];
  }

  const ratioAt = (position) => {
    if (shape === 'rising') return 0.94 + (0.14 * position);
    if (shape === 'falling') return 1.08 - (0.14 * position);
    if (shape === 'rise-fall') {
      return position <= 0.5
        ? 0.96 + (0.16 * (position / 0.5))
        : 1.12 - (0.14 * ((position - 0.5) / 0.5));
    }
    return 1;
  };

  return Array.from({ length: count }, (_, index) => Number(ratioAt(index / (count - 1)).toFixed(3)));
}

function playbackRate(units) {
  return Number(clamp(1.08 - ((Number(units) - UNSTRESSED_UNITS) * 0.32), 0.78, 1.12).toFixed(3));
}

function validateContour(contour) {
  const value = text(contour);
  if (!KELYRAN_CONTOURS.includes(value)) {
    throw new Error(`Contour must be one of: ${KELYRAN_CONTOURS.join(', ')}.`);
  }
  return value;
}

export function buildPronunciationContourTag(lexeme, contour = 'level') {
  if (!lexeme || typeof lexeme !== 'object' || Array.isArray(lexeme)) throw new Error('A Kelyran lexeme object is required.');

  const before = JSON.stringify(lexeme);
  const lexemeId = text(lexeme.id);
  if (!lexemeId) throw new Error('Kelyran pronunciation tags require a lexeme id.');

  const syllables = Array.isArray(lexeme.syllables) ? lexeme.syllables.map(text).filter(Boolean) : [];
  if (!syllables.length) throw new Error('Kelyran pronunciation tags require explicit syllable blocks.');

  const shape = validateContour(contour);
  const reading = readingFor(lexeme);
  const stressedIndex = stressIndex(lexeme, syllables.length);
  const durations = durationUnits(lexeme, syllables.length, stressedIndex);
  const pitches = contourRatios(shape, syllables.length);
  const crown = text(lexeme.crown);

  const params = new URLSearchParams();
  params.set('lexeme', lexemeId);
  params.set('reading', reading.reading);
  params.set('source', reading.source);
  params.set('syllables', encodeList(syllables));
  params.set('stress', String(stressedIndex));
  params.set('timing', durations.join(','));
  params.set('contour', shape);
  params.set('pitch', pitches.join(','));
  if (crown) params.set('crown', crown);

  const result = Object.freeze({
    schema: KELYRAN_PRONUNCIATION_CONTOUR_SCHEMA,
    lexeme_id: lexemeId,
    reading: reading.reading,
    reading_source: reading.source,
    syllables: Object.freeze([...syllables]),
    stress_index: stressedIndex,
    duration_units: Object.freeze([...durations]),
    contour: shape,
    pitch_ratio: Object.freeze([...pitches]),
    crown: crown || null,
    tag: `[kelyran-pron/v0.1?${params.toString()}]`,
  });

  if (JSON.stringify(lexeme) !== before) throw new Error('Kelyran pronunciation tagging must not mutate canonical lexeme data.');
  return result;
}

export function parsePronunciationContourTag(value) {
  const raw = text(value);
  const match = /^\[kelyran-pron\/v0\.1\?([^\]]+)\]$/.exec(raw);
  if (!match) throw new Error('Unsupported Kelyran pronunciation tag.');

  const params = new URLSearchParams(match[1]);
  const syllables = decodeList(params.get('syllables'));
  const durations = String(params.get('timing') || '').split(',').filter(Boolean).map(Number);
  const pitches = String(params.get('pitch') || '').split(',').filter(Boolean).map(Number);
  const stress = Number(params.get('stress'));
  const contour = validateContour(params.get('contour'));

  if (!text(params.get('lexeme')) || !text(params.get('reading')) || !syllables.length) {
    throw new Error('Kelyran pronunciation tag is incomplete.');
  }
  if (!Number.isInteger(stress) || stress < 0 || stress >= syllables.length) throw new Error('Kelyran pronunciation tag has invalid stress.');
  if (durations.length !== syllables.length || durations.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error('Kelyran pronunciation tag has invalid timing.');
  if (pitches.length !== syllables.length || pitches.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error('Kelyran pronunciation tag has invalid pitch contour.');

  return Object.freeze({
    schema: KELYRAN_PRONUNCIATION_CONTOUR_SCHEMA,
    lexeme_id: text(params.get('lexeme')),
    reading: text(params.get('reading')),
    reading_source: text(params.get('source')),
    syllables: Object.freeze(syllables),
    stress_index: stress,
    duration_units: Object.freeze(durations),
    contour,
    pitch_ratio: Object.freeze(pitches),
    crown: text(params.get('crown')) || null,
    tag: raw,
  });
}

export function buildAudibleGlyphPlaybackCue(lexeme, contour = 'level') {
  const control = buildPronunciationContourTag(lexeme, contour);
  const reading = readingFor(lexeme);
  const segments = pronunciationSegments(lexeme, reading, control.syllables);

  return Object.freeze({
    schema: KELYRAN_AUDIBLE_GLYPH_CUE_SCHEMA,
    lexeme_id: control.lexeme_id,
    lemma: text(lexeme.lemma),
    romanization: text(lexeme.romanization),
    pronunciation_tag: control.tag,
    contour: control.contour,
    reading: control.reading,
    segments: Object.freeze(segments.map((segment, index) => Object.freeze({
      index,
      text: segment,
      canonical_syllable: control.syllables[index],
      stressed: index === control.stress_index,
      duration_units: control.duration_units[index],
      pitch_ratio: control.pitch_ratio[index],
      speech_rate: playbackRate(control.duration_units[index]),
    }))),
    authority: Object.freeze({
      mutates_canonical_strokes: false,
      mutates_canonical_lexeme: false,
      playback_metadata_only: true,
      explicit_user_launch_required: true,
    }),
  });
}

export async function playAudibleGlyphCue(cue, {
  speechSynthesis = globalThis.speechSynthesis,
  UtteranceClass = globalThis.SpeechSynthesisUtterance,
  language = 'en-US',
  now = () => new Date(),
} = {}) {
  if (cue?.schema !== KELYRAN_AUDIBLE_GLYPH_CUE_SCHEMA) throw new Error('A compiled Kelyran Audible Glyph cue is required.');
  if (typeof speechSynthesis?.speak !== 'function' || typeof UtteranceClass !== 'function') {
    throw new Error('Browser speech synthesis is unavailable.');
  }

  const scheduled = [];
  for (const segment of cue.segments) {
    const utterance = new UtteranceClass(segment.text);
    utterance.lang = language;
    utterance.pitch = clamp(segment.pitch_ratio, 0.5, 2);
    utterance.rate = clamp(segment.speech_rate, 0.5, 2);
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
    scheduled.push({
      text: segment.text,
      pitch: utterance.pitch,
      rate: utterance.rate,
      stressed: segment.stressed,
      duration_units: segment.duration_units,
    });
  }

  return Object.freeze({
    schema: KELYRAN_AUDIBLE_GLYPH_PLAYBACK_RECEIPT_SCHEMA,
    lexeme_id: cue.lexeme_id,
    pronunciation_tag: cue.pronunciation_tag,
    contour: cue.contour,
    segments_scheduled: scheduled.length,
    speech_language: language,
    canonical_mutation: false,
    scheduled,
    created_at: now().toISOString(),
  });
}
