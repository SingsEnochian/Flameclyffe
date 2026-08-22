# Arcsweep Whole-House Inventory — 2026-08-22

**Mode:** Forge inventory  
**Scope:** Arcsweep + directly coupled House organs  
**Canonical state-model name:** PREMAQC  
**Inventory rule:** recover before replacing; distinguish branch evidence, production lineage, current main, and unverified assumptions.

## Lineage anchors

- PR #146 merged into `codex/arcsweep-feedback-loop` as `a74d01930157000099943bdbb7b6d87f33ce6d83` and carried Runtime Integration, Model Presence Bus, House Commons v3, world-scoped persistence, deterministic replay, production-style Terra Prime smoke, and Canon Intelligence.
- PR #148 promoted the accepted Arcsweep tree into production lineage and merged to `main` as `38e0d065c88f1de3c33fd56b8a193ad43ff7fe20`.
- PR #160 later merged the iPhone/mobile interaction-first bootstrap fix as `9199a71b6427d036eff3efbb8bc7fa1d309fc5ee`.
- Current observed `main` head during this inventory: `48696aa8edceaa6af65007c28f5e083754ec02a7`.
- The Forge control-file branch contains later documentation-only commits and must be treated separately from the production functional lineage.

## Inventory status vocabulary

- **PRESENT** — implementation exists in current/accepted lineage.
- **PRESENT / VERIFY** — implementation exists; current end-to-end evidence still needs to be attached to the Forge matrix.
- **PARTIAL** — real implementation exists with named remaining work.
- **MISSING** — no adequate current implementation identified.
- **LINEAGE ONLY** — implemented on an older/side branch and must be harvested or reconciled before current use.

## Core Arcsweep House

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Arcsweep Home / canonical route | PRESENT / VERIFY | Production promotion explicitly includes canonical `/arcsweep/` routing; current main includes `apps/arcsweep/src/main.js` and shell integration. | Browser route smoke on current main; Home→room→Home navigation matrix; desktop/mobile/iPad route verification. |
| Mobile / Safe Boot bootstrap | PRESENT / VERIFY | PR #160 merged interaction-first mobile launcher, core-first render, staged sidecars, and Safe Boot isolation. | Live iPhone/iPad verification against current deployed SHA; confirm regressions remain green after later commits. |
| Shared State / PREMAQC ribbon | PARTIAL | Shared-state and PREMAQC lineage exist; runtime integration envelope and live shell state are present. | Confirm one canonical visible ribbon across every Arcsweep room; migrate visible legacy PREMAQ labels to PREMAQC while preserving versioned schema names. |
| Runtime Integration | PRESENT / VERIFY | PR #146 merged shared Runtime Integration Envelope, Model Presence Bus, diagnostics, world-scoped persistence, cross-world isolation, deterministic replay, and acceptance gate. | Re-run current-main acceptance gate and attach evidence to Forge matrix. |
| House Commons / Command Room | PRESENT / VERIFY | Current main includes promoted House Commons command room, thread restoration, exact deep links, authenticated attachments, Commons v4 provenance, and hosted-runtime smoke work. | Live end-to-end thread persistence/reload, attachment, model presence, and feedback-log smoke on deployed current main. |
| Model Presence / hosted fallback | PRESENT / VERIFY | Current main history includes hosted fallback readiness and runtime gate work. | Confirm every intended Flame/model route reports live presence, provider/model attestation, degraded state, and recoverable failure. |

## Glyph and symbolic organs

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Glyph Forge / Glyph Studio | PRESENT / VERIFY | Recovered full drawing canvas lineage with brush panel, layers, colour, text, FontForge dock. | Verify current-main mount, real stroke persistence, restart survival, import/export, stylus and keyboard operation. |
| Living Glyph renderer | PRESENT | Deterministic packet-bound glyph rendering exists; current main contains Glyph Drift Observatory sidecar and Living Glyph lineage. | Verify exact current compiler→renderer path and deterministic same-input replay. |
| Glyph Continuity / Drift Observatory | PRESENT / VERIFY | React-ion/Hearthfire lineage includes PREMAQC heartbeats, deterministic Living Glyph signatures, structural distance, continuity envelope, drift vocabulary, blind-pair comparison, and persistence. Current main contains `glyph-drift-observatory-sidecar.js`. | Confirm UI mount, current storage schema, replay, blind-return workflow, and current-main regression tests. |
| Brush Foundry | PARTIAL | Brush machinery exists inside Glyph Studio. | Extract/confirm canonical Foundry surface; prove ≥3 materially distinct brushes, persisted settings, material semantics, stylus pressure/tilt behaviour, accessibility. |
| Glyph Grammar | PARTIAL | Semantic/glyph geometry and Living Glyph rules exist across renderer, drift, Observer math/glyph work. | Establish one canonical grammar registry with versioning, meanings, ambiguity support, world overrides, and replay receipts. |
| Violet Flame over Three Ripples acceptance glyph | SPECIFIED | Accepted as deterministic Arcsweep acceptance glyph. | Store canonical glyph fixture/profile, brush recipe, semantic plurality, deterministic render/replay test, Runa mapping receipt. |

