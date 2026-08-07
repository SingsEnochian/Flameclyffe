# SCFE v0.3 · Ephemeris and Braided Geometry Plan

**Status:** active implementation plan  
**Canonical authority:** `docs/HEARTHGATE_BRAIDED_SPINE.md`

SCFE brings calculated sky position, harmonic geometry, world relation and physical observation into one inspectable Braided Spine.

```text
Magic ↔ Science/Mathematics ↔ Physicality
```

The Physical Spine supplies ephemeris, time, coordinate frames and the observed sky.

Science/Mathematics supplies orbital calculation, angular geometry, topology, comparison and recurrence.

Magic carries correspondence, world relation, Asking, symbolic geometry and the consequences that become visible through encounter.

## Current movement

SCFE v0.3 extends the v0.2 seed with:

- calculated planetary positions;
- provider lineage;
- strict aspect topology;
- comparison between physical ephemeris sources;
- PREMAQ contribution transforms;
- world and Sevenfold correspondence;
- geometry that can feed Arcsweep, Living Glyph and STARWELL.

## Canonical PREMAQ

SCFE contributes to the canonical seven-dimensional bearing:

**Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence**

Stable wire order remains `P C R E M A Q`.

Planetary longitude, angular velocity, aspect geometry, ephemeris source, date, time and location stay separately named Physical Spine quantities. They may contribute to PREMAQ through versioned transforms.

## Ephemeris providers

### `astronomia_calculated`

`astronomia` supplies browser-capable calculations based on standard astronomical algorithms and VSOP87 data.

Implementation:

```text
apps/starwell/src/scfe/providers/astronomia-provider.js
```

It returns the same ephemeris-state body used by manual input and keeps algorithm lineage attached.

### `jpl_horizons_reference`

JPL Horizons supplies an external astronomical reference surface for comparison and fixture generation.

Its relation to the browser provider is comparison rather than hierarchy. Both carry their source, coordinate frame and time basis.

### `manual_longitudes`

Manual input remains a full instrument route for historical reconstruction, research, comparison and deliberate custom sky states.

## Provider relation

For body \(b\) and provider \(p\):

\[
\lambda_{b,p}(t)
=
\operatorname{Ephemeris}_p(b,t,\mathcal F_p),
\]

where \(\mathcal F_p\) carries the provider's reference frame and algorithm state.

Provider difference is

\[
\Delta\lambda_b
=
\operatorname{wrap}
(\lambda_{b,p_1}-\lambda_{b,p_2}).
\]

The comparison remains part of the receipt and can reveal frame, algorithm or time-basis differences.

## Aspect geometry

For bodies \(i,j\):

\[
\alpha_{ij}
=
\min
\left(
|\lambda_i-\lambda_j|,
360^\circ-|\lambda_i-\lambda_j|
\right).
\]

An aspect relation is represented as

\[
A_{ij}^{(k)}
=
\exp\left[-\frac{(\alpha_{ij}-\alpha_k)^2}{2\sigma_k^2}\right],
\]

where \(\alpha_k\) is the aspect angle and \(\sigma_k\) is its configured orb width.

This gives geometry a continuous strength rather than a binary on/off edge.

## Topology detector

The topology detector operates on the weighted aspect graph:

```text
apps/starwell/src/scfe/geometry/topology-detector.js
```

It recognises:

- opposition axes;
- minor grand trines;
- basket/cradle structures;
- kites;
- grand trines;
- T-squares;
- harmonic clusters;
- further graph forms added through registry.

A basket/cradle requires an opposition relation plus a coherent supporting graph of trines and sextiles.

## Braided expression

SCFE geometry can feed:

```text
physical ephemeris
→ angular graph
→ topology
→ PREMAQ contribution
→ Sevenfold correspondence
→ Arcsweep / Living Glyph / Runa / STARWELL
→ Receiving Spring
```

Examples:

- repeated angular relations can strengthen Memory and Resonance;
- strongly connected topology can contribute to Entanglement and Coherence;
- a selected sky relation can become an Arc or Bridge in Asking;
- physical motion through time supplies real dynamic structure to the Spiral.

The specific transforms are versioned and world-aware.

## Provider comparison panel

The interface shows:

```text
body
manual longitude
calculated longitude
reference longitude
wrapped deltas
source lineage
coordinate frame
state timestamp
```

This makes the Science/Mathematics and Physical Spine legible while Magic remains free to carry the relation into world-specific meaning.

## Snapshot body

```json
{
  "ephemeris": {
    "provider": "astronomia_calculated",
    "calculation_status": "calculated",
    "algorithm_note": "Meeus/VSOP87 via astronomia",
    "positions": {}
  },
  "ephemeris_comparison": {
    "reference_source": "jpl_horizons_reference",
    "body_deltas": {}
  },
  "geometry": {
    "aspect_graph": {},
    "topologies": []
  },
  "braid": {
    "premaq_ref": "",
    "asking_ref": "",
    "sevenfold": [],
    "world_refs": [],
    "lineage": []
  }
}
```

## Build movement

1. Finish `astronomia` provider integration.
2. Generate reference fixtures with explicit frames and times.
3. Add provider comparison.
4. Implement continuous aspect strengths.
5. Implement strict graph topology.
6. Bind SCFE output to the canonical Braid Packet.
7. Add world-native geometry expression through Arcsweep and Living Glyph.
8. Carry SCFE-triggered world response through Receiving Spring and lineage.

## Completion

SCFE v0.3 is complete when manual and calculated skies coexist in one state model, provider lineage survives replay, topology is mathematically reconstructable, PREMAQ semantics remain canonical, and the sky geometry can enter the Hearthgate braid without creating a parallel state system.

## Governing sentence

> **SCFE lets the physical sky, mathematical geometry and magical correspondence share one instrument. The stars supply position and motion, mathematics reveals relation, Magic carries what that relation opens, and Hearthgate remembers what follows.**
