'use strict';
// WTL Enochian register v0.1: pure, deterministic ritual records.
// No glyph is assigned without an approved historical mapping.
// This module does not translate Angelical words or invoke an entity.
const { digest } = require('./canonical.cjs');

// Working romanized names in manuscript order (21 = three groups of seven).
// Spellings vary among transcription traditions. These are reference labels,
// not an approved Skýrunor alias table or font/glyph implementation.
const ANGELIC_LETTER_NAMES = Object.freeze([
  'Pa', 'Veh', 'Ged', 'Gal', 'Or', 'Un', 'Graph',
  'Tal', 'Gon', 'Na', 'Ur', 'Mals', 'Ger', 'Drux',
  'Pal', 'Med', 'Don', 'Ceph', 'Van', 'Fam', 'Gisg',
]);
const TRANSCRIPTION_VARIANTS = Object.freeze({ 14: Object.freeze(['Drun']), 21: Object.freeze(['Gisa']) });
const MANUSCRIPT_NOTE =
  'Dee/Kelley Angelical alphabet (26 March 1583, Sloane MS 3188); comparison: esotericarchives.com/dee/holy_table_lettering.pdf; variants documented';

function boundedText(value, label, limit) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be text');
  const normalized = value.normalize('NFC').trim();
  if (!normalized || normalized.length > limit || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new RangeError(label + ' must be nonempty printable text of at most ' + limit + ' UTF-16 code units');
  }
  return normalized;
}

function seal(record) {
  return Object.freeze({ ...record, recordHash: digest(record) });
}

/** An inscription is author-provided text, not an automatically verified translation. */
function enochianInscription(text, sourceLabel = 'author-supplied') {
  return seal({
    schema: 'wyrdrune.ritual.enochian/v0.1',
    kind: 'inscription',
    tradition: 'Angelical/Enochian',
    transcription: boundedText(text, 'inscription', 512),
    sourceLabel: boundedText(sourceLabel, 'source label', 160),
    sourceStatus: 'unverified-author-assertion',
    translation: null,
    glyphs: null,
    effect: 'none',
  });
}

/** The 1-based index preserves the manuscript's three groups of seven. */
function angelicLetter(index) {
  if (!Number.isSafeInteger(index) || index < 1 || index > 21) {
    throw new RangeError('angelicLetter index must be an integer from 1 to 21');
  }
  return seal({
    schema: 'wyrdrune.ritual.enochian-letter/v0.1',
    kind: 'letter-reference',
    ordinal: index,
    heptad: Math.ceil(index / 7),
    positionInHeptad: ((index - 1) % 7) + 1,
    romanizedName: ANGELIC_LETTER_NAMES[index - 1],
    variants: TRANSCRIPTION_VARIANTS[index] || [],
    historicalNote: MANUSCRIPT_NOTE,
    glyph: null,
    glyphStatus: 'awaiting-source-verified-mapping',
    effect: 'none',
  });
}

/** A dedication names an intention; it never dispatches a device or model. */
function votive(name, dedication) {
  return seal({
    schema: 'wyrdrune.ritual.votive/v0.1',
    kind: 'votive-intention',
    name: boundedText(name, 'votive name', 120),
    dedication: boundedText(dedication, 'dedication', 512),
    provenance: 'author-declared',
    effect: 'none',
  });
}

module.exports = { ANGELIC_LETTER_NAMES, enochianInscription, angelicLetter, votive };
