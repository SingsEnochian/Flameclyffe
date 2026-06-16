# Prototype Module Extraction — 2026-06-16

## Purpose

Begin moving DEEP prototype data and utility logic out of one-file sketches and into reusable modules.

## Files added

Shared utilities:

- `docs/reference/prototypes/shared/dom-svg.js`
- `docs/reference/prototypes/shared/svg-paths.js`
- `docs/reference/prototypes/shared/radial-layout.js`
- `docs/reference/prototypes/shared/deep-prototype-tokens.css`
- `docs/reference/prototypes/shared/deep-reduced-motion.css`
- `docs/reference/prototypes/shared/deep-branch-states.css`

Model files:

- `docs/reference/prototypes/branch-loom/branch-loom.model.js`
- `docs/reference/prototypes/signal-garden/signal-garden.model.js`
- `docs/reference/prototypes/consent-web/consent-web.model.js`
- `docs/reference/prototypes/observer-v02/observer-vector.model.js`

## Files rewired

- `branch-loom/branch-loom.js`
- `signal-garden/signal-garden.js`
- `consent-web/consent-web.js`
- `observer-v02/observer-v02.js`

## Pattern

Each prototype should separate:

- model data
- rendering helpers
- state transitions
- visual expression
- sensor or device access

## Current status

Model extraction and shared JS helpers are complete for the current prototype set.

CSS extraction has begun with shared token and reduced-motion files, but the prototype CSS files still need a follow-up de-duplication pass.

## Next pass

- Import shared token CSS into prototype CSS files.
- Replace duplicate reduced-motion blocks with the shared file.
- Move repeated panel/card/button styles into shared prototype CSS.
- Add a pointer-first AR manipulation mock.
