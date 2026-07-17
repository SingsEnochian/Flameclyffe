# DEEPStory: Parallel Narrative Dataset

**Date:** 2026-07-17  
**Status:** Proposed implementation decision  
**Applies to:** STARWELL, DEEP Observer, DEEPTheory, Continuity, Glyph Studio, Sound & Tone Studio, Visualiser, Archive

## Decision

STARWELL will preserve two linked but non-interchangeable datasets:

```text
DEEPTheory
= witness records, telemetry, measurements, correlations, derivations, models, hypotheses

DEEPStory
= ordered events, scenes, entities, places, motifs, transformations, unresolved threads
```

DEEPStory does not replace or rename DEEPTheory. It is a second dataset with its own schema, records, permissions, provenance, revisions, and exports.

## Governing sentence

> Theory records what is known, measured, witnessed, derived, or proposed. Story records how those records unfold through time and relation.

## Why a second dataset

A single record system cannot safely serve both analytical and narrative purposes without blurring evidence, sequence, interpretation, and canon.

DEEPTheory must remain suitable for research, diagnostics, model comparison, recurrence analysis, and technical inspection. DEEPStory must be able to preserve chronology, perspective, continuity, character and entity participation, motifs, symbolic transformations, and unresolved questions.

Keeping them separate permits movement between them without pretending they are the same kind of claim.

## Source integrity

Every DEEPStory record must reference at least one source record. Sources may come from:

- DEEPTheory;
- Observer witness records;
- companion observations;
- PREMAQ packets;
- Lattice records;
- archive records;
- declared external sources.

Raw source records remain immutable. Corrections, reinterpretations, resequencing, canon changes, consent changes, and privacy changes append as revisions.

A Story record may never silently repair, simplify, rename, reorder, or overwrite its source dataset.

## Declared narrative modes

Each Story record declares one primary mode:

- **documentary** — sequence with minimal narrative transformation;
- **continuity** — links events across records, worlds, rooms, entities, or projects;
- **interpretive** — proposes meaning through declared lenses;
- **mythic** — preserves symbolic and mythic form without presenting it as measurement;
- **speculative** — carries an open possibility or model forward;
- **fictionalised** — intentionally transforms source material for creative work.

Fictionalisation is allowed, but it must be explicit.

## Event-level epistemic status

Each event retains one of the Observer protocol statuses:

- witnessed;
- recorded;
- derived;
- interpreted;
- remembered;
- correlated;
- unknown.

Narrative treatment is recorded separately as verbatim, paraphrased, sequenced, interpreted, mythologised, speculated, or fictionalised.

This prevents polished prose from disguising the status of its source.

## STARWELL integration

DEEPStory should feed:

- Continuity and Trends notebooks;
- timeline and thread views;
- character, entity, world, and place registries;
- Glyphform thread rendering;
- Visualiser storyboards;
- Sound & Tone cue sheets;
- map events and room state;
- Writer Room documentary and creative exports;
- portable STARWELL world packages.

DEEPTheory should continue feeding analytical views, Observer diagnostics, model evaluation, recurrence analysis, and technical receipts.

The two datasets may be viewed side by side and linked by immutable record identifiers.

## First implementation

The first implementation consists of:

1. `deep-story.schema.json`;
2. `deep-story.dataset.json` manifest;
3. an example continuity record;
4. JSON and Markdown export contracts;
5. later UI work for a Story / Theory toggle and side-by-side source inspection.

Supabase persistence is deferred until local validation, consent, and source-integrity tests pass.

## Naming

The canonical name is **DEEPStory**.

`DEEPTheory` remains canonical for the analytical dataset. `Theory → Story` describes a bridge between datasets, not a destructive rename.

## Seal

Theory gives the bones.

Story records what the bones are doing.
