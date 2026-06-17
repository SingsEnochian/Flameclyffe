# Pointer-First AR Manipulation Mock — 2026-06-16

## Purpose

Create the first implementation sketch of DEEP AR manipulation without starting real AR or device systems.

## Files added

- `docs/reference/prototypes/ar-manipulation-mock/README.md`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.css`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation.model.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-intents.js`
- `docs/reference/prototypes/ar-manipulation-mock/ar-manipulation-controller.js`

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

## Synthetic tests

Synthetic gesture buttons now simulate future adapter output without device access.

Current synthetic events:

- synthetic:pinch-drag
- synthetic:two-hand-rotate
- synthetic:hand-scale
- synthetic:air-anchor

## Module boundary

The model file owns:

- object capabilities
- manipulation defaults
- timing and step values
- scale limits

The intents file owns:

- pointer intent names
- synthetic gesture names
- intent description helpers

The controller file owns:

- state transitions
- movement
- rotation
- scaling
- anchoring
- pulsing
- dismissal
- synthetic gesture handling

The page runtime owns:

- pointer input wiring
- keyboard input wiring
- button input wiring
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

- Add a keyboard help panel.
- Add unit-like state transition examples in documentation.
- Add an adapter shim that accepts synthetic gesture payload objects.
- Add optional reduced-motion-specific pulse feedback.
