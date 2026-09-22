# Universal Codex Direct Atelier v0.3

**Date:** 2026-09-22  
**Status:** release candidate  
**Surface:** ArcSweep sidebar → Generator Atelier

## Result

The generator is no longer concealed beneath an unnamed internal Book surface.

- The primary sidebar now names the interface **Universal Codex**.
- A sibling **Generator Atelier** launcher opens the Codex directly on Glyph Forge.
- The Codex toolbar carries a **Generator Atelier** shortcut from every page.
- `?codex=generator` is the stable public deep link.
- Direct entry turns to Glyph Forge, opens the Codex, scrolls the generator section into view, and moves keyboard focus to that section.
- The existing `?book=1` link remains compatible.

No generation authority changed. The new doorway calls the same local ComfyUI/TJ Studio bridge and preserves the same receipts, model lineage, source-image boundary, and Steward canon decision.

## Acceptance

1. Open `/arcsweep/?codex=generator`.
2. Confirm the Universal Codex opens without another navigation step.
3. Confirm **Render a Page Vision**, the ComfyUI endpoint, transformation strength, and all three forge actions are visible after automatic scroll.
4. Confirm the sidebar independently exposes both **Universal Codex** and **Generator Atelier**.

## Verification

- focused Codex/Generator tests: **19 passed**;
- complete ArcSweep suite: **1,306 passed, 0 failed**;
- STARWELL suite: **218 passed, 0 failed**;
- current engine contracts and canonical spine: **passed**;
- ArcSweep organ routes: **valid**;
- production build: **passed**.

## Seal

**A working door must look like a door. The forge no longer hides beneath the floorboards.**
