# Universal Codex Developmental Field Feedback v0.1

## Purpose

Developmental Memory may change what the Cognitive Field notices without becoming identity law, direct prompt text, action permission, or shared memory across runtimes.

The governing distinctions are:

```text
developmental memory ≠ identity law
developmental evidence ≠ direct model prompt
field influence ≠ authority
recent selection ≠ importance
cross-runtime memory ≠ shared memory
```

## Scoped projection

`apps/arcsweep/src/codex/codex-developmental-field-feedback.js` projects explicitly scoped Developmental Memory rings into compact Cognitive Field context entries.

Projection is opt-in. With no `wishIds`, `branchIds`, or explicit `allowAll`, the projector returns no entries. `createCodexDevelopmentalContextRetriever()` also returns no entries unless a runtime-to-Codex `selectScope` function is supplied.

This prevents one identity runtime from inheriting another runtime's developmental history merely because both records exist in the Universal Codex.

## Low-authority context

Each projected entry carries:

```text
signalClass = low-authority-developmental-context
scopeBound = true
directModelPrompt = false
canonicalTruth = false
grantsAuthority = false
productionEffects = false
```

Rows that claim `grantsAuthority = true` or `productionEffects = true` are excluded from projection.

The projection preserves mixed evidence, including:

- observed improvements,
- regressions,
- unresolved questions,
- successful transfer,
- partial transfer,
- failed generalisation,
- unknown transfer,
- surprises.

Negative or unresolved developmental evidence is not pruned merely because a later run succeeded.

## Cognitive Engine integration

`createCognitionEngine()` now accepts a separate `retrieveDevelopmentalContext` provider.

The two retrieval lanes remain distinct:

```text
ordinary continuity context ───────────────┐
                                           ├─> Cognitive Field
scoped developmental context ──────────────┘

ordinary continuity context ─────────────────> generative model
scoped developmental context ──X─────────────> direct generative prompt
```

Developmental context affects the Cognitive Field through the existing deterministic continuity-signal compiler. Laya receives the resulting compact field summary, not the raw developmental records. The generative model continues to receive ordinary context only.

Because developmental evidence influenced cognition, its refs are included in the runtime receipt alongside ordinary evidence refs.

## Bounded selection

The v0.1 projector is bounded to at most 32 entries and defaults to 8. When more records exist, the most recent scoped entries are selected deterministically, with ring ID as a tie-breaker.

This is a context-window policy, not a value judgement:

```text
recentSelectionIsNotImportance = true
```

A later version may add explicit relevance retrieval, but no geometric centrality, recency, or activation value should silently become a claim about importance.

## Developmental use

The field may now carry low-authority signals such as:

```text
prior failure occurred here
this transfer was partial
this domain remains unknown
this lesson previously regressed scope discipline
this question became more interesting after training
```

Those signals can change salience, tension, novelty, retrieval posture, or Laya judgement. They do not block or permit an action by themselves.

## Self-governance boundary

Repeated developmental evidence may support a proposal to change curriculum, training strategy, evaluation coverage, or a field-feedback mapping. Such a proposal must return through explicit review and authority contracts.

The system may remember how learning changed its behaviour. It may reason about that history. It may propose another route.

It may not convert self-observation into self-authority.
