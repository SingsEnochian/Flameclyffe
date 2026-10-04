# Universal Codex Developmental Self-Governance v0.1

## Purpose

Developmental Self-Governance lets ArcSweep inspect patterns in its own learning history and propose bounded changes to how it learns without treating self-observation as permission to rewrite itself.

The governing distinctions are:

```text
observation ≠ decision
proposal ≠ approval
approval ≠ application
application ≠ improvement
self-observation ≠ self-authority
```

## Flow

```text
Developmental Memory
      ↓
pattern / anomaly / repeated failure
      ↓
Developmental Governance Proposal
      ↓
Suggestion Grove
Accept | Keep Open | Decline
      ↓
accepted governance-change suggestion
      ↓
explicit materialisation
      ↓
Governance Change Request
status = prepared
      ↓
separate future implementation authority
```

v0.1 stops at the prepared Governance Change Request. It does not mutate curriculum, training strategy, evaluation, Cognitive Field feedback, production configuration, or model state.

## Proposal contract

`hearthweave.codex-developmental-governance-proposal/v0.1` requires one or more existing Developmental Memory rings and one of four bounded targets:

```text
curriculum
training-strategy
evaluation
field-feedback
```

Each proposal records:

- exact developmental ring IDs,
- the observed learning pattern,
- proposed change,
- expected effects,
- possible regressions / risks,
- invariants to preserve,
- bounded scope,
- reversibility plan,
- proposer, time, evidence and provenance.

The proposal is explicitly non-authoritative:

```text
proposalOnly = true
grantsAuthority = false
automaticApplication = false
automaticExecution = false
productionEffects = false
externalWrites = false
```

## Suggestion Grove review

A developmental governance proposal creates a typed `governance-change` suggestion. Existing Suggestion Grove review applies unchanged:

```text
Accept
Keep Open
Decline
```

Acceptance records a review decision. It does not apply the proposed governance change.

Decline preserves the proposal and its source evidence. Keep Open preserves the proposal as unresolved and reviewable.

## Governance Change Request

An accepted `governance-change` suggestion may be explicitly materialised into `hearthweave.codex-governance-change-request/v0.1`.

The request carries the accepted proposal and remains prepared rather than implemented:

```text
status = prepared
requiresExplicitImplementation = true
implementationApplied = false
requestIsNotImplementationAuthority = true
grantsAuthority = false
automaticApplication = false
automaticExecution = false
productionEffects = false
externalWrites = false
```

Materialisation consumes the accepted suggestion as a review artefact but does not change the underlying learning configuration.

## Reflection boundary

A prepared Governance Change Request is not yet a completed intervention, so Wish Grove does not offer a post-change Learning Reflection at this stage.

Reflection belongs after a separately authorised implementation and evaluation establish what actually changed.

## Why this matters

Developmental Memory already lets cognition retain evidence such as:

- repeated regressions,
- partial transfer,
- failed generalisation,
- unresolved uncertainty,
- unexpected behaviour changes.

Developmental Self-Governance makes those patterns actionable as proposals while preserving stewardship and experimental discipline.

A runtime may therefore say, in structured form:

```text
The same regression appeared across several learning cycles.
I propose changing one bounded part of the learning process.
Here is the evidence.
Here are the expected effects and risks.
Here is what must remain invariant.
Here is how to reverse the change.
```

It may not silently perform the change.

## Next seam

The next contract should implement **Governance Change Implementation + Learning Strategy Experiments**.

An implementation authority should bind one prepared request to one exact reversible change, then compare the changed strategy against an unchanged control using sealed evaluation cohorts. Multiple approved learning strategies should be able to coexist as named experimental branches rather than collapsing immediately into one doctrine.
