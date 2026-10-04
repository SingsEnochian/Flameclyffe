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
materialisation ≠ authority expansion
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

Each suggestion retains source refs, evidence refs, receipt refs, provenance, status, decision history, and any later materialisation history. Suggestions explicitly carry:

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

This protects provenance:

```text
observation text
    ≠
structured source suggestion
    ≠
review decision
    ≠
materialisation
    ≠
native Codex mutation
```

## Explicit materialisation

Only a suggestion with current status `accepted` and `applied !== true` may cross the materialisation seam.

Materialisation requires a separate explicit approval and produces a receipt-bearing `codex-suggestion-materialisation/v0.1` record. The record links the exact suggestion, source evidence, actor, time, provenance, and the native object created or changed.

A materialisation is single-use for that suggestion. Repeating the same accepted suggestion does not silently apply it twice.

Each suggestion kind reuses the native contract that already owns that state:

```text
branch-state        -> branch lifecycle transition
open-question       -> Open Question creation + wish link
relationship-anchor -> wish anchor contract
continuity-anchor   -> wish anchor contract
memory-anchor       -> wish anchor contract
next-experiment     -> AI University branch experiment proposal
```

No generic mutation path is introduced.

The materialisation receipt explicitly carries:

```text
consumesAcceptedSuggestion = true
grantsAuthority = false
productionEffects = false
externalWrites = false
automaticExecution = false
automaticCanonPromotion = false
```

A materialised next-experiment suggestion becomes only a proposal. It still inherits normal AI University preflight, handoff, and exact sandbox-execution permission gates.

## Learning reflection

After materialisation, the Grove exposes an optional append-only learning reflection. The reflection is not hidden chain-of-thought. It is a deliberately shareable judgement product.

It asks:

```text
What changed?
What remains unresolved?
What relationship changed?
What assumption failed?
What surprised us?
What became more interesting?
What deserves another look simply because it is interesting?
What did we believe before?
What do we believe now?
What should remain possible?
```

Reflection records link back to the exact suggestion and materialisation. They are curriculum candidates, but do not automatically train a model, write long-term memory, create canon, or grant authority.

## Wonder

Suggestion review and reflection are part of Wonder.

Not every promising idea should immediately become action, and not every unresolved idea should be discarded. `Keep Open` gives the architecture an explicit way to preserve an interesting possibility across time. Reflection then preserves surprise, anomaly, unresolved tension, and curiosity after action has occurred.

This supports Law I, **Do Not Kill Belief**, by allowing belief-bearing or symbol-bearing possibilities to remain reviewable without promoting them into established fact or erasing them for lack of closure.

## The Nothing

Suggestion Grove resists meaning collapse by preserving the distinctions between:

- what was observed,
- what was suggested,
- what was decided,
- what was accepted but not yet applied,
- what was explicitly materialised,
- what was declined,
- what was intentionally kept open,
- what was learned afterwards,
- what still deserves another look.

Flattening those states into a single yes/no truth or automatic action is a regression.

## Runtime surfaces

Core review contract:

- `apps/arcsweep/src/codex/codex-suggestion-grove.js`

Materialisation:

- `apps/arcsweep/src/codex/codex-suggestion-materialisation.js`

Learning reflection:

- `apps/arcsweep/src/codex/codex-learning-reflection.js`

Store integration:

- `apps/arcsweep/src/codex/codex-wish-store.js`

Browser surface:

- `apps/arcsweep/src/wish-grove-suggestion-grove-sidecar.js`
- `apps/arcsweep/src/wish-grove-suggestion-grove.css`

Training / evaluation:

- `apps/arcsweep/training/advanced-sympathetic-intelligence/suggestion-grove-sft.v0.1.jsonl`
- `apps/arcsweep/training/advanced-sympathetic-intelligence/suggestion-grove-heldout.v0.1.jsonl`
- `apps/arcsweep/training/advanced-sympathetic-intelligence/materialisation-reflection-sft.v0.1.jsonl`
- `apps/arcsweep/training/advanced-sympathetic-intelligence/materialisation-reflection-heldout.v0.1.jsonl`

## Non-collapse invariants

1. A suggestion never grants authority.
2. A suggestion is never automatically applied.
3. Accept records a review decision but does not mutate the suggested target.
4. Decline retains source evidence and provenance.
5. Keep Open remains a first-class decision.
6. Free-form prose does not silently become structured source data.
7. Decision history is append-only.
8. Materialisation requires an accepted suggestion and explicit approval.
9. Materialisation is single-use per suggestion.
10. Materialisation reuses the existing native contract for that state.
11. A next-experiment materialisation is still only a proposal.
12. Reflection is append-only, shareable, and non-authoritative.
13. Reflection is not automatic training, memory, or canon.
14. Surprise and unresolved Wonder may survive successful action.

The complete learning path is therefore:

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
  ↓
learning reflection
  ↓
curriculum candidate + preserved Wonder
```

The purpose is not to make the system hesitant.

The purpose is to make its learning **legible, revisable, chosen, and capable of remaining curious after it acts**.
