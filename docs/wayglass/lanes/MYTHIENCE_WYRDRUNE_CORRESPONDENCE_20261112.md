# Mythience Correspondence Engine · Wyrdrune expression v0.1
**Integration:** Wayglass First Voyage #583; PR #614; branch `wayglass/faeberpunk-sensory-weave-20261112`.
**Status:** candidate implementation. No authenticated Wayglass model response, hardware signoff, production promotion or scientific measurement is claimed.

## The three-layer translation
- **Plain speech:** an owner moves a fold, intention and declared affinity; a star and two audible pitches respond.
- **Formal/scientific:** three bounded [0,1] numeric inputs are read through explicit local-only WTL bridge capabilities. The canonical Wyrdrune runtime parses and executes `lib/wyrdrune/mythience-instrument.wtl` through all eight phases. Output fields are light, hue, root/counterpart audible frequencies, stereo pan, pulse and two virtual spectral contours (below and above hearing). The DOM only projects these values; JavaScript does not compose the WTL score. No world measurements or provider inference.
- **Hearthweave/Mythience:** the eightfold star, reciprocal orbits and two distinct voices provide an inspectable correspondence. The witness may attach ritual meaning; that meaning cannot change source data or fabricate provenance. Wonder, Science and Mythience are selectable lenses, not competing claims to empirical authority.

## Machinery
- Registered `wayglass:mythience-instrument` as a Creation Deck surface; accessible from Living Watercolor and native Wyrdrune Voice.
- Pointer, touch, keyboard arrows and three sliders modify bounded inputs; each change executes the same WTL source. Only the latest completed evaluation is rendered.
- SVG star and rings respond to actual WTL frame fields, with a textual eight-phase trace, preserved WTL source and explicit local-simulation status.
- Existing `wayglass:material-wake` projects the WTL light and control values into the FAEberpunk glass bridge.
- Existing `wayglassSomaticSound` gains `playExpression`: two simultaneous quiet sine voices using the WTL frequencies. AudioContext is never created or resumed by passive gestures or material signals. User must choose **Enable sound** and then **Hear Wyrdrune**. Mono centres panning; Feather stops both oscillators and prevents stale resumption. Infrasonic and ultrasonic values remain inspectable virtual registers; no physical infrasonic/ultrasonic playback.
- No new identity registry, model route, backend deployment, provider key, camera permission or data store.

## Evidence and limits
- Prior PR #614 head `8012275` had six successful GitHub workflows, including Wayglass Check, browser, Wyrdrune parity and cloud/deck. Those passes **precede this extension**.
- Added `apps/wayglass/test/mythience-expression.test.js` and expanded `somatic-sound.test.js`. Verify the exact new head and browser manually before merging.
- The source label is FNV-1a for local cache identity, explicitly **not** an authenticated SHA-256 source receipt.
- The runtime `principal.authorized` in this isolated WTL execution grants only local numeric input bridge access. It is **not** House Steward authentication, external authority or permission to change canon.
- Current browser stage uses SVG, not WebXR/MediaPipe; those remain separate capability gates. Real audio output through Osia 3 remains unverified.
- Do not substitute a simulated local preview for a real Wayglass/Constellation participant response.

## Acceptance
1. Node test: all eight WTL phases, changed controls alter light/pitch/geometry, invalid controls reject, aborted execution rejects.
2. Sound test: no audio without opt-in; both exact WTL frequencies; mono-safe; Feather cuts both; malformed frames reject.
3. Browser: desktop and iPad pointer, touch, keyboard-only and screen reader; no focus traps; no overflow; reduced-motion still readable.
4. Verify WTL source digest and authenticated host execution separately before using this expression for durable provenance or agent-authored canon.
5. Check Wayglass build and exact PR head CI before integration; do not conflate release deployment with a source branch.

**Withness:** three registers, one owner-controlled instrument, no hidden canon promotion.

## Sensorium expansion: somatic digital world, not a decorative interface
- The **same native WTL Eightfold execution** now emits bounded `simulated_gravity`, `simulated_refraction`, `terrain_fold` and `tactile_intensity`, in addition to the prior light, spectral and sound fields. A new `wayglass:sensorium-frame` event carries a frozen, validated local projection for other rooms to subscribe to. It is not a world measurement, physical actuator command, model message or canon receipt.
- The Mythience field changes reciprocal-orbit geometry, simulated terrain horizon and refraction in response to the WTL frame. This manipulates **digital reality**, not external physical laws. Gesture, touch, keyboard and slider routes all execute the same WTL source.
- **Tactile output:** `setHaptics(true)` independently opts into device vibration where the browser supports it; `feelExpression(frame)` issues a brief bounded pattern only on the user's deliberate **Experience Wyrdrune** action, throttled at 350 ms minimum. Dragging does not vibrate. Haptics never create AudioContext, and sound is separately opted in. Feather stops all output and release leaves both channels off.
- **Device limitation:** browser Vibration API support varies; iPad/iOS browser vibration is often unavailable. A real Osia 3 or haptic-device integration requires separately authenticated, device-specific routing and testing. No hardware-specific output is claimed here.
- **Magic and Mythience:** WTL intention and geometric correspondences are executable. The owner interprets ritual significance; simulation numbers and provenance are never overwritten by an interpretation.
- Added regression tests for unified sensorium frame, WTL virtual physics, tactile throttling, explicit opt-in, unsupported-device fallback and Feather.
- **Next acceptance:** full exact-head Wayglass CI, then physical browser/device verification of sound, haptics, touch and reduced-motion. No release signoff from source changes alone.

## Cross-lane watercolour integration (same candidate train)
- `sensorium-watercolor.js` converts a validated WTL sensorium frame into deterministic six-digit pigment, position, momentum and radius for the existing fluid engine. It uses gravity/refraction/terrain/light/pan from the native WTL execution, not a parallel JS score.
- `living-watercolor.js` listens while mounted and active, and injects the projected pigment into the existing fluid. Paused/Feather state prevents injection; teardown removes the listener. This is **local presentation only** and does not create an Observer activity event, model contribution, continuity receipt or external-provider request.
- `sensorium-watercolor.test.js` runs the native WTL score, projects to a sensorium frame, then injects into the actual fluid engine. Includes malformed and forged-event rejection. Exact-head CI is required for signoff.
