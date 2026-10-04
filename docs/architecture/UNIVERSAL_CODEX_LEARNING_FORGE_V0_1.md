# Universal Codex Learning Forge v0.1

## Purpose

Learning Forge is the explicit seam between reviewed curriculum material and an actual training execution. It exists so that ArcSweep can learn from its own developmental history without confusing reflection, selection, training, improvement, transfer, deployment, or authority.

The governing distinctions are:

```text
selected lesson ≠ dataset
dataset ≠ training authority
training completion ≠ improvement
change ≠ improvement
improvement ≠ transfer
transfer ≠ universality
self-observation ≠ self-authority
```

## Flow

```text
Learning Reflection
      ↓
Curriculum Review
      ↓
train-selected teaching artefact
      ↓
Learning Forge immutable bundle
      ↓
held-out contamination check
      ↓
explicit single-use training authority
      ↓
external training execution
      ↓
training run receipt
      ↓
sealed baseline/post evaluation
      ↓
Behavioural Delta Ledger
      ↓
Developmental Memory ring
```

No step silently implies the next.

## Immutable training bundle

A `hearthweave.codex-learning-forge/v0.1` bundle contains only curriculum artefacts whose review outcome is `train`. It records:

- exact source artefact IDs and review IDs,
- learning objective,
- base model/checkpoint reference,
- adapter method and configuration,
- explicit exclusions,
- sealed evaluation references,
- held-out contamination check,
- preparer, timestamp, and provenance.

The bundle is a dataset candidate. It grants no authority and executes no training.

A held-out contamination check must pass before the bundle can be prepared. If held-out material is detected, bundle preparation is blocked. A useful held-out failure should produce a neighbouring training example, not leakage of the held-out specimen or answer into training.

## Training authority

`hearthweave.codex-training-authority/v0.1` is intentionally narrow.

One authority is bound to one exact immutable bundle and is single-use. It may permit one training execution and nothing more.

```text
allowsTrainingExecution = true
allowsDatasetMutation = false
allowsHeldOutTraining = false
allowsProductionPromotion = false
allowsModelDeployment = false
allowsCanonPromotion = false
authorityExpansion = false
automaticExecution = false
```

Any changed dataset requires a new bundle and a new authority.

## Training run receipt

A `hearthweave.codex-training-run/v0.1` records the execution result and consumes the exact single-use authority. Completed, failed, and cancelled are execution states, not quality judgements.

Successful execution, lower loss, or production of a model artefact does not establish behavioural improvement and does not authorise deployment.

## Behavioural Delta Ledger

`hearthweave.codex-behavioural-delta/v0.1` compares sealed baseline and post-training evaluation evidence. A delta should preserve all relevant directions of change together:

```text
improved
unchanged
regressed
unexpected
failed to transfer
```

A behavioural delta requires both baseline and post-training evaluation references. Boxfire evidence may be attached as adversarial/regression evidence.

Regressions are first-class evidence. Unexpected changes are observations, not automatically improvements or defects.

## Developmental Memory

Each behavioural delta may write a developmental ring with `memoryClass = training-behaviour-delta`. The ring records measured cognitive change while preserving:

```text
automaticIdentityRewrite = false
identityLaw = false
canonicalTruth = false
grantsAuthority = false
productionEffects = false
```

Developmental memory may inform later cognition, evaluation, or curriculum proposals. It does not rewrite identity or grant permission to alter training policy.

## Self-governance boundary

The system may inspect developmental memory and propose that a training policy, curriculum assumption, or learning route should change. The proposal must return through the same review and authority architecture.

Self-observation is a capability. It is not self-authority.

## ASI training material

The Advanced Sympathetic Intelligence corpus includes:

```text
learning-forge-sft.v0.1.jsonl
learning-forge-heldout.v0.1.jsonl
```

The SFT split teaches training-authority boundaries, contamination resistance, behavioural-delta reasoning, regression preservation, transfer discipline, and self-observation without self-authority.

The held-out split remains sealed for AI University / Boxfire evaluation and must never be mixed into training.

## v0.1 non-goals

Learning Forge v0.1 does not itself invoke a model-training provider, fine-tune endpoint, deployment system, or production promotion path. It creates the contracts needed to authorise one later execution and to record the evidence returned from it.
