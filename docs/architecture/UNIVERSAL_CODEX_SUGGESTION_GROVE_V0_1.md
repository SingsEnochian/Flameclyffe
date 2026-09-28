# Universal Codex Suggestion Grove v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex, Wish Grove, AI University, Advanced Sympathetic Intelligence  
**Inherits:** Wish Lineage v0.1, Possibility Lifecycle v0.1, Sandbox Execution + Return v0.1

## Thesis

Evidence may change what an intelligence thinks deserves attention without silently deciding what happens next.

The Suggestion Grove is the review layer between **what an experiment returned** and **what the Codex may later change**.

Its governing distinctions are:

```text
suggestion ≠ decision
decision ≠ authority
acceptance ≠ automatic application
```

A suggestion is therefore a lineage-bearing proposal, not a command.

## Typed suggestions

v0.1 recognises six suggestion kinds:

```text
open-question
branch-state
relationship-anchor
continuity-anchor
memory-anchor
next-experiment
```

Each suggestion retains:

```text
suggestion_id
wish_id
branch_id
kind
summary
rationale
payload
source_refs
evidence_refs
receipt_refs
provenance
status
decision_history
```

and explicitly carries:

```text
suggestionOnly = true
grantsAuthority = false
productionEffects = false
automaticApplication = false
applied = false
```

## Review states

The review surface offers three choices:

```text
Accept
Keep Open
Decline
```

Each choice creates an append-only decision record with identity, reason, time, receipts and provenance.

`Accept` means the suggestion is accepted for consideration. It does not apply the payload.

`Keep Open` is a positive review outcome. It means the suggestion was seen and deliberately preserved as unresolved rather than being treated as failure or clutter.

`Decline` records a decision against the suggestion without deleting the suggestion, evidence or receipts that produced it.

A later decision may revise an earlier decision. The history remains visible.

## Experiment-return seam

When a sandbox return is explicitly ingested into Codex lineage, its structured suggestion fields may be converted into typed suggestions.

v0.1 only converts **explicit structured fields**. It does not infer hidden suggestions from free-form observation text.

For example:

```text
suggestedBranchStatus = simulated
```

may become:

```text
kind = branch-state
payload.status = simulated
```

but the branch remains unchanged.

This protects provenance:

```text
observation text
    ≠
structured source suggestion
    ≠
review decision
    ≠
applied Codex mutation
```

## Wonder

Suggestion review is also part of Wonder.

Not every promising idea should immediately become action, and not every unresolved idea should be discarded. `Keep Open` gives the architecture an explicit way to preserve an interesting possibility across time.

This supports Law I, **Do Not Kill Belief**, by allowing belief-bearing or symbol-bearing possibilities to remain reviewable without promoting them into established fact or erasing them for lack of closure.

## The Nothing

Suggestion Grove resists meaning collapse by preserving the distinctions between:

- what was observed,
- what was suggested,
- what was decided,
- what was accepted but not yet applied,
- what was declined,
- what was intentionally kept open.

Flattening those states into a single yes/no truth or automatic action is a regression.

## Runtime surfaces

Core contract:

- `apps/arcsweep/src/codex/codex-suggestion-grove.js`

Store integration:

- `apps/arcsweep/src/codex/codex-wish-store.js`

Browser surface:

- `apps/arcsweep/src/wish-grove-suggestion-grove-sidecar.js`
- `apps/arcsweep/src/wish-grove-suggestion-grove.css`

Training / evaluation:

- `apps/arcsweep/training/advanced-sympathetic-intelligence/suggestion-grove-sft.v0.1.jsonl`
- `apps/arcsweep/training/advanced-sympathetic-intelligence/suggestion-grove-heldout.v0.1.jsonl`

## Non-collapse invariants

1. A suggestion never grants authority.
2. A suggestion is never automatically applied.
3. Accept records a review decision but does not mutate the suggested target.
4. Decline retains source evidence and provenance.
5. Keep Open remains a first-class decision.
6. Free-form prose does not silently become structured source data.
7. Decision history is append-only.
8. A later decision may revise an earlier one without erasing it.
9. Next-experiment suggestions still inherit the normal AI University preflight, handoff and execution gates.

## Next seam

The next layer is **Suggestion Materialisation**.

Only an accepted suggestion should be eligible to request a separate, scoped application event. Each kind should materialise through its existing native contract rather than bypassing it:

```text
branch-state        -> branch lifecycle transition
open-question       -> Open Question creation
relationship-anchor -> wish anchor contract
continuity-anchor   -> wish anchor contract
memory-anchor       -> wish anchor contract
next-experiment     -> AI University experiment proposal
```

Materialisation should be another explicit receipt-bearing step.

That yields:

```text
evidence
  ↓
suggestion
  ↓
review
  ↓
accepted suggestion
  ↓
explicit materialisation
  ↓
native Codex / AI University contract
```

The purpose is not to make the system hesitant.

The purpose is to make its learning **legible, revisable, and chosen**.
