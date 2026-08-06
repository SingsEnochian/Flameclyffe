# Wheel of Time Canon Ingest — Ta’veren Vaen

**Ingest ID:** `taaveren-vaen.wot-fandom.full-v1`  
**World key:** `taaveren-vaen`  
**Source role:** Secondary canon reference  
**Status:** Scaffolded; source archive not yet populated

This directory is the canonical repository boundary for the Wheel of Time ingest used by Ta’veren Vaen, Arcsweep, Observer, and downstream DEEP routing.

## Invariant

Source canon and project canon are separate layers.

- `raw/` preserves source material and source receipts.
- `normalized/` contains transformed records with stable identifiers.
- `overlays/` contains Ta’veren Vaen divergences and later-Turning additions.
- `indexes/` contains lookup structures generated from accepted normalized records.
- `receipts/` records retrieval, revision, licence, classification, transform, and acceptance provenance.

No project overlay may silently overwrite Wheel of Time source canon.

## Import boundary

The intended full MediaWiki archive preserves:

- main and support namespaces
- redirects
- categories
- links
- images and file metadata
- page properties
- latest revision identity
- contributor identity where exposed by the source
- retrieval date
- licence and attribution

Canon promotion is limited to reviewed main-namespace book-lore records. Templates, categories, and modules may support extraction but are not canon facts by themselves. Talk, user, forum, administration, and community metadata are excluded from canon. Television continuity remains separate unless explicitly ingested through its own source profile.

## Target record families

Characters, locations, nations, cultures, organisations, books, chapters, events, artefacts, creatures, abilities, channelling concepts, Old Tongue terms, prophecies, timelines, calendars, relationships, aliases, and source notes.

## Observer routing

An imported source record first enters Observer as a receipted observation. Observer may route it to:

- DEEPStory for canon events, entities, and continuity records
- DEEPTime for publication chronology, in-world chronology, and temporal sequences
- DEEPTheory for interpretations, contradictions, patterns, and derived analyses

No subsystem reads this ingest directly once a record has entered the DEEP pipeline. Downstream systems consume Spiral State through `DualAspectPacket.harmonic_state`.

## Current state

The ingest contract now exists in GitHub. The corpus itself still needs retrieval, normalisation, receipt generation, validation, and review before any record may be marked accepted canon.
