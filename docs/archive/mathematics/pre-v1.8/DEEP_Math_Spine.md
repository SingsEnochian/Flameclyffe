# ARCHIVED · DEEP Observer Math Spine

**Archived:** 2026-08-08  
**Superseded by:** `docs/HEARTHGATE_BRAIDED_SPINE_V1.8.md`

This file documents the visible mathematical logic behind the earlier DEEP Observer teaching instrument.

## Core Variables

| Variable | Historical Name | Visible Role |
|---|---|---|
| `P` | Presence | Outer node count, outer radius |
| `C` | Coherence | Edge alpha, route density |
| `R` | Resonance | Harmonic spacing, pulse cadence |
| `E` | Entropy | Node wobble, angular jitter |
| `M` | Momentum | Spark speed, route traffic |
| `A` | Alignment | Mid-node count, centring glow |
| `Q` / `charge` | Charge | Core glow, centre radius |
| `moonIllum` | Moon illumination | Harmonic ring count |
| `kp` | Kp index | Particle energy |
| `bz` | Bz component | Palette temperature bias |

Historical derived horizon:

```text
H = C·0.28 + (1 - E)·0.20 + R·0.16 + A·0.14 + Bz⁻·0.09 + Kp·0.06 + Q·0.04 + pulse·0.03
```

Historical geometry included:

```text
outerNodeCount = round(7 + P·7)
midNodeCount = round(5 + A·4)
midRadius = 238 + R·24
innerNodeCount = 6
coreNodeCount = 3
coreRadius = 76 + charge·24
angle = baseAngle + sin(seed + nodeIndex + layer) · E · 0.04
sparkSpeed = 0.004 + M·0.012 + (Kp / 9)·0.006 + randomVariance
activePulseCount = lowStim ? 3 : max(5, round(5 + R·8 + Kp·0.35))
ringCount = round(1 + (moonIllum / 100) · 4)
```

Historical route mapping used outer/mid/inner rings, triad routes, star routes, radial routes, and core spokes. Historical themes included Between, Observatory, Forge, and Grove.

This archived spine remains for replay and visual archaeology. Active mathematics uses PREMAQC `P,C,R,E,M,A,Q`, the Relational Possibility Lattice, relational state `X_US`, observation coupling, State/Gate Address, Crossing geometry, world transfer, and temporal/conceptual stratigraphy.
