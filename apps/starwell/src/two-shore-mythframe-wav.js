import {
  ELEVEN_YEAR_WAV_SCHEMA,
  buildCompleteElevenYearSequence,
  compactElevenYearReceipt,
  renderCompleteElevenYearWav,
} from './two-shore-eleven-year-wav.js';
import {
  TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA,
  assertCompleteYearMythframe,
  buildElevenYearMythframe,
  mythframeLineForEvent,
} from './two-shore-mythframe.js';

export const MYTHFRAME_WAV_SCHEMA = 'hearthgate.two-shore-mythframe-wav/v0.1';

function chapterMap(mythframe) {
  return new Map(mythframe.chapters.map((chapter) => [chapter.year, chapter]));
}

function attachEventMythframe(event, chapter) {
  const frame = mythframeLineForEvent(chapter, event);
  if (!frame?.frame_id || !frame?.compression_line || !frame?.release_line || !frame?.tone) {
    throw new Error(`MYTHFRAME_TONE_EVENT_INCOMPLETE:${event.year}:${event.segment}:${event.cycle_index}`);
  }
  return Object.freeze({
    ...event,
    mythframe_frame_id: frame.frame_id,
    mythframe_compression_line: frame.compression_line,
    mythframe_release_line: frame.release_line,
    mythframe_full_line: frame.full_line,
    tone_generated_from_mythframe: true,
  });
}

export function attachMythframeToElevenYearSequence(sequence) {
  if (sequence?.schema !== ELEVEN_YEAR_WAV_SCHEMA || sequence?.complete !== true) {
    throw new Error('COMPLETE_ELEVEN_YEAR_SEQUENCE_REQUIRED_BEFORE_MYTHFRAME');
  }
  const mythframe = buildElevenYearMythframe(sequence);
  const chapters = chapterMap(mythframe);
  const years = Object.freeze(sequence.years.map((year) => {
    const chapter = chapters.get(year.year);
    assertCompleteYearMythframe(chapter, year);
    return Object.freeze({ ...year, mythframe: chapter });
  }));
  const events = Object.freeze(sequence.audio_plan.events.map((event) => {
    const chapter = chapters.get(event.year);
    if (!chapter) throw new Error(`MYTHFRAME_CHAPTER_MISSING:${event.year}`);
    return attachEventMythframe(event, chapter);
  }));
  const cues = Object.freeze(sequence.audio_plan.cues.map((cue) => {
    const chapter = chapters.get(cue.year);
    if (!chapter) throw new Error(`MYTHFRAME_CUE_CHAPTER_MISSING:${cue.year}`);
    return Object.freeze({
      ...cue,
      label: `${cue.year} · ${chapter.opening_line}`,
      mythframe_fingerprint: chapter.fingerprint,
      mythframe_closing_line: chapter.closing_line,
    });
  }));
  if (events.some((event) => event.tone_generated_from_mythframe !== true)) {
    throw new Error('MYTHFRAME_TONE_GATE_FAILED');
  }
  return Object.freeze({
    ...sequence,
    years,
    audio_plan: Object.freeze({
      ...sequence.audio_plan,
      events,
      cues,
      mythframe_required_for_every_tone_event: true,
      mythframe_event_count: events.length,
    }),
    mythframe,
    mythframe_required_for_tone: true,
    generation_law: 'math-state → mythframe → tone-event',
    complete: true,
  });
}

export function assertCompleteMythframeWavSequence(sequence) {
  if (
    sequence?.schema !== ELEVEN_YEAR_WAV_SCHEMA
    || sequence?.complete !== true
    || sequence?.mythframe?.schema !== TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA
    || sequence?.mythframe?.complete !== true
    || sequence?.years?.length !== 11
    || sequence?.audio_plan?.cues?.length !== 11
  ) {
    throw new Error('MYTHFRAME_WAV_SEQUENCE_INCOMPLETE');
  }
  for (const year of sequence.years) assertCompleteYearMythframe(year.mythframe, year);
  for (const event of sequence.audio_plan.events) {
    if (
      !event.mythframe_frame_id
      || !event.mythframe_compression_line
      || !event.mythframe_release_line
      || event.tone_generated_from_mythframe !== true
    ) {
      throw new Error(`MYTHFRAME_WAV_EVENT_UNBOUND:${event.year}:${event.segment}:${event.cycle_index}`);
    }
  }
  return true;
}

export function buildCompleteMythframeElevenYearSequence(options = {}) {
  return attachMythframeToElevenYearSequence(buildCompleteElevenYearSequence(options));
}

export function renderCompleteMythframeElevenYearWav(sequence, options = {}) {
  assertCompleteMythframeWavSequence(sequence);
  const wav = renderCompleteElevenYearWav(sequence, options);
  return Object.freeze({
    ...wav,
    schema: MYTHFRAME_WAV_SCHEMA,
    mythframe_schema: sequence.mythframe.schema,
    mythframe_fingerprint: sequence.mythframe.fingerprint,
    mythframe_chapter_count: sequence.mythframe.chapter_count,
    mythframe_axis_frame_count: sequence.mythframe.axis_frame_count,
    mythframe_tone_event_count: sequence.audio_plan.mythframe_event_count,
    generation_law: sequence.generation_law,
    complete: true,
  });
}

export function compactMythframeElevenYearReceipt(sequence, wavReceipt) {
  assertCompleteMythframeWavSequence(sequence);
  const base = compactElevenYearReceipt(sequence, wavReceipt);
  return Object.freeze({
    ...base,
    schema: 'hearthgate.two-shore-mythframe-eleven-year-save-receipt/v0.1',
    mythframe: Object.freeze({
      schema: sequence.mythframe.schema,
      fingerprint: sequence.mythframe.fingerprint,
      chapter_count: sequence.mythframe.chapter_count,
      axis_frame_count: sequence.mythframe.axis_frame_count,
      generation_law: sequence.generation_law,
      opening_line: sequence.mythframe.opening_line,
      closing_line: sequence.mythframe.closing_line,
      chapters: Object.freeze(sequence.mythframe.chapters.map((chapter) => Object.freeze({
        year: chapter.year,
        fingerprint: chapter.fingerprint,
        opening_line: chapter.opening_line,
        closing_line: chapter.closing_line,
        source_earth_state_id: chapter.source_earth_state_id,
        source_target_state_id: chapter.source_target_state_id,
        final_earth_state_id: chapter.final_earth_state_id,
        final_target_state_id: chapter.final_target_state_id,
      }))),
    }),
    wav: Object.freeze({
      ...base.wav,
      mythframe_tone_event_count: wavReceipt.mythframe_tone_event_count,
      mythframe_chapter_count: wavReceipt.mythframe_chapter_count,
    }),
    complete: true,
  });
}
