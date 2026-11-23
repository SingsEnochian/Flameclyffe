# Wayglass Type Foundry v0.1

Status: implementation candidate in Whole Pizza OS PR #676. No merge, production deployment, or installed font is claimed.

## Existing organs reused

- STARWELL Glyph Studio remains the vector authoring surface.
- The local FontForge worker remains the font compiler and produces explicit job/compile receipts.
- WTL/Skýrunor remains the semantic authority. A font glyph is a visual form, not an execution capability.
- Birdfont is an optional external vector-font authoring tool; it is not a runtime dependency or a new subsystem.

## Canonical somatic glyph source

The imported registry is derived from the user-provided Wyrdrune-Somatic-Runes.html artifact. It retains all 14 entries' IDs, labels, kinds, source-image filenames, viewBoxes and original SVG path strings. No outline is redrawn or normalised at import time.

Each imported Glyph Studio record carries a stable semantic ID and kind, exact source artifact and image reference, original path data and viewBox, a locked canonical-outline layer, provenance metadata, and a provisional Private Use Area codepoint for preview/compile experiments only.

PUA assignments are not a Unicode standard allocation and must not be represented as final or interoperable. Original rune token IDs remain stable semantic identifiers. English alphabet and Wyrdrune glyphs can coexist in one font project, while a companion glyph font can be exported independently.

## Outline and compiler contract

The importer preserves SVG path data using only the source's M/h/v/z path commands. The FontForge worker validates path alphabet, size and viewBox before embedding it into a generated outline SVG. It imports the outline through the existing local worker. Private, hidden, reference and art-only layers remain excluded by existing eligibility rules.

## Reversible workflow

1. Import canonical somatic set into a copy of the current Glyph Studio project.
2. Inspect original vector outlines and source labels.
3. Adjust only a duplicate or separately named revision; never overwrite canonical source.
4. Review provisional codepoint map and metrics.
5. Compile locally and inspect FontForge receipt, font output, glyph coverage and round-trip text rendering.
6. Keep unified Latin+Wyrdrune and companion Wyrdrune-only projects as distinct export profiles sharing the same canonical registry.

Rollback: restore prior local Glyph Studio project snapshot or use Undo. Repository rollback is a revert of the single One Ship commit. Canonical registry and source artifact remain immutable.

## Acceptance criteria

- Exactly 14 source glyphs import with unchanged semantic IDs, kinds, source-image references, viewBoxes and path strings.
- Re-import is idempotent and does not duplicate semantic IDs.
- Existing project glyphs and codepoints are preserved.
- PUA mappings are marked provisional.
- Glyph Studio displays imported outlines and keeps canonical layer locked.
- SVG export and FontForge outline generation preserve path geometry.
- Invalid path data and invalid viewBoxes fail closed.
- Existing stroke-based glyph compilation remains unchanged.
- FontForge output is only claimed after an actual local worker compile receipt.

## Current boundary

This change establishes the canonical source registry, importer and SVG/FontForge path transport. It does not yet design Latin display/interface faces, allocate final Unicode values, produce production font binaries, install Birdfont, or establish device acceptance.
