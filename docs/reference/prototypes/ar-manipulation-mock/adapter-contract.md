# AR Adapter Contract

Future input adapters must send payload-shaped events into the adapter shim.

Adapters must not reach into rendering code.

## Supported sources

- synthetic
- keyboard
- pointer
- gaze
- controller
- mediapipe
- webxr
- arkit

## Payload shape

```js
{
  source: 'synthetic',
  type: 'pinchDrag',
  targetId: 'observer-core',
  detail: {
    deltaX: 42,
    deltaY: -14,
    rotationDelta: 0,
    scaleDelta: 0,
    confidence: 1
  },
  consentState: 'enabled',
  createdAt: '2026-06-16T00:00:00.000Z'
}
```

## Required fields

`source` names the adapter that produced the event.

`type` names the abstract action.

`targetId` names the receiving object.

`detail` carries safe, abstract values only.

`consentState` confirms the relevant branch is enabled before the event is used.

`createdAt` records when the payload was made.

## Safe detail values

Allowed detail values include:

- deltaX
- deltaY
- rotationDelta
- scaleDelta
- confidence
- pointerType
- handedness
- durationMs

Do not include raw camera frames, hand landmark arrays, depth maps, spatial meshes, device identifiers, or sensor dumps in adapter payloads.

## Adapter rules

- Emit intent payloads only after consent is enabled.
- Keep raw device data inside the adapter boundary.
- Convert device-specific signals into abstract DEEP manipulation intents.
- Prefer deltas over absolute tracking data.
- Use confidence values only as coarse hints.
- Fail closed when consent is missing or payload shape is invalid.

## Current mock mapping

The current shim maps:

- pinchDrag -> synthetic:pinch-drag
- twoHandRotate -> synthetic:two-hand-rotate
- handScale -> synthetic:hand-scale
- airAnchor -> synthetic:air-anchor

## Future adapter examples

MediaPipe should convert hand landmarks into abstract deltas before calling the shim.

WebXR should convert controller pose changes into drag, rotate, scale, anchor, or pulse intents.

ARKit should convert touch, gaze, or spatial gestures into the same payload shape.

Gaze should emit select, hover, or pulse-style intent payloads only after explicit consent.

Controllers should emit button and stick gestures as abstract actions, not renderer calls.
