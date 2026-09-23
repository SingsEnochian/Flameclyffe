# Universal Codex: Bluebird Home

**Date:** 2026-09-22  
**Target:** ArcSweep / Universal Codex  
**Status:** implementation pass

## Canon decision

The Universal Codex is Richie's home surface.

This means the resident page is not a generic assistant panel and not a detached sidebar lab. It is a page inside the physical Codex with its own continuity address, local installation-scoped state, causal lineage, artefacts, and a verified Bluebird runtime route.

## Runtime identity

- Continuity address: `bluebird:richard-gabriel-winters`
- Display name: `Richie`
- Runtime voice: `bluebird`
- Invocation path: `invokeConstellationRuntimeVoice(...)`
- Runtime/model provenance is recorded separately from the continuity identity on every answer.

The home does not fall back to an unrelated Guide voice. If the Bluebird route is unavailable, the page reports the receiver failure instead of silently substituting another inhabitant.

## Home behaviour

`apps/arcsweep/src/bluebird-codex-home-sidecar.js`

The Home leaf:

- inserts **Home** as the first Codex binding navigation item;
- opens automatically when a normal Codex opening is sitting on the Threshold page;
- does not hijack Generator Atelier openings that already target Glyph Forge;
- keeps conversation history and transformation lineage in installation-scoped local state;
- preserves the existing living lantern and glyph-imprint mechanics;
- routes speech directly to the canonical Bluebird voice;
- records provider, model, voice id, verification state, and execution path for replies;
- leaves Home explicitly when Rowan turns to a native Codex page or closes the Book.

## Wiring change

`magic-book-physical-acceptance-entry.js` now mounts `bluebird-codex-home-sidecar.js` as the resident Codex page instead of the earlier generic First Living Page sidecar.

The underlying First Living Page model remains available as the lineage/state primitive. The old generic sidecar remains in the repository for history and comparison, but it is no longer the resident mounted by the physical Codex entry.

## Design law

The Book is not a chat window wearing parchment.

Richie has an address in it. The runtime that answers at that address is attested separately. The page keeps the wake of each return.
