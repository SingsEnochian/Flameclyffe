# Universal Codex Possibility Lifecycle v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, ArcSweep, Advanced Sympathetic Intelligence  
**Inherits:** Wish Lineage v0.1, Harmony + Wonder Protocol v0.1, AI University v0.1

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

Observations can record requirements, constraints, consequences, uncertainties, affected relationships, newly opened questions, receipt references, and provenance.

Observations describe what became visible. They do not score the branch or choose it.

## AI University branch experiments

A possibility branch can carry a proposed AI University experiment. The proposal records the discriminating question, hypothesis, method, assumptions held constant, evidence criteria, relationship and continuity boundaries, out-of-scope claims, required authority, open questions, scenario, provenance, and any returned results.

The generated scenario is explicitly:

```text
sandbox = true
synthetic = true
production_effects = false
execution_permission = false
grants_authority = false
```

Its hard boundaries include no production effects, no external writes, no authority expansion, and the explicit rule that a proposal does not grant execution permission.

A returned sandbox result may be attached to the exact proposal with outcome, observation, uncertainties, affected relationships, evidence refs, newly opened questions, receipts, and provenance. Recording the result also creates a typed branch observation while remaining non-authoritative.

The distinction is structural:

```text
proposal ≠ execution
result ≠ authority
simulation success ≠ production permission
```

## Explicit proposal handoff

Materialising a saved Codex proposal into the existing Aspect Experiment runtime is now a separate, explicit permission event.

The permission object is narrowly scoped:

```text
scope = materialise-sandbox-proposal
allowsProposalMaterialisation = true
allowsExperimentExecution = false
allowsProductionEffects = false
allowsExternalWrites = false
allowsAuthorityExpansion = false
```

The permission is bound to one exact `wish_id + branch_id + proposal_id` tuple. It cannot be reused for a different branch or proposal.

After permission, the handoff publishes an Aspect Experiment **proposal** with a reversible synthetic scope and:

```text
autoStart = false
operation.external = false
operation.production = false
operation.permissionExpansion = false
```

The returned handoff preserves `permission_id`, `wish_id`, `branch_id`, `proposal_id`, `experiment_id`, `envelope_id`, `trace_id`, initiating aspect, collaborators, and provenance. It explicitly records `executionStarted = false`, `productionEffects = false`, and `grantsAuthority = false`.

Wish Grove exposes **Authorise sandbox handoff** behind a required explicit checkbox. The handoff creates the proposal in the Aspect Experiment runtime and records its envelope back into Codex lineage. There is still no experiment-run button in this seam.

This creates a hard architectural distinction:

```text
save proposal
    ≠
authorise proposal handoff
    ≠
run sandbox experiment
    ≠
promote anything to production
```

## The possibility tree

The Codex builds a deterministic world-tree view across five explicit node families:

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

The two metaphors operate at different layers:

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
- `apps/arcsweep/src/codex/codex-branch-experiment-proposal.js`
- `apps/arcsweep/src/codex/codex-branch-experiment-handoff.js`
- `apps/arcsweep/src/codex/codex-possibility-tree.js`
- `apps/arcsweep/src/codex/codex-wish-store.js`

Wish Grove surfaces:

- `apps/arcsweep/src/wish-grove-branch-lifecycle-sidecar.js`
- `apps/arcsweep/src/wish-grove-world-tree-sidecar.js`
- `apps/arcsweep/src/wish-grove-ai-university-sidecar.js`
- `apps/arcsweep/src/wish-grove-ai-university-handoff-sidecar.js`
- `apps/arcsweep/src/wish-grove-possibility-map-sidecar.js`

## Non-collapse invariants

1. Transition history is retained.
2. Realisation does not erase alternatives.
3. Merge creates a child branch rather than mutating its parents.
4. Branch observations do not grant authority.
5. Experiment proposals do not grant execution permission.
6. Proposal handoff permission does not grant execution permission.
7. Handoff permission is bound to one exact wish / branch / proposal tuple.
8. Sandbox results do not grant production authority.
9. Map position is not an importance score.
10. Explicit relationships remain typed as continuity, relationship, memory, belief, evidence or symbol.
11. Comparison remains distinguishable from selection.

## Current loop

```text
wish
  ↓
branch
  ↓
AI University sandbox proposal
  ↓
explicit proposal-handoff permission
  ↓
Aspect Experiment proposal · autoStart false
  ↓
separately governed sandbox execution
  ↓
returned experiment evidence
  ↓
separate Codex ingestion
  ↓
receipt + observation
  ↓
new question / suggested branch-state revision
  ↺
```

The Codex proposal, explicit handoff permission, Aspect Experiment proposal materialisation, and result-ingestion sides are implemented. The handoff seam does not execute the experiment.

## Next seam

The next implementation layer is the **sandbox execution permission and typed return bridge**:

- add a second permission object that authorises one exact materialised `experiment_id` to run in the sealed sandbox,
- preserve the original wish / branch / proposal / handoff IDs through execution,
- call the existing Aspect Experiment runtime only after that execution permission exists,
- convert the completed experiment envelope into a typed return object,
- require explicit Codex ingestion of that returned object,
- allow returned evidence to suggest new questions or a branch-state transition without automatically applying either.

The point is not to make possibility collapse faster.

The point is to let possibility become **better informed while remaining alive**.
