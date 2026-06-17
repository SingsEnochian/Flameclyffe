# AR Manipulation Mock

Standalone DEEP prototype for pointer-first spatial manipulation.

Open `ar-manipulation.html` beside its CSS and JS files to review it.

Open `ar-controller-test-harness.html` to run tiny controller transition checks.

## Purpose

This prototype tests the manipulation contract before any AR or sensor adapter exists.

It uses pointer, touch, keyboard, button controls, and synthetic gesture buttons only.

## Manipulation intents

- hover
- select
- grab
- release
- drag
- rotate
- scale
- anchor
- dismiss
- pulse

## Synthetic gestures

Synthetic buttons simulate future gesture-adapter events without device access.

Current synthetic tests:

- pinch drag
- two-hand rotate
- hand scale
- air anchor

## Implementation notes

- No real AR runtime is started.
- No camera, depth, LiDAR, WebXR, or hand tracking API is called.
- `ar-intents.js` owns pointer and synthetic intent vocabulary.
- `ar-manipulation-controller.js` owns manipulation state transitions.
- `gesture-adapter-shim.js` accepts and validates payload-shaped synthetic gesture events.
- `ar-keyboard-controls.js` owns keyboard-to-controller mapping.
- `ar-controller-test-harness.js` runs small controller transition checks, payload checks, and pulse timeout checks.
- `ar-manipulation.js` owns DOM and input wiring.
- JavaScript owns manipulation state and intent events.
- CSS owns visual feedback.
- Shared prototype CSS is loaded before local CSS.
- The object remains usable with keyboard controls.
- Reduced-motion pulse feedback uses static outline and glow instead of animation.

## Support files

- `adapter-contract.md` defines payload shape for future adapters.
- `state-transition-examples.md` documents the input-to-controller flow.
- `gesture-adapter-shim.js` is the future adapter doorway.
- `ar-controller-test-harness.html` runs browser-visible controller checks.

## Future bridge

A production version should become contained modules such as:

- ARManipulationMock
- ARManipulationController
- ARIntentLog
- ARObjectPresenter
- arManipulationModel
- useARManipulation
