# Hollow Vale Whole-Site Reference Ingest

## Status

Prepared as an ArcSweep external worldbuilding reference ingest on 2026-09-17.

This ingest treats Alexander Paul Burton's public Hollow Vale / Tharion Cycle material as an external reference corpus. It is deliberately not a source mirror and it does not promote external material into Rowan's canon.

## Scope

The crawler starts from the Hollow Vale wiki and the site's public sitemap, then identifies Hollow Vale-related pages anywhere on the same domain using direct path membership plus world-specific relevance signals.

This catches the wiki itself and related publication, audiobook, companion, or project pages without importing unrelated author-site material.

## Storage law

The live crawler may read public pages transiently in order to calculate hashes, metadata, link relationships, relevance, and semantic flags.

It does not persist:

- page prose;
- raw HTML;
- images;
- source excerpts.

It does persist:

- canonical URL;
- page title and public metadata;
- content hash and normalized-text hash;
- byte and word counts;
- source class;
- semantic signal labels;
- internal link graph;
- crawl receipt and failures.

A separately reviewed reference pack contains compact paraphrases of high-value lore records.

## Why the variant layer matters

The public Caelwyn origin page intentionally supplies several incompatible traditions. ArcSweep therefore stores each as a named myth variant and forbids automatic winner selection.

The initial pack preserves:

- Wyrm Tree / Elysian Convergence birth;
- Starborn Nomad / Breaking of the Stars;
- Bell-Touched Wanderer;
- Child of the Vale / Elderglen tradition.

This same rule applies to later Hollow Vale contradictions: preserve the strata, label source authority, and resolve only by explicit review.

## Initial semantic map

The first reference pack establishes nodes for:

- Tharion / The Hollow Vale;
- Caelwyn / Bellbearer;
- Daughters of Avalon;
- Elderglen;
- Tor Velden;
- Rune-Stone / Cavren byraeth;
- Starforged Bell / Bellum naedh;
- Tharionese / Lyth Ébrenn;
- Wyrmreth;
- Lleirwyn;
- swefnunga wyrcan;
- Elysian Convergence;
- Breaking of the Stars;
- Thonbrial aethrun;
- memory-as-causal and names-as-identity mechanics.

All of these remain external reference records.

## Files

- apps/arcsweep/presets/hollow-vale-whole-site-ingest.v0.1.json
- apps/arcsweep/skills/sources/hollow-vale/site-ingest.json
- apps/arcsweep/skills/sources/hollow-vale/reference-pack.v0.1.json
- apps/arcsweep/scripts/hollow-vale-ingest.mjs
- apps/arcsweep/test/hollow-vale-ingest.test.js
- .github/workflows/hollow-vale-live-harvest.yml

## Run

Use the Hollow Vale Reference Harvest workflow or run:

node apps/arcsweep/scripts/hollow-vale-ingest.mjs --out ingests/hollow-vale-live --max-pages 2500

## Seal

Index the constellation, not the sentences.

Keep legends plural where the source keeps them plural.

Carry provenance all the way to the door.
