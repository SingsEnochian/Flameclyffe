# Pointer-First AR Manipulation Mock — 2026-06-16

## Purpose

Create the first implementation sketch of DEEP AR manipulation without starting real AR or device systems.

## Files added

- `docs/reference/prototypes/ar-manipulation-mock/README.md`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.model.js`

## Contract tested

The mock tests:

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

## Module boundary

The model file owns:

- object capabilities
- manipulation defaults
- timing and step values
- intent vocabulary

The runtime file owns:

- state transitions
- pointer input
- keyboard input
- button input
- live status updates
- intent log rendering

The CSS file owns:

- object placement
- orb material feel
- anchor feedback
- pulse feedback
- dismissed-state feedback

## Safety and flexibility

The mock is pointer-first by design.

It does not start camera, depth, LiDAR, WebXR, or hand tracking APIs.

Future adapters should emit the same manipulation intents rather than adding renderer-specific logic.

## Next pass

- Split intent handling into `ar-intents.js`.
- Split state transitions into `ar-manipulation-controller.js`.
- Add synthetic gesture events for testing without device access.
- Add a keyboard help panel.
- Add unit-like state transition examples in documentation.
