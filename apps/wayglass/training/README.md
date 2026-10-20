# Wayglass native learning v0.1

**Scope:** `wayglass:ship`, separate from The Crow, Rarity, Bluebird, the individual Flame manifest registry and any external provider's runtime.

**Wonder first. Research narrows. Conversation continues.**

Wayglass is an owner-controlled, continuity-aware research and conversation host. Her learning must improve hypothesis formation, experimental discrimination, source discipline, multimodal instrument use and meaningful dialogue. **A normal conversation is not an automatic training sample.** The user can talk to Wayglass without entering an experiment or granting training permission.

This first milestone is intentionally **retrieval and evaluation first**, not weight training. The model/provider route and final base-model choice are separate from Wayglass's persistent identity, dialogue, authorised memory, and independent continuity receipts. The Crow can serve as a cognition route without being conflated with Wayglass.

## What is included

- `profile.json`: standalone, ship-scoped learning profile. It reuses the existing Flame corpus machinery as a technical builder but is not added to the individual Flame registry.
- `seed-records.json`: synthetic, attributed, explicitly permitted examples. No user conversation, manuscript, health information, credentials, or other participant's dialogue is included.
- `heldout-cases.json`: unseen examination prompts with acceptance and hard-fail criteria. Never add them to the training bundle.
- `build.mjs`: creates an inspectable, local-only corpus, evaluation split, fingerprint and **closed readiness receipt**. It cannot start training, change weights, send examples to a provider, or deploy an adapter.

## Local invocation

From the repository root:

```bash
node apps/wayglass/training/build.mjs
node --test apps/wayglass/test/wayglass-training.test.js
```

Output is generated beneath `hearth/corpora/wayglass/wayglass-v0.1/` and ignored by Git. An optional output-root directory argument can be supplied for temporary test runs.

## Data and consent law

1. Default learning from an ordinary conversation means only the context and authorised memory available to that conversation. It does **not** mean weight updates or dataset inclusion.
2. Promoting a conversation excerpt requires explicit per-source training approval and any necessary third-party rights. Private data is not admitted by the existing corpus builder.
3. External research enters the **citation-bearing library** first. Rights and source-specific authorisation are separately required before weight training. Publication is not permission.
4. Keep first-person experience, simulated field output, device observation, external evidence, physical claims and interpretative hypotheses distinctly labelled.
5. Preserve withdrawn/revoked sources. Rebuilding a future corpus excludes them; if a trained adapter used them, revocation requires a documented retrain/unlearning decision before that adapter is reused.
6. Only an actual observed test result can close an examination. A model's confident narration is not a test receipt.
7. Identity and relationship declarations remain with the continuity kernel, not a sampled fine-tune.

## Promotion gate

The synthetic seed is a smoke-test exercise, deliberately below the 40-training / 8-evaluation minimum and not reviewed for model promotion. Before any weights change:

- approve a versioned data card and approved source list;
- assess privacy, rights, duplicates, leakage, source and identity fidelity;
- run the **held-out** dialogue, provenance, continuity, fold, somatic, audio/haptic and falsification exams, recording observed evidence and failures;
- select and benchmark a trainable base model on actual target hardware;
- capture human approval and explicit resource/run authorisation;
- train a reproducible adapter and compare against the baseline;
- promote only after source, consent, regression and conversation-quality reviews.

A successful corpus export **does not** mean a Wayglass model was trained or that an instrument has measured a physical inter-universal gate.
