# Elara Harmonic Composer · Core v0.1 + Export Renderer v0.2

## Exact status

The active implementation is a deterministic browser-native composer mounted in the live STARWELL Elara Codex page.

Current feature labels:

| Capability | Status | Evidence boundary |
|---|---|---|
| Deterministic score generation | VERIFIED | Node validation checks repeatable score events for identical seeds. |
| E minor and C major bodies | VERIFIED | Both key contracts are exercised by the validator. |
| Kelyran, English, and bilingual lyric display | PARTIAL | Data and UI paths exist; browser layout still requires visual review. |
| Movements I–IV | VERIFIED | Four movement contracts and percussion laws are checked in CI. |
| 2025–2027 temporal identity | VERIFIED | Multipliers and below-20-Hz folded projections are checked in CI. |
| Live browser synthesis | PARTIAL | Real Web Audio implementation exists; browser audition remains required. |
| MIDI export | VERIFIED | Binary header, track count, movement/year metadata, and lyric embedding are checked in CI. |
| WAV PCM encoder | VERIFIED | RIFF/WAVE/data structure and stereo frame length are checked in CI. |
| Offline browser WAV rendering | PARTIAL | Real OfflineAudioContext path exists; browser render and downloaded-file audition remain required. |
| FLAC export | DEFERRED | No implementation in this milestone. |
| Sung Kelyran and English voices | DEFERRED | Lyrics are displayed and embedded in MIDI only. |
| Human/AI performance comping | DEFERRED | No import or stem comparison interface yet. |

This is not a finished neural vocal generator or release build. It creates reproducible instrumental score events, displays the approved lyric layer, renders the 2025–2027 temporal identity separately from the audible key, exports symbolic MIDI, renders bounded offline WAV, and saves a transformation receipt.

## Forge provenance note

The canonical project files named in `NIKOLA_VEE_CODING_PROJECT_INSTRUCTIONS.md`, including `03_ACTIVE_ROADMAP.md`, `04_FEATURE_VERIFICATION_MATRIX.md`, and `08_CURRENT_RELEASE_BASELINE.md`, were not found in the Flameclyffe repository, connected Drive search, or File Library under their canonical names during this milestone.

No competing copies were created. This document and PR #78 are therefore a local Elara handoff record, not a substitute for the missing project-level source-of-truth files.

## Source law

Three layers remain distinct:

1. **Canonical source**
   - chapter and movement order
   - named tone roles
   - canonical frequencies
   - year multipliers
   - Kelyran and English lyric text

2. **Musical interpretation**
   - E minor or C major
   - movement-specific harmonic plans
   - melody, bass, inner motion, luminous colour, and cadence
   - deterministic seeded variation

3. **Sensory rendering**
   - 6.2 kHz audible ceiling
   - master gain boundary
   - temporal mirror output
   - live Web Audio playback
   - offline PCM WAV rendering
   - Feather stop

No transformation is treated as canonical source data.

## Composer matrix

The player exposes:

- **Tonality:** E minor or C major
- **Language:** Kelyran, English, or bilingual display
- **Movement:** I–IV or complete cycle
- **Temporal layer:** 2025, 2026, 2027, or the complete triple spiral
- **Render length:** 12-bar audition or 32-bar movement
- **Temporal output:** off, carrier mirror, or true infrasonic mirror
- **Seed:** repeatable composition identity
- **Exports:** JSON receipt, Standard MIDI File, or bounded PCM WAV

## Temporal law

- 2025: `×1.00`
- 2026: `×1.15`
- 2027: `×1.3225`, the compounded Second Spiral Return

The audible musical pitch remains in E minor or C major. The year multiplier applies only to the temporal identity layer.

True infrasonic rendering uses:

```text
f_infra = (f_canonical × year_multiplier) / 256
```

The carrier mirror uses a quiet 73 Hz carrier amplitude-modulated by the same low-frequency sequence for ordinary speakers that cannot reproduce true infrasonic output.

## Movement laws

### I. The Abyss Foundation

- no percussion
- low foundation
- sparse counterpoint
- restrained open tonic cadence

### II. The Silver Horizon

- no percussion
- wider inner motion
- common-tone threshold cadence

### III. The Solar Surge

- first lawful percussion entrance
- stronger ascent and dominant motion
- bright release with headroom

### IV. The Full Spiral Return

