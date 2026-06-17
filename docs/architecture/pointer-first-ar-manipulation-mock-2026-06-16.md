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
- `docs/reference/prototypes/ar-manipulation-mock/gesture-adapter-shim.js`
- `docs/reference/prototypes/ar-manipulation-mock/state-transition-examples.md`
- `docs/reference/prototypes/ar-manipulation-mock/ar-controller-test-harness.html`
- `docs/reference/prototypes/ar-manipulation-mock/ar-controller-test-harness.js`

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

Synthetic gesture buttons simulate future adapter output without device access.

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

The adapter shim owns:

- payload-shaped synthetic gesture input
- gesture type mapping
- adapter-style receive function

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
- keyboard help list styling
- reduced-motion pulse feedback

The test harness owns:

- browser-visible controller transition checks
- simple pass/fail reporting
- confidence checks for movement, rotation, scale clamp, anchor, dismiss, reset, and synthetic rotation

## Safety and flexibility

The mock is pointer-first by design.

It does not start camera, depth, LiDAR, WebXR, or hand tracking APIs.

Future adapters should emit payload-shaped events into an adapter shim rather than adding renderer-specific logic.

## Completed follow-up pass

- Keyboard help panel added.
- State transition examples added.
- Adapter shim added.
- Synthetic gesture buttons now route through payload-shaped events.
- Reduced-motion pulse feedback added.
- Tiny controller test harness added.

## Next pass

- Add an adapter contract note for future MediaPipe, WebXR, ARKit, gaze, and controller adapters.
- Add more controller checks for pulse timeout and synthetic gesture payload variants.
- Consider moving shared AR keyboard handling into a separate helper.
