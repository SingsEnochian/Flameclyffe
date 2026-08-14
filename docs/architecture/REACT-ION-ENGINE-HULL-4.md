# REACT-ION ENGINE · Hull 4

**Status:** executable architecture on `feature/react-ion-engine-v0.1`  
**Parent:** `REACT-ION-ENGINE-HULL-3.md`  
**Target lineage:** `codex/arcsweep-feedback-loop`

## Purpose

Hull 4 makes the React-ion vessel persistent, inspectable, and replayable.

It adds four major systems:

1. React-ion state rides inside primary Arcsweep persistence and export/backup flow.
2. The Helm displays and replays route topology.
3. Semantic responses have an explicit return channel separate from transport acknowledgement.
4. Runa World Tone approvals and Pocket Concordance anchors enter dimensional DNS with their provenance intact.

---

## 1. Primary Arcsweep persistence

React-ion state now lives inside the main Arcsweep state shape:

```text
reaction
├── registry
│   ├── destinations[]
│   └── corridors[]
└── helm
    └── receipts[]
```

The browser sidecars remain the live UI working stores. `storage.js` merges them into the primary snapshot whenever Arcsweep saves or exports.

Import and backup restoration seed the live sidecar stores from primary state.

Persistence rules:

- existing sidecar data migrates into primary state;
- primary export captures current React-ion ledgers;
- imported React-ion state repopulates browser working stores;
- desktop backup performs a React-ion persistence preflight;
- versioned keys and schema-normalised collections govern migration.

Implementation:

- `apps/arcsweep/src/storage.js`
- `apps/arcsweep/src/react-ion-persistence-sidecar.js`
- `apps/arcsweep/test/react-ion-persistence.test.js`

---

## 2. Route map

The Helm topology view is generated from the same graph used by route selection.

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
- manual route-only addresses.

The 2D layout is deterministic interface geometry and remains the inspectable truth surface for route topology.

---

## 3. Alternate-route exploration is bounded

The route inspector carries a hard exploration-state ceiling in addition to candidate count and hop count.

The inspector records:

- candidate limit;
- exploration-state limit;
- explored-state count;
- truncation state.

This keeps route search finite and receipted even in a highly branching graph.

Implementation:

- `apps/arcsweep/src/react-ion-route-inspector.js`
- `apps/arcsweep/test/react-ion-hardening.test.js`

---

## 4. DNS conflict quarantine

Approved destinations enter the registry in deterministic registration order.

When a later registration claims an existing DNS name or alias:

- the conflicting destination is quarantined;
- healthy destinations remain available;
- diagnostics identify conflicting names and prior registration IDs;
- corridors referencing the quarantined destination remain unresolved.

One bad signpost no longer demolishes the atlas.

Implementation:

- `apps/arcsweep/src/react-ion-registry.js`
- `apps/arcsweep/test/react-ion-hardening.test.js`

---

## 5. Semantic response return channel

The Bifröst semantic vocabulary is:

- `ACK`
- `ACCEPT`
- `REFUSE`
- `DEFER`
- `COUNTER`
- `PARTIAL`
- `UNKNOWN`
- `EXPIRED`

Transport acknowledgement and semantic response are separate layers.

Hull 4 adds an explicit return-path solver for protocol responses.

Implementation:

- `apps/arcsweep/src/react-ion-response-return.js`
- `apps/arcsweep/src/react-ion-response-console-sidecar.js`
- `apps/arcsweep/test/react-ion-response-return.test.js`

### Governing law

The return route is solved from the current graph.

A one-way outbound corridor gives no automatic reverse path. A semantic response can therefore be recorded while return transport is `UNREACHABLE`.

`ACCEPT` records acceptance. Observation and transformation outcome continue through their own receipts.

The Response Console records an explicitly supplied response together with evidence class, source, response fingerprint, return route, and delivery state.

---

## 6. Replay and closed-loop workbench

Implementation:

- `apps/arcsweep/src/react-ion-replay.js`
- `apps/arcsweep/src/react-ion-replay-console-sidecar.js`

### Route replay

A stored route can be recomputed against the current graph.

The workbench reports:

- path match;
- cost match;
- fingerprint match.

Changed registry state, corridor cost, harmonic profile, continuity result, or topology can produce `DRIFT`.

### Closed-loop analysis

The workbench searches recent routed Helm receipts for a contiguous chain that returns to its starting address.

Optional declared orientation vectors supply before/after state. A closed loop with changed orientation records return-with-difference as holonomy.

---

## 7. Runa World Tone approval sync

The World Tone Approval instrument stores human calibration decisions in:

`hearthgate.world-tone-approvals.v1`

Hull 4 reads those receipts and hydrates existing world-level dimensional registrations with the latest still-approved profile.

Implementation:

- `apps/arcsweep/src/react-ion-world-tone-sync.js`
- `apps/arcsweep/src/react-ion-world-tone-sync-sidecar.js`
- `apps/arcsweep/test/react-ion-world-tone-sync.test.js`

World Tone contributes:

- world identity;
- root frequency;
- profile version;
- calibration receipt lineage.

The dimensional registry contributes the address.

The sync joins those two sources in one endpoint while preserving both provenances. Missing world-level addresses remain explicit in the sync report.

---

## 8. Pocket Concordance anchor bridge

Pocket Concordance Lens keeps anchor metadata including:

- anchor ID and display name;
- layer;
- status;
- visibility;
- confidence mode;
- consent scope;
- device mode;
- screen-percent placement.

Hull 4 bridges selected anchor metadata into dimensional DNS.

Implementation:

- `apps/arcsweep/src/react-ion-concordance-anchor.js`
- `apps/arcsweep/src/react-ion-concordance-anchor-sidecar.js`
- `apps/arcsweep/test/react-ion-concordance-anchor.test.js`

### Privacy and agency rules

Draft anchors remain non-routable.

An `approved` anchor destination requires:

- active anchor status;
- explicit publication authorisation;
- selected Arcsweep world;
- explicit dimensional address.

The bridge carries consent scope, confidence mode, visibility, status, and anchor identity into endpoint provenance.

Camera media stays outside the bridge. Screen placement stays screen placement. Dimensional address remains an explicit registry field.

---

## 9. Living interface layout

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

The operator sees simple questions first. The machinery remains available beneath them.

---

## 10. Test gate

React-ion is covered by:

`.github/workflows/arcsweep-build.yml`

The gate executes:

```text
npm run arcsweep:test
npm run arcsweep:build
```

Hull 4 tests cover:

- primary persistence migration;
- route-map topology;
- route exploration bounds;
- DNS conflict quarantine;
- semantic response return routing;
- unreachable return paths;
- ACCEPT and outcome separation;
- approved World Tone sync;
- dimensional address preservation;
- explicit Concordance publication authorisation;
- anchor consent/confidence propagation;
- screen-placement/address separation.

The PR remains draft while construction continues.

---

## 11. Next hull

The next construction pass is:

1. signed graph snapshots and export receipts;
2. endpoint-specific access policy at the Helm;
3. protocol response chains and conversation threading;
4. Replay room indexing for Helm, response, traceroute, DEEPStory, and replay receipts;
5. 3D route-map instrument skin over the deterministic 2D truth surface;
6. DNS export/import manifests with private-anchor filtering;
7. BCEP/1 visual cat after recoverable diagnostic fire.

## Seal

The atlas survives a bad name.

The navigator stays bounded.

The reply finds its own road home.

The world hum tunes its profile.

The anchor keeps its consent.

The loop may close and return changed.

And `ACK-THPPPT` still owns a socket.
