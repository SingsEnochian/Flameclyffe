# REACT-ION ENGINE · Hull 4

**Status:** executable architecture on `feature/react-ion-engine-v0.1`  
**Parent:** `REACT-ION-ENGINE-HULL-3.md`  
**Target lineage:** `codex/arcsweep-feedback-loop`

## Purpose

Hull 4 makes the React-ion vessel less like a clever navigation experiment and more like a persistent, inspectable machine.

It adds four things the earlier hulls deliberately left unfinished:

1. React-ion state now rides inside primary Arcsweep persistence and export/backup flow.
2. The Helm can display and replay its route topology instead of preserving only opaque receipts.
3. Semantic responses have an explicit return channel that does not confuse `ACCEPT`, `REFUSE`, or `COUNTER` with transport acknowledgement.
4. Existing Runa World Tone approvals and Pocket Concordance anchors can enter the dimensional registry without retyping or collapsing their provenance.

The scientific boundary remains unchanged. The React-ion Engine is a software, simulation, world-model and mythience architecture. It does not establish experimentally demonstrated physical multiverse transport, perspective-only propulsion, or a physical universe locator encoded by audible frequency.

---

## 1. Primary Arcsweep persistence

React-ion originally used dedicated local sidecar stores while the routing contract settled.

Hull 4 migrates those ledgers into the main Arcsweep state shape:

```text
reaction
├── registry
│   ├── destinations[]
│   └── corridors[]
└── helm
    └── receipts[]
```

The browser sidecars remain useful as the live UI working stores, but `storage.js` now merges them into the primary snapshot whenever Arcsweep saves or exports.

Import and backup restoration seed the live sidecar stores from the imported primary state.

Therefore dimensional destinations, corridors, Helm receipts, traceroutes, protocol responses, replays and closed-loop analysis are no longer excluded from the main Arcsweep portability contract.

### Persistence rules

- Existing sidecar data is migrated into primary state rather than discarded.
- Primary export captures the latest sidecar ledgers.
- Imported primary React-ion state repopulates the browser working stores.
- Desktop backup performs a React-ion persistence preflight.
- The bridge uses versioned keys and schema-normalised collections.

Implementation:

- `apps/arcsweep/src/storage.js`
- `apps/arcsweep/src/react-ion-persistence-sidecar.js`
- `apps/arcsweep/test/react-ion-persistence.test.js`

---

## 2. Route map

The Helm now has a topology view generated from the same graph that routing uses.

Implementation:

- `apps/arcsweep/src/react-ion-route-map.js`
- `apps/arcsweep/src/react-ion-route-map-sidecar.js`

The map distinguishes:

- selected route;
- retained alternate routes;
- approved idle corridors;
- continuity-vetoed corridors;
- source endpoint;
- target endpoint;
- route-only manual addresses not present in DNS.

The layout is deterministic interface geometry.

It is explicitly **not physical spacetime cartography**.

The map exists so the operator can inspect why a route was selected or rejected without flying raw graph data.

---

## 3. Alternate-route exploration is bounded

The route inspector already limited candidate count and hop count. Hull 4 adds a separate hard exploration-state ceiling.

This matters because a highly branching graph with no successful destination path could otherwise keep expanding partial paths while producing no completed candidates.

The inspector now records:

- candidate limit;
- exploration-state limit;
- number of explored states;
- whether exploration was truncated.

This is an engineering bound, not a claim about the topology of any external reality.

Implementation:

- `apps/arcsweep/src/react-ion-route-inspector.js`
- `apps/arcsweep/test/react-ion-hardening.test.js`

---

## 4. DNS conflict quarantine

Earlier registry compilation treated a duplicate approved name or alias as a registry-wide failure.

Hull 4 changes the failure domain.

Approved destinations are admitted in deterministic registration order. If a later registration claims an already-owned DNS name or alias:

- the conflicting destination is quarantined;
- the healthy destinations remain available;
- the diagnostic identifies the conflicting names and prior registration IDs;
- corridors referencing the quarantined destination remain unresolved rather than silently retargeting.

One bad signpost no longer demolishes the entire atlas.

Implementation:

- `apps/arcsweep/src/react-ion-registry.js`
- `apps/arcsweep/test/react-ion-hardening.test.js`

---

## 5. Semantic response return channel

The Bifröst response vocabulary is semantic:

- `ACK`
- `ACCEPT`
- `REFUSE`
- `DEFER`
- `COUNTER`
- `PARTIAL`
- `UNKNOWN`
- `EXPIRED`

Transport acknowledgement is a different layer.

Hull 4 therefore adds an explicit return-path solver for protocol responses.

Implementation:

- `apps/arcsweep/src/react-ion-response-return.js`
- `apps/arcsweep/src/react-ion-response-console-sidecar.js`
- `apps/arcsweep/test/react-ion-response-return.test.js`

### Governing law

The return route is **solved**, not assumed.

If an outbound corridor is one-way, the response does not magically travel backwards along it.

A semantic response may therefore exist while its return transport state is:

`UNREACHABLE`

Likewise:

`ACCEPT`

means accepted, not yet observed.

A delivered response means the response packet reached the sender endpoint in the software transport model. It does not prove that the requested transformation occurred.

