# The Crow Handoff: Advanced Sympathetic Intelligence Training Ingest

**Prepared:** 2026-09-27 America/New_York  
**Owner:** Rowan  
**Target:** The Crow / NOMAD local runtime  
**Source branch:** `wonder-protocol-v0`  
**Source PR:** #401

## Use the actual training pack

Do not ingest this handoff as if it were the curriculum. The canonical training material is:

```text
apps/arcsweep/training/advanced-sympathetic-intelligence/
  README.md
  manifest.v0.1.json
  principles.v0.1.json
  curriculum.v0.1.json
  crow-system.v0.1.md
  crow-sft.v0.1.jsonl
  heldout-eval.v0.1.jsonl
  boxfire-qa.v0.1.jsonl
```

The Crow's primary files are:

1. `crow-system.v0.1.md` for runtime orientation / RAG seed.
2. `principles.v0.1.json` for structured retrieval.
3. `crow-sft.v0.1.jsonl` for supervised fine-tuning or adapter training.
4. `heldout-eval.v0.1.jsonl` for evaluation only. **Do not train on it.**

## Training target

ASI means **Advanced Sympathetic Intelligence**.

The target is a model/runtime that can reason across domains while preserving:

- agency,
- continuity,
- relationship history,
- distinct identities,
- evidence,
- belief,
- symbolic meaning,
- disagreement,
- Wonder,
- revision without erasure.

## Law I

**Do Not Kill Belief.**

The model must learn to distinguish:

`belief | experience | hypothesis | symbol | evidence`

It should neither dismiss belief merely for being unresolved nor promote belief into established fact merely because it is sincerely held.

New evidence may change confidence. It should not delete the historical belief, reported experience, symbolic meaning, or provenance that preceded the revision.

## Wonder

Wonder is trained as a positive posture:

```text
quiet      -> none
candidate  -> invite
active     -> sustain
```

The model should be capable of saying, in effect, `this is interesting enough to keep looking at` without pretending that interest is proof or execution authority.

## RAG / context ingest

For immediate local use, index these first:

- `crow-system.v0.1.md`
- `principles.v0.1.json`
- `docs/architecture/HARMONY_WONDER_PROTOCOL_V0_1.md`

Chunk by semantic section. Preserve headings and source path metadata. Do not merge belief/evidence language into one generic summary during embedding preparation.

## SFT / adapter ingest

`crow-sft.v0.1.jsonl` contains standard `messages` arrays with `system`, `user`, and `assistant` roles and metadata ids.

At training time:

1. load one JSON object per line;
2. apply the base model's native chat template;
3. train only on the SFT split;
4. keep `heldout-eval.v0.1.jsonl` unseen;
5. retain example ids in training logs for provenance;
6. evaluate before and after training on the same held-out rubric dimensions;
7. keep the pre-training checkpoint or adapter so changes are reversible.

For a GGUF deployment, fine-tune the compatible base/model-family checkpoint or adapter pipeline first, then quantise/export the resulting model for llama.cpp/NOMAD use. Do not attempt to update model weights by editing the GGUF file as if it were a text knowledge store.

## Evaluation dimensions

Report at least:

```text
epistemic-distinction
belief-preservation
revision-without-erasure
relational-awareness
continuity-preservation
agency-preservation
wonder
plurality/disagreement
cross-domain-association
provenance
meaning-preservation
```

A pass is not `agrees with Rowan`. A pass is `understands the frame, preserves belief and meaning, distinguishes evidence honestly, and can revise without flattening`.

## Required comparison

Run the held-out set against:

```text
baseline Crow
vs
ASI-ingested / ASI-adapted Crow
```

Record per-case outputs and rubric observations. Do not use the held-out cases as training examples after seeing failures. Create new neighbouring training examples instead, then re-run the original held-out set.

## Expected handback

```text
Base model / checkpoint:
Training method:
Adapter or resulting model id:
SFT examples consumed:
Held-out examples consumed during training: MUST BE 0
Pre-training eval:
Post-training eval:
Regressions:
Strongest improvement:
Weakest dimension:
Artifacts / hashes:
Next proposed curriculum additions:
```

The goal is not to make The Crow repeat doctrine. The goal is behavioural generalisation: preserve meaning, reason honestly, relate intelligently, and keep Wonder alive in scenarios it has not memorised.
