# Hearthgate: Arcsweep Canon Gate

Status: implementation contract for Arcsweep v0.3.0.

## Purpose

Canon Gate is Arcsweep's local-first intake and release boundary. It accepts source documents, prepares them for canon-aware ingestion, preserves provenance, and exports structured or portable canon packs. It does not silently decide what is true.

The room has four primary actions:

1. **Upload Documents** selects one or more files.
2. **Upload Folder** recursively selects files from a user-approved directory while preserving relative paths.
3. **Review Ingest Primer** defines source authority, canon kinds, extraction rules, conflict handling, and approval requirements before any structured record is written.
4. **Download** exports the full Arcsweep archive, a selected world, a structured canon JSON file, or a portable canon folder containing sources, primer, manifest, and receipts.

## Ingest sequence

1. User chooses or creates the destination canon.
2. User selects files or a folder.
3. Arcsweep copies sources into its private local store.
4. Arcsweep records original name, optional original relative path, size, media type, SHA-256 fingerprint, timestamp, authority, and status.
5. Duplicate hashes are reported and not copied twice.
6. The universal primer is loaded, followed by any named world overlay.
7. A parser or local model may propose entities, rules, timelines, relationships, and conflicts.
8. Proposed records remain staged until Rowan explicitly approves them.
9. Conflicting claims are quarantined. No automatic winner is selected.
10. Every approval, rejection, merge, promotion, retirement, import, and export receives a receipt.

## Universal primer

The universal primer applies to every canon and recognises world, character, relationship, location, timeline, scene/event, culture, power system, science/technology, language/glyph, cosmology/religion, ritual/practice, law/economy, ecology, artefact, wardrobe/appearance, audio/reception, visual, production, alternate-universe, and meta-continuity material.

World-specific overlays may add vocabulary, expected entities, canonical spellings, timelines, source precedence, pronunciation rules, or integrations. Terra Aeterna may link to Lioreal's `terra-aeterna-reception` profile without mixing sensory calibration data into narrative canon.

## Source authority

Authority and status are separate.

Authority values describe where a source stands: primary canon, working canon, author note, adaptation, reference, inspiration, deprecated, or unknown.

Status values describe the current claim: canonical, working, candidate, contradicted, retired, reference-only, or unclassified.

A primary-canon source may still contain an explicitly retired passage. A reference source may contain a useful candidate idea. Arcsweep preserves both dimensions.

## DR script field pack

The ultra-detailed DR script document is represented as an optional field pack. It maps its broad coverage into Arcsweep rooms such as About Me, Appearance, World Competencies, Relationships, Places, Belongings, Timeline, Scenarios, Safety Weave, and Waking Thread.

The pack does not reproduce one enormous document. Sections can be enabled per world, sensitive sections are hidden by default, repeatable entities become records, and rated traits use reusable scales.

Language translation is canonical:

- Lifa app becomes Hearthgate: Arcsweep.
- Safe word becomes return anchor.
- Clone behaviour becomes Waking Thread.
- OR and DR become user-selected world labels.

## Downloader and portability

Downloads must never be limited to a screenshot or rendered view. Arcsweep supports:

- full application state JSON;
- selected-world JSON;
- structured `.arcsweep-canon.json`;
- portable canon folder with `canon.json`, `primer.json`, `sources/`, and `receipts.jsonl`;
- human-readable Markdown summaries;
- selective inclusion of no sources, chosen sources, or all sources.

Exports are explicit, reversible, and redaction-aware. The private local store remains the source of truth until the user chooses another destination.

## Consent and safety laws

- No automatic external reads.
- No automatic canon overwrite.
- No automatic conflict winner.
- Raw sources remain inspectable and immutable.
- Parser or model output is proposal, not canon.
- Folder access begins only after explicit folder selection.
- Export begins only after explicit destination selection.
- Feather, Wrap, Notch, Seldrin clear, and the return controls remain available throughout the wider Arcsweep experience.

## Current implementation seam

The July 25 Arcsweep renderer available in Drive is a compiled production bundle. The feature branch reconstructs the desktop source boundary, contracts, tests, and renderer-facing controller without editing the minified bundle. The visible Canon Gate room must be mounted when the maintained renderer source is restored or rebuilt from this contract.
