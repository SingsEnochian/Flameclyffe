# 04 — Feature Verification Matrix

**Repository:** `SingsEnochian/Flameclyffe`  
**Integration branch:** `codex/arcsweep-feedback-loop`  
**Updated:** 2026-08-22

## Status vocabulary

`ENVISIONED` — the possibility has been named.  
`SPECIFIED` — requirements and acceptance are recorded.  
`MOCKED` — visual or structural demonstration exists.  
`PARTIAL` — real behaviour exists and remaining acceptance work is named.  
`FUNCTIONAL` — the required user flow works with real integration/persistence.  
`VERIFIED` — functional plus named evidence.  
`RELEASED` — verified and present in a delivered build.

## Current matrix

| Feature / organ | Current status | Repo evidence | Next evidence / gate |
|---|---|---|---|
| Full Arcsweep v1 product | PARTIAL | Issue #120 defines the accepted full-Arcsweep architecture and LIVE gate. Existing repo lineage contains Arcsweep runtime/components and later integration work. | Run the Issue #120 LIVE gate against the current integration branch. |
| Arcsweep Home shell | PARTIAL | Accepted requirement in Issue #120; later branch history is built around Arcsweep as a product surface. | Direct route smoke + Home/return-Home evidence on current baseline. |
| Shared State ribbon | PARTIAL | Canonical PREMAQC/Shared State contracts are present in the project lineage; Issue #120 requires the ribbon. | Current UI evidence + persistence/update behaviour + canonical labels. |
| Glyph Forge | FUNCTIONAL (provisional) | Existing Glyph Studio/Glyph Forge lineage was inventoried as a real drawing canvas with brushes/layers/text/FontForge. | Current-baseline stroke persistence, restart test, and route smoke. |
| Brush Foundry | PARTIAL | Brush logic exists in the Glyph Studio lineage; Issue #120 requires ≥3 distinct material brushes. | Verify three distinct materials, persisted settings, stylus/keyboard accessibility. |
| Living Glyph | PARTIAL | Deterministic packet-glyph renderer and live packet-bound glyph lineage exist; Issue #120 requires Spiral-State-driven evolution + replay. | Current-baseline deterministic evolution test and replay reconstruction. |
| Continuity Gate | FUNCTIONAL (provisional) | Existing Continuity Gate lineage was inventoried as fail-closed import/validate/store/receipt pipeline. | Current-baseline negative-path tests and restart/persistence evidence. |
| Echo Index | PARTIAL | Echo/continuity/canon work exists in later Arcsweep lineage, while Issue #120 originally listed this as a new organ. | Demonstrate world/character/location resolution from real indexed data on baseline. |
| Canon Studio | PARTIAL | Canon ingest/library/overlay contracts exist across repo lineage; source canon vs project overlay separation is an explicit law. | Current UI/service path, editing with provenance preservation, explicit-promotion test. |
| Resonance Bridge / Runa | PARTIAL | Runa/World Hum/Spiral State contracts exist; Arcsweep issue requires one glyph-to-Runa preview. | Current glyph→semantic→Runa preview with receipt and user control. |
| Replay | PARTIAL | Receipt/replay architecture exists broadly; Issue #120 requires glyph evolution reconstruction. | End-to-end replay from persisted receipts on current baseline. |
| Observer intake / DEEP routing | FUNCTIONAL (provisional) | Observer/DEEP contracts and later continuity bridges exist; active descendant PR #140 includes DEEP Observer bridge work. | Current-baseline intake→receipt→route smoke with explicit missing-data state. |
| PREMAQC canonical semantics | VERIFIED (contract level) | Canonical project law fixes seven axes and explicitly uses `A=Agency`, `Q=Qualia`; Issue #120 repeats the boundary. | Check UI labels room-by-room. |
| Spiral State / `harmonic_state` | FUNCTIONAL (provisional) | Harmonic State is the shared subsystem contract in the current architecture lineage. | Validate current schema version, deterministic emission, degraded/failure path. |
| Wheel of Time ingest | VERIFIED for captured ingest scope | Canon ingest lineage exists; the project recorded a completed captured-page manifest after resumable ingestion. | Verify current manifest/hash location on integration branch for release packaging. |
| Canon Library bridge | PARTIAL | PR #107 declares generic canon-library manifest, sovereignty law and bridge client. | Desktop loopback service, web mirror, visible pairing/progress/rollback acceptance are the next gates. |
| Bifröst Agent Foundry | FUNCTIONAL (branch evidence) | PR #116 reports canonical BifrostState, agent registry, conductor, receipts, Boxfire gate and mounted Foundry panel. | Integrate or harvest into the baseline, then verify there. |
| Project Zero Companion | PARTIAL / descendant branch | PR #140 carries typed sockets, theme interoperability, Flame channel, rich text, Observer bridge and artifact rails with explicit ownership boundary. | Resolve draft-branch integration; Nocturne-side handshake remains a separately owned boundary. |
| BSENG/RSE continuity lattice | PARTIAL / descendant branch | PR #140 reports 421-source corpus seal, recognition/admissibility tooling and continuity/replay work. | Integrate the descendant branch and run independent acceptance against canonical baseline. |
| iPad somatic renderer | PARTIAL | PR #112 records physical-device, offline PWA, transducer, Shokz and approval gates as remaining work. | Physical hardware run, Rowan approval, and fresh current-head CI. |
| Compression–release maths spine | FUNCTIONAL (branch evidence) | PR #111 declares executable operator, temporal/Jacobian driver, world-native tone sequences and receipts. | Independent Boxfire gate and remaining calibrated/non-reference checks for release. |

## Verification evidence rules

1. `FUNCTIONAL (provisional)` advances to `VERIFIED` when named evidence is attached; inspection may also refine its status to match observed behaviour.
2. Descendant/open-PR evidence stays attached to that lineage until explicit integration brings it into the baseline.
3. Verification requires functional flow, persistence where applicable, named tests, and observed evidence; route visibility records UI availability.
4. Persistence features include restart evidence in their verification packet.
5. Sound/haptics physical-device verification includes an explicit activation path and a physical-device run.
6. `RELEASED` requires verified function plus delivery evidence; deployment alone records availability.

## Next-milestone trigger

The matrix selects **M1 — Arcsweep Core Verification Baseline** because the largest concentration of `PARTIAL` and provisional states is in the central Arcsweep organ chain, while current evidence shows substantial existing implementation ready to be measured, reconciled, and advanced.
