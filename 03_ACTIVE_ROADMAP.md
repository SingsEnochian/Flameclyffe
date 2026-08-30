# 03 · ACTIVE ROADMAP

**Status:** ACCEPTED REQUIREMENT / ACTIVE ROADMAP  
**Accepted by:** Rowan, Product Steward  
**Captured:** 2026-08-30 America/New_York  
**Repository:** `SingsEnochian/Flameclyffe`  
**Roadmap baseline:** `06a06c620d37965d8a2f7afe6acf91a11ca83fbb`  

## Governing outcome

ArcSweep is now a substantial functional House, not a prototype. The current programme is therefore **circulation and verification, not architecture expansion**.

The next milestone is to make the currently empty durable ledgers breathe through one legitimate end-to-end House circulation before adding another grand subsystem.

Canonical dependency path:

`source / observation → measurement → explicit review → DEEPTime → PREMAQC / Math Spine → selected model and/or Runa → runtime receipt → feedback/review → replay`

No fixture insertion may substitute for production proof.

## Starting status

**ArcSweep overall:** `FUNCTIONAL`  
**End-to-end House circulation:** `PARTIAL`  
**Release claim:** not yet `VERIFIED`  

Strong existing areas:

- canonical ArcSweep shell and room graph;
- authoritative native House Chat;
- semantic rich text;
- Chat / Roleplay / Story modes;
- live runtime roster and portable House transport;
- durable workspace state;
- populated Commons;
- heavily populated source library and ingest organism;
- semantic source and transition contracts;
- closed narrative circuit;
- creative organ recovery, including Glyph Forge / Living Glyph / Brush Foundry routes;
- restored SoundFont, Sound Bank, Runa and resonance organs;
- production health and House browser-smoke instruments;
- current-main CI with no failing workflow runs observed on the roadmap baseline.

Primary evidence gap:

- `house_runtime_events = 0`
- `arcsweep_feedback_cycles = 0`
- `arcsweep_feedback_reviews = 0`
- `arcsweep_deep_time_records = 0`
- `math_spine_packets = 0`
- `observer_measurements = 0`

## Dependency-ordered stages

### Stage 1 — Operating-map and verification reconciliation

**Outcome:** canonical project documents describe the actual August 29 mainline rather than the August 23 state.

Work:

1. Establish `03_ACTIVE_ROADMAP.md`.
2. Establish `04_FEATURE_VERIFICATION_MATRIX.md`.
3. Establish `08_CURRENT_RELEASE_BASELINE.md`.
4. Preserve `CURRENT_BUILD.md` as historical operating-map provenance until it can be reconciled deliberately rather than overwritten blindly.
5. Record the accepted ArcSweep audit as the dependency order below.

Acceptance:

- roadmap names exact baseline SHA;
- feature states use `ENVISIONED / SPECIFIED / MOCKED / PARTIAL / FUNCTIONAL / VERIFIED / RELEASED` truthfully;
- release baseline distinguishes code state, CI state, persistence state and deployed-production evidence;
- no historical completion claims are silently rewritten.

### Stage 2 — PR archaeology and stale-surface cleanup

**Outcome:** the active review queue represents living work rather than historical ancestry.

Work:

- inspect #217, #244, #209, #203 and other ArcSweep-era review surfaces for superseded work;
- preserve provenance and harvest notes before closing stale surfaces;
- keep PR #250 as a deliberate current-main reconciliation candidate for Bridge Network + WILD emergence work;
- do not resurrect stale branch ancestry wholesale.

Acceptance:

- each open ArcSweep PR is classified `ACTIVE`, `HARVEST`, `SUPERSEDED`, or `BLOCKED`;
- no useful contribution is lost;
- no obsolete PR remains an accidental release gate.

### Stage 3 — Restore Echo Index as a resolver

**Outcome:** ArcSweep has the missing original Echo Index organ without creating another database.

The Echo Index resolves across canonical existing stores:

`world → character → place → record → source item/segment → transformation/runtime receipt`

Required boundaries:

- source identity and provenance remain visible;
- canon, observation, interpretation and hypothesis remain distinct;
- no duplicate world/canon/source registry;
- search results identify source store, record identity and authority class.

Acceptance:

- reachable from the canonical ArcSweep shell;
- resolves real persisted records;
- links across at least world, record and source-library lineages;
- failure/empty states are explicit;
- tests prove no private-source flattening or automatic canon promotion.