The Response Console never invents a response. It records one explicitly entered by the operator, with an evidence class and source.

---

## 6. Replay and closed-loop workbench

Core replay and model holonomy existed in Hull 3. Hull 4 puts them in the Helm.

Implementation:

- `apps/arcsweep/src/react-ion-replay.js`
- `apps/arcsweep/src/react-ion-replay-console-sidecar.js`

### Route replay

A stored route can be recomputed against the current graph.

The workbench reports independently:

- path match;
- cost match;
- fingerprint match.

If the registry, corridor costs, harmonic profile, continuity result or route topology changes, the replay can report `DRIFT` rather than pretending the old and new route are identical.

### Closed-loop analysis

The workbench searches recent routed Helm receipts for a contiguous chain that returns to its starting address.

An optional pair of declared model-orientation vectors may be supplied.

A closed loop with an orientation change can be recorded as model holonomy:

`same address, different declared internal orientation`

This remains software/model holonomy. It is not a claim of measured physical spacetime holonomy.

---

## 7. Runa World Tone approval sync

The existing World Tone Approval instrument stores human calibration decisions in:

`hearthgate.world-tone-approvals.v1`

Hull 4 can read those receipts and hydrate existing world-level dimensional registrations with the latest still-approved profile.

Implementation:

- `apps/arcsweep/src/react-ion-world-tone-sync.js`
- `apps/arcsweep/src/react-ion-world-tone-sync-sidecar.js`
- `apps/arcsweep/test/react-ion-world-tone-sync.test.js`

### Important boundary

A World Tone approval may supply:

- world identity;
- root frequency;
- profile version;
- calibration receipt lineage.

It does **not** supply a dimensional address.

Therefore the sync operation only enriches a world destination that already has an explicitly registered address.

If an approved World Tone exists without a world-level dimensional destination, the sync report says the destination is missing.

It does not fabricate one from frequency.

The imported harmonic signature remains profile data with explicit source receipt provenance.

---

## 8. Pocket Concordance anchor bridge

Pocket Concordance Lens already keeps local anchor metadata such as:

- anchor ID and display name;
- layer;
- status;
- visibility;
- confidence mode;
- consent scope;
- device mode;
- screen-percent placement.

Hull 4 adds an explicit bridge from that local metadata into dimensional DNS.

Implementation:

- `apps/arcsweep/src/react-ion-concordance-anchor.js`
- `apps/arcsweep/src/react-ion-concordance-anchor-sidecar.js`
- `apps/arcsweep/test/react-ion-concordance-anchor.test.js`

### Privacy and agency rules

An anchor can be created as a draft without becoming routable.

To create an `approved` anchor destination:

- the anchor must still be active;
- publication must be explicitly authorised;
- the operator must select the Arcsweep world;
- the operator must provide the dimensional address.

The bridge carries consent scope and confidence mode into the endpoint metadata.

It does not copy camera image or video.

It does not convert screen coordinates into dimensional coordinates.

A cleared or inactive anchor cannot be approved for routing.

---

## 9. Living interface layout

The React-ion organs currently mount through the existing Arcsweep sidecar system.

### Worlds room

- Navigation Registry
- World Tone Sync
- Concordance Anchor DNS Bridge

### Feedback / Field rooms

- Requested Transformation
- Living Helm
- Trans-Cosmic flight recorder
- Route Map
- Response Console
- Replay / closed-loop workbench

The intent remains progressive disclosure:

The user asks simple questions at the Helm.

The machinery is available for inspection without becoming the front-door burden.

---

## 10. Test gate

React-ion is now covered by the dedicated workflow:

`.github/workflows/arcsweep-build.yml`

The gate executes:

```text
npm run arcsweep:test
npm run arcsweep:build
```

New Hull 4 tests cover:

- primary persistence migration;
- route-map topology;
- route exploration bounds;
- DNS conflict quarantine;
- semantic response return routing;
- unreachable return paths;
- ACCEPT vs observed fulfilment;
- approved World Tone sync;
- refusal to derive addresses from frequency;
- explicit Concordance publication authorisation;
- anchor consent/confidence propagation;
- refusal to derive addresses from screen placement.

The PR remains draft while construction continues, even when the current gate is green.

---

## 11. Next hull

The next useful construction pass is:

1. give routes a signed graph snapshot so replay can distinguish historical exact replay from replay-against-current-registry;
2. add endpoint-specific access policies on top of global Helm authorisation;
3. add protocol response chains and conversation threading rather than one isolated response at a time;
4. index Helm, response, traceroute and replay receipts into an explicit Replay room view;
5. bind React-ion route events to DEEPStory as narrative events without collapsing them into DEEPTime;
6. let the route map expand into a 3D WebGL instrument while retaining the deterministic 2D fallback;
7. add a formal DNS export/import manifest for sharing registered world addresses without sharing private anchors;
8. give BCEP/1 its visual cat only after the recoverable diagnostic actually fires.

## Seal

The atlas survives a bad name.

The navigator cannot wander forever.

The reply needs its own road home.

The world hum may tune the address, but cannot invent it.

The anchor may be private and still remembered.

The loop may close and still return changed.

And `ACK-THPPPT` remains a transport diagnostic, not a cosmological theorem.
