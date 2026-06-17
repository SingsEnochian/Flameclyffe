# AR Manipulation State Transition Examples

These examples document how pointer controls, keyboard controls, and synthetic gesture payloads reach the same manipulation controller.

## Pointer drag

Input:

```txt
pointerdown on object
pointermove on window
pointerup on window
```

Flow:

```txt
ar-manipulation.js -> controller.setMode(grab)
ar-manipulation.js -> controller.moveBy(dx, dy, drag)
ar-manipulation.js -> controller.setMode(release)
```

State effect:

```txt
mode: grab -> drag -> release
x/y: updated by pointer delta
```

## Keyboard move

Input:

```txt
ArrowLeft
```

Flow:

```txt
ar-manipulation.js -> controller.moveBy(-step, 0)
```

State effect:

```txt
mode: drag
x: x - step
```

## Keyboard rotate

Input:

```txt
]
```

Flow:

```txt
ar-manipulation.js -> controller.rotateBy(rotationStep)
```

State effect:

```txt
mode: rotate
rotation: rotation + rotationStep
```

## Keyboard scale

Input:

```txt
+
```

Flow:

```txt
ar-manipulation.js -> controller.scaleBy(scaleStep)
```

State effect:

```txt
mode: scale
scale: clamped between minScale and maxScale
```

## Synthetic pinch drag

Input payload:

```js
makeSyntheticPayload('pinchDrag')
```

Flow:

```txt
gesture-adapter-shim.receive(payload)
-> controller.syntheticGesture(synthetic:pinch-drag)
-> controller.moveBy(step * 3, -step, synthetic:pinch-drag)
```

State effect:

```txt
mode: drag
x/y: adjusted by synthetic gesture mapping
intent log: synthetic pinch-drag
```

## Synthetic two-hand rotate

Input payload:

```js
makeSyntheticPayload('twoHandRotate')
```

Flow:

```txt
gesture-adapter-shim.receive(payload)
-> controller.syntheticGesture(synthetic:two-hand-rotate)
-> controller.rotateBy(rotationStep * 2, synthetic:two-hand-rotate)
```

State effect:

```txt
mode: rotate
rotation: rotation + rotationStep * 2
intent log: synthetic two-hand-rotate
```

## Synthetic hand scale

Input payload:

```js
makeSyntheticPayload('handScale')
```

Flow:

```txt
gesture-adapter-shim.receive(payload)
-> controller.syntheticGesture(synthetic:hand-scale)
-> controller.scaleBy(scaleStep * 2, synthetic:hand-scale)
```

State effect:

```txt
mode: scale
scale: clamped between minScale and maxScale
intent log: synthetic hand-scale
```

## Synthetic air anchor

Input payload:

```js
makeSyntheticPayload('airAnchor')
```

Flow:

```txt
gesture-adapter-shim.receive(payload)
-> controller.syntheticGesture(synthetic:air-anchor)
-> controller.toggleAnchor(synthetic:air-anchor)
```

State effect:

```txt
mode: anchor
anchor: floating <-> surface
intent log: synthetic air-anchor
```

## Adapter rule

Future MediaPipe, WebXR, ARKit, gaze, or controller adapters should emit payload-shaped events into a shim rather than reaching into rendering code.

The controller is the doorway.
