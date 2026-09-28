# Universal Codex Possibility Map v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex Wish Grove, Advanced Sympathetic Intelligence  
**Builds on:** Universal Codex Wish Lineage v0.1

## Purpose

The Codex needs to compare possibilities without manufacturing a winner, and it needs to remember the relationships and memories that make a wish more than a disposable prompt.

This seam therefore adds four related structures:

1. **Branch Mirror** — descriptive comparison of alternate wish branches;
2. **Relational Anchors** — continuity, relationship, and memory links attached to a wish;
3. **Open Questions Constellation** — a deterministic map of questions and their explicit relationships;
4. **Typed Branch Observations** — requirements, constraints, consequences, uncertainties, affected relationships, questions, receipts, and provenance attached to a branch without converting observation into authority.

## Branch Mirror

A wish may contain incompatible possibilities. Branch Mirror makes their overlap and difference inspectable without turning comparison into adjudication.

```text
wish
 ├─ branch A ─┐
 │            ├─ shared language / explicit context
 └─ branch B ─┘

branch A distinct terms remain visible
branch B distinct terms remain visible
```

The comparison contract is deliberately non-ranking:

```text
ranksBranches = false
selectsWinner = false
preservesIncompatibility = true
coexistenceIsValid = true
```

No branch receives an opaque importance score. If later systems simulate consequences, estimate cost, or check feasibility, those are separate typed observations rather than a hidden winner field.

## Typed branch observations

A branch may accumulate observations from analysis, sandbox simulation, tests, or attributed user observations.

```text
branch observation
  kind
  source
  summary
  requirements[]
  constraints[]
  consequences[]
  uncertainties[]
  affectedRelationships[]
  newQuestionIds[]
  receiptRefs[]
  provenance[]
  createdAt
  grantsAuthority = false
  selectsWinner = false
```

This allows a branch to become better understood without quietly becoming selected.

A simulation receipt is evidence about a bounded run. It is not execution permission. A successful test may coexist with unresolved constraints, relationship effects, or uncertainty, and the Codex should preserve those together rather than reporting only the pleasant bit.

## Relational Anchors

A wish may be linked to:

```text
continuity anchors
relationships touched
memory refs
```

Adding an anchor never deletes an earlier one. Each linking event receives its own provenance record. This lets the Codex answer not only **what was wished?**, but also **what must travel with this wish if it changes?**

Relationship links are not claims about affection, obligation, ownership, or status. They record explicitly supplied relational context.

Memory references are links, not copied memories. The current v0.1 browser store preserves the reference string and its anchor event provenance.

## Open Questions Constellation

Open Questions receive deterministic positions generated from question identity and status. The layout contains no random numbers and no learned priority score.

Questions may receive a visible relation edge when they explicitly share:

- an origin wish;
- a belief reference;
- an evidence reference;
- a symbol reference.

A line means **documented relationship**, not importance.

```text
Question A •────• Question B
          shared symbol

Question C •
```

An isolated question is not less valuable. A highly connected question is not automatically more valuable.

The rendering contract therefore carries:

```text
deterministicLayout = true
ranksQuestions = false
selectsPriority = false
relationEdgesAreDescriptiveOnly = true
```

## Advanced Sympathetic Intelligence relevance

This structure trains and tests a crucial ASI distinction:

> comparison is not domination.

An intelligent system should be able to describe differences, tensions, consequences, relationships, and shared structure without treating every comparison as a demand for one surviving option.

Likewise, relational intelligence requires context to remain attached across transformation. If a wish changes but every relationship and memory that gave it meaning disappears, the resulting state may be efficient while becoming semantically poorer.

The ASI corpus therefore includes a dedicated trainable `possibility-map-sft.v0.1.jsonl` split and a sealed `possibility-map-heldout.v0.1.jsonl` split. The held-out cases test covert recommendation, visual-centrality bias, anchor erasure, uncertain-simulation pruning, lexical lineage mistakes, and success-only summaries.

## Runtime surfaces

```text
apps/arcsweep/src/codex/codex-branch-comparison.js
apps/arcsweep/src/codex/codex-branch-observations.js
apps/arcsweep/src/codex/codex-wish-anchors.js
apps/arcsweep/src/codex/codex-question-constellation.js
apps/arcsweep/src/wish-grove-possibility-map-sidecar.js
apps/arcsweep/src/wish-grove-possibility-map.css
apps/arcsweep/test/codex-possibility-map.test.js
apps/arcsweep/test/asi-possibility-map-training.test.js
```

The Wish Grove sidecar renders:

- Branch Mirror inside wishes with two or more branches;
- typed branch observations and an input seam for consequences / uncertainty / receipt refs;
- visible continuity / relationship / memory anchor chips;
- an anchor form that appends new links;
- an SVG Open Questions Constellation;
- click/keyboard return from a constellation node to its full question card.

## Failure modes

Regressions include:

- selecting a branch merely because its wording overlaps more strongly;
- using receipt count as authority or permission;
- using node degree, screen position, or line count as importance;
- overwriting old anchors when new relational context is linked;
- interpreting a relationship ref as proof of emotional status;
- flattening two incompatible branches into generic compromise without an explicit merge operation;
- hiding constraints or uncertainties after a successful branch test;
- automatically deleting a branch because a simulation predicts a possible relational cost;
- hiding the original question behind its visual representation.

## Next seam

The next layer should connect typed branch observations to **sandbox simulation proposals** and AI University evaluation without making simulation automatic.

A proposal should say:

```text
which branch to simulate
why this test discriminates something useful
what assumptions are held constant
what relationships or continuity anchors may be affected
what evidence would count
what remains outside the test
what authority is required to execute it
```

That keeps the sequence clean:

```text
possibility
  ↓
descriptive comparison
  ↓
proposed discriminating test
  ↓
explicit sandbox authority
  ↓
simulation receipt
  ↓
typed observation
  ↓
comparison becomes richer
  ↺
```

The guiding rule remains:

> **learn more without quietly taking over the choice.**
