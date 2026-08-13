# REACT-ION ENGINE · Hull 3

**Status:** executable architecture on `feature/react-ion-engine-v0.1`  
**Parent:** `docs/architecture/REACT-ION-ENGINE-v0.1.md`  
**Target lineage:** `codex/arcsweep-feedback-loop`

## Purpose

Hull 3 turns the first React-ion projection engine into a navigable software vessel rather than a collection of isolated formulas.

The new layer adds:

- a Dimensional Naming Service;
- approved destination registrations;
- explicit projection corridors;
- alternate-route inspection;
- Trans-Cosmic traceroute receipts;
- DEEPTime route extensions;
- deterministic route replay;
- closed-loop holonomy analysis;
- a dedicated Arcsweep test/build CI gate.

The central rule remains unchanged:

> Travel is modelled as re-projection, not displacement.

This is an executable software / simulation / mythience architecture. It does not assert experimentally demonstrated physical multiverse transport, perspective-only propulsion, or physically verified universe-frequency addressing.

---

## 1. Dimensional Naming Service

The compact address remains:

`X.Y.Z.T@frequency:φ=phase`

Humans should not be expected to remember it.

Hull 3 therefore adds an approved destination registry. A destination may be registered as a:

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

Lifecycle states are:

- `draft`;
- `approved`;
- `deprecated`.

Only `approved` destinations enter the runtime naming table.

A draft may therefore be authored, inspected and revised without silently becoming navigable.

### Implementation

- `apps/arcsweep/src/react-ion-registry.js`
- `apps/arcsweep/src/react-ion-registry-sidecar.js`

The registry desk mounts in Arcsweep's Worlds room and can link directly to existing World and Place records. Manual entries may carry Concordance anchor identifiers.

The first persistence layer is a dedicated local registry store:

`hearthgate.arcsweep.react-ion-registry.v1`

This is deliberately separate from the main Arcsweep state in Hull 3. Migration into exported/imported Arcsweep state remains a later hull task.

---

## 2. Projection corridors

An address tells the Helm where an endpoint is in the model. It does not prove that every endpoint may be reached directly from every other endpoint.

Hull 3 adds explicit corridors.

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

Only approved corridors enter the route graph.

Bidirectional corridors compile a reverse edge using the transposed Jacobian rather than pretending the forward matrix is automatically identical in reverse.

Every corridor edge is compiled through the existing STARWELL Jacobian analyser and React-ion Continuity Gate.

A failed gate becomes a blocked edge.

Blocked edges remain inspectable but are not routable.

---

## 3. Helm name resolution

The Living Helm now resolves approved DNS names before reading manual Instrument Bay addressing.

Resolution order:

1. exact approved DNS name or alias;
2. for the source only, an approved world-level endpoint matching the active Arcsweep world;
3. manual Instrument Bay fallback.

When a DNS registration resolves, the registered dimensional address and Runa profile take precedence over manual fallback values.

This prevents the visible interface from requiring repeated entry of already-approved machine state.

The operator-facing questions remain simple:

- Where are we?
- Where are we going?
- What do you notice?
- What are you asking?
- What transformation do you intend?
- What must remain unchanged?

The Instrument Bay remains expandable.

---

## 4. Operator continuity is a global route gate

Hull 3 strengthens the Helm route law.

Authorization alone is not enough to route.

The operator continuity gate evaluates:

- identity;
- continuity;
- agency.

The Helm computes:

`canRoute = authorised && operatorContinuityGate.admitted`

If that gate closes, neither a direct candidate nor an otherwise-approved registry corridor may bypass it.

The distinction is preserved in the receipt:

- `ask_authorised`;
- `operator_continuity_gate_admitted`;
- `route_gate_admitted`.

An authorised Ask can therefore still produce a correctly receipted route veto.

---

## 5. Alternate-route inspection

The minimum-cost route remains Dijkstra-style.

Hull 3 adds a bounded simple-path inspector so the Helm can retain alternatives rather than discarding every route except the winner.

Implementation:

`apps/arcsweep/src/react-ion-route-inspector.js`

The inspector:

- skips blocked edges;
- forbids repeated nodes within one candidate path;
- obeys a maximum-hop bound;
- ranks candidates by total weighted cost;
- breaks ties by hop count and deterministic path order;
- fingerprints each retained candidate.

The Helm currently retains up to five candidates.

The best route is still compiled through the main route engine. Alternatives are inspection artefacts, not automatically travelled paths.

---

## 6. DEEPTime route extension

If the Helm has both:

- an admitted route; and
- a receipted PREMAQC source state,

it emits a DEEPTime React-ion extension.

