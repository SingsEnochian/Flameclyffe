# AR Mobile and Pointer Cleanup — 2026-06-18

## Purpose

Keep the AR manipulation seedling modular and usable as it gains light, sound, and XYZ movement.

This pass extracts pointer drag handling from the page runtime and adds responsive sizing for smaller screens.

## Files added

- `docs/reference/prototypes/ar-manipulation-mock/ar-pointer-drag.js`

## Files updated

- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/README.md`

## Pointer cleanup

`ar-pointer-drag.js` now owns:

- pointer drag start
- pointer movement deltas
- pointer release
- optional pointer capture
- grab and release callbacks

The page runtime now wires the helper instead of owning drag state directly.

## Mobile sizing

The CSS now uses:

- `--ar-object-size`
- `clamp()` for object size
- clamped stage height
- percentage-sized orb core and rings
- smaller grid spacing at mobile breakpoints
- narrower anchor plane on mobile
- single-column control groups on small screens

## Current boundary

The prototype remains pointer-first.

No camera, depth, LiDAR, WebXR, hand tracking, microphone, recording, or autoplay behaviour was added in this pass.

## Still open

- Add visible numeric values for light and sound sliders.
- Add a light reset button.
- Add a very quiet sound preset.
- Consider an axis helper once multiple objects exist.
