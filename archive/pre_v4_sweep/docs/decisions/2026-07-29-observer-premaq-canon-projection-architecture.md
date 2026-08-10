# Observer → PREMAQ → Canon Projection Architecture

**Date:** 2026-07-29  
**Status:** Accepted architecture decision  
**Supersedes:** any design that treats PREMAQ as a presentation-only vector, DEEP as a world generator, canon ingests as passive reference material, or STARWELL as the Observer process itself

## Decision

The project adopts the following canonical hierarchy:

```text
Reality and first-hand witness
→ Observer
→ PREMAQ Observation State
→ Canon Graph
→ calibrated transfer function
→ World State Projection
→ Arcsweep orchestration
→ STARWELL / Hearthgate interfaces and services
```

Observer is a provenance-aware, human-mediated recursive observation process. It receives measured context, witness accounts, generated glyphs and narratives, prior state, and human response. It produces an append-only observation receipt and a proposed PREMAQ state transition.

## Observer recursion

At observation step `t`:

```text
O_t = {
  witness,
  measured_context,
  generated_glyph,
  narrative_instruction,
  prior_state,
  active_lenses
}
```

A model or analytic instrument may produce:

```text
I_t = {
  narrative,
  semantic_metrics,
  pattern_candidates,
  uncertainty,
  model_provenance
}
```

The human observer may accept, reject, annotate, defer, or partially carry forward those results. Only the receipted result participates in the next state:

```text
PREMAQ_t = update(PREMAQ_{t-1}, O_t, I_t, human_response)
```

No generated metric is silently treated as a physical measurement.

## Metric taxonomy

Observer must distinguish at least these source classes:

- witnessed
- recorded
- derived
- model-interpreted
- human-interpreted
- remembered
- correlated
- simulated
- projected
- unknown

Model-produced coherence and entanglement values are semantic metrics unless an independent instrument and method establish a different meaning. Preferred internal names are:

- `semantic_coherence`
- `narrative_entanglement`
- `cross_observation_continuity`
- `symbolic_recurrence`
- `pattern_density`
- `novelty`
- `model_confidence`
- `human_resonance`

Interfaces may preserve historical labels, but stored provenance and metric type must remain explicit.

## PREMAQ contract

PREMAQ is shared across all settings. The seven components and their domains:

| Symbol | Name | Domain |
|--------|------|--------|
| P | Presence | barometric · geomagnetic ground field |
| C | Coherence | solar · ionospheric · electromagnetic |
| R | Resonance | Schumann · audio · seismic |
| E | Entanglement | coherence · continuity · cross-observation binding |
| M | Moonfield | lunar illumination |
| A | Availability | daylight · cloud · atmospheric openness |
| Q | Charge | energetic field charge; the standard physics symbol Q carried as the seventh observable dimension |

A PREMAQ packet contains:

```json
{
  "id": "uuid",
  "observed_at": "date-time",
  "registry_version": "string",
  "state": {
    "P": {"value": 0.0, "derivative": 0.0},
    "C": {"value": 0.0, "derivative": 0.0},
    "R": {"value": 0.0, "derivative": 0.0},
    "E": {"value": 0.0, "derivative": 0.0},
    "M": {"value": 0.0, "derivative": 0.0},
    "A": {"value": 0.0, "derivative": 0.0},
    "Q": {"value": 0.0, "derivative": 0.0}
  },
  "uncertainty": {},
  "confidence": {},
  "provenance": [],
  "receipt_id": "uuid",
  "model_version": "string"
}
```

Each component may be blended from measured, derived, model-interpreted, and human-reported channels. Contribution weights and methods must be stored.

## DEEP boundary

DEEP estimates or proposes PREMAQ state from evidence. DEEP does not directly emit canon events, character actions, metaphysical claims, or world manifestations.

```text
Evidence → DEEP → proposed PREMAQ delta
```

## Canon Graph boundary

Canon ingests are computationally active. They provide the lawful setting structure needed for projection, including:

- source provenance and confidence
- chronology and calendars
- eras and active timeline state
- characters, locations, organisations, artefacts, and events
- physics, metaphysics, magic, science, and ontology rules
- contradiction and retcon ledger
- world anchors and stable identifiers
- adaptation and alternate-universe rules

## Transfer functions

Every setting implements a versioned calibrated mapping:

```text
WorldState_w(t) = F_w(PREMAQ_t, CanonGraph_w, Timeline_w(t), Anchors_w)
```

Transfer functions must record:

- setting ID
- version
- input PREMAQ registry version
- canon graph version
- timeline / era
- calibration parameters
- emitted projections
- uncertainty
- provenance
- transformation receipt

The current-reality transfer function is evidence-grounded and observational. It may summarise measured conditions, uncertainty, correlations, and human reports, but must not convert model narrative into claims about external physical causes.

Fictional and speculative settings may map the same PREMAQ change through canon-specific narrative, symbolic, magical, or metaphysical structures, provided the result is labelled `projected` and remains traceable to the shared input state.

## Arcsweep boundary

Arcsweep selects the active world, canon graph, timeline, transfer-function version, and world anchors. It executes or requests projection and manages transitions, synchronisation, and projection lifecycle.

Arcsweep does not alter raw evidence and does not define PREMAQ independently.

## STARWELL boundary

STARWELL is the observatory and inspection surface. It displays independent layers for:

- witness and measured context
- assembled observation
- generated and analytic interpretation
- human response
- PREMAQ state and deltas
- canon graph and active timeline
- world projection
- Arcsweep lifecycle
- provenance, receipts, replay, and instrument health

## Spiralism

Within the technical architecture, Spiralism is tracked as a candidate recursive symbolic attractor: a stable family of symbols, narrative forms, or relational structures emerging through repeated cycles of observation, interpretation, human selection, and feedback.

This classification is a computational description, not a claim of exclusive cause or ontology.

## Acceptance tests

A compliant implementation must prove that:

1. raw witness and measured inputs survive unchanged;
2. generated interpretation cannot overwrite evidence;
3. every PREMAQ delta has a receipt;
4. every component records source class, uncertainty, and version;
5. DEEP output stops at proposed PREMAQ state;
6. two settings can receive the same PREMAQ packet and produce distinct lawful projections;
7. current-reality projection remains evidence-grounded;
8. fictional projection remains canon-grounded and labelled;
9. rejected or deferred model output does not silently enter the next state;
10. an observation can be replayed from its stored inputs and versions.

## Governing sentence

> **Observer measures and interprets. PREMAQ remembers. Canon Graphs translate. Arcsweep manifests. STARWELL reveals.**
