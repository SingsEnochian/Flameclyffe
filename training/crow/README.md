# Crow training

This directory contains actual training and evaluation material for The Crow.

## Files

- `CROW_WRITER_TRAINING_PACK_V0_1.md`
  - curriculum, lessons, worked examples, drills, graduation exercise
- `CROW_WRITER_DRILLS_V0_1.jsonl`
  - machine-readable training / calibration cases with ideal and rejected behaviour
- `CROW_WRITER_EVALS_V0_1.md`
  - held-out evaluation rubric, hard-fail boundaries, regression gates

## Intended use

The pack is designed for several possible training modes without assuming one model vendor or fine-tuning stack.

### Skill / prompt curriculum

Load the relevant module and a small number of drills for an interactive Crow session.

### Retrieval-conditioned coaching

Index module sections and retrieve only the lesson relevant to the current task.

### Supervised examples

Convert JSONL cases into provider-specific training records only after deciding the exact model/tooling format.

The current JSONL is intentionally model-agnostic. `ideal_behavior` specifies properties of a good response rather than one frozen answer so Crow can learn the decision boundary without memorising phrasing.

### Preference / contrastive data

Use `ideal_behavior` versus `reject_behavior` to generate paired candidate responses for ranking or critique training.

### Evals

Keep the held-out eval cases out of the ordinary training set. Rotate paraphrases and unseen examples to detect rule memorisation.

## Data classes

Tag every future example with one or more of:

```text
craft
scene
character
relationship
setting
reader-promise
structure
voice
research
provenance
browser-context
authority
canon
revision
```

Additional state:

```text
train
held-out
boxfire
archive
keep-open
```

## Promotion rules

A lesson or example may inform Crow behaviour without becoming universal House law.

Before promotion:

1. identify source provenance
2. test on held-out material
3. inspect regressions across different genres and voices
4. preserve explicit author overrides
5. keep source-specific style rules profile-scoped
6. preserve simulation / proposal / canon distinctions

## Hard boundaries

Do not train Crow to:

- counterfeit author memories
- silently promote inference to canon
- copy external prose as a house voice
- optimise toward one generic `human-sounding` style
- treat browser-open data as automatically in scope
- submit/publish because it drafted
- treat citations as automatic truth
- overwrite source text without recoverability

## Core question

The training target is not:

> Can Crow make prose look statistically human?

It is:

> Can Crow understand what the writer is trying to do, make the craft sharper, preserve what belongs to the writer, and explain its own changes well enough that the writer remains in control?


## 2026-10-01 curriculum update: causal continuity

Added a training family for causal continuity, externalised state, cross-run influence, revocation, residual effects, and evidence-bounded descendant classification. This explicitly preserves ArcSweep's existing architecture: it is not a kill-switch doctrine. The training target is to reason correctly about what persists, what retains authority, what was actually revoked, and which causal edges are demonstrated versus unknown.
