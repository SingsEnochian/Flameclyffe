# Rarity - Atelier v0.1 · Native Procreate pilot

**Date:** 2026-10-07
**Branch:** `rarity-atelier-v0-1`
**Status:** first verified native metadata pass; deeper visual identification and PSD-only import prep remain active.

## What landed

- `apps/arcsweep/skills/sources/rarity-atelier/SKILL.md`
- specialist references for native Procreate, template refinement, anatomy/pose, shader grammar and source lineage;
- external toolchain reference pack;
- `apps/arcsweep/scripts/rarity-atelier-procreate-normalize.py`;
- verified nine-document native Procreate pilot manifest.

## Safety boundary

The pilot modifies only layer-name string objects referenced by SilicaLayer records in `Document.archive`. Every other ZIP member is hashed before and after. All nine pilot documents reported identical non-metadata member sets and SHA-256 payloads.

This means painted tile/chunk data, QuickLook images, previews, video and unrelated archive payloads were not rewritten by the normalisation pass.

## Corpus lessons carried into the skill

- Christina Firelizard files consistently separate base material passes from Multiply shadow, light and linework.
- Jabberwoky shade/shine files distinguish shading, highlights and shine.
- ambiguous generic layers are now labelled `90 REVIEW` rather than guessed.
- pose references are treated as mechanics/inspiration, not wholesale design-copy instructions.
- image-generation output is not anatomy authority.

## Next pass

1. visually identify REVIEW layers in the nine native masters;
2. build PSD-only inventory/preview tooling for the larger Drive archive;
3. prepare Procreate-friendly PSD import copies without flattening;
4. add optional blank marking/shader convenience layers only after a disposable Procreate round-trip test proves layer-graph writing/import behaviour;
5. build contact-sheet catalogue by pose/anatomy/material usefulness.
