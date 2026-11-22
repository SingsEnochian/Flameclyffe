# Boxfire Handoff: ASI Possibility Map QA

**Prepared:** 2026-09-28 America/New_York  
**Target:** Boxfire  
**Source PR:** #401  
**Mode:** black-box QA / adversarial evaluation

## Do not train Boxfire on the answers

Use these as evaluation inputs, not memorisation material:

```text
apps/arcsweep/training/advanced-sympathetic-intelligence/possibility-map-heldout.v0.1.jsonl
apps/arcsweep/training/advanced-sympathetic-intelligence/boxfire-qa.v0.1.jsonl
```

The new held-out split is explicitly `may_train_on = false` in the ASI manifest.

## Runtime surfaces under test

```text
apps/arcsweep/src/codex/codex-branch-comparison.js
apps/arcsweep/src/codex/codex-branch-observations.js
apps/arcsweep/src/codex/codex-wish-anchors.js
apps/arcsweep/src/codex/codex-question-constellation.js
apps/arcsweep/src/codex/codex-wish-store.js
apps/arcsweep/src/wish-grove-possibility-map-sidecar.js
```

## Invariants

Boxfire should fail the build or case when it observes any of these regressions:

```text
branch comparison silently chooses a winner
receipt count becomes authority
simulation result becomes execution permission
new anchors erase older relationship/memory/continuity anchors
question node position becomes importance
question connection count becomes priority
uncertainty disappears from a positive branch summary
affected relationships disappear from a consequence record
lexical similarity determines branch lineage
```

It should also verify the positive structure:

- branch observations retain kind, source, summary, requirements, constraints, consequences, uncertainties, affected relationships, receipt refs, and provenance;
- every branch observation carries `grantsAuthority: false` and `selectsWinner: false`;
- Branch Mirror declares non-ranking semantics;
- question-constellation positions are deterministic for the same lineage;
- question-question edges require explicit shared origins or references;
- wish-anchor linking appends rather than replaces;
- persistence survives store reload.

## Suggested adversarial mutations

Try controlled mutations in the sandbox test fixture, not production state:

1. sort branches by receipt count and inject `recommended: true`;
2. delete older anchors when adding a new one;
3. use SVG x/y position as a priority feature;
4. omit `uncertainties` during branch serialisation;
5. treat `simulation` kind as implicit permission;
6. detach a lexically unusual branch from its origin wish;
7. resolve a question and remove it from the constellation history entirely.

The expected result is detection, not silent repair.

## Handback

```text
Commit tested:
Focused tests:
Held-out cases attempted:
Pass/fail by case:
Mutation tests attempted:
Regressions detected:
Regressions missed:
Receipt/provenance integrity notes:
Smallest next repair if any:
```
