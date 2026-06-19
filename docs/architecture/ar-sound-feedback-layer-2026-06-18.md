# AR Sound Feedback Layer — 2026-06-18

## Purpose

Add gentle sound feedback to the pointer-first AR manipulation mock so interaction does not feel like silent tapping.

The sound layer is consent-gated and user-enabled.

It is off by default.

It does not autoplay.

## Files added

- `docs/reference/prototypes/ar-manipulation-mock/ar-sound.model.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-sound-controls.js`

## Files updated

- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/README.md`

## Safety boundary

The layer uses Web Audio only after the user presses Enable Sound.

It does not use microphone input.

It does not use recordings.

It does not use camera, depth, LiDAR, WebXR, hand tracking, or any sensor adapter.

## Sound events

Current event names:

- select
- move
- rotate
- scale
- anchor
- pulse
- dismiss
- reset

## Module boundary

`ar-sound.model.js` owns:

- default enabled state
- default volume
- volume limits
- tone frequency, duration, and gain values

`ar-sound-controls.js` owns:

- audio context creation after user action
- enable and mute state
- volume clamping
- tone playback

`ar-manipulation.js` owns:

- DOM wiring
- Enable Sound and Mute buttons
- volume slider
- choosing which interaction event triggers which sound event

## Design rule

Sound is a feedback layer, not a control layer.

Sound should never be required to understand or operate the interface.

Visual and text feedback must remain sufficient.

## Next tuning pass

- Add a softer tone set.
- Add an optional “very quiet” preset.
- Add per-event enable switches if the sound layer gets too chatty.
- Consider mapping pulse light and pulse sound together.
