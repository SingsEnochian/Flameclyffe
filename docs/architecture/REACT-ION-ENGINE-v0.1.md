# REACT-ION ENGINE v0.1

**Status:** Experimental architecture / first executable spine

**Branch:** `feature/react-ion-engine-v0.1`

## Prime inversion

The React-ion Engine models travel as **re-projection rather than displacement**.

A vessel has a persistent state larger than any one rendered frame. A local world, timeline, simulation, narrative domain, or interface exposes a projection of that state. Navigation changes the active projection while a continuity gate protects declared invariants.

This is a formal software, simulation, and mythience architecture. It does not claim that physical multiverse travel, universe-addressing frequencies, or perspective-only spacecraft propulsion have been experimentally demonstrated.

## Human contract

The ordinary operator should not be asked to fly the mathematics.

The living interface asks for:

- Where are we?
- What do you notice?
- What are you asking?
- What transformation do you intend?
- What must remain unchanged?

The instrument bay may expose Jacobians, singular values, harmonic mismatch, projection cost, PREMAQC receipts, provenance, route alternatives, and replay data.

Complexity stays under the floorboards without erasing provenance.

## Dimensional address

The compact human-readable routing form is:

`X.Y.Z.T@frequency:φ=phase`

Each of the four routing fields is an integer in `0..255`, producing the familiar 32-bit / IPv4-shaped namespace. Frequency and phase are optional harmonic selectors inside the model, not independently verified physical universe coordinates.

Example:

`0137.0042.0219.0088@7.835769:φ=1.724`

A Dimensional Naming Service may map memorable names to these compact addresses, for example:

`templehouse.hearthweave.terra`

The current resolver expands each compact address into 32 eight-component lattice blocks, yielding a 256-dimensional `E8^32`-shaped software coordinate. v0.1 uses integer D8 representatives, a valid integer sublattice of E8, as deterministic block coordinates.

## Navigation state

For local render state `y = f(u)`, the navigation Jacobian is:

`J = ∂y/∂u`

The v0.1 cusp score follows the existing fold convention:

`Φ = 1 - σ_min / (σ_max + ε)`

State precedence:

1. `CONTINUITY_UNSAFE`
2. `CUSP_NEARBY`
3. `DEGRADED`
4. `READY`

Continuity is therefore allowed to veto an otherwise attractive route.

## Projection routing

Each candidate edge carries four normalized costs:

- projection distance
- Jacobian risk
- harmonic mismatch
- continuity risk

Default weighted cost:

`C = 1·D + 2·J + 1·H + 3·K`

The route solver uses Dijkstra-style minimum-cost routing. This makes a short but unstable direct edge lose to a longer route that better preserves continuity.

The weights are configuration, not metaphysical constants.

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

An Ask is not an observation and is not proof that the requested transformation occurred.

## Response vocabulary

- `ACK`: request received
- `ACCEPT`: request accepted, fulfilment not yet proven
- `REFUSE`: request declined
- `DEFER`: not now
- `COUNTER`: alternate terms proposed
- `PARTIAL`: some requested portion may be fulfilled
- `UNKNOWN`: insufficient basis to classify
- `EXPIRED`: request exceeded its meaningful routing window

Silence is never automatically agreement.

## Evidence classes

Every attached evidence item must identify its epistemic class:

- `observed`
- `derived`
- `simulated`
- `symbolic`
- `model-generated`

A simple interface may hide the details by default, but may not collapse these categories into one undifferentiated truth label.

## Consent and continuity

Consent may be required, granted, scoped, and revocable. `ACCEPT` cannot override a packet that declares required consent but lacks it.

Navigation requests carry a preservation set. Default invariants are:

- identity
- continuity
- crew
- causal history

Future versions should allow world-specific invariant contracts and Continuity Gate receipts.

## Runa and harmonic selectors

Runa may provide harmonic signatures, mismatch measures, beat periods, phase relationships, and World Hum context. In the React-ion model these are selectors and compatibility features, not claims that one audible frequency uniquely identifies a physically existing universe.

## Arcsweep, PREMAQC and DEEPTime

Arcsweep supplies receipted observations, transformation requests, replay, and Continuity Gate functions.

PREMAQC supplies state context and admissibility signals without being rewritten to make a request appear successful.

DEEPTime should record the route history `Γ(τ)`, including rejected alternatives. A later holonomy pass can compare closed routes that return to the same apparent destination with changed internal orientation.

## Easter egg protocol

`BCEP/1`: **Bill the Cat Easter Egg Protocol**.

A normal healthy acknowledgement remains `ACK`.

A recoverable loopback or checksum diagnostic may emit:

`ACK-THPPPT`

Presentation contract: a scraggly orange cat with one eye appears, sticks out its tongue, delivers the diagnostic, and disappears.

Source comment:

`// ancient protocol. do not remove.`

It must never replace a serious consent, safety, continuity, or data-integrity failure.

## v0.1 executable files

- `apps/arcsweep/src/bifrost-protocol-stack.js`
- `apps/arcsweep/src/react-ion-engine.js`
- `apps/arcsweep/test/bifrost-protocol-stack.test.js`
- `apps/arcsweep/test/react-ion-engine.test.js`

## Next hull sections

1. Connect Dimensional Naming Service to World/Location registries.
2. Bind Ask packets to Requested Transformation and Waking World Ask receipts.
3. Add Continuity Gate route vetoes.
4. Feed Runa harmonic signatures into route-edge generation.
5. Write route receipts to DEEPTime and Replay.
6. Build a Living Interface with four operator prompts and an expandable Instrument Bay.
7. Add the BCEP cat only after the diagnostic state itself is visible and inspectable.