Hull 3 deliberately gives each navigation request its own sequence:

`sequence_id = reaction-<navigation-request-id>`

with:

`lambda = 0`

This avoids manufacturing a false continuous temporal series when multiple Helm compilations occur against the same PREMAQC snapshot.

The extension carries:

- UTC;
- Julian Date;
- PREMAQC source receipt;
- accepted-state hash;
- route fingerprint;
- Ask fingerprint;
- route path and cost;
- explicit missing harmonic-profile fields;
- the authority statement that the route is a modelled projection path, not an observation.

---

## 7. Trans-Cosmic Protocol traceroute

The TCP joke now has an executable transport layer.

Implementation:

`apps/arcsweep/src/react-ion-transport.js`

A routed Ask can be traced hop by hop.

Each hop records:

- address;
- TTL before;
- TTL after;
- loopback state;
- acknowledgement code.

If TTL is exhausted before the target, the traceroute closes with:

`EXPIRED`

If the target is reached, it closes with:

`ACK`

The transport receipt explicitly states:

> Delivery is transport state, not fulfilment of the requested transformation.

### BCEP/1

Recoverable transport loopback remains eligible for:

`ACK-THPPPT`

The Bill the Cat diagnostic is not emitted for serious consent, continuity or data-integrity failure.

The Helm flight-recorder sidecar enriches completed Helm route receipts with this traceroute and displays the hop list beneath the main receipt.

Implementation:

`apps/arcsweep/src/react-ion-flight-recorder-sidecar.js`

---

## 8. Deterministic route replay

Implementation:

`apps/arcsweep/src/react-ion-replay.js`

A route can be recomputed from the original navigation request and a supplied graph.

Replay checks:

- path equality;
- cost equality;
- fingerprint equality.

If the graph or weighting environment changes enough to produce a different route, replay reports drift rather than silently blessing the new result as identical.

Replay verifies declared software inputs only. It is not independent physical validation.

---

## 9. Closed-loop holonomy

Hull 3 adds a formal return-with-difference receipt.

A chain of route receipts may be analysed when:

- every route begins where the previous one ended; and
- the final destination equals the initial source.

The loop receipt records:

- all route IDs and fingerprints;
- total hop count;
- accumulated route cost;
- maximum Jacobian risk;
- maximum harmonic mismatch;
- maximum continuity risk.

An optional declared model-orientation vector may be supplied before and after the loop.

If the closed path returns to the same address while the declared orientation changes beyond tolerance, the model records:

`holonomy_detected = true`

This is model holonomy. It does not claim measured physical spacetime holonomy.

It gives the architecture a rigorous software form for:

> same home, same address, different return orientation.

---

## 10. CI becomes a real gate

Hull 3 adds:

`.github/workflows/arcsweep-build.yml`

The workflow runs on relevant Arcsweep pushes and pull requests and performs:

1. Node setup from `.nvmrc`;
2. dependency installation;
3. `npm run arcsweep:test`;
4. `npm run arcsweep:build`.

This closes the earlier gap where Vercel could prove that the browser build compiled but the Node contract suite was not executing for this branch.

The React-ion PR should remain draft whenever this gate is red or unavailable.

---

## 11. New contract tests

Hull 3 adds tests for:

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
- closed-loop model holonomy.

---

## 12. Current persistence boundary

Two React-ion UI stores remain sidecar-local in Hull 3:

- registry store;
- Helm / flight receipt store.

That gives the prototype durable browser continuity but does not yet make those records part of Arcsweep's primary exported state or desktop backup contract.

This is an explicit unfinished boundary, not an implied integration.

### Next persistence migration

Move both stores into versioned Arcsweep state with:

- import/export support;
- desktop backups;
- schema migration;
- append-only receipt history;
- explicit deletion / deprecation semantics;
- DEEPTime and Replay indexing.

---

## 13. Next hull

The next useful construction pass is:

1. migrate DNS, corridor and Helm receipts into the primary Arcsweep state;
2. add a route-map visualizer to the Helm Instrument Bay;
3. add replay controls to existing Helm receipts;
4. add a closed-loop / holonomy workbench;
5. allow approved Runa World Reception Profiles to register harmonic signatures without retyping them;
6. allow Concordance Anchor Registry records to publish approved DNS endpoints;
7. add signed protocol responses and return-path receipts;
8. expose transport failures separately from semantic refusal, delay and counterproposal;
9. keep BCEP/1 exactly where it belongs: lurking in the recoverable diagnostics ductwork.

## Seal

The name resolves.

The Ask routes.

The Gate may refuse.

The packet may expire.

The path is receipted.

The return can be replayed.

And the cat still has network privileges.
