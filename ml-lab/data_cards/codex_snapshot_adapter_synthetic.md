# Data Card: Codex Snapshot Adapter Synthetic Fixtures

## Registry

- Version: 0.1.0
- Owner: Flameclyffe ML Laboratory
- Created: 2026-06-14
- Source systems: synthetic test fixtures only
- Snapshot hash: computed by `SnapshotBatch.snapshot_hash`
- Status: synthetic

## Purpose

This fixture set validates the offline snapshot adapter that converts reviewed records into
`CanonDocument` objects for the Codex search baseline.

## Composition

- Record count: small unit-test records
- Unit of observation: `SnapshotRecord`
- Modalities: text only
- Expected outcome: privacy-filtered document output

## Provenance

All records are hand-written synthetic examples inside `ml-lab/tests`. They are not copied from
workspace exports, drafts, private notes, or conversation archives.

## Intended use

Use this data for adapter tests, gate tests, deterministic snapshot hashing, and CI.

## Out-of-scope use

Do not use this fixture set to evaluate real Terra Aeterna coverage, export quality, or semantic
retrieval accuracy.

## Limitations

The data is tiny, synthetic, English-only, and deliberately simple. It proves the adapter boundary,
not search intelligence.

## Revision history

- 2026-06-14: Initial synthetic snapshot adapter data card.
