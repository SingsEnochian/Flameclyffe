# AR Axis Growth Cleanup — 2026-06-18

## Purpose

Clean up the growing AR manipulation mock before it becomes tangled.

Add real axis growth so the seedling can move across X, Y, and Z instead of only sliding around the flat stage.

## Files updated

- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.model.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation-controller.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-keyboard-controls.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/ar-controller-test-harness.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-sound.model.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-sound-controls.js`
- `docs/reference/prototypes/ar-manipulation-mock/README.md`

## Axis growth

The manipulation state now includes:

- x
- y
- z

The controller now supports:

- `moveBy(dx, dy, dz)`
- `moveAxis(axis, delta)`
- clamped Z depth

The CSS stage now uses perspective.

The object transform now uses `translate3d(x, y, z)`.

## Interface cleanup

The old directional move buttons were replaced with a clearer Axis Growth section.

Axis controls now expose:

- X -
- X +
- Y -
- Y +
- Z -
- Z +

Keyboard controls now include:

- arrow keys for X/Y movement
- PageUp and PageDown for Z movement
- Shift for larger steps

## Sound play cleanup

Sound feedback has been extended into a playable sound-pad layer without breaking the consent gate.

New playable sound pads:

- Donk
- Ding
- Hum
- Chime
- Seedling Reply

Sound remains off by default and user-enabled only.

## Test coverage

The controller harness now checks:

- X movement
- Z movement
- Z clamping
- reset restoring Z
- existing rotation, scale, anchor, dismiss, strict adapter rejection, and pulse timeout checks

## Still open

- Extract pointer drag handling into a helper.
- Add mobile sizing rules for the AR stage and object.
- Add visible numeric values for light and sound sliders.
- Consider splitting axis controls into a small helper once another object is added.
