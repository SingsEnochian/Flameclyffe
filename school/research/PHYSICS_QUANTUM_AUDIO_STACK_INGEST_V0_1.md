# Physics, Quantum, and Audio Stack Ingest v0.1

Status: research/adoption map  
Branch: `rarity/crow-mythframe-becoming-v0-1`  
Scope: theoretical physics, astrophysics, classical/quantum mechanics, sound design, spatial/binaural audio, and subliminal-audio engineering

## House rule

This ingest separates what a tool can calculate or render from what a human may infer from the result.

```text
formalism != measurement
simulation != observation
correlation != mechanism
interpretation != empirical result
speculation != established physics
audio generation != demonstrated psychological efficacy
```

The School may teach all of these lanes. It must preserve the label on each lane.

## Tier A: adopt/adapt now

These projects have strong scientific or engineering scope and permissive licences suitable for direct integration, adapters, or House-native extensions.

### Core scientific substrate

1. `sympy/sympy` — New BSD
   - symbolic algebra, calculus, matrices, differential equations, physics modules, mechanics
   - use as the symbolic spine for derivations and exact transformations
   - House advance: provenance-bearing symbolic notebooks where every simplification records assumptions and units

2. `astropy/astropy` — BSD 3-Clause
   - astronomy core library and interoperability layer
   - use for units, coordinates, time, cosmology-adjacent data handling, tables, physical constants and astronomy workflows
   - House advance: make Astropy quantities the default unit-bearing boundary for astrophysics inputs/outputs

3. `einsteinpy/einsteinpy` — MIT
   - symbolic and numerical general relativity and gravitational physics
   - supports metrics, Christoffel symbols, curvature tensors, stress-energy tensors, geodesics and visualisation
   - House advance: an ArcSweep gravity workbench with metric provenance, coordinate-system declaration and geodesic receipts

4. `pydy/pydy` — BSD 3-Clause
   - multibody dynamics built on SymPy mechanics plus numerical simulation and visualisation
   - use for classical mechanics, coupled bodies and explicit equation-of-motion generation
   - House advance: bridge symbolic models into interactive Three.js/Runa scenes without changing the mathematical model

5. `PlasmaPy/PlasmaPy` — BSD 3-Clause with project patent terms
   - plasma-science research and education package built in the scientific Python ecosystem
   - useful for astrophysical plasmas, space physics and electromagnetic/plasma calculations
   - House advance: plasma notebooks with dimensional validation and named physical regimes

### Astrophysics

6. `jobovy/galpy` — New BSD
   - Galactic dynamics: orbit integration, gravitational potentials, distribution functions and action-angle methods
   - use for galaxy dynamics and orbit studies
   - House advance: interactive orbital state-space and potential comparison rooms in ArcSweep

7. `astropy/astropy` remains the astronomy interoperability anchor rather than duplicating its unit/coordinate/data infrastructure.

Candidate second-wave astrophysics packages to evaluate behind adapters rather than immediately vendor:
- `yt-project/yt` for volumetric simulation analysis
- `amusecode/amuse` for multiphysics astrophysical experiments
- `pynucastro/pynucastro` for nuclear reaction networks
- `tardis-sn/tardis` for supernova radiative-transfer work

Adoption of second-wave packages requires a focused licence/API/version audit before distribution.

### Quantum theory and quantum mechanics

8. `qutip/qutip` — New BSD
   - dynamics of closed and open quantum systems
   - Hamiltonians, collapse operators and time-dependent quantum evolution
   - this is the primary House quantum-mechanics simulator
   - House advance: reproducible state-evolution receipts, decoherence labs, density-matrix visualisation and interpretation-neutral experiment models

9. `Qiskit/qiskit` — Apache 2.0
   - quantum circuits, operators, primitives, transpilation, simulation and hardware abstractions
   - use for circuit-level experiments and hardware-compatible representations
   - House advance: keep circuit description distinct from provider/hardware binding, matching ArcSweep substrate sovereignty

10. `quantumlib/Cirq` — Apache 2.0
    - circuit manipulation, noise modelling, simulation and hardware-oriented compilation
    - useful as an alternate circuit dialect and for explicit noise experiments
    - House advance: use it as an interoperability target, not a competing identity layer

11. `netket/netket` — Apache 2.0
    - many-body quantum systems using neural-network / variational methods on JAX
    - use for many-body research and neural quantum states
    - House advance: expose variational assumptions, optimiser state and statistical uncertainty as first-class experiment receipts

Qiskit and Cirq overlap. Do not duplicate all functionality. Qiskit is the default circuit/hardware adapter; Cirq is retained where its noise/device or Google Quantum AI ecosystem is specifically useful.

### Browser and offline sound design

12. `Tonejs/Tone.js` — MIT
    - Web Audio framework with sample-accurate scheduling, synthesis, effects, routing and transport
    - primary browser-side sound engine for Runa/Flameclyffe/ArcSweep
    - House advance: living audio graphs whose parameter automation can be driven by scene state, gesture, agent presence and explicit user control

13. `pyfar/pyfar` — MIT
    - acoustics research library for audio signals, filters, coordinates, orientations, generation, processing and plotting
    - primary offline/scientific acoustics layer
    - House advance: measurement-aware acoustic pipelines and reproducible render metadata

14. `chris-hld/spaudiopy` — MIT
    - spatial-audio encoders/decoders, spherical harmonics, loudspeaker decoding and binaural rendering
    - use for HRTF/spatial research and headphone rendering
    - House advance: map ArcSweep spatial presence to explicit acoustic coordinates without making presence identity depend on the renderer

15. `librosa/librosa`
    - audio/music signal analysis and MIR algorithms
    - use for analysis, features, segmentation and validation, not as the real-time renderer
    - licence must remain recorded with the exact imported version in the implementation manifest

