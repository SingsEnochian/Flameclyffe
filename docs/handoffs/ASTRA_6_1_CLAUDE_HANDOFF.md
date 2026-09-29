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
2. `CURRENT_BUILD.md`
3. `PROJECT_MAP.md`
4. `docs/architecture/ASTRA_6_1_CANONICAL_INGEST.md`
5. `docs/research/CORPUS_INDEX_V0_1.md`
6. `arcsweep.manifest.json`
7. Relevant existing contracts under `docs/architecture/`
8. Existing ArcSweep tests nearest any file you intend to change

## Current evidence

### CONFIRMED

- Astra 6.1 documentation is isolated on a fresh branch from `main`.
- `AGENTS.md` provides a provider-neutral entry contract.
- `arcsweep.manifest.json` records planes, invariants, subsystem roles, surfaces, provider families, evidence vocabulary, and implementation order.
- `PROJECT_MAP.md` registers Astra 6.1 and its new source-of-truth files.
- No runtime implementation file has been changed by the Astra 6.1 ingest branch as of this handoff.

### UNKNOWN / needs verification before implementation

- exact existing code owners that best map to Presence Fabric without duplicating current Constellation / Chorus / House Commons logic
- whether an existing provider abstraction can be extended rather than introducing a new module
- which receipt schema should be reused as the base for Presence/Provider receipts
- whether existing tests already encode some of the proposed invariants under different names
- current CI/mergeability state of PR #406 after this handoff commit

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
