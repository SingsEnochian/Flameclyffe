# Universal Codex Possibility Lifecycle v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, ArcSweep, Advanced Sympathetic Intelligence  
**Inherits:** Wish Lineage v0.1, Harmony + Wonder Protocol v0.1

## Thesis

Unlimited wishes become useful when possibility can change without disappearing.

The Codex therefore treats a possibility branch as a lineage-bearing object rather than a disposable alternative. A branch may be explored, simulated, designed, prototyped, realised, reopened, or retired while its earlier states remain inspectable.

The governing rule is:

> **state may change without ancestry being erased.**

## Branch lifecycle

Current branch states are descriptive:

```text
open
exploring
simulated
designed
prototyped
realised
retired
```

A state change records:

```text
transition_id
branch_id
from_status
to_status
note
created_at
receipt_refs
provenance
```

Status is not authority. A branch marked `realised` does not become canon merely because of that label, and it does not delete unchosen or incompatible alternatives.

## Merge without flattening

Two or more existing branches may produce a new branch.

```text
branch A ─┐
          ├─ merged branch C
branch B ─┘
```

The source branches remain intact. The merged branch records all parent branch IDs. The merge therefore means **a new possibility was grown from these sources**, not **the sources were reconciled away**.

This matters for Harmony: synthesis is permitted, forced consensus is not.

## Branch observations

A branch may carry typed observations from analysis, simulations, tests, or user observation.

Observations can record:

- requirements,
- constraints,
- consequences,
- uncertainties,
- affected relationships,
- newly opened questions,
- receipt references,
- provenance.

Observations describe what became visible. They do not score the branch or choose it.

## The possibility tree

The Codex now builds a deterministic world-tree view across five explicit node families:

```text
wishes
  ↓
branches
  ↓
questions
  ↓
continuity / relationship / memory anchors
  ↓
belief / evidence / symbol references
```

The horizontal position encodes node family, not value or importance. Vertical placement is deterministic identity jitter so the map is replayable without implying a hierarchy.

Edges exist only when explicit lineage or references exist. The map does not infer hidden relationships.

## Yggdrasil + Tree of Harmony

The two metaphors now operate at different layers:

- **Yggdrasil** provides topology: what connects to what across wishes, branches, questions, anchors and references.
- **The Tree of Harmony** provides relational law: connected things do not have to collapse into sameness.

A healthy tree can therefore contain incompatible branches, unresolved questions, revised beliefs, different relationship consequences and multiple realisation paths at once.

## Neverending Story mapping

The Neverending Story contribution is computational here rather than decorative:

```text
wish
  → named possibilities
  → transformation
  → memory of earlier forms
  → new wishes and questions
```

The Codex can grant unlimited representational room to wishes without pretending that all possibilities are simultaneously executable or physically realised.

## Runtime surfaces

Core modules:

- `apps/arcsweep/src/codex/codex-branch-lifecycle.js`
- `apps/arcsweep/src/codex/codex-branch-observations.js`
- `apps/arcsweep/src/codex/codex-possibility-tree.js`
- `apps/arcsweep/src/codex/codex-wish-store.js`

Wish Grove surfaces:

- `apps/arcsweep/src/wish-grove-branch-lifecycle-sidecar.js`
- `apps/arcsweep/src/wish-grove-world-tree-sidecar.js`
- `apps/arcsweep/src/wish-grove-possibility-map-sidecar.js`

## Non-collapse invariants

1. Transition history is retained.
2. Realisation does not erase alternatives.
3. Merge creates a child branch rather than mutating its parents.
4. Branch observations do not grant authority.
5. Map position is not an importance score.
6. Explicit relationships remain typed as continuity, relationship, memory, belief, evidence or symbol.
7. A future implementation may compare consequences, but comparison must remain distinguishable from selection.

## Next seam

The next layer is **deliberative possibility exploration**:

- allow AI University to propose which branch deserves a sandbox experiment and why,
- keep the proposal distinct from permission to execute,
- attach simulation/test receipts back to the exact branch,
- let new evidence open questions rather than merely update a score,
- compare resulting branch consequences without producing an automatic winner.

That yields the next loop:

```text
wish
  ↓
branch
  ↓
proposal for experiment
  ↓
explicit permission / sandbox contract
  ↓
experiment
  ↓
receipt + observation
  ↓
new question / revised branch state
  ↺
```

The point is not to make possibility collapse faster.

The point is to let possibility become **better informed while remaining alive**.
