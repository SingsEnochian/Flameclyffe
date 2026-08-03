# Geometric Manifold Engine

**Status:** Experimental local engine  
**Version:** 1.0.0  
**Runtime:** Flameclyffe ML Laboratory  
**Authority:** No canon, publication, consent or safety authority

## Position beside the existing engines

The Geometric Manifold Engine is a sibling instrument, not a replacement kernel.

```text
accepted Hearthweave / PREMAQ state
        │
        ├── Hearthgate Kernel        deterministic dual-aspect packet
        ├── Observer Audio Engine    bounded audio projection
        ├── Bifröst Temporal Engine  temporal evolution and crossing receipts
        ├── Living Engine            local typed service and browser bridge
        └── Geometric Manifold Engine
              experimental structural projections and diagnostics
```

Every engine receives a sealed source-state fingerprint. No geometric module creates its
own truth, rewrites PREMAQ or promotes an interpretation into canon.

## Runtime lanes

### Torch-free control lane

Always available with the base ML installation:

- dodecahedron, tesseract and penteract reference vertices;
- exact edge sets;
- Gram spectra and tight-frame checks;
- deterministic 3D projections for browser rendering;
- typed contracts and receipts;
- health and schema routes.

### Optional PyTorch worker lane

Available only with the `torch` extra:

- nonlinear anchor-manifold projection;
- differentiable SO(5) penteract rotation;
- causal Poincaré-ball attention;
- live token Gram matrices;
- projective quintic constraint proxy;
- complex-interference-inspired decoder;
- language, geometry, diversity and quintic losses;
- preference reward and DPO helpers;
- fixed-profile ONNX export wrapper.

The Living Engine starts without PyTorch. Heavy model imports are lazy and remain outside
the ordinary site process.

## Module contracts

### Anchor geometry

For a reference matrix

\[
G\in\mathbb{R}^{V\times d},
\]

the engine verifies unit vertices, zero centre and tight-frame structure:

\[
G^\mathsf{T}G=\alpha I_d.
\]

The current references are:

| Geometry | Vertices | Dimension | Edges | Frame constant |
|---|---:|---:|---:|---:|
| Dodecahedron | 20 | 3 | 30 | \(20/3\) |
| Tesseract | 16 | 4 | 32 | \(4\) |
| Penteract | 32 | 5 | 80 | \(32/5\) |

The dodecahedral field supports a compound of five tetrahedra. It is not labelled as five
Merkabas without explicit ten-tetrahedron incidence and orientation data.

### Live token geometry

Each token state produces live coordinates

\[
Z_{b,s}\in\mathbb{R}^{V\times d}
\]

and a live relational matrix

\[
L_{b,s}=Z_{b,s}Z_{b,s}^{\mathsf T}.
\]

Losses operate on `L`, not arbitrary slices of layer weights. This gives every structural
loss a real gradient path through the current activations.

### Hyperbolic attention

Queries and keys are mapped into a Poincaré ball. Pairwise token distance produces a
causal attention matrix of shape `[batch, heads, query_sequence, key_sequence]`. Values
and the residual stream remain Euclidean. Curvature and distance temperature are explicit,
bounded controls.

### Rotating penteract

Ten ordered Givens angles parameterise one differentiable element of \(SO(5)\). Rotation
preserves the penteract Gram matrix exactly, so Gram loss checks structural preservation
but cannot identify orientation. Orientation requires a declared external correspondence
or task loss.

### Projective quintic proxy

The research proxy creates five complex homogeneous coordinates and measures the residual

\[
\left|\sum_{i=1}^{5} z_i^5\right|^2.
\]

It does not calculate a Ricci-flat Calabi-Yau metric, a vanishing first Chern class or an
Euler characteristic. Those claims require separate mathematical machinery and evidence.

### Preference training

Geometry is not a human-alignment oracle. Preference training uses explicit chosen and
rejected examples through Bradley-Terry reward loss or DPO with a frozen reference model.
Geometry metrics remain auxiliary diagnostics.

## Service routes

The existing local Living Engine on `127.0.0.1:8765` exposes:

```text
GET  /v1/geometric/health
GET  /v1/geometric/contracts
POST /v1/geometric/reference
POST /v1/geometric/probe
```

`/reference` is torch-free. `/probe` returns `503` until the torch extra is installed.

## CLI

```bash
cd ml-lab
python -m pip install -e '.[service,torch,dev]'

flameclyffe-geometric-engine health
flameclyffe-geometric-engine reference penteract
flameclyffe-geometric-engine probe penteract --d-model 64
```

## Hearthweave activation

`GeometricActivationControls` binds one invocation to:

- source-state fingerprint;
- geometry ID;
- calibration ID;
- curvature;
- distance temperature;
- geometry gate;
- ten SO(5) angles;
- quintic tension;
- uncertainty.

A projection receipt records input, configuration and output hashes. Browser interfaces
render the diagnostics and never infer source-state authority from them.

## Export

ONNX export binds the actual trained model to a fixed rotation profile. The research
quintic proxy is excluded from the v1 export profile. A successful ONNX file write does
not establish TensorRT or Triton compatibility. Deployment requires runtime build,
numerical parity, latency, memory and target-device tests.

## Acceptance gate

The engine is ready to join a production workflow only after:

1. CPU-safe contract tests pass without PyTorch.
2. Optional Torch tests prove causality, finite gradients and rotation orthogonality.
3. Matched baseline and ablation experiments exist.
4. Data and model cards are complete.
5. Held-out metrics beat the named baseline.
6. Receipts include code revision, environment, seed, device and calibration.
7. Arcsweep receives proposals through review, not direct mutation.
