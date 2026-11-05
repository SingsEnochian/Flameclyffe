# Wayglass Mission-Grade Instrumentation · Engineering Gate 01

**Revision scope:** Acoustic Room, Return Marker, interactive illustrative field, Jacobian instrument
**Status:** implemented in integration branch; no NASA affiliation, certification, deployment or successful CI run asserted.
**Philosophy:** mission-inspired traceability, deterministic numerical fixtures, explicit operator authority and graceful degraded operation.

## Instrument classification and traceability

| Instrument | Authoritative input | Output | Failure / fallback | Test |
| --- | --- | --- | --- | --- |
| Acoustic bearing | bounded listener and marker coordinates | relative bearing, distance, pan, gain | mute/mono and visible readout | acoustic-marker.test.js |
| Return marker | schema/versioned local receipt | recovered listener and marker state | reject invalid provenance/coordinates; no autoplay | acoustic-marker.test.js |
| Field simulator | bounded source positions/masses and parameters | potential, gradient, displacement | reject invalid/nonfinite inputs | field-instrument.test.js |
| Jacobian Fold Detector | **same displacement function as rendered grid** | 2×2 Jacobian, det, singular values, condition number, fold index | near-singular condition reports Infinity; label simulated | field-instrument.test.js |
| Crossing request | operator intent | pending request, no route actuation | remain stationary | acoustic-marker.test.js |
| Feather | explicit operator stop | silence and cancelled state | sound never resumes automatically | acoustic-marker.test.js |

## Coordinate conventions

- A **normalized illustrative scene**, x increases to screen right and y increases down screen.
- Listener heading 0 points +x; positive heading rotates toward +y. Bearings are listener-relative in radians and displayed in degrees.
- Pan is a bounded sine mapping, **not an HRTF**, binaural localization proof or calibrated physical azimuth.
- Softened potential `-Σ k mᵢ / √(dx²+dy²+ε²)`; gradient `Σ k mᵢ (dx,dy) / (dx²+dy²+ε²)^(3/2)`; rendered mapping `D(x,y)=(x,y)-s∇Φ`.
- Numerical Jacobian uses central differences of **D**, and singular values derive from the eigenvalues of `JᵀJ`.
- `foldIndex=log10(max(1,κ))` is a project-specific exploratory indicator, not a physical singularity or verified relativistic metric.
- Field grid, readout and model snapshots use one implementation. Source count and masses are bounded to avoid pathological values.
- No world-to-metre calibration, gravitational constant, dynamical geodesic simulation or calibrated acoustics is claimed.

## Release gates

**Gate A: source and contracts**: exact revision identifies models, interface, tests and document. Code committed; review pending.

**Gate B: numerical**: `node --test apps/wayglass/test/acoustic-marker.test.js apps/wayglass/test/field-instrument.test.js`; require all cases pass, including zero-field identity, source symmetry, superposition, independent finite-difference gradient, Jacobian consistency, finite/non-NaN metrics, bad-input rejection, no-crossing and cold return. **Not yet executed/verified in this handoff.**

**Gate C: full Wayglass**: `npm run wayglass:test` and `npm run wayglass:build` on exact branch head, with complete run IDs and artifacts. **Pending.**

**Gate D: browser/device**: navigate from Writing Room to Acoustic Room; rotate and move, adjust mass and compare numerical telemetry, enable audio from an explicit gesture, mute and Feather, mono fallback, save/reload/return, reduced-motion and mobile touch. Capture failures and fixes. **Pending.**

**Gate E: real instrument**: only after Gate D, test hearing-device output and head tracking as optional adapters. A WebAudio stereo pan is not a device-specific head tracker. Calibrate output levels and verify interruption behavior before declaring suitability for a user's listening setup. **Pending.**

## Known limits and next corrections

- LocalStorage receipt is a **local convenience snapshot**, not a cryptographically signed or server-authorized Return Engine receipt. Never use it to authorize route execution.
- Field mass is preserved in the UI's local return snapshot; future formal receipts must bind parameter version, simulation tick, model hash, source identifiers, operator identity and host authorization.
- Browser AudioContext suspension, background tabs and device switches need fault-injection tests. Current implementation provides a mono-safe stereo fallback and user-triggered start but has no measured device latency.
- Renderer resize is supported; visual accuracy and framerate under mobile GPU load need profiling.
- Current source position is fixed; source dragging, wave propagation and volumetric storm effects are next-level work, not present capabilities.
- User-provided CodePen and Odio works are credited as reference inspiration, not copied source.
- Before any claims of *mission-grade*, collect repeatable measurements: p50/p95 input-to-audio and input-to-render latency, frame-time variance, CPU/GPU usage, output level ceilings, restoration success under cold start, and browser interruption behavior.

## Next executable gate

Run tests and build against the exact head; repair until green. Then perform browser visual/audio inspection, with one controlled fault per trial and an attributable test receipt. No release or physical-device integration before those gates.
