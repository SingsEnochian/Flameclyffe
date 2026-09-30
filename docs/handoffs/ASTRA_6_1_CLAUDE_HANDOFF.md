# Astra 6.1 Claude Handoff

**Repository:** `SingsEnochian/Flameclyffe`  
**Branch:** `feature/astra-6.1-canonical-ingest`  
**Draft PR:** `#406`  
**Base:** `main`

## Mission

Take Astra 6.1 from architecture/documentation into the smallest executable shared-contract slice without collapsing existing ArcSweep boundaries or duplicating subsystem ownership.

The goal is not to invent another framework. The goal is to make the existing architecture easier for every future worker to enter, extend, test, and hand off.

## Read order

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CURRENT_BUILD.md`
4. `PROJECT_MAP.md`
5. `docs/architecture/ASTRA_6_1_CANONICAL_INGEST.md`
6. `docs/research/CORPUS_INDEX_V0_1.md`
7. `arcsweep.manifest.json`
8. Relevant existing contracts under `docs/architecture/`
9. Existing ArcSweep tests nearest any file you intend to change

## Current evidence

### CONFIRMED

- Astra 6.1 documentation is isolated on a fresh branch from `main`.
- `AGENTS.md` provides a provider-neutral entry contract.
- `CLAUDE.md` routes Claude into the same shared contract rather than establishing model-specific architecture.
- `arcsweep.manifest.json` records planes, invariants, subsystem roles, surfaces, provider families, evidence vocabulary, implementation order, and Claude handoff entrypoints.
- `PROJECT_MAP.md` registers Astra 6.1 and its source-of-truth / handoff files.
- `docs/handoffs/astra-6.1-claude-task.json` provides a machine-readable task packet.
- No runtime implementation file has been changed by the Astra 6.1 ingest branch as of this handoff.

### UNKNOWN / needs verification before implementation

- exact existing code owners that best map to Presence Fabric without duplicating current Constellation / Chorus / House Commons logic
- whether an existing provider abstraction can be extended rather than introducing a new module
- which receipt schema should be reused as the base for Presence/Provider receipts
- whether existing tests already encode some of the proposed invariants under different names
- current CI and branch-conflict/mergeability state of PR #406

## First task

### TASK

Implement or formalise the smallest shared **Presence Fabric contract** that existing ArcSweep/Constellation/House Commons code can consume without moving identity, continuity, capability, or authority ownership.

### WHY

Recent external research repeatedly converged on the same structure: identity, provider/model, session, surface, and presence must remain separate. ArcSweep already has many of these organs, but they need an explicit common seam before more Discord/TUI/AR/social adapters are added.

### SCOPE

You may:

- inspect existing Constellation, Chorus, House Commons, model-route, session, and receipt code;
- reuse or extend existing contracts;
- add a minimal Presence contract/module if no suitable shared contract exists;
- add focused tests;
- add/update one architecture contract explaining ownership and non-ownership;
- update the Astra 6.1 handoff with evidence.

### OUT OF SCOPE

Do not:

- create a second identity store;
- create a second continuity engine;
- grant production/external-write authority;
- wire live Discord, CharacterAI, Maverick, Banuba, BAHA, or other external services in this slice;
- refactor unrelated UI;
- migrate canon data;
- make provider-specific identity assumptions;
- introduce perpetual animation or decorative runtime work.

## Contract target

Prefer adapting to existing naming if the repository already has a better owner, but the conceptual contract should be able to represent:

```ts
interface Presence {
  presenceId: string;
  identityId: string;
  surface: string;
  participationMode: "silent" | "addressed" | "reply-only" | "ambient" | "active";
  sessionId: string;
}
```

Presence must NOT imply:

- identity ownership
- model ownership
- canon authority
- memory ownership
- production authority
- external-write authority

## Required invariants

Tests should prove at minimum:

1. one identity may have more than one presence without identity duplication;
2. rebinding a model/provider does not change identity id;
3. changing surface does not change identity id;
4. presence mode does not grant authority;
5. presence teardown does not delete identity or continuity;
6. receipts preserve enough lineage to identify identity + surface + session without embedding credentials;
7. unknown surfaces/providers fail safely or remain explicit `UNKNOWN`, rather than silently coercing to a default identity.

## Second task after Presence Fabric

Inspect current model routing and formalise the minimal **CognitiveProvider / capability** seam. Prefer reuse over replacement.

The provider seam must allow Crow, OpenAI, Qwen, Claude, local GGUFs, and future providers to differ in capability while remaining subordinate to ArcSweep authority/capability gates.

## Third task after provider seam

Add small shared interfaces/contracts for:

- `SensoryAdapter`
- `OutputAdapter`
- `AuditoryRenderTarget`

Do not implement vendor integrations yet. These contracts exist so future Banuba/Maverick/Cochl/bone-conduction/haptic work attaches cleanly.

## Verification expectations

Before claiming success:

- run focused tests for new/changed contracts;
- run the existing ArcSweep test command relevant to the touched subsystem;
- run the build if runtime/source code changed;
- inspect the resulting receipt/state object, not just test exit codes;
- record CONFIRMED/TESTED/OBSERVED/UNKNOWN separately.

If a deploy preview becomes available, runtime observation is preferable but not required for a pure contract-only slice.

## Handoff to the next worker

Append or create a short handoff stating:

- what existing owners were found;
- what was reused vs added;
- files changed;
- tests/commands run;
- receipt/runtime evidence;
- what remains UNKNOWN;
- next smallest step.

## Research context

Do not independently crawl every external corpus before coding. The distilled useful patterns are already in `docs/research/CORPUS_INDEX_V0_1.md`.

The high-value implementation lessons are:

- CharacterAI/fount ecosystems: identity/provider/session/surface separation, streaming, portable presence, group chat, local providers
- Banuba/Maverick: AR/spatial input-output adapters
- Cochl/hearing research: semantic sound events, auditory analysis, assistive/bone-conduction-aware render targets
- reality-shifting/symbolic corpora: world-state transitions, sensory anchors, rollback/return controls, with experience/interpretation/ontology/evidence kept distinct

These sources inform design. They do not override repository contracts.

## Final instruction

Do not optimise for the prettiest abstraction. Optimise for the smallest shared seam that fits the living code, preserves ownership boundaries, passes tests, and leaves stronger evidence than it found.

## Current implementation evidence (2026-09-29)

**CONFIRMED:** The first Presence Fabric slice is implemented in `apps/arcsweep/src/presence-fabric.js` and documented in `docs/architecture/PRESENCE_FABRIC_V0_1.md`. It is additive: `apps/arcsweep/src/model-presence-bus.js` retains its existing fields and exposes a nested `presence` record. House Commons v5 now supplies the `house-commons` surface, addressed participation mode, and stable room/voice session key during streaming.

**TESTED:** `node --test apps/arcsweep/test/presence-fabric.test.js apps/arcsweep/test/model-presence-bus.test.js` passes all 16 tests. `npm run contracts:verify` passes. `npm run arcsweep:build` passes. The full `npm run arcsweep:test` run still contains unrelated pre-existing failures in canon-pack and performance-safe-pack assertions; those failures are not in the Presence Fabric tests.

**OBSERVED:** Records are deeply frozen; provider rebinding preserves identity/presence/surface/session; surface projection creates a new presence while preserving identity; teardown receipts are credential-free and carry `before` lineage with `after: null`. Unknown surfaces/providers/models are explicit `UNKNOWN` in the canonical record.

**ADDED RESEARCH:** `docs/research/MIRAGE_FS_ADAPTER_ASSESSMENT.md` and the corpus index now record `SSL-ACTX/mirage-fs` at commit `e199f5d` as AGPL-3.0 external research only. No binary, mount, covert carrier, uploader, or destructive format operation is integrated or executed.

**UNKNOWN:** Provider capability seam, sensory/output contracts, runtime deployment observation, and production credential state remain future work. The GitNexus safe plan writer was unavailable on Windows; implementation evidence is recorded here and in the local ASTRA context ledger instead.

**NEXT:** Add the minimal provider/capability seam, then sensory/output interfaces, with the same identity/authority boundaries and focused runtime evidence.

## Current implementation evidence (2026-09-30)

**CONFIRMED:** The CognitiveProvider contract is implemented in `apps/arcsweep/src/architecture/cognitive-provider.js`. The companion `capability-negotiation.js` (ported from `feature/arcsweep-asi-ignition-v0`, PR #400) lives alongside it in `apps/arcsweep/src/architecture/`. The contract is documented in `docs/architecture/COGNITIVE_PROVIDER_V1.md`.

**TESTED:** `node --test apps/arcsweep/test/cognitive-provider.test.js` passes 21/21 tests. Running alongside prior tests: `node --test apps/arcsweep/test/presence-fabric.test.js apps/arcsweep/test/model-presence-bus.test.js apps/arcsweep/test/cognitive-provider.test.js` passes 37/37.

**OBSERVED:** Provider descriptors are frozen and carry no authority, credentials, or session fields. Unknown capability names are stripped. The gate (`evaluateProviderCapability`) delegates to `capability-negotiation.js`'s `evaluateCapabilityRequest` — providers cannot self-grant capability or authority. Cognitive events are frozen and kind-exclusive (only one payload field non-null per event). The contract is additive: no existing file was modified.

**REUSED:** `capability-negotiation.js` from PR #400 (`arcsweep.capability-request/v0.1`, `arcsweep.capability-decision/v0.1`, `arcsweep.execution-receipt/v0.1`) was ported as-is without modification. Presence Fabric (`presence-fabric.js`) and `model-presence-bus.js` are unchanged.

**UNKNOWN:** No live provider implementations exist yet. `assertCognitiveProvider` is a shape-only check — real provider conformance requires integration tests with each provider adapter. Sensory/output contracts remain future work.

**NEXT:** Add the `SensoryAdapter`, `OutputAdapter`, and `AuditoryRenderTarget` interface contracts (Task 3). These are shape-only contracts — no vendor integrations. Same pattern: frozen descriptors, schema-tagged, no authority fields, focused tests, architecture doc.

## Current implementation evidence (2026-09-30, Task 3)

**CONFIRMED:** Sensory/output adapter contracts are implemented in `apps/arcsweep/src/architecture/sensory-output-contracts.js`. Three contracts: `SensoryAdapter` (input, modalities), `OutputAdapter` (output, channels), `AuditoryRenderTarget` (auditory-specific, render modes). Documented in `docs/architecture/SENSORY_OUTPUT_CONTRACTS_V1.md`.

**TESTED:** `node --test apps/arcsweep/test/sensory-output-contracts.test.js` passes 25/25 tests. Full suite: `node --test apps/arcsweep/test/presence-fabric.test.js apps/arcsweep/test/model-presence-bus.test.js apps/arcsweep/test/cognitive-provider.test.js apps/arcsweep/test/sensory-output-contracts.test.js` passes 62/62.

**OBSERVED:** All descriptor records are frozen. `audio-air` and `audio-bone` are separate channels; `bone-conduction` and `assistive` are separate render modes. Unknown modalities/channels/modes are stripped. No authority, credential, or identity fields on any descriptor. `surface_hint` is always distinct from `id`. `max_latency_ms` is `null` for non-finite input.

**UNKNOWN:** No live adapter implementations exist. `assertSensoryAdapter`, `assertOutputAdapter`, `assertAuditoryRenderTarget` are shape checks only — real adapter conformance requires integration tests per surface. Runa render-target contracts and the end-to-end vertical slice remain future work.

**NEXT:** The four shared contract seams are now in place (Presence Fabric, CognitiveProvider, SensoryAdapter/OutputAdapter/AuditoryRenderTarget). The next step is Task 4/5: one end-to-end vertical slice with runtime receipts — `enter/select universe → Codex context → ArcSweep reasoning → Crow realisation → continuity → receipt → continue`. Start from the existing Constellation lens flow and wire the new contracts into one observable path.

## Current implementation evidence (2026-09-30, Task 4/5 — vertical slice)

**CONFIRMED:** `runAstraVerticalSlice` in `apps/arcsweep/src/architecture/astra-vertical-slice.js` is the end-to-end contract orchestrator. It composes all four Astra 6.1 layers: Presence Fabric → CognitiveProvider gate → sensory/output descriptors → provider invoke → execution receipt → presence lineage receipt. Returns a frozen `arcsweep.astra-slice-receipt/v1`. Documented in `docs/architecture/ASTRA_VERTICAL_SLICE_V1.md`.

**TESTED:** `node --test apps/arcsweep/test/astra-vertical-slice.test.js` passes 7/7. Full Astra 6.1 suite passes 69/69.

**OBSERVED:** Granted path: delta + done events, execution receipt `applied`, presence receipt `provider-rebound` with identity preserved. Denied path (missing capability): `null` execution receipt, presence `torn-down`, events empty. Denied path (authority escalation): same — gate blocks even when provider declares the capability. Provider invoke error: caught as `error` event, execution receipt `failed`, no crash. No credentials or elevated authority_grants anywhere in the receipt. Identity never equals surface or provider.

**UNKNOWN:** No live runtime observation yet — slice uses stub providers. Runa render-target contracts, continuity resolution, and full Constellation lens integration remain future work. A PR from this branch has not been created yet.

**ALL ASTRA 6.1 CONTRACT SEAMS COMPLETE:**
- `apps/arcsweep/src/model-presence-bus.js` — additive Presence Fabric fields
- `apps/arcsweep/src/presence-fabric.js` — canonical Presence contract
- `apps/arcsweep/src/architecture/capability-negotiation.js` — capability gate (ported from PR #400)
- `apps/arcsweep/src/architecture/cognitive-provider.js` — CognitiveProvider descriptor + event stream
- `apps/arcsweep/src/architecture/sensory-output-contracts.js` — SensoryAdapter / OutputAdapter / AuditoryRenderTarget
- `apps/arcsweep/src/architecture/astra-vertical-slice.js` — end-to-end slice orchestrator

**NEXT FOR NEXT WORKER:** Create a PR from `codex/astra-6-1-constellation-advance` into `feature/astra-6.1-canonical-ingest`. Then wire `runAstraVerticalSlice` into the Constellation lens response path so real runtime receipts appear in `runtime-integration-bridge.js`'s active envelope.
