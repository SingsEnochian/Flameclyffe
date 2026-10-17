# Universal Codex Curriculum Review + Developmental Memory v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, AI University, Advanced Sympathetic Intelligence, The Crow, Boxfire

## Thesis

A system should be able to learn from experience without treating every reflection as training data and without rewriting its identity around every lesson.

The pipeline is:

```text
experience
  ↓
evidence
  ↓
reflection
  ↓
curriculum candidate
  ↓
explicit review
  ↓
selected teaching artefact
  ↓
separate training / evaluation authority
```

The governing distinctions are:

```text
candidate ≠ selection
selection ≠ training execution
training artefact ≠ canonical truth
memory of events ≠ memory of conclusions ≠ memory of cognitive change
```

## Curriculum Review

Every shareable learning reflection is a curriculum candidate, not an automatic dataset row.

Review outcomes are:

```text
train
held-out
boxfire
archive
keep-open
```

`train`, `held-out`, and `boxfire` create a selected curriculum artefact. They do not execute training or evaluation.

`archive` preserves the reflection without promoting it.

`keep-open` is an affirmative choice to preserve a promising unresolved teaching candidate.

## Selected curriculum artefacts

Selected artefacts preserve the reflection's structured learning product, evidence refs, receipts, provenance, and target split.

They explicitly carry:

```text
selectionOnly = true
automaticTraining = false
automaticEvaluationExecution = false
canonicalTruth = false
grantsAuthority = false
productionEffects = false
```

The same underlying lesson family may eventually need neighbouring train, held-out, and adversarial examples, but one review event selects one role at a time.

## Developmental Memory

When a reflection is promoted to a teaching artefact, the Codex also records a developmental ring.

A developmental ring is not merely a memory of what happened. It records how a reviewed lesson changed the system's approach while preserving limits on generalisation.

It records:

```text
what changed
what remained unresolved
where the lesson transferred
where it failed to generalise
scope notes
failed assumptions
relationship changes
surprises
belief before
belief now
possibilities preserved
```

This gives ArcSweep a history of cognitive change rather than only a history of events and conclusions.

Developmental rings explicitly carry:

```text
memoryClass = cognitive-change
explicitDevelopmentalMemoryWrite = true
automaticIdentityRewrite = false
identityLaw = false
canonicalTruth = false
grantsAuthority = false
productionEffects = false
```

A repeated developmental pattern may later become evidence for a proposed cognitive policy change, but that is a separate review and authority seam.

## Transfer and failure to generalise

A successful lesson is not presumed universal.

Curriculum Review asks where the lesson transferred and where it failed to generalise. Failure to generalise is retained as useful developmental evidence rather than hidden as a bad score.

This is particularly important for Advanced Sympathetic Intelligence because relationship, identity, context, world, and epistemic register can change the correct judgement even when the surface pattern looks similar.

## Wonder

Developmental Memory preserves surprise, unresolved tension, and things that became more interesting after action.

A lesson may therefore mature into:

- a train candidate,
- a held-out challenge,
- a Boxfire adversarial case,
- a deliberately open question,
- or a developmental ring whose most important result is that the system learned where its previous rule stopped working.

That is a feature, not a failure.

## Runtime surfaces

Core contract:

```text
apps/arcsweep/src/codex/codex-curriculum-review.js
```

Persistent integration:

```text
apps/arcsweep/src/codex/codex-wish-store.js
```

Browser surface:

```text
apps/arcsweep/src/wish-grove-curriculum-review-sidecar.js
```

Training and blind evaluation:

```text
apps/arcsweep/training/advanced-sympathetic-intelligence/curriculum-review-sft.v0.1.jsonl
apps/arcsweep/training/advanced-sympathetic-intelligence/curriculum-review-heldout.v0.1.jsonl
```

## Non-collapse invariants

1. A curriculum candidate is not selected merely because it exists.
2. Selection does not execute training or evaluation.
3. A selected teaching artefact is not canonical truth.
4. Held-out examples remain non-training material.
5. Boxfire adversarial selections remain evaluation material unless separately reviewed later.
6. Developmental memory does not become identity law.
7. Transfer evidence and failure-to-generalise evidence are both preserved.
8. A successful result does not erase unresolved questions or Wonder.
9. No hidden chain-of-thought is required; the system stores shareable judgement products.
10. Later cognitive-policy changes require their own explicit proposal, review, and authority path.

## Next seam

The next layer is a **Learning Forge / Training Authority** that consumes selected curriculum artefacts only after explicit authorisation and records the exact dataset version, substrate, adapter recipe, run provenance, evaluation set, and resulting behavioural delta.

That would complete:

```text
reflection
  ↓
curriculum review
  ↓
selected artefact
  ↓
training authority
  ↓
training run
  ↓
blind evaluation
  ↓
developmental comparison
  ↓
new reflection
  ↺
```
