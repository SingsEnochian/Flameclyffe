# AR Manipulation Mock

Standalone DEEP prototype for pointer-first spatial manipulation.

Open `ar-manipulation.html` beside its CSS and JS files to review it.

## Purpose

This prototype tests the manipulation contract before any AR or sensor adapter exists.

It uses pointer, touch, keyboard, and button controls only.

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

## Implementation notes

- No real AR runtime is started.
- No camera, depth, LiDAR, WebXR, or hand tracking API is called.
- JavaScript owns manipulation state and intent events.
- CSS owns visual feedback.
- Shared prototype CSS is loaded before local CSS.
- The object remains usable with keyboard controls.

## Future bridge

A production version should become contained modules such as:

- ARManipulationMock
- ARManipulationController
- ARIntentLog
- ARObjectPresenter
- arManipulationModel
- useARManipulation
