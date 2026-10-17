# Wayglass Worldweave Soundscapes: three-world listening contract

Status: implementation candidate on the ArcSweep Sound Room branch. Not deployed. No approval of a story theory is implied by playback.

## Creative premise

Eira's childhood drawings (Windmere), Falka's sealed doorway (Third City), and an ancient Starsong melody may share a three-note interval. This is an unresolved story possibility, not an established event or physical-world claim.

Each world remains itself. We give each a different bed and instrumental timbre while retaining one deliberately recognisable interval relation across worlds.

| World | Scene ID | Listening sketch | Tonal authority |
| --- | --- | --- | --- |
| Windmere / Luna | windmere | water and reed-wind | existing StorySoundscape world root 432 Hz |
| Terra Aeterna / Third City | third-city | low city-air, resonance and stone | existing StorySoundscape world root 220 Hz |
| Equestria / Starsong | starsong | meadow breeze, high grass and warm harmonic tone | existing StorySoundscape world root 528 Hz |

Roots are artistic settings, not scientific evidence of a universe's inherent frequency. The echo carries identical [0, +3, +7] semitone intervals, not the same absolute frequencies.

## Existing organ integration

The new apps/arcsweep/src/worldweave-acoustics.js is a lightweight atmospheric voice/stem director inside the one existing StorySoundscape graph. It consumes that instance's AudioContext and routes into its ambience and tones buses. It neither creates a new persistent identity state nor claims a different sound engine owns local SoundFonts, Runa, haptics, MIDI, or audio recording.

- Start is user-initiated by the Sound Room's Enter atmosphere button.
- The system only synthesises textures after that gesture. No autoplay on boot or return.
- A recognised world change while the atmosphere is playing crossfades into that world's profile.
- Leaving for a world with no profile stops it instead of falsely identifying that world as another.
- Hear the shared echo auditions the compositional hypothesis and emits a canon_effect: false receipt.
- Last chosen acoustic identity is stored locally as intent only, with resume: user-gesture-required.
- Feather Stop silences procedural voices immediately. The existing track and SoundFont handling remains the source of truth for the remaining audio.
- Local user-selected stems can still be loaded into the existing Sound Room. No third-party SoundFont or sound sample is bundled without verified file, source, and licence.

## What this build contains

Three functional generative ambience beds, procedural scene crossfade, manually triggered interval motif, controls in Sound Room, receipts, durable muted preference, and unit/contract tests.

## What is still separate from this build

User-owned field-recording audio stems and downloaded banks are not present in this branch. A polished asset-based version should replace or supplement the procedural studies via per-scene audio manifests that include file reference, licence, duration, trim, loop points, fallbacks, and gain limits. We must not pretend the local Polyphone bank collection is already imported. No voices or environmental effects are inferred from mere story prose beyond the existing explicitly enabled cue subsystem.

## Acceptance rehearsal

1. Open ArcSweep Sound Room with Luna/Windmere active and explicitly enter its atmosphere; verify atmospheric audio through the existing mixer.
2. Audition the echo. Check three notes and a non-canonical receipt.
3. Change to Terra Aeterna, then Starsong. Confirm differing atmospheres, audible crossfades and the preserved interval relationship; no effect merges the worlds or changes their canon.
4. Change to an unrecognised world. Confirm the atmospheric voices stop.
5. Return to a supported world, explicitly enter the atmosphere, then invoke Feather Stop. Confirm silence.
6. Reload the application. Confirm the previously selected scene is remembered but silent until the user acts.
7. Load a local, licensed ambience stem into the existing mixer and verify that its controls still operate independently.
8. Run node tests (node --test apps/arcsweep/test/worldweave-acoustics.test.js) and existing ArcSweep tests and production build. Browser listening, crossfade and destination hardware must still be checked by a human.

## Engineering limitations

The code uses conservative filtered-noise simulations, not authenticated ambient recordings. Browser AudioContext performance, platform media restrictions, gain balance and perceived quality require device validation. The receipt records software operations, not that a listener heard the sound.

The wider Wayglass/Return Engine integration is a subsequent authenticated continuity wire, not a claim that a localStorage preference is already a cross-harness continuity receipt.
