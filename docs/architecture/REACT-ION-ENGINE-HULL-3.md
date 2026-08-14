# REACT-ION ENGINE · Hull 3

**Status:** executable architecture on `feature/react-ion-engine-v0.1`  
**Parent:** `docs/architecture/REACT-ION-ENGINE-v0.1.md`  
**Target lineage:** `codex/arcsweep-feedback-loop`

## Purpose

Hull 3 turns the first React-ion projection engine into a navigable vessel.

It adds:

- a Dimensional Naming Service;
- approved destination registrations;
- explicit projection corridors;
- alternate-route inspection;
- Trans-Cosmic traceroute receipts;
- DEEPTime route extensions;
- deterministic route replay;
- closed-loop holonomy analysis;
- a dedicated Arcsweep test/build CI gate.

The central rule is:

> Travel is re-projection.

---

## 1. Dimensional Naming Service

The compact address is:

`X.Y.Z.T@frequency:φ=phase`

Hull 3 adds an approved destination registry. A destination may be registered as a:

- world;
- place;
- Concordance anchor;
- gate;
- manual endpoint.

Each registration may carry:

- canonical DNS name;
- aliases;
- linked World / Place / Anchor identity;
- compact dimensional address;
- optional Runa root and phase;
- profile version;
- evidence class;
- provenance;
- lifecycle state.

Lifecycle states are `draft`, `approved`, and `deprecated`.

Approved destinations enter the runtime naming table. Drafts remain editable records.

Implementation:

- `apps/arcsweep/src/react-ion-registry.js`
- `apps/arcsweep/src/react-ion-registry-sidecar.js`

The registry desk mounts in Arcsweep's Worlds room and links to existing World and Place records. Manual entries may carry Concordance anchor identifiers.

---

## 2. Projection corridors

An address identifies an endpoint. A corridor identifies an admitted path between endpoints.

A corridor declares:

- `from` destination;
- `to` destination;
- navigation Jacobian;
- identity continuity score;
- thread continuity score;
- agency continuity score;
- continuity floor;
- optional hard vetoes;
- one-way or bidirectional topology;
- registration state.

Approved corridors enter the route graph.

Bidirectional corridors compile a reverse edge using the transposed Jacobian.

Every corridor edge passes through the STARWELL Jacobian analyser and React-ion Continuity Gate. A failed gate becomes a blocked edge. Blocked edges remain inspectable and stay outside route selection.

---

## 3. Helm name resolution

The Living Helm resolves approved DNS names before reading manual Instrument Bay addressing.

Resolution order:

1. exact approved DNS name or alias;
2. approved world-level source endpoint matching the active Arcsweep world;
3. manual Instrument Bay fallback.

When a DNS registration resolves, its registered dimensional address and Runa profile take precedence over manual fallback values.

The operator-facing questions remain simple:

- Where are we?
- Where are we going?
- What do you notice?
- What are you asking?
- What transformation do you intend?
- What must remain unchanged?

---

## 4. Operator continuity is a global route gate

The operator continuity gate evaluates identity, continuity, and agency.

The Helm computes:

`canRoute = authorised && operatorContinuityGate.admitted`

When the gate closes, every candidate path is vetoed at the Helm level.

The receipt preserves:

- `ask_authorised`;
- `operator_continuity_gate_admitted`;
- `route_gate_admitted`.

An authorised Ask can therefore produce a route veto with full provenance.

---

## 5. Alternate-route inspection

Hull 3 adds a bounded simple-path inspector.

Implementation:

`apps/arcsweep/src/react-ion-route-inspector.js`

The inspector:

- skips blocked edges;
- forbids repeated nodes within one candidate path;
- obeys a maximum-hop bound;
- ranks candidates by total weighted cost;
- breaks ties by hop count and deterministic path order;
- fingerprints each retained candidate.

The Helm retains up to five candidates. The primary route still comes from the main route engine.

---

## 6. DEEPTime route extension

When the Helm has an admitted route and a receipted PREMAQC source state, it emits a DEEPTime React-ion extension.

Each navigation request receives its own sequence:

`sequence_id = reaction-<navigation-request-id>`

with:

`lambda = 0`

The extension carries:

- UTC;
- Julian Date;
- PREMAQC source receipt;
- accepted-state hash;
- route fingerprint;
- Ask fingerprint;
- route path and cost;
- explicit missing harmonic-profile fields;
- route provenance.

---

## 7. Trans-Cosmic Protocol traceroute

Implementation:

`apps/arcsweep/src/react-ion-transport.js`

A routed Ask can be traced hop by hop.

Each hop records:

- address;
- TTL before;
- TTL after;
- loopback state;
- acknowledgement code.

TTL exhaustion closes with `EXPIRED`. Reaching the target closes with `ACK`.

Transport state and transformation state remain separate receipts in the same chain.

### BCEP/1

Recoverable transport loopback remains eligible for:

`ACK-THPPPT`

Consent, continuity, access, and data-integrity failures keep their own native diagnostics.

The Helm flight recorder enriches completed Helm route receipts with traceroute data and displays the hop list beneath the main receipt.

---

## 8. Deterministic route replay

Implementation:

`apps/arcsweep/src/react-ion-replay.js`

Replay recomputes a route from the original navigation request and supplied graph.

Replay checks:

- path equality;
- cost equality;
- fingerprint equality.

Changed routing conditions produce `DRIFT`.

---

## 9. Closed-loop holonomy

Hull 3 adds a formal return-with-difference receipt.

A chain may be analysed when every route begins where the previous route ended and the final destination equals the initial source.

The loop receipt records:

- route IDs and fingerprints;
- total hop count;
- accumulated route cost;
- maximum Jacobian risk;
- maximum harmonic mismatch;
- maximum continuity risk.

Optional before/after orientation vectors produce an orientation delta.

A closed path that returns to the same address with orientation change beyond tolerance records:

`holonomy_detected = true`

Same address, changed return orientation.

---

## 10. CI becomes a real gate

Hull 3 adds:

`.github/workflows/arcsweep-build.yml`

The workflow performs:

1. Node setup from `.nvmrc`;
2. dependency installation;
3. `npm run arcsweep:test`;
4. `npm run arcsweep:build`.

The PR stays draft while this gate is red or unavailable.

---

## 11. Contract tests

Hull 3 covers:

- approved vs draft DNS registrations;
- alias resolution;
- world-level destination lookup;
- bidirectional corridors;
- continuity-blocked corridors;
- alternate route ranking;
- blocked-route omission;
- Trans-Cosmic traceroute delivery;
- TTL expiry;
- deterministic route replay;
- replay drift;
- closed-loop holonomy.

---

## 12. Persistence boundary at Hull 3

Hull 3 stores the registry and Helm ledger in sidecar-local stores.

That boundary is the starting point for Hull 4 migration into primary Arcsweep persistence, export, backup, and restore.

---

## Seal

The name resolves.

The Ask routes.

The Gate may refuse.

The packet may expire.

The path is receipted.

The return can be replayed.

And the cat still has network privileges.
