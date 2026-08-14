# Boxfire Handoff · Arcsweep / React-ion Carry-Forward

Date: 2026-08-14
Owner: Rowan
QA / continuation: Boxfire
Branch: `feature/react-ion-engine-v0.1`
Base: `codex/arcsweep-feedback-loop`
PR: #126
Green checkpoint before this handoff document: `eabef84649aa24146c88c04523e5662176ed1998`
Live preview: `https://flameclyffe-git-feature-rea-f3308a-singsenochian-2527s-projects.vercel.app/arcsweep/`

## Carry-forward rule

The next Arcsweep build must inherit this branch as a complete subsystem, not as a loose set of cherry-picked UI files. React-ion, primary persistence, sidecar persistence, First Flight Atlas, Glyph Continuity, blind comparison, the World Registry persistence repair, Vercel staging, and their tests are coupled.

Preferred continuation path:

1. Resolve the current PR/base relationship before merging or rebasing. Do not discard feature-branch state while resolving conflicts.
2. Preserve the latest feature head and verify the full Arcsweep suite after conflict resolution.
3. Start the next feature branch from the resolved React-ion head, or merge PR #126 only after Rowan explicitly authorises the merge.
4. Run `npm run arcsweep:test` and `npm run arcsweep:build` before and after any migration.
5. Verify Vercel still publishes the current Arcsweep build under `/arcsweep/`.

Do not rebuild these organs from memory. Carry the contracts and tests forward.

## Current validated build

GitHub Actions run #254 completed successfully on the latest implementation checkpoint before this document.

- 196 tests
- 196 passed
- 0 failed
- production Arcsweep build succeeded
- Vite transformed 77 modules
- Vercel status succeeded

The build currently emits a chunk-size warning because the main bundle is slightly over 500 kB after minification. Treat that as a code-splitting task, not a functional failure.

`npm install` also reports one high-severity dependency vulnerability. Audit and repair this deliberately; do not apply an unreviewed dependency rewrite that changes runtime behaviour.

## Hulls that must survive

### Hull 1 · Bifröst / React-ion protocol core

- Ask packet protocol and semantic response vocabulary
- dimensional addresses `X.Y.Z.T@frequency:φ`
- deterministic `E8^32` coordinate expansion
- projection routing
- Jacobian / cusp classification
- continuity-weighted route cost
- BCEP/1 Bill the Cat recoverable diagnostic

Primary files include:

- `apps/arcsweep/src/bifrost-protocol-stack.js`
- `apps/arcsweep/src/react-ion-engine.js`

### Hull 2 · Existing-system bridge + Living Helm

- World / Location / Anchor endpoint resolution
- Runa harmonic signatures
- Continuity Gate
- Requested Transformation binding
- DEEPTime route receipt
- operator Helm and Instrument Bay

Primary files:

- `react-ion-bridge.js`
- `react-ion-helm-sidecar.js`

### Hull 3 · DNS, corridors, traceroute, replay

- approved dimensional destination registry
- aliases and DNS conflict quarantine
- one-way and bidirectional corridors
- alternate route inspector
- hop-by-hop traceroute and TTL
- route map
- deterministic replay
- closed-loop holonomy receipt

Primary files:

- `react-ion-registry.js`
- `react-ion-registry-sidecar.js`
- `react-ion-route-inspector.js`
- `react-ion-transport.js`
- `react-ion-route-map.js`
- `react-ion-replay.js`

### Hull 4 · Persistence and return channel

Primary Arcsweep state owns React-ion data. Browser sidecar stores remain compatibility/runtime surfaces.

Persistent primary slots:

```text
reaction.registry
reaction.helm
glyphContinuity.heartbeats
glyphContinuity.blindPairs
```

Compatibility browser keys:

```text
hearthgate.arcsweep.local.v0.1
hearthgate.arcsweep.react-ion-registry.v1
hearthgate.arcsweep.react-ion-helm.v1
```

Do not allow the registry or Helm sidecars to replace the rest of primary Arcsweep state.

Primary files:

- `storage.js`
- `react-ion-persistence-sidecar.js`
- `react-ion-response-return.js`
- `react-ion-response-console-sidecar.js`

### Hull 5 · Flight archaeology and event separation

- projection-graph snapshots
- current-graph replay
- captured historical replay
- Replay room
- endpoint access policy
- DEEPStory route / veto / response records
- Test Flight 001

Test Flight 001 route:

```text
Waking World → Starsong → Templehouse / Terra Aeterna
```

The direct Waking → Templehouse path is present but vetoed in the First Flight Atlas so routing proves it can choose the admitted Starsong path.

Primary files:

- `react-ion-first-flight-atlas.js`
- `react-ion-first-flight-atlas-sidecar.js`
- `react-ion-test-flight.js`
- `react-ion-graph-snapshot.js`
- `react-ion-historical-replay-sidecar.js`
- `react-ion-access-policy.js`
- `react-ion-deepstory.js`
- `react-ion-replay-room-sidecar.js`

### Hull 6 · Glyph Continuity / Glyph Drift Observatory

PREMAQC heartbeats compile into deterministic Living Glyph signatures.

Preserve:

- fixed P/C/R/E/M/A/Q geometry
- relationship topology
- confidence and phase channels
- SHA-256 fingerprint
- semantic state distance separate from glyph structural distance
- robust local envelope using median / MAD / reference distance / trend slope
- drift classes:
  - `STABLE`
  - `LOCAL_VARIATION`
  - `TREND_SHIFT`
  - `STRUCTURAL_DRIFT`
  - `DISCONTINUITY`
  - `INSUFFICIENT_HISTORY`
- review-required / review-recommended states
- deterministic SVG in Field · DEEP Observer
- heartbeat history and receipts