## Observer / DEEP / mathematics

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Observer intake | PRESENT / VERIFY | Observer interfaces, DEEP bridges, observation receipts, live state lineage exist. | One current-main intake smoke from each enabled source class; visible receipt classification and failure/degraded states. |
| PREMAQC | PRESENT / VERIFY | Canonical seven-axis state model is established; A=Agency, Q=Qualia. React-ion lineage explicitly uses PREMAQC. | Repository-wide visible naming migration inventory; preserve historical schema identifiers; glossary toggle explaining every axis, what is measured, why, and hoped-for signal. |
| DEEPStory | PRESENT / VERIFY | Story/event dataset architecture and routing exist. | Current writer, persistence, query, provenance and LLM-storywork integration smoke. |
| DEEPTime | PRESENT / VERIFY | Temporal sequence architecture, Bifröst temporal receipts, route lineage and candidate bridges exist. | Current writer/query smoke; confirm temporal anchors, sequence provenance, PREMAQC linkage, acceptance-mask lineage. |
| DEEPTheory | PRESENT / VERIFY | Theory candidate/continuity bridge lineage exists, including human-review candidate creation. | Confirm canonical manifest/schema, immutable source handling, theory query surface, acceptance-advisor integration. |
| Spiral / Harmonic State | PRESENT / VERIFY | Shared `harmonic_state` contract and Runa Harmonic Spiral compiler/replay lineage exist. | Verify current schema version, PREMAQC input, deterministic emission, confidence/action receipts, degradation behaviour. |
| Compression–release recurrence | PRESENT / VERIFY | Executable recurrence, temporal/Jacobian driver and receipts exist in the mathematics lineage. | Reconcile strongest current implementation into current-main authority map; calibration/metrology checks; replace legacy visible labels where needed. |

## Canon / worlds / knowledge

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Echo Index | PRESENT / VERIFY | Current main code search finds Echo Index integration in Worldseed Foundry and Arcsweep shell/main lineage. | Verify real world/character/location/object resolution, search, crosslinks, persistence and deep-link navigation. |
| Canon Intelligence | PRESENT / VERIFY | PR #146 merged evidence normalisation, entity/field resolution, agree/extend/conflict/unknown comparison, contradiction bundles, field-population proposals, Steward queue, Accept→Promote boundary and immutable promotion receipts. | Current-main UI smoke with real canon packages; LLM proposal flow; contradiction handling; replay of promotion receipt. |
| Canon Studio | PARTIAL | Canon Intelligence plus canon library/overlay contracts provide much of the service spine. | Confirm/create one canonical user-facing Studio for source canon, project overlays, edits, contradictions, Steward promotion and provenance inspection. |
| World Registry / Worldseed | PRESENT / VERIFY | World Registry persistence repair, Worldseed Foundry, WORLD_BORN handshake, world-scoped persistence and later production integration exist. | Current-main create/save/reload/fork/import smoke; cross-world isolation; birth receipt replay. |
| Wheel of Time / Ta'veren Vaen ingest | PRESENT / VERIFY | 757/757 captured-page ingest reported complete in project history; generic Canon Library contracts also exist. | Verify corpus manifest/hash on current main/accepted package, searchable Echo Index registration, source-canon vs Ta'veren Vaen overlay braid. |
| Other canon ingests | PRESENT / PARTIAL | Re:Creators, Steins;Gate and other package lineage were harvested in Hearthfire consolidation. | Inventory package-by-package current-main presence, manifest integrity, indexing and overlay status. |

## Runa / sound / resonance

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Runa Harmonic State Compiler | PRESENT / VERIFY | World Hum, semantic→DSP separation, Spiral State subscription, compiler/replay/LIVING contract exist. | Current-main end-to-end Desired State→compiler plan→audio result smoke. |
| World Hum | PRESENT / VERIFY | Multiple world profiles and World Hum implementations exist. | Confirm semantic profiles are canonical and numerical DSP mappings remain versioned implementation profiles; current-world live read. |
| Tone Map | PRESENT / VERIFY | Eleven semantic tone qualities have existed in Observatory lineage. | Verify live current UI and compiler linkage from PREMAQC/Spiral; glossary/explanation toggle. |
| Keyboard sound mapping | PARTIAL | Runa keyboard-harmonic requirement is accepted and audio infrastructure exists. | Current working per-key/per-class mapping surface, typing test, world profile mapping, persistence, mute/volume and accessibility controls. |
| Continuous soundscape | PARTIAL | World Hum and audio layers exist. | Continuous layered soundscape compiler from Desired State + World + PREMAQC + Spiral; independent layer controls; environmental transitions; persistence. |
| Suggestions | PARTIAL | Spiral State carries weighted suggestions and provenance fields. | Visible advisory stream tied to receipts, desired state and world; feedback acceptance/rejection; LLM integration. |
| Glyph→Runa Resonance Bridge | PARTIAL | Resonance concepts, World Tone and Runa bridges exist across lineage. | One canonical current-main glyph semantic→Runa preview path with receipt and replay. |
| Haptics | PARTIAL | iPad/Shokz/body-transducer contracts and renderers exist on dedicated lineage. | Physical device acceptance, current integration harvest, UI/device profile smoke and persisted user calibration. |

