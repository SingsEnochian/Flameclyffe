# Interface Audit — 2026-06-18

## Scope

This audit covers the current standalone prototype shelf, with emphasis on the new pointer-first AR manipulation interface.

Audited focus areas:

- module boundaries
- consent and sensor safety
- adapter payload shape
- keyboard accessibility
- reduced-motion behaviour
- test harness coverage
- hardcoding and prototype drift
- older prototype cleanup risks

## Overall status

The new AR manipulation mock is in good prototype shape.

It is modular, pointer-first, and adapter-ready enough for the next round of iteration.

It does not start real camera, depth, LiDAR, WebXR, or hand-tracking APIs.

The main remaining work is tightening the adapter shim to match the written contract, then extracting remaining page-local interaction helpers as the interface grows.

## Strong patterns found

### Shared CSS contract is being used

The AR mock loads shared prototype CSS before local CSS.

This keeps layout, panel, button, SVG-stage, branch-state, token, and reduced-motion patterns aligned with the other prototypes.

### Keyboard support exists

The AR mock includes a keyboard help panel.

The object itself is a button, so it is focusable by default.

Keyboard handling has been extracted into `ar-keyboard-controls.js`.

### Adapter boundary exists

The adapter contract defines a payload shape for future adapter sources.

The shim now accepts payload-shaped input rather than direct renderer calls.

### Reduced-motion pulse feedback exists

The AR mock has static outline/glow feedback for pulse state under reduced motion.

### Test harness exists

The AR mock has browser-visible controller checks for core transitions, payload validation, and pulse timeout.

## Findings

### A1 — Adapter shim validation is looser than the written contract

Priority: High.

The adapter contract lists `targetId`, `detail`, and `consentState` as required fields and says payloads should fail closed when consent is missing or the payload shape is invalid.

The current shim validates `source`, `type`, and `createdAt`, but `targetId` is optional and `consentState` is optional as long as it is not explicitly disabled.

Recommended fix:

- require `targetId === 'observer-core'` for the current mock
- require `consentState === 'enabled'`
- require `detail` to be an object
- reject unknown source names
- reject unknown detail keys
- clamp or reject invalid confidence values

### A2 — Adapter source values are not yet checked against the contract

Priority: Medium-high.

The contract lists supported sources, but the shim currently accepts any string source.

Recommended fix:

- add a supported-source set in the shim or import it from a contract/config module
- reject payloads from unknown sources

### A3 — Detail field is not yet whitelisted

Priority: Medium-high.

The contract lists safe detail values, but the shim does not inspect `detail` yet.

Recommended fix:

- permit only known coarse fields
- reject raw arrays or nested device dumps
- keep raw device data inside the future adapter boundary

### A4 — Keyboard help should mention focus

Priority: Medium.

The keyboard handler is attached to the AR object. The help panel lists the keys but does not tell the tester that the Observer object must have focus first.

Recommended fix:

- update the help text to say: “Focus the Observer object first, then use these keys.”
- consider adding a visible “Focus Object” button later if testing proves awkward

### A5 — Pointer drag handling is still page-local

Priority: Medium.

The page runtime still owns pointer drag start/move/end. This is acceptable for a one-object prototype, but it will become sticky once we add a second manipulable object.

Recommended fix:

- extract `ar-pointer-drag.js` before adding another AR object
- let the helper emit controller calls just as the keyboard helper does

### A6 — Mobile layout may feel tall and heavy

Priority: Medium.

Shared layout collapses to one column at narrow widths, but the AR stage itself has a fixed minimum height. The object size is also fixed.

Recommended fix:

- add local responsive rules for smaller screens
- reduce stage min-height on mobile
- scale the object size with `clamp()`

### A7 — Test harness can overlap async runs

Priority: Low-medium.

The harness awaits pulse timeout. Repeated clicks can start overlapping runs.

Recommended fix:

- disable the Run Tests button while a test run is active
- clear or label stale runs

### A8 — Older prototypes still contain trusted-template `innerHTML`

Priority: Medium for cleanup, low immediate risk.

Branch Loom, Consent Web, and Observer v0.2 still use `innerHTML` in trusted local model/rendering contexts.

This is not the new AR mock, and current strings are local prototype data, but the cleanup goal is still to move to DOM construction everywhere.

Recommended fix:

- harden Consent Web controls first
- harden Observer readout second
- harden Branch Loom readout third

### A9 — Control re-rendering remains in older prototypes

Priority: Medium.

Older prototypes still re-render controls as part of full render cycles.

Recommended fix:

- create controls once
- update `data-state`, `aria-pressed`, labels, and readouts separately
- start with Observer v0.2 because slider/control UX is most sensitive there

## Recommended next patches

1. Strict adapter shim validation.
2. Keyboard help focus wording.
3. Test harness run-lock.
4. AR mobile sizing patch.
5. Extract pointer drag helper.
6. Harden older prototype `innerHTML` paths.
7. Split older prototype control creation from state updates.

## Production-readiness note

The new AR interface is safe to continue as a prototype.

It should not be promoted to production until strict adapter validation, consent-state enforcement, and mobile/responsive checks are completed.
