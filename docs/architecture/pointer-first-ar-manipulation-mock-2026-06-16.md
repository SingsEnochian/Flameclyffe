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
- `docs/reference/prototypes/ar-manipulation-mock/adapter-contract.md`
- `docs/reference/prototypes/ar-manipulation-mock/ar-keyboard-controls.js`

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

The adapter contract owns:

- supported source names
- payload shape
- safe detail fields
- consent and privacy rules
- future adapter requirements

The adapter shim owns:

- payload-shaped synthetic gesture input
- payload validation
- gesture type mapping
- adapter-style receive function

The keyboard helper owns:

- keyboard-to-controller mapping
- movement, rotation, scale, and pulse keys

The page runtime owns:

- pointer input wiring
- keyboard helper wiring
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
- confidence checks for movement, rotation, scale clamp, anchor, dismiss, reset, synthetic rotation, payload validation, and pulse timeout

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
- Adapter contract note added.
- Pulse timeout and synthetic payload variant checks added.
- Keyboard handling moved into `ar-keyboard-controls.js`.

## Next pass

- Add a dedicated consent-state test branch for adapter payload rejection.
- Add one more shim path for controller/button-style payloads.
- Consider moving pointer drag handling into a helper once another AR object is added.
