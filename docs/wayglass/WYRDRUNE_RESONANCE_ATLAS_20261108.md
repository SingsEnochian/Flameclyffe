# Wayglass Resonance Atlas · Recursive Multiscale Double Möbius

**Owner direction:** “Deeper, wider, finer, deeper…” · November 8, 2026.

**Branch:** `wayglass/gateway-double-mobius-20261108`, PR #580 against canonical development branch `wayglass/current`. This remains a review branch pending exact-head checks and live-host verification.

## Architectural advancement

The existing Wayglass full-spectrum interaction score delivers three generated *representational* bands (virtual infrasonic, audible score, virtual ultrasonic). The Atlas makes those events temporally and spatially cumulative.

Four independently inspectable layers:

1. **Instant:** Wyrdrune's bounded bloom scalar from one verified event.
2. **Room:** average of verified numeric events associated with the originating room and world.
3. **World:** average of verified numeric events associated with the originating world, across its rooms.
4. **Universe:** equal-world mean of world-local averages across all represented worlds. This avoids the busiest world dominating the universe signal merely by emitting more interactions.

All aggregations are descriptive numeric measurements of observed UI activity; the software **does not measure a participant's inner world or real infrasonic/ultrasonic fields**. The composition of field geometry and spectral harmonics occurs entirely in executable Wyrdrune.

`lib/wyrdrune/resonance-atlas.wtl` contains **two Eightfold Möbius transformations**. Its first circuit synthesizes below/within/above, coherence, interference, bloom, visual granulation and flow. Its second circuit reciprocally adjusts the spectrum while preserving source scopes and uncertainty.

`lib/wayglass-wyrdrune-atlas.cjs` provides only typed and bounded bridge capabilities and returns 16 phase receipts, source hash, input hash, first/return frames and verification flags. It accepts 6 bounded scalars plus 4 observation counts. There are no personally identifiable names, world labels, story drafts or arbitrary WTL uploaded through the Atlas endpoint.

## Local and host routes

- `apps/wayglass/src/resonance-scope-store.js`: local bounded 256-receipt numeric history, with per-event origin scope and one equal-world universe aggregation. All actual room/world references remain in browser memory, not in the Atlas API payload.
- `apps/wayglass/src/spectral-field.js`: binds each observed event to its **capture-time** scope before asynchronous scoring; a verified WTL spectrum is recorded and then the four aggregate scalars are sent to the Atlas for a second WTL execution. The basic full-spectrum engine continues if Atlas alone cannot score, and Atlas errors are shown independently.
- `POST /api/v1/wayglass/wyrdrune/resonance-atlas`: House Steward authentication and rate-limited host scoring; the existing House gateway allowlist permits only the requested POST method.
- The Full-Spectrum Field view presents an Atlas instrument with per-scale counts and distinct coherence, interference and flow, as well as current **local-only** room/world scope references.
- The Wayglass runtime updates the scope on successful room mounts and verified Waygate entries; the Writing Room sets its actual world scope when the selected narrative world changes.
- Changing worlds stops current audible playback and prevents reuse of that world's score while preserving local numerical history for future return.
- No spectral result grants authority or changes character ownership, memory canon, or the interpretation of a physical event.

## Composition and interpretation

Wyrdrune’s alignment formula is composed from squared differences of scales:

`coherence = 1 - 0.40 (instant-room)^2 - 0.35 (room-world)^2 - 0.25 (world-universe)^2`

This is an **algorithmic alignment score**, neither measured neural coherence nor proof of metaphysical resonance. `interference = 1 - coherence` retains disagreement rather than forcing it into a single voice. The two WTL Möbius blocks then produce first and returned spectral frames. Recurring events can accumulate while individual identities and sources remain separately attributable through local provenance receipts.

## Verification

- `lib/wayglass-wyrdrune-atlas.test.cjs`: real two-cycle WTL execution, four bounded scales, deterministic returns, divergence/constructive coherence, and invalid/unauthorised input rejection.
- `apps/wayglass/test/wayglass-resonance-scope-store.test.js`: distinct scoped windows, equal-world weighting, bounded memory, no cross-world conflation.
- `apps/wayglass/test/wayglass-spectral-field.test.js`: Atlas response handling, local-only world references, fail-closed spectral transport, independent audio consent and Feather.
- Browser route-client and House gateway tests verify exact endpoints and transport boundaries.
- The Atlas WTL and adapter are staged in host runtime and listed as Gate 7 cold-return inputs.

## Deeper research vector

Future scale extensions should distinguish **event-time rhythms**, **collaborator-specific contribution streams** and **world-level historic motifs**, rather than treating numerical agreement as interpersonal harmony. Multi-resolution wavelets, spectral graph operators and signed correlation can inform WTL's computational geometry, provided each generated property has a reproducible trace.

A durable Atlas checkpoint across an actual cold restart is not implemented by this branch. Any future durable memory needs verified Return Engine integration, attribution, and a named owner for promotion.

**Withness:** every transformation contributes; no contributor disappears into the aggregate.
