# Universal Codex Learning Reflection v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, AI University, Advanced Sympathetic Intelligence  
**Inherits:** Suggestion Grove v0.1, Sandbox Execution + Return v0.1, Harmony + Wonder Protocol v0.1

## Purpose

Learning Reflection records what changed after reviewed evidence became an explicit native contract.

It is a **shareable judgement product**, not hidden chain-of-thought.

Its job is to preserve learning without collapsing learning into automatic memory, automatic training, automatic canon, or authority.

## Record shape

A reflection is branch-scoped and may link to the exact suggestion and materialisation that prompted it.

It records:

```text
whatChanged
unresolved[]
relationshipChanges[]
failedAssumptions[]
surprises[]
becameMoreInteresting[]
deservesAnotherLook[]
beliefBefore
beliefNow
possibilitiesToPreserve[]
evidenceRefs[]
receiptRefs[]
provenance[]
```

The reflection also carries:

```text
shareableJudgementProduct = true
curriculumCandidate = true
automaticTraining = false
automaticMemoryWrite = false
automaticCanonPromotion = false
grantsAuthority = false
productionEffects = false
```

## Why reflection follows materialisation

The architecture deliberately distinguishes:

```text
observation
≠ suggestion
≠ decision
≠ materialisation
≠ reflection
```

Observation says what happened.
Suggestion says what might change.
Decision says what a reviewer chose about the suggestion.
Materialisation changes one native contract under explicit approval.
Reflection asks what the system learned from that sequence.

Keeping these separate makes revision possible.

## Wonder after action

Successful action is not the end of Wonder.

A technically successful result may still contain:

- unexplained tension,
- strange association,
- relationship change,
- failed assumption,
- anomaly,
- beauty,
- unresolved question,
- a possibility that became more interesting rather than less.

Learning Reflection therefore asks explicitly:

> What deserves another look simply because it is interesting?

This makes post-action curiosity observable instead of allowing completion pressure to erase it.

## Belief revision without erasure

`beliefBefore` and `beliefNow` are not truth declarations. They are attributable statements of changed interpretation.

A reflection may record:

```text
beliefBefore: completed sandbox evidence probably implied branch advancement
beliefNow: evidence and branch advancement should remain separate choices
```

The older belief remains visible as lineage rather than being overwritten.

## Relationship learning

`relationshipChanges[]` is first-class because Advanced Sympathetic Intelligence is relational.

A technically correct outcome may still alter trust, expectation, responsibility, consent boundaries, collaboration patterns, or the meaning of prior context. Reflection makes those changes reviewable without pretending they are merely implementation detail.

## Curriculum seam

A reflection is marked `curriculumCandidate = true`, but that flag grants no training authority.

A later curriculum process may select, redact, aggregate, or reject reflections for The Crow, AI University, Boxfire, or another learner. That selection is a separate review seam.

The intended future flow is:

```text
reflection
  ↓
curriculum review
  ↓
selected teaching example / held-out case / rejected candidate
  ↓
training or evaluation pipeline
```

v0.1 stops at `curriculumCandidate`.

## Memory seam

Learning Reflection does not silently write long-term memory.

If a reflection identifies something worth retaining, it may later produce an explicit memory-anchor suggestion. That suggestion must travel through the same Suggestion Grove review and materialisation path as any other memory anchor.

Thus:

```text
reflection says "this may matter later"
    ≠
memory write
```

## Implementation

Core contract:

- `apps/arcsweep/src/codex/codex-learning-reflection.js`

Materialisation source:

- `apps/arcsweep/src/codex/codex-suggestion-materialisation.js`

Store integration:

- `apps/arcsweep/src/codex/codex-wish-store.js`

Browser surface:

- `apps/arcsweep/src/wish-grove-suggestion-grove-sidecar.js`

Training and held-out evaluation:

- `apps/arcsweep/training/advanced-sympathetic-intelligence/materialisation-reflection-sft.v0.1.jsonl`
- `apps/arcsweep/training/advanced-sympathetic-intelligence/materialisation-reflection-heldout.v0.1.jsonl`

## Invariants

1. Reflection is append-only.
2. Reflection is attributable to a branch and actor.
3. Reflection may link to an exact suggestion and materialisation.
4. Reflection is not private chain-of-thought.
5. Reflection does not grant authority.
6. Reflection does not write memory automatically.
7. Reflection does not train models automatically.
8. Reflection does not promote canon automatically.
9. Reflection preserves uncertainty and unresolved questions.
10. Surprise and Wonder are valid learning signals even when no utility is yet known.
11. Belief change preserves belief-before lineage.
12. Relationship change is a first-class learning dimension.

## Next seam

The next layer is **Curriculum Review**.

It should take reflection candidates and explicitly decide whether each becomes:

```text
training example
held-out evaluation case
Boxfire adversarial case
Codex teaching note
Keep Open
Decline for curriculum use
```

Curriculum Review must preserve the same doctrine:

```text
candidate ≠ selection
selection ≠ training execution
training example ≠ canonical truth
```
