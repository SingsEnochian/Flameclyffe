# DEEPTheory: Analytical Pattern Dataset

**Date:** 2026-08-14  
**Status:** Approved implementation seam  
**Applies to:** STARWELL, DEEP Observer, Arcsweep, DEEPTime, DEEPStory, Theory-Grounded Acceptance Advisor, Runa

## Decision

DEEPTheory is the analytical dataset parallel to DEEPStory and DEEPTime.

```text
DEEPStory = what happened and how it belongs in narrative continuity
DEEPTheory = what pattern, relation, model or hypothesis is being proposed across observations
DEEPTime = how accepted state evolves through receipted time
```

No dataset silently substitutes for another.

## Source contract

Every DEEPTheory finding cites immutable source records. Analysis is append-only. Candidate generation never rewrites the source observation, accepts a theory, commits canon, or silently converts model output into a physical claim.

A candidate requires human review.

## Domain-semantic controls

Normal-form coordinates such as cusp controls `a` and `b` must carry explicit domain semantics.

The same mathematical slot may represent different variables in different domains without implying numeric or ontological equivalence.

Examples:

```text
Requested Transformation
  a = Bone / structural constraint
  b = declared Intention

Astrophysics QA fixture
  a = envelope-density control
  b = accretion-rate control
```

The astrophysical controls are explicitly non-intentional. Arcsweep must not manufacture agency because a natural system uses the same topology mathematics.

## Arcsweep route

```text
Domain Control Profile
  -> forward/reverse sweep
  -> receipted topology + hysteresis analysis
  -> DEEPTheory candidate
  -> human review
  -> accepted/superseded/retired theory record
```

The source sweep fingerprint is retained in the DEEPTheory source ledger.

## Calibration rule

`normal-form-only` means the coordinates are mathematical controls, not calibrated physical units.

`model-calibrated` means a project-specific mapping is defined but is not automatically a physical measurement.

`domain-calibrated` requires an explicit domain calibration and source chain.

No calibration state is inferred from a suggestive label.

## Seal

Theory identifies the pattern.  
Story carries the event.  
Time preserves the path.
