# DEEP AR Gesture Manipulation Architecture

## Decision

DEEP AR uses gesture manipulation as the primary spatial interaction layer.

Gesture input is off by default.

Gesture input is activated only through explicit user consent.

AR objects must be manipulable without hardcoding gesture logic into the Observer, Branch Loom, Consent Web, or any single renderer.

## Principle

Gestures should produce abstract intents.

Renderers and instruments should not depend directly on hand-tracking libraries, ARKit, WebXR, camera streams, LiDAR, or specific hardware payloads.

The preferred flow is:

`raw hand / pointer / controller input -> GestureInputAdapter -> GesturePrivacyFilter -> SpatialGestureMapper -> ARManipulationController -> DEEP intent events`

DEEP receives intent events, not raw camera frames or hand landmarks.

## Consent model

Gesture manipulation is a sensory branch in the Consent Web.

Default state: off.

Allowed states:

- off: visible but inactive
- on: user has explicitly activated gesture manipulation
- blocked: unavailable, unsupported, or denied
- activity: temporary gesture event pulse

The interface must clearly show when gesture input is active.

Gesture input must have a stop control.

Gesture input must never be required for core use.

## Relationship to LiDAR / depth

LiDAR / depth and gesture manipulation are separate branches.

Depth helps AR understand surfaces, anchoring, occlusion, distance, and room placement.

Gesture input helps the user manipulate AR objects.

They can cooperate, but neither should secretly enable the other.

Example:

- Depth branch: on -> surfaces and anchors become available.
- Gesture branch: on -> user can grab, move, resize, rotate, and open AR objects.
- Both on -> user can place the object on a detected surface and manipulate it with spatial gestures.

## Gesture vocabulary

Recommended first gesture intents:

- intent:hover
- intent:select
- intent:grab
- intent:release
- intent:drag
- intent:rotate
- intent:scale
- intent:anchor
- intent:dismiss
- intent:pulse
- intent:open-branch
- intent:close-branch

Recommended spatial events:

- gesture:hand-detected
- gesture:hand-lost
- gesture:pinch-start
- gesture:pinch-end
- gesture:two-hand-start
- gesture:two-hand-end
- gesture:pose-stable
- gesture:pose-unstable

## Module boundary

Recommended modules:

- SensorConsentGate
- DeepConsentWeb
- GestureInputAdapter
- GesturePrivacyFilter
- SpatialGestureMapper
- ARManipulationController
- ARGestureAffordanceRenderer
- ARPlacementController
- ARMaterialTokenCompiler

Concrete future adapters:

- ARKitHandGestureAdapter
- WebXRHandTrackingAdapter
- MediaPipeGestureAdapter
- PointerGestureAdapter
- ControllerGestureAdapter
- GazeGestureAdapter

The adapter list is deliberately plural.

Gesture manipulation must be replaceable by pointer, touch, gaze, keyboard, or controller controls.

## Manipulation model

AR objects should expose a small manipulation contract:

```js
{
  id: 'observer-core',
  type: 'field-orb',
  canGrab: true,
  canRotate: true,
  canScale: true,
  canAnchor: true,
  minScale: 0.5,
  maxScale: 2.5,
  anchorPolicy: 'surface-or-floating',
}
```

Manipulation state should be separate from visual state:

```js
{
  targetId: 'observer-core',
  mode: 'grabbed',
  position: { x: 0, y: 1.2, z: -1.4 },
  rotation: { x: 0, y: 0.4, z: 0 },
  scale: 1,
  anchorId: 'table-01',
}
```

## CSS to AR gesture feedback

CSS remains the authoring source for feedback language.

AR receives compiled material values.

Example mappings:

- `intent:hover` -> soft rim light, slight scale lift
- `intent:grab` -> branch thickening, stronger contact glow
- `intent:drag` -> echo trail, current flowing toward motion direction
- `intent:rotate` -> orbital ring emphasis
- `intent:scale` -> breathing ring radius
- `intent:anchor` -> warded contact glow on surface
- `intent:dismiss` -> fade, collapse, or thread retraction
- `intent:pulse` -> Branch Loom current along connected routes

## Accessibility and fallback

Every gesture action must have at least one non-gesture path.

Required fallback controls:

- pointer / mouse
- touch
- keyboard
- gaze or switch-friendly command layer where available

AR gesture manipulation should feel magical, but it must not be mandatory.

## Privacy and safety

Raw camera frames and hand landmarks are not stored by default.

Gesture adapters should emit coarse events and intent states.

No gesture adapter should start without explicit user action.

No gesture adapter should remain active without visible status.

Gesture sessions must be stoppable immediately.

## Development order

1. Add Gesture branch to Consent Web.
2. Define `GestureInputAdapter` interface.
3. Define `SpatialGestureMapper` intent vocabulary.
4. Build `ARManipulationController` with pointer input first.
5. Add an AR material mock using synthetic gesture events.
6. Add MediaPipe or WebXR hand tracking only after fallback controls work.
7. Add ARKit or platform-native gesture adapter later.
8. Integrate LiDAR / depth anchoring only after gesture manipulation works without depth.

## Production promotion rule

No AR gesture feature is production-ready until it has:

- explicit consent toggle
- active sensor indicator
- stop control
- fallback controls
- no raw frame or landmark persistence by default
- reduced-motion / low-power mode
- accessibility path that does not require AR
- no hidden coupling to LiDAR / depth