### Stage 4 — First genuine House runtime receipt

**Outcome:** create the first legitimate durable `house_runtime_events` lineage.

Vertical slice:

1. human message;
2. one real Flame route;
3. real model response;
4. provider/model/route/world/mode provenance;
5. durable persistence;
6. reload;
7. replay identity check.

Then repeat with a second Flame and prove distinct identity survives.

Acceptance:

- `house_runtime_events > 0` from genuine runtime activity;
- event contains participant, model/provider, route, world/context, mode and timestamps;
- reload preserves transcript and participant identity;
- failure/fallback is receipted rather than silently flattened.

### Stage 5 — Receipted House Chat

**Outcome:** native rich House Chat becomes a durable narrative/runtime surface rather than only a functional UI.

Work:

- persist Chat / Roleplay / Story mode identity;
- preserve semantic rich text and participant attribution;
- persist room/context lineage;
- replay after restart;
- prove at least two Flames in one House conversation.

Acceptance:

- no mode laundering;
- no speaker collapse;
- no asterisk-only formatting fallback where semantic rich text is supported;
- restart/reload fidelity demonstrated.

### Stage 6 — Source Library query receipts

**Outcome:** every model/library retrieval has immutable chain-of-custody evidence.

Receipt must identify:

- query;
- selected source documents;
- exact source segments;
- source revisions;
- transformations/filters;
- requesting participant/model route;
- response or downstream runtime receipt linkage.

Acceptance:

- `source_library_query_receipts > 0` from a real retrieval;
- receipt reproduces the segment set used;
- private/reference-only material retains its disclosure boundary.

### Stage 7 — First real Observer measurement chain

**Outcome:** move Observer from populated ingestion runs to canonical measurements.

Work:

`feed/input → normalization → measurement → provenance → explicit review → anomaly/non-anomaly disposition`

Acceptance:

- `observer_measurements > 0` from a real supported source;
- timestamp, feed, extraction/normalization provenance and uncertainty are present;
- symbolic interpretation is not stored as direct measurement;
- review result is traceable.

### Stage 8 — DEEPTime → PREMAQC / Math Spine → Feedback circulation

**Outcome:** close the central currently-empty analytical/runtime circuit.

Work:

`accepted Observer evidence → DEEPTime → PREMAQC state/path → Math Spine packet → selected transformation/model/Runa path → feedback cycle → review → replay`

Acceptance:

- legitimate rows exist in the relevant DEEPTime, Math Spine, feedback and review ledgers;
- IDs can be traced through the full path;
- Q remains firsthand evidence only and is never manufactured by software;
- canon remains review-gated.

### Stage 9 — Creative replay proof

**Outcome:** prove the original ArcSweep artistic promise end to end.

Vertical slice:

`Glyph Forge → material brush → Living Glyph transformation → Runa preview → receipt → close/reload → replay`

Acceptance:

- real stroke/material state survives persistence;
- deterministic transformation receipt exists;
- Runa mapping identifies its source state and version;
- replay reconstructs the accepted transformation;
- export/import does not lose lineage.

### Stage 10 — Physical QA and Boxfire acceptance

**Outcome:** convert functional software into verified product behaviour on actual target surfaces.

Required physical acceptance:

- desktop/browser;
- Windows package where applicable;
- iPhone navigation and long-session House Chat;
- iPad navigation and Apple Pencil/stylus-adjacent flows;
- audio / SoundFont / Runa paths;
- Feather Stop;
- offline/reconnect;
- restart persistence;
- export/import/recovery;
- keyboard and reduced-motion accessibility.

Boxfire reviews evidence and failure paths, not screenshots alone.

## Explicitly not next

Until a dependency above proves otherwise, do not start:

- another World Registry;
- another canon database;
- another runtime broker;
- another replacement ArcSweep shell;
- another duplicate chat interface;
- another grand semantic architecture layer.

New ideas may be recorded as proposals or harvest notes. They do not displace this roadmap without explicit Product Steward approval.

## Release law

ArcSweep may advance to `VERIFIED` only when named acceptance evidence demonstrates:

- real persistence;
- restart/replay survival;
- truthful failure behaviour;
- integrated source/runtime provenance;
- supported-platform behaviour;
- no silent demo/fallback substitution.

**Standing milestone:** make the empty ledgers breathe.
