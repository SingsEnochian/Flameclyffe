# Foundry brushes in Wayglass watercolour

## System design and ownership

The ship inherits STARWELL Glyph Studio's brush definitions and live editing rather than copying its catalogue into another database. Glyph Studio remains the owner/editor of brush libraries and its existing live stroke preview. Wayglass owns a read-only projection for its fluid body and an immediate fluid preview. This connects the existing creative organ to the ship entryway.

Flow: Glyph Studio edits → existing debounced local browser library save → same-origin storage event (or window focus) → Wayglass catalogue validation → selected brush projection → preview and subsequent pigment strokes. Controls for width, saturation and pigment update the preview immediately. A brush edit affects subsequent strokes; it does not retroactively repaint existing work. Each source brush keeps its id, name, source reference and modification time in the projection.

The public adapter interfaces are `loadFoundryBrushes`, `projectFoundryBrush` and `foundryPigmentSample`. Size, opacity and pressure response have explicit mappings into fluid radius and pigment amount. Shape, grain, tilt, taper and wet-mix fidelity are not claimed by this projection. Existing Foundry originals retain those attributes.

Persistence stays in `starwell.glyphStudio.brushLibrary.v0.1`; the adapter never writes or migrates that library. Malformed, unavailable, empty or duplicate-id input produces an explicit warning and the existing Foundation brushes. Source data remains untouched. Listeners are disposed with the mounted surface. No participant identity, remote authorisation or canon is changed.

## Acceptance criteria

- Existing Foundation brushes work without storage or transport.
- Saved library changes reach the mounted watercolour shelf on storage/focus events.
- Size/opacity edits and Pencil pressure change actual injected pigment.
- Brush selection and pigment controls update the fluid preview immediately.
- Corrupt input remains preserved and the warning is visible.
- Teardown removes subscriptions; Feather and model-turn return tests continue passing.
- No native brush-file decoder, deployment, cross-origin sync or full asset ingestion is falsely claimed.

## Verification

48 focused tests passed on 10 November 2026, covering the Foundry adapter, mounted First Contact UI, Glyph Studio model, watercolour fluid, model integrity and continuity. `node --check` and `git diff --check` passed.

A broader suite was attempted; host/package tests reported missing local build/dependency prerequisites and the run did not finish. It is not a full-suite pass. A real Chromium run was attempted and failed at browser startup: process singleton `socket() failed: Operation not permitted`. Browser visual verification and release builds remain pending; Vite dependencies are absent from this checkout. Source verification does not establish a running production update.

## Remaining inheritance

The checked-in source has two Foundation definitions (Stonewood Ink and Moon Graphite). Saved user brush libraries on the same host are included dynamically. No additional fontmaker brush binaries were found in this checkout, and the exact external collection remains unidentified. `.brush`, `.brushset`, `.brushlibrary` and `.abr` are still held by the existing importer pending real decoders. This work must not be reported as importing every brush or consolidating every Wayglass source.

Same-origin local storage is a browser boundary: a separate origin, browser profile or device requires explicit library export/import or a future owner-authenticated asset service. The current unresolved imports in `current.json` remain unresolved.
