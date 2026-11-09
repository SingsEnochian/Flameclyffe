# Acoustic composition integration

Worker `/root/motion`; integration owner `/root`. Independent branch `wayglass/lane-acoustic-composition-20261108`, base local integration `004ee2d2258db00f9ba5f839358a29e62b445c15`, source-equivalent to remote candidate `1038e54d` (tree `a01f9bb`). Canonical development is separately `wayglass/current` at `15467ce4ac5dc93d30a80e58302b5bda8597dc07`; main remains release. This is a selective additive port, not a release/production change.

## Purpose and ownership

Wayglass inherits ArcSweep's acoustic and world instruments in one vessel. The existing Acoustic Room now exposes its actual `audio.composition` through an expandable Spatial Soundstage. No somatic composition is substituted for the acoustic engine. The existing somatic bus remains the already-adopted shared Feather broadcaster.

`acoustic-composition.js` owns the acoustic-local Wyrdrune binding, literal optional story text, an immutable field receipt anchor captured on the first valid source declaration, and complete regional return validation. It uses the unchanged owner-authored WTL score through `createStoryCompositionBinding`; it computes no replacement musical formulas. Independent voice and affinity declarations remain explicit and blank until supplied. Story metrics are literal acoustic-local text with source `acoustic-local:story-input`; turns are zero because no conversation turns are observed here.

The shared soundstage receives explicit acoustic composition, soundscape Feather delegates and story binding. The existing navigation, field instruments, mono preference, status cues and three original audio buses retain their owned behavior.

## Runtime behavior

- Expand `Compose this acoustic landscape` (`data-acoustic-composition-panel`). Shared controls mount into `data-acoustic-composer`; optional text is `data-acoustic-story`.
- Fresh mounted regions generate quietly under Rowan's standing choice. Missing declarations remain visibly source-unavailable; no procedural substitute or invented voices are played.
- Explicit composition playback synchronizes the existing acoustic sound/ambience flags. Rendering or moving the probe no longer silently disables this output. Mono synchronizes both controls.
- Muting output preserves score generation. Default `audio.stop()`/dispose and Feather still pause it; the engine's optional `pauseComposition:false` is used only for muted projection updates and explicit silence.
- Global Feather stops the acoustic generator, output and shared ship buses. Explicit release starts neither generation nor sound.
- Leaving the Acoustic Room preserves a regional checkpoint and retains its existing audio-disposal boundary. Reentry restores declarations, literal text and the actual anchor paused/silent (`return-held`); it does not silently restart.
- Existing Stone Save/Recover stores a source-bound sound extension in the same validated world receipt. Legacy world receipts still recover. Full world and sound validation precedes mutation or writing; corrupt sound provenance leaves the active world and score intact. Oversized combined world receipts cannot overwrite a valid saved return.
- The soundstage's own save/recover methods use the same complete binding+score adapter. Cached program output cannot authorize playback until fresh source evaluation.

## Acceptance and evidence

Criteria: unchanged acoustic/nav/calibration regressions; actual WTL execution with two declared voices and immutable world anchor; no AudioContext on quiet entry; separate generation/playback; field edits preserve explicit playback; global Feather and release behavior; complete paused/silent source-preserving cold return; rejected corrupt receipts cause no live mutation; listeners and audio release on cleanup.

Node 24.22.1: **56/56 relevant tests passed** across acoustic engine, world model, room UI, new acoustic composition adapter, shared composition UI and engine suites. New adapter tests execute the actual authored WTL score (16 phase receipts), literal metrics and source hash validation. Mounted-room tests use production handlers with an explicit audio/DOM adapter, exercise real composition/binding, save/recover, field changes, shared stop and regional cold remount. Audio adapter counts verify no sound context on entry; these are not physical output/hearing tests.

A first mounted-room test exposed an inherited Feather latch from the prior test. The test now explicitly releases and starts, preserving the real consent latch instead of bypassing it. Initial failure retained in execution history; no runtime latch weakened.

`npm run wayglass:build` passed (151 modules; existing large-main-chunk warning remains). Syntax and diff checks passed. Browser desktop/mobile acoustic composition and physical output are pending root's actual combined-source gate. Root will include `apps/wayglass/test/acoustic-composition.test.js` in the cross-lane matrix; no matrix file changed here.

No provider inference, installed Windows/Osia verification, credentials/auth/RLS changes, production deployment, merge, spending or private-data training occurred. Model/provider exact IDs are not exposed by this executor; this receipt attributes the coding worker only.
