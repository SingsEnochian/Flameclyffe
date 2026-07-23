# Runa 3-6-9 Harmonic Triptych — Accepted Requirement

**Date:** 2026-07-23  
**Steward:** Rowan  
**Classification:** ACCEPTED REQUIREMENT → IMPLEMENTATION TASK  
**Canonical instrument:** STARWELL Sound & Tone Studio / Wardenclyffe × Möbius patch contract  
**Review:** Boxfire QA

## Outcome

Add a Runa preset family containing three declared stereo binaural patches:

| Role | Centre carrier | Binaural difference | Stereo pair |
|---|---:|---:|---:|
| Seed | 333 Hz | 3 Hz | 331.5 / 334.5 Hz |
| Coupling | 666 Hz | 6 Hz | 663 / 669 Hz |
| Transition | 999 Hz | 9 Hz | 994.5 / 1003.5 Hz |

The stereo pairs are symmetrical around the named carrier:

```text
left = carrier - beat / 2
right = carrier + beat / 2
carrier = (left + right) / 2
beat = abs(right - left)
```

Each patch uses a two-second exact-loop quantum so every declared oscillator closes on an integer cycle count.

## Declared layers

### Established engineering

- oscillator frequency arithmetic;
- protected left/right routing;
- explicit-tap Web Audio playback;
- exact-loop verification;
- named patch import/export through the canonical audio contract.

### Active research

- perception and possible entrainment effects associated with binaural difference tones.

### Symbolic correspondence

The uploaded source graphic associates:

- 333 / 3 with threefold spiral, solar plexus, fire, citrine, beauty, wisdom, and joy;
- 666 / 6 with sixfold flower, heart, water, rose quartz, grace, divine love, and correspondence;
- 999 / 9 with ninefold star, soul star, spirit, moonstone, transition, release, and rhythm.

These are retained as declared symbolic correspondences and do not alter the recorded carrier or beat values.

## Provenance

- source type: user-supplied graphic;
- title shown: “Nikola Tesla: The Magnificence of the 3, 6 and the 9… A Key to the Universe”;
- attribution shown: Pythagoras Beats;
- evidence register: symbolic correspondence;
- recorded: 2026-07-23.

## Current implementation status

### Functional in the branch

- three protected binaural presets registered in the canonical patch contract;
- explicit Seed, Coupling, Transition, and Feather controls in the coupled audio laboratory;
- exact carrier-pair playback without Concurrent Field mutation;
- source, evidence register, geometry, correspondences, and haptic plans stored in patch metadata;
- automated tests for carrier arithmetic, beat difference, exact loops, and epistemic separation.

### Specified, not implemented

- animated threefold, sixfold, and ninefold geometry rendering;
- iPad or compatible haptic output from the declared rhythm patterns;
- recorded audio export beyond the existing live engine paths;
- dedicated Runa preset-browser presentation inside the future unified Sound & Tone Studio.

## Acceptance evidence required

The feature remains `PARTIAL` until:

1. CI passes the new unit tests;
2. the coupled laboratory visibly renders the triptych card;
3. each button starts the expected pair on physical stereo headphones;
4. Feather stops all triptych sources;
5. patch export preserves metadata and declarations;
6. Boxfire records browser, audio-routing, and regression results.

## Governing line

The signal remains measurable. The correspondence remains visible. Neither is permitted to overwrite the other.
