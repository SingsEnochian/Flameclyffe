# Pocket Concordance Lens

Status: first public-safe prototype slice.

Pocket Concordance Lens is the phone/tablet camera fallback for Concordance Lens. It lets people without dedicated AR glasses open a camera view, place a Waking anchor, see a Hearth Lantern, read the first five Concordance sigils, and return to the saved local anchor.

## Related specs

- `docs/concordance-mythframe-flight-spec.md` — explains how the mythframe becomes buildable instead of merely atmospheric.
- `docs/pocket-concordance-lens-state-machine.md` — defines the first Pocket Lens state machine.
- `docs/concordance-anchor-registry-contract.md` — defines the future Supabase persistence contract. No migration has been applied from it yet.

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

## Why this slice matters

The first slice proves the core loop:

- enter the Lens
- choose a Waking anchor
- mark relation with sigils
- receive a DEEP reading
- save locally
- compare return state
- clear if needed

A mythframe with no mechanics floats. A mythframe with repeatable state, anchor, return, and failure modes begins to fly.

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

## Return readings

Stable return:

- Return-point recognised.
- Anchor remains stable.
- Concordance thread holds.

Drifted return:

- Anchor drift detected.
- Relation is present but misaligned.
- Re-place or clear the anchor.

Cleared:

- Anchor cleared.
- The room is unbound and ready for a new return-point.

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

## Current implementation notes

- `src/anchorContract.js` holds the shared local anchor contract.
- `src/main.jsx` renders the Lens UI and uses the contract helpers.
- Local anchors are stored under `pocket-concordance-lens-anchor-v0-1`.
- The first comparison checks whether a new placement is close enough to the previous saved placement.
- This comparison is intentionally simple and should become more spatially aware later.

## Next build steps

- Add a saved-anchor list and return flow.
- Add persistent low-motion and large-ui settings.
- Draft Supabase migration only after Anchor Registry contract review.
- Add DEEP Observer event logging after safe sync exists.
- Add optional WebXR/device adapter exploration.
- Add Stonewood interior presets and room-state skins.
