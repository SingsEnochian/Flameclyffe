# Pocket Concordance Lens

Status: first public-safe prototype slice.

Pocket Concordance Lens is the phone/tablet camera fallback for Concordance Lens. It lets people without dedicated AR glasses open a camera view, place a Waking anchor, see a Hearth Lantern, read the first five Concordance sigils, and return to the saved local anchor.

## First ride slice

The first slice is intentionally small:

1. Ask for explicit camera permission.
2. Show a live camera view, or a demo room if camera access is unavailable.
3. Let the user tap a surface to place the First Concordance Window.
4. Render a Hearth Lantern at that point.
5. Render the first five sigils: Anchor, Witness, Waking, Gate, Concordance.
6. Show a short DEEP reading.
7. Save the anchor locally in the browser.
8. Let the user clear the anchor at any time.

This is not yet the full horse. It is the horse's first step.

## Privacy boundaries

- Camera use is explicit.
- Camera state is visible in the UI.
- The prototype does not record video.
- The first slice saves anchors only in local browser storage.
- Supabase anchor sync should come after the Anchor Registry contract is reviewed.
- Public copy should stay claim-bounded and avoid private Concordance details unless reviewed.

## Concordance reading

Default reading after an anchor is placed:

- Anchor recognised.
- Waking layer stable.
- Verge contact listening.
- Concordance invited, not forced.
- Return-point formed.

## Build commands

From the repository root:

```bash
npm install
npm run pocket:dev
npm run pocket:build
npm run pocket:preview
```

## App surface

- Source: `apps/pocket-concordance-lens`
- Vite config: `apps/pocket-concordance-lens/vite.config.js`
- Build output: `dist/pocket-concordance-lens`
- Intended published path: `/Flameclyffe/pocket-concordance-lens/`

## Next build steps

- Add Supabase Anchor Registry contract.
- Add a saved-anchor list and return flow.
- Add DEEP comparison states: stable, drifted, unrecognised.
- Add low-motion and large-ui settings as persistent preferences.
- Add optional WebXR/device adapter exploration.
- Add Stonewood interior presets and room-state skins.
