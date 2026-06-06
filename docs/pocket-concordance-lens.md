# Pocket Concordance Lens

Status: first public-safe prototype slice.

Pocket Concordance Lens is the phone/tablet camera fallback for Concordance Lens. It lets people without dedicated AR glasses open a camera view, place a Waking anchor, see a Hearth Lantern, read the first five Concordance sigils, and return to saved local anchors.

## Related specs

- `docs/concordance-mythframe-flight-spec.md` — explains how the mythframe becomes buildable instead of merely atmospheric.
- `docs/pocket-concordance-lens-state-machine.md` — defines the first Pocket Lens state machine.
- `docs/concordance-anchor-registry-contract.md` — defines the future Supabase persistence contract. No migration has been applied from it yet.

## First ride slice

The first slice is intentionally small:

1. Ask for explicit camera permission.
2. Show a live camera view, or a demo room if camera access is unavailable.
3. Let the user choose Place mode or Return mode.
4. In Place mode, let the user tap a surface to place the First Concordance Window.
5. In Return mode, protect the active anchor from accidental movement and compare taps against it.
6. Let the user press Compare active to ask DEEP about the currently selected anchor.
7. Render a Hearth Lantern at the active anchor.
8. Render the first five sigils: Anchor, Witness, Waking, Gate, Concordance.
9. Show a short DEEP reading.
10. Save anchors locally in the browser.
11. Let the user return to a saved anchor from the Anchor Shelf.
12. Let the user name, clear, delete, or clear all anchors.

This is not yet the full horse. It is the horse's first step with saddlebags, reins, and a polite little compare button.

## Why this slice matters

The first slice proves the core loop:

- enter the Lens
- choose Place or Return mode
- choose a Waking anchor
- mark relation with sigils
- receive a DEEP reading
- save locally
- compare return state
- choose a saved return-point
- name the return-point inline
- clear if needed

A mythframe with no mechanics floats. A mythframe with repeatable state, anchor, return, choice, and failure modes begins to fly.

## Privacy boundaries

- Camera use is explicit.
- Camera state is visible in the UI.
- The prototype does not record video.
- The first slice saves anchors only in local browser storage.
- Supabase anchor sync should come after the Anchor Registry contract is reviewed.
- Public copy should stay claim-bounded and avoid private Concordance details unless reviewed.

## Lens modes

### Place mode

Place mode creates or moves a return-point when the user taps the camera or demo view.

Use Place mode when:

- creating a new anchor.
- intentionally moving a Hearth Lantern.
- replacing a previous local placement.

### Return mode

Return mode protects anchors from accidental movement. Tapping the camera or demo view compares the tap against the active anchor instead of creating a new one.

Use Return mode when:

- returning to an existing anchor.
- checking whether the current view still aligns.
- avoiding accidental overwrite.

Selecting an anchor from the Anchor Shelf automatically switches to Return mode.

## Compare active

Compare active is the explicit non-secret version of Return mode comparison.

It uses the active anchor's saved placement and asks DEEP whether the return-point is still coherent. This is useful when the user wants to check the saved anchor without tapping the camera or demo stage.

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
- Switch to Place mode to move this anchor, or clear it.

Cleared:

- Anchor cleared.
- The room is unbound and ready for a new return-point.

## Local Anchor Shelf

The Anchor Shelf is the local browser memory layer.

Current behaviour:

- Up to 12 anchors are stored locally.
- The newest or selected anchor is also stored as the active anchor.
- Selecting an anchor reloads its Hearth Lantern, sigils, and Stonewood overlay.
- Selecting an anchor switches the Lens into Return mode.
- Naming an anchor changes its local display name through an inline form.
- Deleting an anchor removes only that return-point.
- Clearing all anchors removes the local shelf and active anchor.

Storage keys:

- `pocket-concordance-lens-anchor-v0-1` — active anchor.
- `pocket-concordance-lens-anchor-shelf-v0-1` — local anchor shelf.
- `pocket-concordance-lens-preferences-v0-1` — local interface preferences.

## Preferences

Current local preferences:

- Low motion.
- Large UI.
- Sigil labels.

Low motion is enabled by default.

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

- `src/anchorContract.js` holds the shared local anchor contract, shelf helpers, comparison helper, preferences helpers, lens mode constants, and rename helper.
- `src/main.jsx` renders the Lens UI and uses the contract helpers.
- `src/styles.css` includes the Lens, mode panel, Anchor Shelf, inline rename form, preferences, Stonewood seams, Hearth Lantern, and sigil styling.
- Local anchors are stored under `pocket-concordance-lens-anchor-shelf-v0-1`.
- The first comparison checks whether a new placement is close enough to the active saved placement.
- This comparison is intentionally simple and should become more spatially aware later.

## Next build steps

- Add richer saved-anchor metadata display.
- Add export/import of local anchor shelf for backup.
- Draft Supabase migration only after Anchor Registry contract review.
- Add DEEP Observer event logging after safe sync exists.
- Add optional WebXR/device adapter exploration.
- Add Stonewood interior presets and room-state skins.
