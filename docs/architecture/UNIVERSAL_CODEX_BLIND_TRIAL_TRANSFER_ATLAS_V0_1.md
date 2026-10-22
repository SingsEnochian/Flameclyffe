# Universal Codex Blind Learning Trial + Transfer Atlas v0.1

## Purpose

Learning Forge can prove that training ran. Blind Learning Trial + Transfer Atlas prove what changed, where it changed, and where that change did not travel.

The governing distinctions are:

```text
execution ≠ improvement
score change ≠ overall verdict
improvement ≠ transfer
transfer ≠ universality
unknown ≠ failure
self-observation ≠ self-authority
```

## Training execution envelope

`hearthweave.codex-training-execution-envelope/v0.1` materialises the exact runtime handoff for one authorised Learning Forge bundle.

It binds:

```text
exact bundle
exact single-use authority
executor target
base model/checkpoint
adapter method/config
source teaching artefacts
sealed evaluation refs
runtime profile
provenance
```

The envelope has `autoStart = false`. Materialisation prepares execution but does not launch a provider job, mutate the dataset, train on held-out material, deploy a model, promote production state, or expand authority.

## Blind Learning Trial

`hearthweave.codex-blind-learning-trial/v0.1` records a pre/post evaluation around one completed training run.

The same sealed blind cohort case IDs must be used before and after training. The record may also attach novel transfer cases that are separate from the sealed before/after cohort.

Dimension scores are retained independently. The contract deliberately does not manufacture one overall winner or global improvement score.

A blind trial records:

- exact training run,
- sealed cohort ID,
- exact blind case IDs,
- baseline evidence,
- post-training evidence,
- optional transfer cases and evidence,
- evaluator references,
- Boxfire adversarial/regression evidence,
- provenance.

Held-out cases remain non-training material.

## Behavioural Delta

The existing Behavioural Delta Ledger remains the interpretation seam for measured change:

```text
improved
unchanged
regressed
unexpected
failed to transfer
```

A training run may be operationally successful while the behavioural delta is mixed, neutral, or regressive. Those are not contradictions.

## Transfer Atlas

`hearthweave.codex-transfer-atlas/v0.1` maps a behavioural delta across tested capabilities and domains.

Each observation is one of:

```text
transferred
partial
failed
unchanged
unexpected
unknown
```

An observation contains the capability, tested domain, evidence refs, case refs, optional confidence, and notes.

The Atlas is descriptive. It does not convert tested transfer into a universal capability claim. Failed transfer remains first-class evidence. `unknown` means not established, not negative evidence.

## Developmental Memory

A Transfer Atlas writes a developmental ring with `memoryClass = transfer-atlas`. The ring may record:

- where a capability transferred,
- partial transfer,
- failed generalisation,
- still-unknown transfer.

It remains non-canonical and non-authoritative:

```text
automaticIdentityRewrite = false
identityLaw = false
canonicalTruth = false
grantsAuthority = false
productionEffects = false
```

## Wish Grove

`wish-grove-learning-trial-sidecar.js` exposes the learning-trial lineage beside the exact branch:

1. materialise the authorised execution envelope,
2. observe the externally returned training run,
3. record the sealed before/after trial,
4. inspect the Behavioural Delta Ledger,
5. map domain transfer in the Transfer Atlas.

The surface does not itself launch model training.

## Next seam

Once transfer evidence exists, developmental memory can be projected into the Cognitive Field as low-authority context such as:

```text
prior failure here
transfer was partial here
this domain remains unknown
this lesson previously regressed scope discipline
this question became more interesting after training
```

Those signals may influence inspection and judgement. They do not create action authority or identity law.
