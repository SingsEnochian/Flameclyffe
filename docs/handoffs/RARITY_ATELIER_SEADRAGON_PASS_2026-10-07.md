# Rarity - Atelier · Seadragon pass

**Date:** 2026-10-07  
**Branch:** `rarity-atelier-v0-1`

## Corpus

The HybridGeist Seadragon material is now an explicit Atelier corpus rather than an incidental template family.

Reviewed:
- four Seadragon Mutation template PSDs;
- one adult Seadragon Mutation template PSD;
- `Seadragons.zip`, which contains byte-identical copies of the adult source and four hatchling sources.

## Result

Mutation templates 001-004 passed the conservative PSD import-candidate gate after visual identification of the editable scenes:
- paper/background;
- filled silhouette/base;
- linework.

The layer labels were normalised to:
- `00 HELPERS | Paper`
- `02 BASE | Silhouette`
- `09 LINEWORK | Lines`

Verification preserved scene count, geometry, compose state, decoded pixels, and flattened composite.

## Adult blocker

The adult source is intentionally not rewritten. Its Paper layer reports `compose=None`. The current writer cannot guarantee that state survives rewrite, so Atelier fails closed and leaves the source untouched.

## Skill improvement

The PSD normaliser now supports:
- `--mapping <json>` for visually confirmed per-file label mappings;
- `--inspect` for read-only layer/preflight inspection;
- a fail-closed compose preflight before writing.

This allows Atelier to refine weird historical PSDs without pretending that every generic `Layer 3` means the same thing.

## Design use

Seadragons are a dedicated anatomy/mutation reference set. They may inform silhouette, aquatic adaptation, wing/fin relationships, tail mechanics, hatchling-to-adult changes and dynamic pose design. They are not a wholesale-copy target.
