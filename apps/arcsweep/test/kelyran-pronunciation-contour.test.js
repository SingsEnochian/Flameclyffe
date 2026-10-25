import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KELYRAN_AUDIBLE_GLYPH_CUE_SCHEMA,
  KELYRAN_AUDIBLE_GLYPH_PLAYBACK_RECEIPT_SCHEMA,
  KELYRAN_PRONUNCIATION_CONTOUR_SCHEMA,
  buildAudibleGlyphPlaybackCue,
  buildPronunciationContourTag,
  parsePronunciationContourTag,
  playAudibleGlyphCue,
} from '../src/kelyran-pronunciation-contour.js';

const MIRA = Object.freeze({
  id: 'kel-mira',
  lemma: 'mira',
  romanization: 'mira',
  pronunciation: 'MEE-rah',
  syllables: ['mi', 'ra'],
  stress: { primarySyllable: 1, indexBase: 1 },
  script: '',
  scriptStatus: 'pending-runic-expression',
});

test('pronunciation-plus-contour tag is explicit, round-trippable, and leaves canonical data untouched', () => {
  const before = JSON.stringify(MIRA);
  const tag = buildPronunciationContourTag(MIRA, 'rising');

  assert.equal(tag.schema, KELYRAN_PRONUNCIATION_CONTOUR_SCHEMA);
  assert.equal(tag.lexeme_id, 'kel-mira');
  assert.equal(tag.reading, 'MEE-rah');
  assert.equal(tag.reading_source, 'pronunciation-guide');
  assert.deepEqual(tag.syllables, ['mi', 'ra']);
  assert.deepEqual(tag.duration_units, [1.25, 0.75]);
  assert.deepEqual(tag.pitch_ratio, [0.94, 1.08]);
  assert.match(tag.tag, /^\[kelyran-pron\/v0\.1\?/);

  const parsed = parsePronunciationContourTag(tag.tag);
  assert.equal(parsed.lexeme_id, tag.lexeme_id);
  assert.equal(parsed.reading, tag.reading);
  assert.equal(parsed.contour, 'rising');
  assert.deepEqual(parsed.syllables, tag.syllables);
  assert.deepEqual(parsed.duration_units, tag.duration_units);
  assert.deepEqual(parsed.pitch_ratio, tag.pitch_ratio);
  assert.equal(JSON.stringify(MIRA), before);
  assert.equal(MIRA.script, '');
});

test('Audible Glyph cue compiles pronunciation guide, stress timing, and contour without creating stroke data', () => {
  const cue = buildAudibleGlyphPlaybackCue(MIRA, 'falling');

  assert.equal(cue.schema, KELYRAN_AUDIBLE_GLYPH_CUE_SCHEMA);
  assert.equal(cue.authority.mutates_canonical_strokes, false);
  assert.equal(cue.authority.mutates_canonical_lexeme, false);
  assert.equal(cue.authority.playback_metadata_only, true);
  assert.equal(cue.segments.length, 2);
  assert.equal(cue.segments[0].text, 'MEE');
  assert.equal(cue.segments[0].stressed, true);
  assert.equal(cue.segments[0].duration_units, 1.25);
  assert.equal(cue.segments[1].text, 'rah');
  assert.ok(cue.segments[0].pitch_ratio > cue.segments[1].pitch_ratio);
  assert.equal(Object.hasOwn(cue, 'strokes'), false);
});

test('browser playback schedules explicit pronunciation segments with contour-derived pitch and produces a receipt', async () => {
  const cue = buildAudibleGlyphPlaybackCue(MIRA, 'rise-fall');
  const spoken = [];
  class FakeUtterance {
    constructor(value) {
      this.text = value;
      this.lang = '';
      this.pitch = 1;
      this.rate = 1;
      this.volume = 1;
    }
  }
  const speechSynthesis = { speak: (utterance) => spoken.push({ ...utterance }) };

  const receipt = await playAudibleGlyphCue(cue, {
    speechSynthesis,
    UtteranceClass: FakeUtterance,
    now: () => new Date('2026-10-02T13:00:00.000Z'),
  });

  assert.equal(receipt.schema, KELYRAN_AUDIBLE_GLYPH_PLAYBACK_RECEIPT_SCHEMA);
  assert.equal(receipt.canonical_mutation, false);
  assert.equal(receipt.segments_scheduled, 2);
  assert.deepEqual(spoken.map((item) => item.text), ['MEE', 'rah']);
  assert.equal(spoken[0].lang, 'en-US');
  assert.equal(receipt.created_at, '2026-10-02T13:00:00.000Z');
});

test('tagging refuses guessed pronunciation and invalid contour labels', () => {
  assert.throws(() => buildPronunciationContourTag({ id: 'kel-unknown', syllables: ['x'] }, 'level'), /explicit pronunciation/i);
  assert.throws(() => buildPronunciationContourTag(MIRA, 'wibbly'), /Contour must be one of/i);
});
