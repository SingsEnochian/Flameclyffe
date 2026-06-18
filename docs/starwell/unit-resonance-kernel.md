# Unit Resonance Kernel

The Unit Resonance Kernel turns the unit-distance proof pattern into STARWELL architecture without welding meaning into components.

## Rule of the road

- The math kernel owns distances, unit edges, bounded windows, and projections.
- Config owns dimensions, weights, scales, tolerance, window rules, and projection modes.
- Adapters translate app data into resonance nodes.
- Renderers draw whatever graph they receive. They do not decide canon.

## Proof pattern translated

The unit-distance construction uses hidden high-dimensional structure, many unit translations, a bounded window, and a projection into the plane. STARWELL uses the same shape:

1. Hidden state space: DEEP fields, gallery canon, route metadata, manuscript signals, or other app state.
2. Unit translation: a configured one-step relationship in the selected metric.
3. Bounded window: visible, consented, current nodes only.
4. Projection: UI coordinates for SVG, Canvas, WebGL, audio routing, or future haptic layers.

## Metric contract

The canonical distance is scaled weighted Euclidean distance:

```txt
d(a,b) = sqrt(sum_i weight_i * ((a_i - b_i) / scale_i)^2)
```

Weights name channel importance. Scales name channel units. A zero weight intentionally makes the metric ignore that dimension. Scales must be positive.

Tolerance is the configured unit band. Epsilon is only floating-point fuzz.

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

The lab page is `apps/starwell/unit-resonance-lab.html`. Vite ships it as a separate build input.

Canonical GitHub Pages routes after deployment:

```txt
https://singsenochian.github.io/Flameclyffe/starwell-react-lab/unit-resonance-lab.html
https://singsenochian.github.io/Flameclyffe/starwell-react-lab/unit-resonance-lab/
https://singsenochian.github.io/Flameclyffe/starwell-react-lab/resonance-lab/
```

The extensionless routes are copied during Pages assembly so GitHub Pages does not 404 when the browser asks for a directory-style path.

## No-hardcode contract

A component may receive a graph, read a label, and render a strand. It may not invent distances, canonical relationships, or metric weights. Any new meaning goes into config or an adapter.
