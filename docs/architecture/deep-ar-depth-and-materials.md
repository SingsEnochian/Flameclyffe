# DEEP AR Depth and Material Architecture

## Decision

DEEP AR uses LiDAR / depth only through explicit user activation.

Depth is off by default.

Depth is most applicable in AR, where it can help the instrument understand space, surfaces, occlusion, anchoring, and near-field presence.

## Principle

AR must not look like flat web panels pasted onto the room.

The same living style system used by Branch Loom, Signal Garden, Consent Web, and Observer v0.2 should be translated into AR-safe material tokens.

CSS remains the design language. AR renderers receive a compiled material contract.

## Consent model

Depth / LiDAR is a sensory branch in the Consent Web.

Default state: off.

Allowed states:

- off: visible but inactive
- on: user has explicitly activated depth sensing
- blocked: unavailable, unsupported, or denied
- activity: temporary depth event pulse

The interface must clearly show when depth is active.

Depth must have a stop control.

Depth must never be required for core use.

## Privacy model

Raw depth maps and room meshes are not stored by default.

The preferred flow is:

`raw depth / mesh -> DepthPrivacyFilter -> coarse spatial events -> DEEP state`

Allowed coarse events include:

- surface:floor-detected
- surface:wall-detected
- surface:table-detected
- anchor:stable
- anchor:lost
- presence:near
- presence:mid
- presence:far
- occlusion:available
- room-field:calm
- room-field:busy

Local-only calibration can exist later, but must be explicitly labelled and separately consented.

## Module boundary

Recommended modules:

- SensorConsentGate
- DeepConsentWeb
- DepthInputAdapter
- DepthPrivacyFilter
- SpatialPresenceMapper
- ARMaterialTokenCompiler
- ARBranchRenderer
- ARFieldOrbRenderer
- ARHudLayer

Concrete future adapters:

- ARKitLiDARAdapter
- WebXRDepthAdapter

DEEP should not depend on ARKit, WebXR, or any specific hardware API directly.

The Observer should receive abstract spatial events, not raw device payloads.

## CSS to AR material translation

CSS tokens should remain the authoring source for visual intent.

AR receives material values derived from those tokens.

Example token mapping:

- `--presence` -> scale, opacity, depth weight, anchor strength
- `--coherence` -> edge clarity, line stability, material smoothness
- `--resonance` -> pulse speed, shimmer flow, branch current
- `--entropy` -> edge fray, noise, turbulence, distortion
- `--moon` -> palette phase, cool/warm tint, ritual ambience
- `--attention` -> focus sharpness, selected branch brightness
- `--charge` -> emissive bloom, rim light, flare strength

## AR material families

Recommended AR material families:

- Glass: translucent interface surfaces and cards
- Thread: Branch Loom / Consent Web branches in space
- Orb: Observer core and field body
- Ward: consent boundary, protected systems, unavailable sensors
- Echo: temporary pulse trails and afterimages
- Anchor: floor, wall, or table placement indicators

## Rendering rule

Flat 2D panels may exist as fallback, but primary AR should use spatial depth cues.

Use:

- parallax
- shadows or contact glows
- occlusion where available
- scale changes with distance
- world anchoring
- surface-aware placement
- gentle material thickness

Avoid:

- full-screen HUD clutter
- always-on bloom
- unreadable thin text in space
- sensor activation without clear user action
- storing room geometry by default

## Development order

1. Keep Consent Web branch for Depth / LiDAR off by default.
2. Add abstract `DepthInputAdapter` interface.
3. Add `DepthPrivacyFilter` that only emits coarse events.
4. Add `ARMaterialTokenCompiler` to translate CSS/state tokens into renderer-friendly material values.
5. Build a non-sensor AR material mock using static depth events.
6. Only then connect a real ARKit or WebXR adapter.

## Production promotion rule

No AR depth feature is production-ready until it has:

- explicit consent toggle
- active sensor indicator
- stop control
- no raw mesh persistence by default
- fallback controls for non-depth devices
- reduced-motion / low-power mode
- accessibility path that does not require AR
