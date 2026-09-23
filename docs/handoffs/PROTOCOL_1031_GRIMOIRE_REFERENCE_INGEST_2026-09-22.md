# Protocol-1031 + Grimoire Reference Ingest

**Date:** 2026-09-22  
**Status:** reference ingest foundation complete  
**Target:** ArcSweep / Universal Codex

## Intent

Ingest two public sites as external design references without cloning their branding, copy, artwork, or unverified claims:

- https://protocol-1031.com/?lang=en
- https://getgrimoire.app/

This is not a canon import. It is a pattern harvest for interaction design, provenance, capture, instrumentation, animation grammar, and working-page architecture.

## Storage law

The live harvester may read public pages transiently in order to calculate metadata, hashes, link relationships, relevance, and semantic flags.

It does not persist:

- page prose;
- raw HTML;
- images;
- screenshots;
- source excerpts.

It may persist:

- canonical URL;
- title and public metadata;
- content and normalized-text hashes;
- byte and word counts;
- source class;
- semantic signal labels;
- internal link graph;
- crawl receipt and failures;
- separately reviewed compact paraphrases of reusable design patterns.

## Protocol-1031: retained patterns

Protocol-1031 is useful primarily as an interaction and experimental-protocol reference.

Retained concepts:

- staged awakening / activation rather than all-at-once UI;
- participant dossier and persistent session identity;
- voluntary node or station topology;
- instrumentation presented as ritualised field practice;
- paired observer experiments using commit-before-reveal structure;
- scheduled synchronous events;
- low-amplitude ambient signal motion with stronger effects reserved for meaningful transitions;
- latent information that becomes visible under the right interaction/state conditions;
- strict separation between raw signal, observation, and interpretation.

Not imported:

- Protocol-1031 branding or wording;
- its visual assets;
- any claim of paranormal causation;
- any historical/network claim that has not been independently verified;
- full-screen HUD treatment that competes with the physical book.

## Grimoire: retained patterns

Grimoire is useful primarily as a practice-oriented information architecture reference.

Retained concepts:

- direct-manipulation working surfaces: drag, resize, rotate, layer, save;
- artefact + method + context + provenance as one persistent record;
- capture-now-organise-later, including low-glare voice/text capture;
- typed journal records sharing one relationship graph;
- cross-reference libraries that link reference material into active practice;
- local-first private records;
- context stamping such as time and astronomical state without forcing interpretation;
- continuity without streak pressure or engagement coercion.

The public feature pages observed on 2026-09-22 specifically describe the Virtual Altar, Sigil Forge, Dream Weaver, Codex, My Craft journal, and local-device privacy behaviour.

Not imported:

- Grimoire branding or wording;
- proprietary illustrations or visual assets;
- its exact taxonomy where ArcSweep already has a richer type system;
- subscription/engagement mechanics.

## ArcSweep implementation added in this pass

### Generic external-site harvester

`apps/arcsweep/scripts/external-site-reference-ingest.mjs`

The harvester is source-agnostic. Config controls relevance, classification, semantic signal terms, crawl bounds, robots handling, and output location. Raw source prose is used transiently for hashing/classification and is not written to the ingest output.

### Source configs

- `apps/arcsweep/skills/sources/protocol-1031/site-ingest.json`
- `apps/arcsweep/skills/sources/grimoire/site-ingest.json`

### Reviewed reference packs

- `apps/arcsweep/skills/sources/protocol-1031/reference-pack.v0.1.json`
- `apps/arcsweep/skills/sources/grimoire/reference-pack.v0.1.json`

These are compact paraphrased pattern records, not mirrors.

### Runtime primitives

`apps/arcsweep/src/universal-codex-reference-patterns.js`

This first implementation turns the harvested ideas into executable ArcSweep primitives:

- five-tier motion hierarchy: idle → attention → interaction → event → revelation;
- latent reveal strength;
- observation receipts that separate raw signal, observation, and interpretation;
- Universal Capture records defaulting to the Local Realm;
- transformable composable working pages with artefact provenance;
- paired observer commit/reveal records that remain sealed until reveal and never manufacture a causal conclusion.

## Intended next integration

Wire these primitives into the physical Codex renderer rather than adding another dashboard:

1. bind ambient animation to the five-tier motion hierarchy;
2. confine ordinary effects to individual pages and the gutter;
3. use latent reveal masks for hidden marks and agent/state cues;
4. add Universal Capture as a one-gesture page action;
5. let Glyph Forge output become draggable Working Page artefacts;
6. connect Observation receipts into Observer/DEEP and the Records Room;
7. add a paired-observer experiment page using commit/reveal receipts;
8. keep raw measurements reachable underneath mythic presentation.

## Run examples

```bash
node apps/arcsweep/scripts/external-site-reference-ingest.mjs \
  --config apps/arcsweep/skills/sources/protocol-1031/site-ingest.json \
  --out ingests/protocol-1031

node apps/arcsweep/scripts/external-site-reference-ingest.mjs \
  --config apps/arcsweep/skills/sources/grimoire/site-ingest.json \
  --out ingests/grimoire
```

For a network-free config check:

```bash
node apps/arcsweep/scripts/external-site-reference-ingest.mjs \
  --config apps/arcsweep/skills/sources/grimoire/site-ingest.json \
  --dry-run
```

## Seal

Borrow the grammar, not the costume.

Measure first. Interpret second.

Let the book remain the book.
