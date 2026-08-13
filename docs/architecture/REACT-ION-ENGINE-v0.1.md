# REACT-ION ENGINE v0.1

**Status:** Experimental architecture / first executable spine

**Branch:** `feature/react-ion-engine-v0.1`

## Prime inversion

The React-ion Engine treats travel as **re-projection rather than displacement**.

A vessel has a persistent state larger than any one rendered frame. A world, timeline, narrative domain, simulation, or interface exposes a local projection of that state. Navigation changes the active projection while the Continuity Gate protects declared invariants.

React-ion records the source and class of its coordinates, harmonics, observations, interpretations, route calculations, and replay results. Research claims can therefore be evaluated from their receipts instead of being settled by vocabulary.

## Human contract

The operator flies the ship, not the mathematics.

The living interface asks:

- Where are we?
- Where are we going?
- What do you notice?
- What are you asking?
- What transformation do you intend?
- What must remain unchanged?

The Instrument Bay exposes Jacobians, singular values, harmonic mismatch, projection cost, PREMAQC receipts, provenance, route alternatives, traceroutes, graph snapshots, replay, and return analysis when requested.

Complexity stays under the floorboards without erasing provenance.

## Dimensional address

The compact routing form is:

`X.Y.Z.T@frequency:φ=phase`

Each routing field is an integer in `0..255`, giving a 32-bit IPv4-shaped namespace. Frequency and phase are harmonic selectors carried alongside the compact address.

Example:

`0137.0042.0219.0088@7.835769:φ=1.724`

The Dimensional Naming Service maps memorable names onto explicitly registered addresses, for example:

`templehouse.hearthweave.terra`

The resolver deterministically expands a compact address into 32 eight-component lattice blocks, yielding a 256-dimensional `E8^32`-shaped coordinate representation. v0.1 uses integer D8 representatives, an integer sublattice of E8, as deterministic block coordinates.

The address registration, harmonic selector, resolver output, and evidence lineage remain separately receipted.

## Navigation state

For local render state `y = f(u)`, the navigation Jacobian is:

`J = ∂y/∂u`

The v0.1 cusp score follows the existing fold convention:

`Φ = 1 - σ_min / (σ_max + ε)`

State precedence:

1. `CONTINUITY_VETO`
2. `CUSP_NEARBY`
3. `DEGRADED`
4. `READY`

Continuity therefore has route authority. A route that fails its declared invariants is vetoed rather than merely made expensive.

## Projection routing

Each candidate edge carries four normalised costs:

- projection distance
- Jacobian risk
- harmonic mismatch
- continuity risk

Default weighted cost:

`C = 1·D + 2·J + 1·H + 3·K`

The route solver uses Dijkstra-style minimum-cost routing. A short direct edge can therefore lose to a longer corridor whose combined continuity and Jacobian cost is lower.

The weights are named configuration values and are written into route receipts.

## Bifröst Protocol Stack

### TCP: Trans-Cosmic Protocol

Transport responsibilities:

- packet identity
- TTL
- hop count
- loop detection
- route receipts
- integrity fingerprints
- acknowledgements
- replayability

### IP: Intention Protocol

Semantic responsibilities:

- sender and target
- world/domain
- intention
- requested transformation
- preservation constraints
- forbidden transformations
- consent scope
- PREMAQC context
- evidence and provenance

An Ask is a request/control event. Observation, semantic response, and transformation outcome enter the receipt chain independently.

## Response vocabulary

- `ACK`: transport or request receipt
- `ACCEPT`: semantic acceptance
- `REFUSE`: request declined
- `DEFER`: not now
- `COUNTER`: alternate terms proposed
- `PARTIAL`: a portion is accepted or returned
- `UNKNOWN`: basis is insufficient to classify
- `EXPIRED`: the packet exceeded its routing window

Silence carries no affirmative response code.

## Evidence classes

Every attached evidence item identifies how it entered the instrument:

- `observed`
- `derived`
- `simulated`
- `symbolic`
- `model-generated`

These are provenance classes, not a ladder of permitted reality. They allow later analysis to distinguish measurement, derivation, simulation, symbolism, and generated material without collapsing them into one label.

## Consent and continuity

Consent may be required, granted, scoped, and revocable. An `ACCEPT` response inherits the consent contract carried by its Ask.

Navigation requests carry preservation invariants. Defaults are:

- identity
- continuity
- crew
- causal history

The Continuity Gate can veto a corridor or a whole route when required invariants are missing, fall below their configured floor, or carry an explicit veto.

## Runa and harmonic selectors

Runa contributes harmonic signatures, mismatch measures, beat periods, phase relationships, and World Hum context. The dimensional registry supplies the registered address; Runa supplies the harmonic profile and its receipt lineage.

That separation is structural. It keeps address assignment, harmonic calibration, and later interpretation independently inspectable.

## Arcsweep, PREMAQC, DEEPTime and DEEPStory

Arcsweep supplies the Helm, Requested Transformation, Continuity Gate, Replay, and operator-facing world records.

PREMAQC supplies receipted state context and admissibility signals.

DEEPTime records temporal state and route extensions, including the accepted PREMAQC source hash, route fingerprint, UTC, Julian Date, missing fields, and quality metadata.

DEEPStory records route, veto, response, replay, and return events with narrative context and declared interpretation layered over the source receipts.

Request, observation, interpretation, response, and outcome therefore remain distinct without being severed from one another.

## Replay and holonomy

Replay recomputes a route from its navigation request, graph, and weights and compares path, cost, and fingerprint.

A captured graph snapshot allows historical replay against the routing state that existed when the route was compiled. Replay against the current registry answers a different question and is receipted separately.

Closed route chains can be analysed for return-with-difference. Optional before/after orientation vectors produce a declared orientation delta and a holonomy receipt when the closed path returns to the same address with changed internal orientation.

## Easter egg protocol

`BCEP/1`: **Bill the Cat Easter Egg Protocol**.

Healthy receipt remains:

`ACK`

A recoverable loopback or checksum diagnostic may emit:

`ACK-THPPPT`

Presentation contract: a scraggly orange cat with one eye appears, sticks out its tongue, delivers the diagnostic, and disappears.

Source comment:

`// ancient protocol. do not remove.`

BCEP activates after recoverable diagnostic classification. Consent, continuity, and data-integrity failures retain their native diagnostic codes.

## Executable surface

Core organs include:

- `apps/arcsweep/src/bifrost-protocol-stack.js`
- `apps/arcsweep/src/react-ion-engine.js`
- `apps/arcsweep/src/react-ion-bridge.js`
- `apps/arcsweep/src/react-ion-registry.js`
- `apps/arcsweep/src/react-ion-helm-sidecar.js`
- `apps/arcsweep/src/react-ion-transport.js`
- `apps/arcsweep/src/react-ion-response-return.js`
- `apps/arcsweep/src/react-ion-graph-snapshot.js`
- `apps/arcsweep/src/react-ion-replay.js`
- `apps/arcsweep/src/react-ion-deepstory.js`

The dedicated Arcsweep contract suite and build workflow cover the executable spine.

## Research status

v0.1 establishes a deterministic, receipted React-ion instrument architecture. It records what was supplied, observed, derived, simulated, symbolised, generated, routed, returned, and replayed, so future empirical work can extend the evidence without rewriting earlier receipts.