- full integration
- percussion remains subordinate to melody
- added-sixth/ninth release

## Current instrument voices

The browser renderer currently uses synthesis roles rather than sample libraries:

1. Foundation: sine bass and pedal memory
2. Inner motion: quiet triangle arpeggiation
3. Narrative voice: gliding triangle melody
4. Luminous colour: restrained sine extension
5. Crown: selective cadence tones
6. Percussion: low filtered sine pulse, beginning only in Movement III

These are scaffolding voices. Later renderers may replace them with hurdy-gurdy, acoustic guitar, violin, piano, strings, sampled instruments, or locally generated performances without changing the score contract.

## MIDI contract

The exporter writes Standard MIDI File format 1 with:

- 480 ticks per quarter note
- a fixed 123 BPM tempo event
- a metadata track containing movement, year, multiplier, metre, cadence, seed, and schema
- lyric meta events for Kelyran, English, or bilingual selections
- separate musical tracks for foundation, inner motion, narrative voice, luminous colour, crown, and percussion when present
- movement-specific time-signature meta events
- no conversion of the temporal identity layer into misleading tempered notes

Temporal identity remains metadata in MIDI because the canonical tones are not equivalent to the selected E-minor or C-major musical pitches.

## WAV contract

The exporter renders:

- stereo PCM WAV
- 16-bit integer samples
- 32 kHz sample rate
- the same audible score events used by the live composer
- the selected temporal mode when enabled
- the same master, low-pass, and limiter boundaries

### Bounded failure path

Offline WAV rendering is limited to five minutes in v0.2. A longer score fails with an explicit message asking the user to export separate years or movements.

This prevents a nine-to-ten-minute triple-spiral render from silently allocating a very large browser audio buffer. Long-form chunked WAV and FLAC rendering remain a later milestone.

## Consent and sensory boundaries

- no surprise playback
- export requires an explicit button press
- temporal output defaults to off
- true infrasonic output is explicitly labelled for suitable hardware
- temporal gain is capped at five percent
- master gain is capped in the UI
- audible synthesis is low-pass limited to 6.2 kHz
- Feather stops composer nodes and the shared Möbius bus
- offline WAV rendering does not begin live playback
- no medical or guaranteed-effect claims

## Validation

Run:

```bash
node scripts/validate-elara-composer.mjs
```

The validator checks:

- both keys exist
- all four movements exist
- 2025, 2026, and 2027 multipliers are correct
- Movement I and II contain no percussion
- Movement III contains percussion
- infrasonic projections remain below 20 Hz
- repeated seeds reproduce the same score
- the complete bilingual triple spiral includes all years and movements
- MIDI begins with `MThd` and contains at least one metadata and one musical track
- MIDI embeds the selected year, movement title, and lyric text
- WAV begins with `RIFF`, contains `WAVE` and `data`, and reports the expected stereo PCM length
- the five-minute WAV boundary accepts and rejects the correct score durations

## Files in this milestone

```text
assets/elara-composer-core.js
assets/elara-composer-export.js
assets/elara-temporal-2027-adapter.js
assets/elara-codex-bootstrap.js
starwell/elara-codex.html
scripts/validate-elara-composer.mjs
.github/workflows/elara-composer-validation.yml
docs/elara-harmonic-composer-v0.1.md
```

## Known limitations

- Browser playback and downloaded WAV output still require direct audition on desktop and mobile browsers.
- MIDI captures symbolic equal-tempered musical notes, not expressive articulation or microtonal temporal carriers.
- Bilingual lyrics are metadata and display text, not yet timed sung phonemes.
- No persistence of generated score variations beyond downloaded receipts and files.
- No packaged desktop integration yet.
- No FLAC, stem export, sampled instrument bank, or vocal synthesis.
- No Boxfire QA evidence has yet been attached to the PR.

## Next dependency-ordered milestone

1. Bind lyric syllables and Audible Glyph duration/stress records to narrative melody events.
2. Split the narrative melody into independent first-soprano and baritone symbolic tracks.
3. Export those guide tracks in MIDI and WAV stems.
4. Add a small, local Elara instrument bank for hurdy-gurdy, acoustic guitar, and violin.
5. Add long-form chunked WAV and FLAC rendering.
6. Add phonetic Kelyran guide synthesis.
7. Add human and AI performance import, comparison, and comping.
8. Preserve approved variations with their seed, source, and receipt.
