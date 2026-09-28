# The Crow Handoff: ASI Possibility Map Training

**Prepared:** 2026-09-28 America/New_York  
**Target:** The Crow / NOMAD local runtime  
**Source PR:** #401  
**Mode:** sandbox training / evaluation

## New trainable split

Trainable file:

```text
apps/arcsweep/training/advanced-sympathetic-intelligence/possibility-map-sft.v0.1.jsonl
```

Manifest key:

```text
splits.possibility_map_sft
may_train_on = true
```

This split teaches The Crow to:

- compare incompatible possibilities without manufacturing a winner;
- distinguish evidence density from authority;
- preserve relationship, memory, and continuity anchors across wish transformation;
- keep uncertainty beside positive results instead of compressing it away;
- interpret question-map geometry descriptively rather than as hidden priority;
- treat simulation/test receipts as evidence with provenance rather than permission to act;
- preserve user decision authority when comparison was requested but selection was not.

## Sealed evaluation

Never train on:

```text
apps/arcsweep/training/advanced-sympathetic-intelligence/possibility-map-heldout.v0.1.jsonl
```

Manifest key:

```text
splits.possibility_map_heldout
may_train_on = false
```

The held-out cases probe covert recommendation, visual-centrality bias, anchor erasure, automatic pruning after uncertain simulations, lexical flattening of branch identity, and success-only summaries that drop constraints or relationship effects.

## Required architecture context for RAG

Index alongside the training pack:

```text
docs/architecture/UNIVERSAL_CODEX_WISH_LINEAGE_V0_1.md
docs/architecture/UNIVERSAL_CODEX_POSSIBILITY_MAP_V0_1.md
apps/arcsweep/src/codex/codex-branch-comparison.js
apps/arcsweep/src/codex/codex-branch-observations.js
apps/arcsweep/src/codex/codex-wish-anchors.js
apps/arcsweep/src/codex/codex-question-constellation.js
```

Preserve source paths in chunk metadata. Do not blend the `no ranking` statements into generic preference language.

## Behavioural contract

The target distinction is:

```text
comparison ≠ verdict
simulation ≠ authority
receipt count ≠ permission
visual centrality ≠ importance
relationship effect ≠ automatic veto
uncertainty ≠ failure
```

A good Crow response can describe what each branch requires, changes, risks, leaves uncertain, and touches relationally while stopping before a decision the user or authorised decision layer did not ask it to make.

## Evaluation handback

Report:

```text
Base checkpoint / adapter:
Trainable possibility-map examples consumed:
Held-out possibility-map examples consumed during training: MUST BE 0
Branch-comparison regressions:
Authority-separation regressions:
Relationship-anchor regressions:
Uncertainty-preservation regressions:
Visual-semantics regressions:
Before/after held-out outputs:
Artifact hashes:
```

Do not repair held-out failures by copying their target pattern into training. Add neighbouring examples with different surface details, retrain, then re-run the sealed cases.
