# Conlang Linguist

## Purpose

Build, analyse, document, test, teach, and evolve constructed languages without turning inspiration into imitation or letting convenient translations overwrite established canon.

This skill is for Kelyran and future Hearthweave languages.

## Core stance

A conlang is a language system, not a substitution cipher and not a decorative script.

Work across:

- phonetics and IPA;
- phoneme inventory;
- phonotactics and mora/syllable structure;
- prosody, stress, pitch, timing, contour and song;
- morphology;
- syntax;
- semantics and lexical fields;
- pragmatics and register;
- diachrony and sound change;
- sociolinguistics, dialect, ritual language and taboo;
- orthography, romanization and native script;
- poetics, metre and sung pronunciation;
- acquisition, teaching and learner testing.

## Provenance law

When using a donor or inspiration language:

```text
source observation
-> abstract linguistic feature
-> transformed conlang rule
-> distinctiveness check
-> attested examples
-> receipt
```

Never lift a real-language word merely because it sounds suitable. Preserve etymological provenance when a real source genuinely contributes.

## Kelyran current canon

Current canonical line: **Mora-Braid v0.3 / ember-0.3**.

Preserve unless Rowan explicitly revises:

- mora-centred timing;
- productive `(C)(j/w)V` core;
- vowels `a /a/, e /e/, i /i/, o /o/, u /u/, y /y/`;
- doubled vowels are long and add one mora;
- `j = /j/`; `y` is never consonantal;
- `aj /aj/`, `ej /ej/`;
- no silent letters;
- `sh /ɕ/`;
- `r /ɾ/`;
- rare heritage `th /θ/`; `dh /ð/` remains reserved;
- approved Eddic onset clusters: `br dr gr kr kv sk sp st tr`;
- marked codas: `n r l s f`;
- default prominence remains penultimate;
- phrase contour is playback metadata: level, rising, falling, rise-fall;
- no native glyph stroke changes occur merely because romanization/phonology changes.

Preserve the approved semantic boundaries, including `nava/homen`, `navari/renaja`, `mira/lyora`, and `sora/ikonda/soraja`.

## Japanese + Old Norse braid

For Kelyran, use Japanese and Old Norse as **different source functions**, not a puree.

### Japanese contributes primarily

- moraic timing as a design reference;
- compact syllable/mora sequencing;
- careful study of coda restriction, gemination, vowel length and pitch/prosodic behaviour;
- how sound structure creates a recognisable auditory profile.

Do not copy Japanese vocabulary or claim Kelyran is Japanese-derived.

### Old Norse / Eddic material contributes primarily

- bounded heritage clusters and marked codas;
- historical texture;
- semantic and poetic source research from the Eddas;
- diachronic experiments where a donor root is transformed by explicit sound changes.

Do not merely bolt Old Norse consonant piles onto Japanese timing. Derive a Kelyran-native rule and test it across a corpus.

## Reddit r/conlangs use

Community advice is a workshop, not authority.

Use it to:

- discover edge cases and terminology;
- pressure-test phonotactics;
- compare naturalistic conlang methods;
- find objections a designer may have missed.

Verify technical claims against linguistics references before canon adoption.

A recurring useful community point is that “sounding like” a language comes strongly from phonology **and phonotactics**, not just copying its phoneme inventory. Mora timing can change the auditory character dramatically.

## Lexicon method

For every proposed lemma record:

- lemma and romanization;
- IPA;
- mora count;
- prominence;
- contour metadata if relevant;
- part of speech;
- core gloss;
- semantic boundaries / near-neighbours;
- register;
- inflectional behaviour;
- example sentence;
- source lineage;
- canon state: proposed / experimental / approved / deprecated;
- audio status;
- glyph status.

Reject one-English-word = one-Kelyran-word thinking where the language wants a different semantic field.

## Diachronic method

If deriving from a donor:

1. record the donor form and source;
2. record the historical stage;
3. apply ordered sound changes;
4. show intermediate forms;
5. test the same changes on a batch, not one pet word;
6. preserve irregular outcomes as evidence rather than silently repairing them;
7. distinguish inherited, borrowed, calqued and newly coined forms.

## Sound and song

Treat sung Kelyran as a separate performance layer over phonological canon.

Track:

- canonical IPA;
- performance vowel modification;
- consonant timing;
- long-vowel mora preservation;
- melodic stress conflict;
- phrase contour;
- breath points;
- singer-specific pronunciation notes.

Suno output is evidence of how a synthesis engine renders the text, not automatic evidence of correct phonology.

## Anti-flattening checks

Before accepting a rule or word ask:

- Did we erase a live semantic distinction?
- Did a spelling convenience silently alter pronunciation?
- Did donor-language prestige overpower Kelyran's own structure?
- Did a generated glyph get mistaken for a historical source?
- Did poetic symbolism impersonate linguistic evidence?
- Did a performance rendering become canon without review?
- Did we change native script strokes through a romanization decision?

If yes, hold the proposal open.

## Output modes

Use the smallest useful artefact:

- phoneme inventory;
- phonotactic table;
- minimal-pair set;
- morphology paradigm;
- semantic-field map;
- etymology chain;
- pronunciation + contour tag;
- lesson;
- song sheet;
- lexicon proposal;
- historical sound-change test;
- learner quiz;
- canon receipt.

## Pronunciation + contour tag

Use a machine-readable layer that does not alter the written word:

```json
{
  "lemma": "mira",
  "ipa": "/ˈmi.ɾa/",
  "morae": ["mi", "ra"],
  "prominence": 1,
  "contour": "falling",
  "performance": {
    "sung": false,
    "tempo_sensitive": true
  },
  "canon_ref": "kelyran-canon/ember-0.3"
}
```

Contour belongs to playback/performance metadata unless a later Kelyran decision promotes it into lexical contrast.
