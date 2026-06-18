# Unit Resonance Kernel

The Unit Resonance Kernel turns the unit-distance proof pattern into STARWELL architecture without welding meaning into components.

## Rule of the road

- The math kernel owns distances, unit edges, bounded windows, and projections.
- Config owns dimensions, weights, tolerance, window rules, and projection modes.
- Adapters translate app data into resonance nodes.
- Renderers draw whatever graph they receive. They do not decide canon.

## Proof pattern translated

The unit-distance construction uses hidden high-dimensional structure, many unit translations, a bounded window, and a projection into the plane. STARWELL uses the same shape:

1. Hidden state space: DEEP fields, gallery canon, route metadata, manuscript signals, or other app state.
2. Unit translation: a configured one-step relationship in the selected metric.
3. Bounded window: visible, consented, current nodes only.
4. Projection: UI coordinates for SVG, Canvas, WebGL, audio routing, or future haptic layers.

## Package map

```txt
apps/starwell/src/math-kernels/unit-resonance/
  validation.js
  vector.js
  distance.js
  edges.js
  projection.js
  window.js
  index.js

apps/starwell/src/configs/resonance/
  deep-default.js
  gallery-canon.js
  unit-resonance-lab-demo.js

apps/starwell/src/adapters/resonance/
  fromDeepSignals.js
  fromGalleryItems.js
  fromRouteRegistry.js
```

## Live lab

The lab page is `apps/starwell/unit-resonance-lab.html`. Vite ships it as a separate build input, so the GitHub Pages route is expected to be:

```txt
/Flameclyffe/starwell-react-lab/unit-resonance-lab.html
```

## No-hardcode contract

A component may receive a graph, read a label, and render a strand. It may not invent distances, canonical relationships, or metric weights. Any new meaning goes into config or an adapter.
