# ArcSweep Magic Book v0.1 — Working Proof

**Date:** 2026-09-18  
**Status:** implementation candidate  
**Surface:** ArcSweep main app sidecar  
**Primary proof:** open Book → turn to Glyph Forge → choose/change brush → draw with pointer/Pencil → persist → leave/return → inspect receipts

## What v0.1 proves

Magic Book v0.1 is not a themed mock-up. It is a working ArcSweep interface surface with a real continuity binding and one fully live instrument page.

The Book provides:

- an animated Three.js cover and page-turn layer;
- an accessible DOM two-page spread beneath the visual embodiment;
- reduced-motion and WebGL failure fallback that leaves the Book fully functional;
- a persistent binding state;
- page-turn, open/close, room-crossing, brush, and stroke receipts;
- live room doors derived from the current ArcSweep room registry;
- a Glyph Forge page using STARWELL's existing Glyph Studio data contracts.

## Shared Glyph Forge state

The Magic Book does not create a parallel drawing format.

It reads and writes the same keys used by STARWELL Glyph Studio:

- \`starwell.glyphStudio.project.v0.1\`
- \`starwell.glyphStudio.brushLibrary.v0.1\`
- \`starwell.glyphStudio.colour.v0.1\`

It also exposes:

\`starwell.glyph-studio-bridge/v1\`

with surface:

\`arcsweep-magic-book-glyph-page\`

So ArcSweep's existing Glyph Forge OS service can read project state, read/select brushes, and apply Steward-approved brush setting patches against the Book page.

## Input proof

The embedded page records compatible STARWELL strokes with:

- pointer type;
- pressure;
- tilt X/Y;
- twist;
- timestamps;
- coalesced pointer/Pencil events;
- brush runtime snapshot;
- layer, glyph, and brush IDs.

It emits the existing:

- \`arcsweep:glyph-brush-sample\`
- \`starwell:glyph-stroke-committed\`
- \`starwell.glyph-stroke-receipt/v1\`

contracts.

## Book binding

Persistent binding:

\`arcsweep.magic-book-binding/v0.1\`

Pages in this proof:

1. Threshold
2. Glyph Forge
3. Receipts

The Threshold page reads the live ArcSweep room navigation and crosses through the existing OS route. It does not invent a second router.

## Visual embodiment boundary

Three.js owns only the physical book illusion:

- hinged opening cover;
- paper spread;
- spine;
- curled turning leaf;
- page-turn direction.

The DOM pages own the actual controls, text, canvas input, focus, keyboard interaction, accessibility, and state changes.

If WebGL is unavailable, or reduced motion is requested, the Book falls back to the DOM/CSS surface without losing function.

## Receipt law

The Book receipts:

- open;
- close;
- page turn;
- room crossing;
- brush selection;
- brush setting changes;
- glyph stroke;
- undo;
- clear.

Receipts are bounded locally and also published onto the ArcSweep event bus when available.

## Entrance

Normal ArcSweep boot mounts a **Magic Book** launcher in the primary room navigation.

Direct opening is available with:

\`?book=1\`

## Acceptance target

v0.1 is accepted only if ArcSweep tests and production build pass with:

- Magic Book mounted in the lazy sidecar graph;
- Three.js bundled successfully;
- shared Glyph Studio persistence unchanged;
- no replacement of ArcSweep room authority;
- no loss of accessible fallback;
- no fake claim that a visual page turn changed state without a corresponding binding receipt.

## Next after v0.1

Do not add a dozen decorative pages.

The next page should be chosen because it can become fully live through the same binding. Strong candidates are Time Room palimpsest or Canon Studio comparative folio.

## Seal

**The page is beautiful because the machinery beneath it is true.**