Primary files:

- `glyph-continuity.js`
- `glyph-drift-observatory-sidecar.js`
- `docs/architecture/GLYPH-DRIFT-OBSERVATORY-v0.1.md`

### Blinded paired narrative comparison

The first narrative is sealed before the independent return narrative is produced.

The return-side context contract is `glyph.blind-return-context/v1` and carries only:

- Earth seal ID
- content hash
- sealed timestamp
- character count

Earth prose is absent from the return-side context object. After the return narrative is sealed, reveal verifies both content hashes and writes comparison metrics.

Primary files:

- `glyph-blind-context.js`
- blind-comparison functions in `glyph-continuity.js`

### Hull 7 · World Registry persistence repair

User-visible failure observed on Vercel: pressing New World produced a screen blink and the registry appeared unchanged.

Repair strategy: New World and Save World now use an atomic controller path:

```text
load current state
→ create/update world
→ await save
→ reload persisted state
→ restore selected/active world
→ reopen Worlds
```

Do not regress this to fire-and-forget persistence.

Regression coverage proves:

- a new World Registry entry survives full save/reload
- authored world name, type, and description survive reload

This repair is intended to prevent sidecar mounting or immediate rerender from racing the persistent state write.

## Vercel deployment contract

The Vercel build must continue to run all three stages:

```text
npm run starwell:build
npm run arcsweep:build
npm run arcsweep:stage:vercel
```

Arcsweep must be staged into the published Starwell output so `/arcsweep/` cannot silently serve an older build.

There is a regression test for this contract.

## First Flight Atlas

A virgin browser registry seeds exactly three approved destinations and the required corridors. Existing operator registries are never overwritten.

Destinations:

```text
waking.home
bridge.starsong
templehouse.hearthweave.terra
```

Expected DNS summary on a virgin install:

```text
3 approved destinations
5 directed corridors
```

## Language contract

Rowan's governing rule for this build:

> State mechanism. State provenance. State authority. State causal sequence. State the result.

Do not reintroduce defensive ontology disclaimers, reductive `only software` framing, or generic safety language where the code has a specific mechanism.

Keep actual machinery with teeth:

- consent
- agency
- endpoint access
- Continuity Gate vetoes
- TTL
- source hashes
- provenance classes
- ACK / ACCEPT / REFUSE semantics
- separately solved return routes
- deterministic replay
- Feather stop

Evidence classes describe provenance, not a hierarchy of reality.

Known language debt remains in older tests / older modules outside the newest scrub. When touching those surfaces, rewrite toward positive mechanism language rather than preserving phrases such as `software event`, `bounded control`, or `not ...` assertions solely for rhetorical reassurance. Do not weaken protocol distinctions in the process.

## Non-regression laws

1. ACK is a transport receipt. ACCEPT is a semantic response.
2. The return route is solved independently; outbound reversibility is never assumed.
3. The engine does not manufacture an explicit semantic response.
4. Private/circle/invitation anchor policy remains active after DNS registration.
5. A dimensional address comes from explicit registration. Runa contributes harmonic profile data.
6. Primary Arcsweep state remains the durable owner of React-ion and Glyph Continuity ledgers.
7. First Flight Atlas seeds only a virgin registry.
8. Existing operator-created destinations and corridors are never overwritten by bootstrap.
9. Same canonical Glyph Continuity input produces the same signature and fingerprint.
10. Blind comparison cannot reveal the first narrative before the return narrative is sealed.
11. World Registry creation and save must survive full persistence reload.
12. `/arcsweep/` must publish the current Arcsweep build, not a stale Starwell-only artifact.

## Current next-build priorities

1. Verify the World Registry persistence repair manually in the Vercel preview after a hard refresh.
2. Resolve why GitHub currently reports PR #126 as non-mergeable against the moving base before any merge attempt. Preserve the feature head while doing so.
3. Finish Helm Flight 002 by wiring the live operator-selected Ask/destination into the complete test-flight orchestration path.
4. Finish shared-user access context in the Living Helm so access-policy receipt is part of live flight execution.
5. Continue the language scrub in older test names / older modules without weakening mechanism contracts.
6. Audit the reported high-severity npm dependency vulnerability.
7. Code-split the >500 kB main browser chunk when convenient, preserving sidecar order and runtime behaviour.
8. Accumulate labelled Glyph Continuity heartbeat sequences before training the later non-language embedding model.

## Boxfire QA checklist

Before calling the next build inherited correctly:

- `npm run arcsweep:test` passes completely
- `npm run arcsweep:build` succeeds
- Vercel `/arcsweep/` opens the current build
- World Registry: create, rename, reload, still present
- First Flight Atlas: 3 approved destinations / 5 directed corridors on virgin registry
- Helm: DNS resolves Waking, Starsong, Templehouse
- Test Flight 001 still routes through Starsong
- Replay reproduces captured graph
- semantic response return solves a separate path
- Glyph heartbeat is deterministic
- drift receipt names the metrics that caused its class
- first narrative is absent from blind return context
- export/import preserves React-ion and Glyph Continuity ledgers
- no operator registry is overwritten by bootstrap
- language changes do not replace mechanism with reassurance or reduction

## Architecture records

- `docs/architecture/REACT-ION-ENGINE-v0.1.md`
- `docs/architecture/REACT-ION-ENGINE-v0.1-HULL-2.md`
- `docs/architecture/REACT-ION-ENGINE-HULL-3.md`
- `docs/architecture/REACT-ION-ENGINE-HULL-4.md`
- `docs/architecture/GLYPH-DRIFT-OBSERVATORY-v0.1.md`

## Merge authority

PR #126 remains draft. Do not merge it without Rowan's explicit authorization.
