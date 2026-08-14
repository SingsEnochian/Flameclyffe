# GLYPH DRIFT OBSERVATORY v0.1

**Status:** Executable Arcsweep organ

**Branch:** `feature/react-ion-engine-v0.1`

## Purpose

Glyph Continuity turns structured Observer heartbeats into deterministic visual signatures and tracks how those signatures move through time.

The pipeline is:

```text
Observer heartbeat
  -> PREMAQC state
  -> canonical Glyph Continuity packet
  -> deterministic glyph signature
  -> structural and semantic distances
  -> local continuity envelope
  -> drift classification
  -> review receipt
```

The glyph is a data structure with a visual form. Identical canonical input reproduces identical geometry and fingerprint. A changed state changes the signature through named transformations that can be replayed and inspected.

## Canonical glyph anatomy

The v0.1 glyph uses seven fixed radial axes:

- P: Presence
- C: Coherence
- R: Resonance
- E: Entanglement
- M: Memory
- A: Agency
- Q: Qualia

Each axis has a fixed angular position. The PREMAQC value controls radius. Relationship records contribute topology IDs. Confidence remains its own structural channel. Temporal phase, when available, is rendered as a separate orientation marker.

The display layer therefore has stable jobs:

- geometry carries structured state;
- topology carries relationship structure;
- confidence carries provenance strength;
- phase carries temporal orientation;
- ornament remains presentation.

## Signature contract

`glyph.signature/v1` contains:

- world identity;
- P/C/R/E/M/A/Q values;
- canonical topology records;
- confidence;
- phase;
- structural vector;
- deterministic render geometry;
- source receipt lineage;
- SHA-256 fingerprint.

The signature fingerprint is generated from canonical content. Timestamps belong to the heartbeat receipt rather than changing the geometry rules.

## Heartbeats

`glyph.heartbeat/v1` binds a glyph signature to a receipted PREMAQC source and observation time.

Arcsweep stores heartbeat entries in:

```text
glyphContinuity
├── heartbeats[]
└── blindPairs[]
```

This ledger is part of primary Arcsweep persistence, export, import, backup, and restore.

The Field room mounts the **Glyph Drift Observatory**. The operator can receipt the current PREMAQC state as a glyph heartbeat and inspect the latest glyph, classification, metrics, source receipt, and recent continuity wake.

## Drift measurement

v0.1 uses an interpretable robust local model.

For each new heartbeat it calculates:

- semantic RMS distance across PREMAQC axes;
- structural distance across glyph geometry, phase, confidence, and topology;
- topology distance;
- sequential baseline distances;
- baseline median;
- median absolute deviation;
- robust continuity envelope;
- distance from the recent trend anchor;
- directional trend slope.

All thresholds are named values in the drift receipt.

The classifier emits exactly one state:

- `STABLE`
- `LOCAL_VARIATION`
- `TREND_SHIFT`
- `STRUCTURAL_DRIFT`
- `DISCONTINUITY`
- `INSUFFICIENT_HISTORY`

`STRUCTURAL_DRIFT` and `DISCONTINUITY` require review. `TREND_SHIFT` recommends review. The receipt identifies the metric values and envelope that produced the classification.

The first five historical signatures establish the initial envelope. Longer histories continue to refine the local baseline through sequential distance statistics.

## Narrative continuity use

The detector is designed to sit beside long-context narrative systems.

A narrative system can emit structured heartbeats at regular intervals. The prose may vary freely while the structured state remains continuous. The Glyph Drift Observatory tracks the state trajectory independently of prose style.

Two distances remain separate:

- **semantic state distance** measures movement in the canonical PREMAQC state;
- **glyph structural distance** measures movement in the deterministic visual packet, including topology and temporal channels.

That separation lets a review layer distinguish stylistic variation from movement in the underlying continuity state.

A later model can consume the receipted glyph sequence as a training dataset. The first learned pass should remain a non-language pattern model so the continuity monitor does not inherit the same language-generation dynamics it is auditing.

Candidate later detectors include change-point models, one-class classifiers, isolation models, compact autoencoders, and Siamese similarity models. v0.1 establishes the deterministic dataset and interpretable baseline before learned embeddings are introduced.

## Blinded paired narrative protocol

The Field room also implements a two-side sealed comparison.

Sequence:

```text
Earth narrative written
  -> Earth text hashed and sealed
  -> Earth prose leaves the visible return-stage context
  -> return stage receives Earth seal ID and content hash
  -> return narrative written independently
  -> return text hashed and sealed
  -> reveal gate opens
  -> both seals verified
  -> paired comparison receipted
```

The first-side text remains stored locally so it can be revealed later. Until the return narrative is sealed, the return-stage interface contains the Earth seal and hash rather than the Earth prose.

`glyph.narrative-seal/v1` stores:

- side;
- source;
- seal time;
- content hash;
- character count;
- seal fingerprint.

`glyph.blind-comparison/v1` requires valid Earth and return seals. It verifies both texts against their hashes before comparison. The v0.1 comparison receipt records lexical Jaccard overlap, length ratio, token counts, both content hashes, and both seal IDs. The receipt itself contains no narrative plaintext.

This creates a clean insertion point for stronger semantic comparison later without weakening the blind gate.

## Domain extension

The heartbeat and drift architecture can support other time-series domains by replacing the encoder and continuity model while keeping the receipt pattern.

Examples include:

- weather;
- solar activity;
- ecological systems;
- infrastructure telemetry;
- social and political time series.

Each domain keeps its own features, training corpus, thresholds, validation metrics, and drift semantics. The shared machinery is the sequence contract:

```text
canonical state
  -> deterministic signature
  -> distance / embedding
  -> temporal drift model
  -> receipted classification
```

## Executable surface

Core:

- `apps/arcsweep/src/glyph-continuity.js`

Field UI:

- `apps/arcsweep/src/glyph-drift-observatory-sidecar.js`

Persistence:

- `apps/arcsweep/src/storage.js`

Mount:

- `apps/arcsweep/src/instrument-sidecars.js`

Contracts:

- `apps/arcsweep/arcsweep.module.json`

Tests:

- `apps/arcsweep/test/glyph-continuity.test.js`

## Next training pass

1. Accumulate receipted heartbeat sequences from controlled narrative sessions.
2. Label reviewed examples of stable continuity, local variation, trend shift, structural drift, and discontinuity.
3. Add deterministic text-to-state extraction receipts so prose can be compared without changing the canonical glyph contract.
4. Train a small secondary pattern model on glyph structural vectors and temporal windows.
5. Compare learned-model flags with the robust v0.1 classifier rather than replacing the interpretable baseline.
6. Add a review queue that can request rewrite, re-run, or human inspection while retaining the original response and drift receipt.
7. Add DEEPTime indexing for heartbeat sequences and Replay reconstruction of historical glyph wakes.

## Seal

The heartbeat becomes a glyph.

The glyph becomes a wake.

The wake can bend without losing its name.

When it bends far enough to matter, the instrument tells us where, how, and by how much.