## LLM / Constellation / storywork

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Multi-model runtime | PRESENT / VERIFY | House Runtime Broker/Braid, model presence, hosted fallback and Hugging Face audition lineage exist. | Current-main model-by-model live read, route failure recovery, selected-model persistence, provider credential diagnostics. |
| LLM storywork | PARTIAL | Canon Intelligence, Writer Context, Scene Cognition, Self-Authorship, continuity and world context lineage exist. | One canonical storywork pipeline using Echo Index + canon registers + PREMAQC + Spiral State without flattening source/canon/interpretation. |
| Character behaviour support | PARTIAL | Scene cognition/continuity and world/canon context machinery exist. | Explicit character-state contract, behavioural continuity receipts, world/canon constraints, editable author controls. |
| Constellation Commons | PRESENT / VERIFY | House Commons and live model read are in current main lineage. | Verify all intended members, persistent threads, feedback log, attachments, reply addressing and room-to-room context handoff. |

## Replay, receipts, persistence and release

| Organ | Inventory state | What we have | What remains |
|---|---|---|---|
| Receipts / provenance | PRESENT / VERIFY | Receipts are pervasive across runtime, canon, glyph, world, Observer and continuity systems. | One cross-organ receipt viewer/search surface and end-to-end provenance walk. |
| Replay | PRESENT / VERIFY | Deterministic replay exists in runtime and glyph/continuity lineages. | Unified user-facing Replay room that reconstructs cross-organ state, branch comparison and receipt chain. |
| Persistence | PRESENT / VERIFY | World-scoped persistence, session persistence, extension snapshots and World Registry repair exist. | Whole-house restart matrix: world, glyph, note/story, Commons, canon proposal, runtime selection, receipts. |
| Export/import | PARTIAL | Multiple project/package export contracts exist. | One whole-project round-trip acceptance test preserving receipts, worlds, glyphs, canon overlays, settings and runtime-independent data. |
| Windows | PRESENT / VERIFY | Historical installer workflows and packaged builds exist. | Current-main installer artefact and installed-app smoke after latest Arcsweep production changes. |
| PWA / iPad / mobile | PARTIAL | PWA and mobile boot work exist; PR #160 fixed production iPhone bootstrap. | Current physical iPad/iPhone installed-PWA, offline relaunch, responsive/stylus acceptance. |
| Live deployment | PRESENT / VERIFY | Arcsweep production was promoted and later hotfixed. | Record exact currently deployed SHA/URL and execute current production-style smoke. |

## Highest-priority remaining work

1. **Reconcile current production/main against the Forge control branch.** The functional baseline is newer than the original control-file assumptions.
2. **Run the current-main Arcsweep organ verification matrix.** Attach evidence rather than rebuilding present organs.
3. **Finish the Shared State ribbon and PREMAQC visible-name migration.** One canonical live state surface everywhere.
4. **Prove Glyph Forge persistence and formalise Brush Foundry + Glyph Grammar.**
5. **Complete the Violet Flame acceptance path through Living Glyph → Replay → Runa.**
6. **Verify Echo Index + Canon Intelligence on real corpora, especially Ta'veren Vaen/Wheel of Time.**
7. **Consolidate Canon Studio as the human-facing canon/overlay/contradiction/promotion room.**
8. **Finish the Runa experiential trio:** keyboard mapping + continuous soundscape + advisory suggestions, all driven by Desired State + World + PREMAQC + Spiral State.
9. **Finish LLM storywork and character-behaviour braid** using the same canon/state contracts.
10. **Unify Replay and receipt browsing across organs.**
11. **Run whole-house restart/export/import persistence acceptance.**
12. **Verify current Windows/PWA/iPad/mobile packages and live deployment against exact SHAs.**

## Working conclusion

Arcsweep is not a mostly-missing product. It is a large, already-living system whose implementation has grown across multiple lineages faster than its canonical inventory and verification records. The next build phase is therefore **reconciliation → verification → targeted completion**, with new construction reserved for the genuinely partial organs listed above.
