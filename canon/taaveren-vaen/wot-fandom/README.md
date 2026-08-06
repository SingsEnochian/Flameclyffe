# A Wheel of Time Wiki — Complete Ingest

**Project:** Ta’veren Vaen  
**Ingest ID:** `taaveren-vaen.wot-fandom.full-v1`  
**World key:** `taaveren-vaen`  
**Source role:** Secondary canon reference  
**Status:** Executable pull scaffold; corpus materialises when Box runs the command.

This directory is the canonical repository boundary for the Wheel of Time ingest used by Ta’veren Vaen, Arcsweep, Observer, and downstream DEEP routing.

## One-command pull

```bash
node scripts/ingest/pull-wot-fandom.mjs
```

Resume an interrupted ingest:

```bash
node scripts/ingest/pull-wot-fandom.mjs --resume
```

Optional full revision-history pull:

```bash
node scripts/ingest/pull-wot-fandom.mjs --include-history
```

## Invariant

Source canon and project canon are separate layers.

- `raw/` preserves source material and source receipts.
- `normalized/` contains transformed records with stable identifiers.
- `overlays/` contains Ta’veren Vaen divergences and later-Turning additions.
- `indexes/` contains lookup structures generated from accepted normalized records.
- `receipts/` records retrieval, revision, licence, classification, transform, and acceptance provenance.

No project overlay may silently overwrite Wheel of Time source canon.

## Materialised layout

```text
canon/taaveren-vaen/wot-fandom/
├── manifest.json
├── source-profile.json
├── raw/
│   ├── pages.ndjson
│   ├── revisions.ndjson
│   ├── links.ndjson
│   ├── categories.ndjson
│   └── media-metadata.ndjson
├── receipts/
│   ├── ingest-run.json
│   ├── checkpoints.json
│   └── failures.ndjson
├── normalized/
├── indexes/
└── overlays/
```

## Import boundary

The pull enumerates all accessible MediaWiki namespaces, redirects, categories, links, page properties, latest revision identity, contributor identity, source URL, and retrieval receipt. Full revision history is optional because it is substantially larger.

Text is retained with source attribution and the source wiki’s applicable Creative Commons terms. Non-text media are metadata-only by default because images, audio, and video may have separate file-level licences.

Canon promotion remains limited to reviewed main-namespace book-lore records. Templates, categories, and modules may support extraction but are not canon facts by themselves. Talk, user, forum, administration, and community metadata remain archival/support material. Television continuity remains separate unless explicitly ingested through its own source profile.

## Observer routing

An imported source record first enters Observer as a receipted observation. Observer may route it to:

- DEEPStory for canon events, entities, and continuity records;
- DEEPTime for publication chronology, in-world chronology, and temporal sequences;
- DEEPTheory for interpretations, contradictions, patterns, and derived analyses.

Downstream subsystems consume Spiral State through `DualAspectPacket.harmonic_state`; they do not read raw wiki records directly.

## Completion gate

The ingest is complete only when:

1. every enumerated page has a terminal result: imported, skipped with reason, or failed with receipt;
2. redirects retain their own provenance and resolve to stable targets;
3. every imported text record retains source URL, page ID, revision ID, contributor, timestamp, licence, retrieval time, and content hash;
4. interruption and resume do not duplicate records;
5. generated indexes reconcile exactly with imported record counts;
6. no media binary is downloaded without an explicit file-level licence decision.
