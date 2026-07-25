# Elara Harmonic Composer Core v0.1

## Status

This is the first deterministic browser-native composer for the live STARWELL Elara Codex page.

It is an auditionable composition engine, not a finished neural vocal generator. It creates reproducible instrumental score events, displays the approved Kelyran or English lyric layer, renders the 2025–2027 temporal identity path separately from the audible key, and saves a transformation receipt.

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
   - Feather stop

No transformation is treated as canonical source data.

## Matrix

The player exposes:

- **Tonality:** E minor or C major
- **Language:** Kelyran, English, or bilingual display
- **Movement:** I–IV or complete cycle
- **Temporal layer:** 2025, 2026, 2027, or the complete triple spiral
- **Render length:** 12-bar audition or 32-bar movement
- **Temporal output:** off, carrier mirror, or true infrasonic mirror
- **Seed:** repeatable composition identity

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

## Consent and sensory boundaries

- no surprise playback
- temporal output defaults to off
- true infrasonic output is explicitly labelled for suitable hardware
- temporal gain is capped at five percent
- master gain is capped in the UI
- audible synthesis is low-pass limited to 6.2 kHz
- Feather stops composer nodes and the shared Möbius bus
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

## Next build after v0.1 approval

1. Add symbolic MIDI export.
2. Add WAV and FLAC offline rendering.
3. Replace scaffold voices with an Elara instrument bank.
4. Bind lyric syllables and Audible Glyph duration records to melody events.
5. Add separate baritone and first-soprano guide tracks.
6. Add phonetic Kelyran guide synthesis.
7. Add human and AI performance import, comparison, and comping.
8. Preserve every generated variation with its seed and receipt.
