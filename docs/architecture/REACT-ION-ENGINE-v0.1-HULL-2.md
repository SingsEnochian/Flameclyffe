# REACT-ION ENGINE v0.1 · Hull 2

**Status:** Implemented on `feature/react-ion-engine-v0.1`

**Parent architecture:** `docs/architecture/REACT-ION-ENGINE-v0.1.md`

## Purpose

Hull 2 connects the first React-ion routing spine to organs that already exist in Arcsweep / STARWELL instead of creating parallel replacements.

The governing interaction remains:

```text
notice
  -> Ask
  -> Bifröst packet
  -> destination resolution
  -> Continuity Gate
  -> Jacobian / harmonic route evaluation
  -> projection route
  -> Requested Transformation link when applicable
  -> receipted observation
  -> DEEPTime route extension
  -> Replay
```

An Ask remains a control/request. It never manufactures the observation that would count as its answer.

## Destination Registry / Dimensional Naming Service

`createReactionEndpoint()` binds a compact dimensional address to explicit world, optional location, optional Concordance anchor, Runa signature, aliases and provenance.

`createReactionDestinationRegistry()` maps human-readable names and aliases onto those endpoints through the Bifröst dimensional-name registry.

Names are therefore conveniences, not hidden coordinates. A destination must still have an explicit address assignment before it can enter the registry.

## Runa bridge

`createRunaHarmonicSignature()` describes a Runa / World Hum profile as profile data with an epistemic class.

`harmonicMismatch()` uses:

- logarithmic root-frequency distance;
- optional circular phase difference;
- declared configuration weights.

Missing harmonic data receives an explicit penalty rather than silently becoming zero mismatch.

The harmonic layer remains a compatibility feature in the software model, not a claim that an audible frequency uniquely identifies a physical universe.

## Continuity Gate

`evaluateContinuityGate()` requires named invariants and scores.

A route is blocked when:

- a required invariant is missing;
- a required invariant falls below the configured floor;
- an explicit veto is present.

A blocked projection edge is now excluded by the route solver instead of merely receiving a large cost.

This makes Continuity Gate a true route authority.

## Existing Jacobian authority

`buildProjectionEdge()` delegates the Jacobian audit to the existing STARWELL `analyseWorldJacobian()` implementation.

React-ion therefore inherits the existing singular-value / fold calculation rather than introducing a second incompatible Jacobian implementation.

## Requested Transformation bridge

`bindAskPacketToTransformation()` compiles a Bifröst Ask into the existing `createTransformationRequest()` contract.

The link preserves:

- packet fingerprint;
- transformation-request fingerprint;
- world/domain;
- packet constraints;
- packet consent;
- explicit non-success authority flags.

The existing Requested Transformation circuit remains the organ that measures later PREMAQC response.

## DEEPTime bridge

`createReactionDeepTimeReceipt()` adds a React-ion route extension to a canonical DEEPTime-shaped record.

It requires:

- sequence ID / revision / lambda;
- UTC and Julian Date anchors;
- receipted PREMAQC source state;
- observation-run provenance;
- acceptance-mask provenance;
- accepted-state hash;
- source receipt fingerprints;
- data quality / missing / stale metadata;
- navigation request and route receipts.

The route is explicitly labelled a modelled projection path and is not rewritten into an observation.

## Living Helm

`react-ion-helm-sidecar.js` mounts in the Arcsweep Feedback and Field rooms through the existing instrument-sidecar loader.

The visible prompts are intentionally simple:

1. Where are we?
2. Where are we going?
3. What do you notice?
4. What are you asking?
5. What transformation do you intend?
6. What must remain unchanged?

The expandable Instrument Bay contains:

- compact source / target addresses;
- target world identity;
- optional Runa source / target frequency and phase;
- identity / continuity / agency scores;
- navigation Jacobian;
- sender and TTL.

An unauthorised Ask may be drafted, but the Helm injects an `ask-not-authorised` continuity veto and refuses to compile a route.

The Helm receipt exposes the packet, navigation request, edge diagnostics, route, projection state and diagnostic acknowledgement together.

## BCEP/1

Bill the Cat remains a recoverable diagnostic only.

A same-address loopback route may produce `ACK-THPPPT` after normal route admission. It cannot replace consent, continuity or integrity failure reporting.

`// ancient protocol. do not remove.`

## Current executable surface

- `apps/arcsweep/src/bifrost-protocol-stack.js`
- `apps/arcsweep/src/react-ion-engine.js`
- `apps/arcsweep/src/react-ion-bridge.js`
- `apps/arcsweep/src/react-ion-helm-sidecar.js`
- `apps/arcsweep/src/instrument-sidecars.js`
- `apps/arcsweep/test/bifrost-protocol-stack.test.js`
- `apps/arcsweep/test/react-ion-engine.test.js`
- `apps/arcsweep/test/react-ion-bridge.test.js`

## Next hull

Hull 3 should make the registry durable and automatic without inventing coordinates:

1. add explicit dimensional-address fields to World / Place / Concordance Anchor records;
2. build the DNS registry from persisted approved records;
3. add route-receipt storage and Replay indexing;
4. connect approved Runa world profiles automatically;
5. add route alternatives and rejected-edge inspection to the Helm;
6. persist DEEPTime route extensions through the existing storage / database boundary;
7. add a compact spatial route visualisation while retaining the textual fallback.
