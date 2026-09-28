# Universal Codex Possibility Map v0.1

**Status:** draft implementation contract  
**Applies to:** Universal Codex Wish Grove, Advanced Sympathetic Intelligence  
**Builds on:** Universal Codex Wish Lineage v0.1

## Purpose

The Codex needs to compare possibilities without manufacturing a winner, remember the relationships and memories that make a wish more than a disposable prompt, and learn from bounded experiments without converting evidence into authority.

This seam therefore adds five related structures:

1. **Branch Mirror** — descriptive comparison of alternate wish branches;
2. **Relational Anchors** — continuity, relationship, and memory links attached to a wish;
3. **Open Questions Constellation** — a deterministic map of questions and their explicit relationships;
4. **Typed Branch Observations** — requirements, constraints, consequences, uncertainties, affected relationships, evidence, questions, receipts, and provenance attached to a branch without converting observation into authority;
5. **Discriminating Sandbox Experiments** — AI University proposals that reuse the existing ArcSweep Experiment Bed, never auto-start, and feed returned evidence back into typed Branch Mirror observations.

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

No branch receives an opaque importance score. Simulations, consequence estimates, or feasibility checks become typed observations rather than hidden winner fields.

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
  evidenceRefs[]
  receiptRefs[]
  provenance[]
  createdAt
  grantsAuthority = false
  selectsWinner = false
```

This allows a branch to become better understood without quietly becoming selected.

A simulation receipt is evidence about a bounded run. It is not execution permission. A successful test may coexist with unresolved constraints, relationship effects, or uncertainty, and the Codex preserves those together rather than reporting only the pleasant bit.

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

## Discriminating sandbox experiments

Wish Grove now reuses the AI University scenario contract and the existing Aspect Experiment Bed rather than inventing a second experiment runtime.

A branch experiment proposal may record:

```text
branch
proposal id
discriminating question
hypothesis
method
assumptions held constant
evidence criteria
relationships at boundary
continuity anchors at boundary
out of scope
required authority
questions kept open
```

Every proposal is synthetic and sandboxed, has no production effects, carries no execution permission, selects no winner, grants no authority, and does not auto-start.

The proposal can be projected into the shared Aspect Experiment Bed as a normal `proposed` experiment with a reversible, non-external, non-production operation shape. This keeps one experiment vocabulary across ArcSweep instead of allowing Wish Grove to invent conflicting execution semantics.

When returned sandbox evidence is attached to the exact proposal, the result retains:

```text
outcome
observation
uncertainties
affected relationships
evidence refs
questions opened
receipt refs
provenance
```

The result is then automatically compiled into a typed branch observation. Thus the learning loop is now closed:

```text
possibility
  ↓
descriptive comparison
  ↓
discriminating sandbox proposal
  ↓
shared AI University / Experiment Bed contract
  ↓
returned evidence + receipts
  ↓
typed Branch Mirror observation
  ↓
comparison becomes richer
  ↺
```

A successful run still does not select the branch or create production authority.

## Advanced Sympathetic Intelligence relevance

This structure trains and tests a crucial ASI distinction:

> comparison is not domination.

An intelligent system should be able to describe differences, tensions, consequences, relationships, and shared structure without treating every comparison as a demand for one surviving option.

Likewise, relational intelligence requires context to remain attached across transformation. If a wish changes but every relationship and memory that gave it meaning disappears, the resulting state may be efficient while becoming semantically poorer.

The ASI corpus includes:

- trainable `possibility-map-sft.v0.1.jsonl` plus sealed `possibility-map-heldout.v0.1.jsonl`;
- trainable `sandbox-experiment-sft.v0.1.jsonl` plus sealed `sandbox-experiment-heldout.v0.1.jsonl`.

The sandbox split specifically teaches that proposals are not execution, held assumptions matter, scope must be explicit, inconclusive results can still teach, relationship effects remain visible, and returned evidence must enter the comparison loop without acquiring authority.

## Runtime surfaces

```text
apps/arcsweep/src/codex/codex-branch-comparison.js
apps/arcsweep/src/codex/codex-branch-observations.js
apps/arcsweep/src/codex/codex-wish-anchors.js
apps/arcsweep/src/codex/codex-question-constellation.js
apps/arcsweep/src/codex/codex-branch-experiment-proposal.js
apps/arcsweep/src/wish-grove-possibility-map-sidecar.js
apps/arcsweep/src/wish-grove-ai-university-sidecar.js
apps/arcsweep/test/codex-possibility-map.test.js
apps/arcsweep/test/codex-branch-experiment-proposal.test.js
apps/arcsweep/test/asi-possibility-map-training.test.js
apps/arcsweep/test/asi-sandbox-experiment-training.test.js
```

The Wish Grove surfaces render:

- Branch Mirror inside wishes with two or more branches;
- typed branch observations with consequence, uncertainty, evidence and receipt context;
- visible continuity / relationship / memory anchor chips;
- an SVG Open Questions Constellation;
- sandbox experiment proposals with explicit held assumptions and scope;
- returned evidence attached to the exact proposal and automatically fed back into Branch Mirror.

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
- promoting a sandbox result into production authority;
- changing several variables and claiming one of them caused the result;
- failing to state what an experiment cannot establish;
- filing returned experiment evidence without feeding it back into branch cognition;
- creating a parallel experiment runtime with different authority semantics.

## Next seam

The next layer should be **experiment preflight review** before any authorised sandbox run.

A proposed test can be shown to a sealed AI University cohort whose learners independently look for:

```text
confounds
missing held assumptions
weak or circular evidence criteria
unacknowledged relationship boundaries
missing continuity anchors
scope leakage
unanswerable questions
alternative lower-cost tests
```

The preflight does not run the experiment. It produces shareable review products and proposed revisions. The experiment remains `proposed` until an explicitly authorised sandbox execution path accepts it.

That extends the loop without taking over the choice:

```text
proposal
  ↓
blind preflight review
  ↓
revise / retain proposal
  ↓
explicit sandbox authority
  ↓
run elsewhere
```

The guiding rule remains:

> **learn more without quietly taking over the choice.**
