# Universal Codex Sandbox Execution + Return v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, AI University, Aspect Experiment runtime  
**Inherits:** Possibility Lifecycle v0.1

## Thesis

A proposal is not an execution, an execution is not a conclusion, and returned evidence is not automatically Codex truth.

The runtime therefore separates four moments:

```text
materialised proposal
        ↓
explicit sandbox-execution permission
        ↓
sealed experiment run
        ↓
typed return inbox
        ↓
explicit Codex ingestion
```

Each edge has its own receipt and identifiers.

## Execution permission

A sandbox execution permission is bound to exactly:

```text
wish_id
branch_id
proposal_id
experiment_id
handoff_envelope_id
```

It permits only:

```text
scope = run-sealed-sandbox-experiment
allowsSandboxExecution = true
```

It explicitly excludes:

```text
production effects
external writes
authority expansion
automatic promotion
```

Rounds are bounded to 1–3 for this seam.

## Execution

`runBranchSandboxExperiment(...)` validates the exact materialised proposal and exact execution permission before invoking `AspectMeshRuntime.runExperiment(...)`.

Execution uses:

```text
autoReflect = false
```

so the first return remains a bounded experiment result rather than silently spawning another reflective write.

Runtime metadata carries the Codex wish, branch, proposal, handoff and execution-permission identifiers for replay and provenance.

## Typed return

The sandbox result becomes a `hearthweave.codex-branch-experiment-return/v0.1` object containing:

```text
return_id
wish_id
branch_id
proposal_id
experiment_id
handoff_envelope_id
execution_permission_id
status
outcome
observation
evidence_refs
receipt_refs
provenance
suggested_branch_status
```

The return always carries:

```text
suggestionOnly = true
ingestedIntoCodex = false
grantsAuthority = false
productionEffects = false
automaticPromotion = false
```

A successful completed sandbox may suggest `simulated` as the descriptive branch state. The transition is not applied automatically.

## Return inbox

Returns are persisted independently at:

```text
arcsweep:universal-codex:branch-experiment-returns:v0.1
```

This is intentionally separate from the wish store. Closing the Book therefore does not force an unreviewed runtime result into Codex lineage.

The inbox tracks whether a return has been ingested and the resulting Codex result ID.

## Explicit Codex ingestion

`ingestBranchExperimentReturn(...)` converts a reviewed return into the existing typed branch-experiment result and branch-observation seams.

Ingestion:

- retains evidence and receipt references,
- retains return provenance,
- records the observation against the exact branch proposal,
- does not apply the suggested branch-state transition,
- does not automatically create Open Questions,
- does not grant authority.

Wish Grove therefore exposes two separate required approvals:

1. **Run authorised sandbox experiment**
2. **Ingest return into Codex**

The first cannot imply the second.

## Runtime surfaces

Core:

- `apps/arcsweep/src/codex/codex-branch-experiment-execution.js`
- `apps/arcsweep/src/codex/codex-branch-experiment-return-store.js`
- `apps/arcsweep/src/codex/codex-wish-store.js`

Browser:

- `apps/arcsweep/src/wish-grove-ai-university-execution-sidecar.js`
- `apps/arcsweep/src/wish-grove-ai-university-execution.css`

Tests:

- `apps/arcsweep/test/codex-branch-experiment-execution.test.js`

## Invariants

```text
proposal ≠ handoff permission
handoff permission ≠ execution permission
execution permission ≠ Codex ingestion permission
sandbox result ≠ branch-state transition
sandbox result ≠ canon
sandbox result ≠ production authority
```

## Next seam

Returned evidence should be allowed to make **typed suggestions** without applying them:

- propose an Open Question from a named uncertainty,
- propose a branch-state transition with evidence refs,
- propose another discriminating experiment,
- propose a continuity or relationship anchor that became relevant.

Those suggestions should live in a review queue. Acceptance should be explicit and individually receipted.
