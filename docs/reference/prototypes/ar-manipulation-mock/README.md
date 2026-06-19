# AR Manipulation Mock

Standalone DEEP prototype for pointer-first spatial manipulation.

Open `ar-manipulation.html` beside its CSS and JS files to review it.

Open `ar-controller-test-harness.html` to run tiny controller transition checks.

## Purpose

This prototype tests the manipulation contract before any AR or sensor adapter exists.

It uses pointer, touch, keyboard, button controls, synthetic gesture buttons, CSS-variable light controls, XYZ axis controls, responsive sizing, and explicitly enabled procedural sound only.

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

## Axis growth

The mock now tracks X, Y, and Z movement.

- X/Y movement uses the normal step value.
- Z movement uses a separate depth step.
- Z is clamped so the object cannot drift beyond the prototype bounds.
- CSS uses `translate3d(x, y, z)` with stage perspective.

Keyboard support:

- Arrow keys move X/Y.
- PageUp and PageDown move Z.
- Shift increases the movement step.

## Synthetic gestures

Synthetic buttons simulate future gesture-adapter events without device access.

Current synthetic tests:

- pinch drag
- two-hand rotate
- hand scale
- air anchor

## Light play

The mock now includes a state-driven lighting layer.

Controls:

- ambient
- gold bloom
- green shimmer
- rim light

Presets:

- Moonlit
- Hearth
- Grove
- Eclipse

JavaScript owns lighting state. CSS expresses the light through variables on the AR stage.

## Sound feedback and play

The mock includes consent-gated procedural sound.

Sound is off by default.

Sound only starts after the user presses Enable Sound.

Interaction events:

- select
- move
- rotate
- scale
- anchor
- pulse
- dismiss
- reset

Playable pads:

- donk
- ding
- hum
- chime
- seedling reply

The sounds are small Web Audio oscillator tones. They are not samples, recordings, microphone input, or sensor input.

## Responsive sizing

The stage and object now scale down for narrower screens.

- The AR object uses a CSS size variable with `clamp()`.
- The stage height clamps instead of staying fixed at desktop height.
- Orb rings and core scale as percentages of the object.
- Grid, anchor plane, and control columns adjust at small breakpoints.

## Implementation notes

- No real AR runtime is started.
- No camera, depth, LiDAR, WebXR, or hand tracking API is called.
- No sound plays automatically.
- `ar-intents.js` owns pointer and synthetic intent vocabulary.
- `ar-manipulation-controller.js` owns manipulation state transitions, including X/Y/Z movement.
- `ar-pointer-drag.js` owns pointer drag start, move, and release handling.
- `gesture-adapter-shim.js` accepts and validates payload-shaped synthetic gesture events.
- `ar-keyboard-controls.js` owns keyboard-to-controller mapping, including Z movement.
- `ar-lighting.model.js` owns lighting defaults and presets.
- `ar-lighting-controls.js` owns light state and CSS variable application.
- `ar-sound.model.js` owns sound defaults, event tone values, and playable pad patterns.
- `ar-sound-controls.js` owns audio enable, mute, volume, tone playback, and pattern playback.
- `ar-controller-test-harness.js` runs controller transition checks, payload checks, Z axis checks, and pulse timeout checks.
- `ar-manipulation.js` owns DOM and input wiring only.
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
- ARLightingController
- ARSoundController
- ARAxisControls
- ARPointerDrag
- ARIntentLog
- ARObjectPresenter
- arManipulationModel
- useARManipulation