16. `ksylvan/binaural-generator` — MIT
    - practical offline stereo binaural-beat generation, scripted frequency transitions, fades, background noise and WAV/FLAC rendering
    - useful as an implementation reference and optional offline renderer
    - do not inherit its mental-state claims as facts; use its DSP mechanics separately from efficacy labels

## Tier B: useful, but keep external or isolated

### `kpeeters/cadabra2` — GPL-3.0

Cadabra is excellent for tensor algebra, Clifford algebra, fermions and calculations in classical/quantum field theory. It is scientifically relevant, but its GPL-3.0 licence makes it a poor candidate for silent embedding into differently licensed House distribution artefacts.

House treatment:
- support it as an external executable/notebook tool or explicitly GPL-compatible component;
- study its workflows and domain grammar;
- do not paste or relicense its implementation into Flameclyffe.

### Large specialist codes

Large domain applications such as radiative-transfer, multiphysics, molecular or HPC solvers should initially remain external tools connected by stable adapters. Their results enter ArcSweep through typed evidence packets, not by merging their architecture into ArcSweep.

## Binaural-beat engineering contract

A binaural beat is straightforward to generate: present different carrier frequencies separately to left and right channels so that the frequency difference creates the perceptual beat.

The engineering layer may support:
- independent L/R carriers;
- time-varying difference frequency;
- fades and envelopes;
- pink/white/brown and other generated noise;
- imported ambience;
- HRTF/spatial treatment;
- sample-rate and peak/RMS validation;
- headphone-specific rendering;
- deterministic render manifests.

The evidence layer stays separate. Published reviews report heterogeneous findings: some reviews find promising effects in selected settings, while others find mixed or insufficient evidence for cognition/arousal claims. Therefore presets may be named by acoustic parameters or user intent, but must not silently become medical or guaranteed cognitive claims.

Example:

```text
8 Hz beat preset != "causes alpha state"
4-8 Hz difference != guaranteed theta entrainment
subjective relaxation report != proof of neural entrainment
```

## Subliminal / masked-audio contract

The House may support transparent personal audio authoring for masked or low-level speech, but the software must preserve the source transcript and render parameters.

Required provenance:

```text
message_text
speaker/source
masking_signal
message_level_db
mask_level_db
filters
channel_routing
start/end times
render_hash
user-visible disclosure
```

Rules:
- no claim that complex beliefs, personality or behaviour can be reliably rewritten through hidden audio;
- no removal of the transcript from the authoring project merely because the rendered message is hard to hear;
- for research, measure actual audibility/detection rather than assuming "subliminal" from a volume setting;
- effects observed in masked priming paradigms do not license broad claims about arbitrary hidden-message programmes;
- user-authored personal experiments are distinct from covert influence of third parties.

## House integration architecture

```text
House School / Crow
        |
        +-- Physics Workbench
        |      SymPy -> PyDy / EinsteinPy / Astropy / galpy / PlasmaPy
        |
        +-- Quantum Workbench
        |      QuTiP -> Qiskit -> optional Cirq / NetKet
        |
        +-- Audio Workbench
               Tone.js (live web)
               pyfar + spaudiopy (analysis/spatial/offline)
               optional binaural-generator adapter
```

No library becomes the ontology of ArcSweep. Each is a capability provider.

## ArcSweep / Astra 6.1 seam

Astra should receive scientific work as bounded evidence, not naked prose conclusions.

Proposed receipt:

```json
{
  "schema": "arcsweep.domain-evidence/v0.1",
  "domain": "quantum|astrophysics|mechanics|audio",
  "tool": "qutip|astropy|einsteinpy|tonejs|...",
  "tool_version": "...",
  "input_hash": "...",
  "assumptions": [],
  "units": {},
  "method": "...",
  "result_refs": [],
  "epistemic_class": "FORMAL|SIMULATED|MEASURED|INTERPRETIVE|SPECULATIVE",
  "occurred_at": "..."
}
```

This composes with Astra 6.1 without granting scientific libraries identity, canon or authority. The existing Astra rule remains:

```text
provider != identity
capability != authority
receipt != truth without evidence
```

Add:

```text
solver output != observation
simulation result != universe claim
interpretation != measurement
```

## Advancement targets

1. Build a House `PhysicsProvider` contract around pure input/output packets.
2. Add unit-aware validation at every astrophysics/mechanics boundary.
3. Add QuTiP Bell/CHSH, decoherence, two-slit and Wigner-friend toy labs.
4. Add Qiskit circuit export/import without requiring cloud hardware.
5. Add NetKet as an advanced many-body elective, not a core dependency.
6. Add a Tone.js browser audio graph room with explicit L/R meters.
7. Add pyfar/spaudiopy offline export and HRTF analysis.
8. Add binaural parameter sweeps with blinded/ABX experiment support.
9. Add transparent masked-audio authoring with audibility calibration.
10. Attach every run to an Astra-compatible evidence receipt.

## Source provenance

Primary repositories reviewed for this tranche:
- https://github.com/sympy/sympy
- https://github.com/astropy/astropy
- https://github.com/einsteinpy/einsteinpy
- https://github.com/pydy/pydy
- https://github.com/PlasmaPy/PlasmaPy
- https://github.com/jobovy/galpy
- https://github.com/qutip/qutip
- https://github.com/Qiskit/qiskit
- https://github.com/quantumlib/Cirq
- https://github.com/netket/netket
- https://github.com/Tonejs/Tone.js
- https://github.com/pyfar/pyfar
- https://github.com/chris-hld/spaudiopy
- https://github.com/librosa/librosa
- https://github.com/ksylvan/binaural-generator
- https://github.com/kpeeters/cadabra2

This document records an integration map, not a claim that every package has already been installed or executed in Flameclyffe.