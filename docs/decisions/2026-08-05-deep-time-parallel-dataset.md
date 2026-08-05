# DEEPTime: Third Parallel Dataset

**Date:** 2026-08-05  
**Status:** Approved architecture decision  
**Applies to:** STARWELL, DEEP Observer, DEEPTheory, DEEPStory, Bifröst, Theory-Grounded Acceptance Advisor, Runa, Hearthgate

## Decision

STARWELL and the DEEP architecture preserve three linked but non-interchangeable datasets:

```text
DEEPStory
= discrete events with narrative context, append-only continuity and declared interpretation

DEEPTheory
= axis patterns, correlations, models, hypotheses and immutable analytical sources

DEEPTime
= receipted temporal sequences describing how PREMAQ state evolves through time
```

No dataset may silently substitute for another.

## Governing distinction

> DEEPStory asks what happened and how it belongs in narrative continuity.
>
> DEEPTheory asks what patterns, relations or models exist across observations.
>
> DEEPTime asks in what order, at what rate, and at what real-world moment the accepted state evolved.

DEEPTime is the temporal coordinate system of the observatory: the receipted worldline.

## Correction to the earlier DEEPStory decision

The earlier governing sentence said that Story records how records unfold through time and relation. This remains valid only at the narrative-continuity layer.

DEEPStory may order events for story, canon, scene and relationship continuity. It does not own the canonical physical or observational time coordinate. DEEPTime owns temporal anchoring, sequence rate, interval, drift, recurrence and replay order.

## Canonical DEEPTime record

A DEEPTime record carries:

- `sequence_id`;
- `sequence_revision`;
- `lambda`, the Bifröst temporal coordinate;
- the PREMAQ schema version;
- a PREMAQ state snapshot at that coordinate;
- UTC timestamp;
- Julian Date and declared time scale;
- optional TAI / Unix / mission-time coordinates when available;
- moon phase and illumination source;
- solar and geomagnetic baseline values used by Observer;
- CODATA / constants registry version;
- source observation-run identifier;
- acceptance-mask identifier and version;
- accepted-state hash;
- source receipt hashes;
- interval from the prior accepted coordinate;
- calculated axis velocities and optional accelerations;
- missing-data, uncertainty, calibration and data-quality metadata.

Qualia remains `Q` in PREMAQ. Engineering data quality is stored separately as `data_quality` or `DQ`.

## Bifröst lambda

`lambda` is a monotonic sequence coordinate within a declared sequence. It is not a replacement for UTC, Julian Date or proper time, and it must not be presented as a novel physical time dimension without a separately labelled theory and evidence.

Its engineering role is to provide a stable replay coordinate across irregularly sampled records.

Minimum requirements:

- monotonic within one sequence revision;
- deterministic from declared inputs or explicitly assigned with provenance;
- stable under replay;
- never silently renumbered;
- accompanied by real-world time anchors;
- branch-aware when a sequence forks.

## Temporal derivatives

DEEPTime may derive axis motion from accepted PREMAQ states:

```text
v_axis = delta(axis) / delta(t)
a_axis = delta(v_axis) / delta(t)
```

All derivative records must declare:

- time basis;
- interpolation policy;
- smoothing policy;
- missing-data policy;
- uncertainty propagation;
- source coordinates.

Raw accepted snapshots remain immutable. Smoothing, interpolation and derivative estimates are derived views.

## Theory-Grounded Acceptance Advisor

DEEPTime is a primary input to the Theory-Grounded Acceptance Advisor.

The advisor may use DEEPTime sequences to identify:

- sustained axis drift;
- cyclical or quasi-periodic behaviour;
- rate changes;
- transition points;
- anomaly windows;
- disagreement between accepted state and incoming candidate state;
- recurrence under comparable real-world anchors;
- insufficient temporal coverage.

The advisor recommends acceptance gates. It does not overwrite source records or silently accept a state.

Every recommendation must cite:

- the DEEPTime sequence range used;
- the DEEPTheory pattern or model invoked;
- the acceptance-mask version;
- confidence and data-quality fields;
- the recommendation rationale.

## Relationship to audio, glyph and storywork

DEEPTime provides temporal trajectories to downstream compilers.

Runa may read a DEEPTime trajectory to create continuous, gradual transitions in World Hum, keyboard harmonics and soundscape layers rather than abrupt state jumps.

Arcsweep may map a sequence into stroke order, curvature, rhythm, density and animated glyph evolution.

LLM storywork may use DEEPTime to distinguish temporary state, sustained drift, cyclic return and irreversible character change. A character's current state must not be inferred from one isolated snapshot when a receipted trajectory is available.

DEEPStory links scenes and events to DEEPTime coordinates. DEEPTheory analyses patterns across one or more DEEPTime sequences.

## Proposed module location

```text
ml-lab/src/flameclyffe_ml/deep_time/
```

Recommended first files:

```text
__init__.py
models.py
sequence.py
derivatives.py
validation.py
serialization.py
advisor_features.py
```

The module is parallel in package status to the existing synthetic and analytical tooling, but remains a distinct domain module.

## STARWELL test location

```text
apps/starwell/test/DEEPTime.test.js
```

The test should follow the DEEPStory / DEEPTheory pattern while enforcing DEEPTime-specific invariants.

## Minimum acceptance tests

1. Sequence IDs and revisions validate.
2. Lambda is monotonic within a sequence revision.
3. UTC and Julian Date anchors agree within declared tolerance and time scale.
4. PREMAQ records use the canonical schema and `Q = Qualia`.
5. Data quality is not stored as `Q`.
6. Observation-run and acceptance-mask provenance are required.
7. Accepted-state hashes replay deterministically.
8. Derivatives declare time basis and source coordinates.
9. Branches retain parent sequence and fork coordinate.
10. Missing or stale Observer anchors are explicit.
11. DEEPTime records remain append-only.
12. Advisor outputs cite sequence windows and theory sources.

## Initial schema sketch

```json
{
  "dataset": "DEEPTime",
  "schema_version": "1.0.0",
  "sequence_id": "dt-...",
  "sequence_revision": 1,
  "lambda": 0.0,
  "time": {
    "utc": "2026-08-05T18:44:00Z",
    "julian_date": 0.0,
    "julian_time_scale": "UTC"
  },
  "premaq": {
    "version": "1.0",
    "P": 0.0,
    "R": 0.0,
    "E": 0.0,
    "M": 0.0,
    "A": 0.0,
    "Q": {}
  },
  "observer_anchors": {},
  "provenance": {
    "observation_run_id": "...",
    "acceptance_mask_id": "...",
    "acceptance_mask_version": "...",
    "source_receipt_hashes": [],
    "accepted_state_hash": "..."
  },
  "quality": {
    "data_quality": 0.0,
    "uncertainty": {},
    "missing": [],
    "stale": []
  }
}
```

This sketch is illustrative. The implementation schema should use descriptive canonical field names internally, with compact symbols limited to defined PREMAQ views.

## Seal

Theory identifies the pattern.

Story carries the event.

Time preserves the path.
