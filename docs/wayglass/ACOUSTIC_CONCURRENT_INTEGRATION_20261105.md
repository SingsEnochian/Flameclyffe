# Acoustic systems concurrent integration — 2026-11-05

## Purpose and baseline

Implement the Century Architecture as cooperating Wayglass modules: shared spatial state, field instruments, acoustic buses, Mirror comparison, local return, and an inspectable room. This work extends PR #539 from `53da0246773aca1901605da28874e9e92f4f158a`, whose base matches the current canonical `wayglass/current` head `8bb0e3b5938f694e56028d54a2f092102bcd4b96` at inspection time. Existing baseline Wayglass Check run: `42091740702` (success); that result does not verify the new implementation.

## Coordinated ownership

Six concurrent engineering agents worked under one integrator. File ownership prevented competing rewrites; interface agreements preceded integration, and an independent review lane examined cross-module behavior.

| Lane | Owned responsibility | Public boundary |
| --- | --- | --- |
| Field engineering | numerical field and marker state validation | potential, gradient, displacement, Jacobian, instrument snapshot, marker intents/recovery |
| Acoustic engineering | optional browser audio lifecycle, bus graph, bounded status voices | createAcousticAudioEngine: start, update, signal, stop, dispose, getState |
| Snapshot engineering | local spatial snapshots, branch lineage, frame/model agreement | createWorld, advanceWorld, forkWorld, compareWorlds, worldReceipt, recoverWorld |
| Room integration | controls, field projection, comparison and local storage | mountWayglassAcousticRoom with cleanup lifecycle |
| System verification | cross-module voyage and actual room-handler regressions | Node tests using deterministic numeric and DOM/audio fixtures |
| Independent review | corruption, lifecycle, projection and authority analysis | findings returned to file owners and integrator |

## State and control flow

An input becomes a typed marker intent, then a validated world revision. Field, visual, textual and acoustic projections read the same world snapshot and model parameters. Pointer placement is an event, including its revision, so it can survive the same cold-return checks as keyboard movement. Mirror creates a branch with an explicit parent and changed field conditions; comparison preserves the primary branch.

The snapshot module owns local simulation data only. It does not create a replacement participant kernel, server ledger, route permission system or identity store. Crossing controls preserve the existing request-only behavior. Durable participant authority remains in the host/kernel.

## Module invariants

- Coordinates use an explicit normalized screen frame; units and model version travel with the state. The rendered grid and numerical readouts use the same parameters.
- Field inputs reject nonfinite and invalid typed parameters. The smaller Jacobian singular value uses a cancellation-resistant calculation. Serialized unbounded conditions carry `null` and an explicit status instead of silent JSON conversion of Infinity.
- Marker recovery rejects corrupted source positions, selection coercion, unsafe revisions and untyped/noncontiguous event histories.
- World snapshots validate frame, model, source provenance, content tag, size and lineage. The FNV diagnostic tag detects accidental modification; it is not an authorization credential or cryptographic signature.
- Independent ambience, navigation and status buses share a bounded digital gain budget and compression stage. Ambience mute leaves the other buses available. Device acoustic output levels require separate measurement.
- Audio starts through an explicit action. Stop/dispose invalidates pending resume, disconnects output and cancels active cues. Accepted signal IDs deduplicate within a bounded 256-entry session window, with at most four simultaneous status voices.
- Browser suspension is inspectable; explicit restart resumes the retained graph without duplicate oscillators. Audio allocation failures clean up partially created nodes.
- Local recovery restores scientific/spatial state muted. Unsupported/corrupt return data leaves the current world available and reports a failed recovery.

## Review-driven corrections

Preserve these as useful integration failure history:

1. Initial saved field model defaults differed from room-renderer defaults. Room rendering now consumes the world model parameters.
2. Initial direct pointer placement incremented marker revision without adding an event. A typed `place` intent now records valid history.
3. Initial scene/path projections used differing scales and a world angle on rectangular stages. The room now shares a projection scale and computes path angle in screen pixels.
4. Audio review found partial-allocation cleanup and suspended-context restart gaps. Regression tests now exercise both.

## Verification and operational limits

Observed local verification on Node 24.22.1: **58/58 tests passed**, across the six focused suites: audio engine (13), marker (14), field (11), world snapshots (10), integrated voyage (5), and actual room mount through a DOM adapter (5). Syntax checks passed for the acoustic modules, field model and room. Tests were run after all agent files were frozen. The DOM adapter executes the production mount and handlers with real model imports and a captured audio graph; it does not establish browser layout or physical playback.

Command: `node --test apps/wayglass/test/acoustic-audio-engine.test.js apps/wayglass/test/acoustic-marker.test.js apps/wayglass/test/field-instrument.test.js apps/wayglass/test/acoustic-world-model.test.js apps/wayglass/test/acoustic-system-voyage.test.js apps/wayglass/test/acoustic-room-ui.test.js`.

Full repository verification remains the existing Wayglass Check workflow, which also stages the host, tests host behavior, verifies contracts, and builds both Wayglass and ArcSweep. Record the exact implementation commit and observed run result separately from later documentation commits.

This execution environment has no terminal Git clone credential and no installed Playwright Chromium executable. Source was obtained through the connected GitHub integration. A real-browser launch was attempted and failed before page execution because the Chromium executable was absent. DOM fixture execution is a separate evidence class from real browser rendering, audio-device output and Osia playback. No device or deployment verification follows from these local tests.

The century horizon remains the parent design. This implementation delivers its shared-state acoustic/field laboratory foundations; additional solver families, planetary coordinate frames, HRTF/head tracking, live telemetry and distributed persistence retain their own implementation and measurement gates.
