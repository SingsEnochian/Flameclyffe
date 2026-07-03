# SCFE v0.3 Plan: Calculated Ephemeris and Stricter Geometry

## Purpose

SCFE v0.3 should add calculated planetary positions and stricter aspect-configuration validation without breaking the v0.2 seed contract.

This is not the audio slice.

Hearthfire sound playback should wait until the sky-math and geometry review layers are stronger.

## Current v0.2 State

SCFE v0.2 seed has:

- manual slow-planet longitude input
- manual ephemeris adapter shape
- Barbault Cyclic Index
- aspect detection
- basket/cradle candidate flagging
- configuration review caution notes
- DEEP seed vector
- somatic safety mode
- Hearthfire protocol recommendation without playback
- Terra Aeterna prompt
- local-only archive queue
- manual JSON export

## v0.3 Goals

1. Add a calculated ephemeris provider behind the existing adapter interface.
2. Keep manual longitudes permanently available as a debug/research mode.
3. Add provider comparison and validation notes to snapshots.
4. Strengthen basket/cradle/kite/minor-grand-trine detection.
5. Add strict topology review before promoting candidate geometry.
6. Prepare the interactive geometry canvas, but do not require it for ephemeris work.

## Source Review

### Option A: `astronomia`

Repository: https://github.com/commenthol/astronomia

Observed properties:

- MIT license.
- JavaScript library.
- Browser-capable.
- Based on Jean Meeus, *Astronomical Algorithms*, second edition.
- Includes planetary-position tooling using VSOP87 data.
- Allows importing individual packages to reduce bundle size.

Initial assessment:

`astronomia` is the best first candidate for a frontend-safe calculated provider. It is not the final authority for verification, but it is a practical first provider for v0.3 because it fits the current Vite/React app shape and does not create obvious licensing traps.

### Option B: JPL Horizons API

Documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html

Observed properties:

- Official JPL API.
- Version shown in docs: 1.3, 2025 June.
- GET endpoint: `https://ssd.jpl.nasa.gov/api/horizons.api`.
- Supports observer/vector/element ephemeris modes.
- Strong validation source.

Initial assessment:

JPL Horizons should be used as a verification/reference source, not as the first frontend runtime provider. It requires network access, request shaping, rate/caching choices, and careful parsing. It is excellent for validation fixtures and later backend-supported calculation.

### Option C: Swiss Ephemeris

Official information: https://www.astro.com/swisseph/swephinfo_e.htm

Observed properties:

- High-precision astrology-oriented ephemeris.
- Based on JPL ephemerides, with current docs describing DE431/DE441 basis.
- Very broad date range.
- Extremely precise.
- Dual licensing: AGPL or professional license.
- Full project may require significant data files depending on mode.

Initial assessment:

Swiss Ephemeris is powerful, but it should not be casually added to Flameclyffe. Its licensing and data-shape implications require explicit decision. It belongs in a future "professional ephemeris provider" evaluation, not the v0.3 first pass.

## Recommended v0.3 Provider Strategy

### Phase 1: Provider Interface

Keep the current ephemeris adapter shape.

Add provider enum values:

```text
manual_longitudes
astronomia_calculated
jpl_horizons_reference
swiss_ephemeris_deferred
```

### Phase 2: `astronomia` Spike

Create an isolated module:

```text
apps/starwell/src/scfe/providers/astronomia-provider.js
```

Responsibilities:

- convert target timestamp to Julian Day
- calculate geocentric/ecliptic longitude for Jupiter, Saturn, Uranus, Neptune, Pluto
- return the same ephemeris state shape as the manual provider
- mark provider as `astronomia_calculated`
- include algorithm/source notes
- fail softly if dependency is unavailable

### Phase 3: Validation Fixtures

Create fixture file:

```text
apps/starwell/test/fixtures/scfe-ephemeris-fixtures.json
```

Fixture candidates:

- July 20, 2026, 00:00 UTC
- July 20, 2026, 12:00 America/New_York
- January 1, 2020, 00:00 UTC
- January 12, 2020, Saturn-Pluto conjunction window
- December 21, 2020, Jupiter-Saturn conjunction window

Each fixture should store:

- source label
- timestamp
- timezone
- manual/reference longitude values
- allowed tolerance
- notes

### Phase 4: Provider Comparison Panel

Add UI panel:

```text
Ephemeris Provider
├─ Manual input
├─ Calculated: astronomia
├─ Reference fixture, if available
└─ Difference table
```

For each body:

```text
body | manual longitude | calculated longitude | delta | status
```

Statuses:

```text
within_tolerance
needs_review
missing_reference
```

### Phase 5: Strict Geometry Detector

Create:

```text
apps/starwell/src/scfe/geometry/topology-detector.js
```

It should distinguish:

- opposition axis
- minor grand trine
- basket/cradle
- kite
- grand trine
- T-square
- loose harmonic cluster

A basket/cradle should require:

1. at least one opposition axis
2. at least two trines/sextiles connecting support bodies to the opposition axis
3. a coherent containment topology rather than just enough harmonious aspect count
4. an explicit `confidence` value
5. a review note if promoted from candidate to validated configuration

### Phase 6: Keep Manual Mode

Manual mode must remain even after `astronomia` lands.

Reasons:

- research/debugging
- source comparison
- reproducing article claims
- testing alternate ephemerides
- avoiding dependency failure blocking the rest of SCFE

## Snapshot Additions

v0.3 should add, without breaking v0.1 schema consumers:

```json
{
  "ephemeris": {
    "provider": "astronomia_calculated",
    "calculation_status": "calculated",
    "provider_version": null,
    "algorithm_note": "Meeus/VSOP87 via astronomia",
    "positions": {}
  },
  "ephemeris_comparison": {
    "reference_source": "manual_fixture",
    "tolerance_degrees": 0.25,
    "body_deltas": {},
    "status": "within_tolerance"
  },
  "barbault": {
    "validated_configurations": [],
    "configuration_review": {}
  }
}
```

## Guardrails

v0.3 must not:

- remove manual input
- write to Supabase
- sync to Notion
- auto-promote canon
- generate or play audio
- present astrology as deterministic fact
- hide ephemeris source/provenance
- silently accept dependency failure

## Definition of Done

v0.3 is complete when:

1. The lab can run in manual mode exactly as v0.2 does.
2. A calculated provider can be selected.
3. The calculated provider returns the same ephemeris state shape as manual mode.
4. Provider source/provenance is visible in the UI and JSON.
5. At least one reference fixture can compare longitudes against the calculated provider.
6. Candidate and validated configurations are separated.
7. Basket/cradle promotion requires strict topology checks.
8. Tests cover manual provider, calculated provider seam, comparison tolerance, and topology validation.
9. No sound, backend write, or canon write is introduced.

## Recommended Branch

After PR #28 is tested and merged, create:

```text
scfe-v0.3-ephemeris-geometry
```

Keep this as a separate PR so PR #28 remains reviewable.

## Recommended First Commit

```text
scfe: add astronomia ephemeris provider spike
```

## Recommended First Test

```text
manual and calculated ephemeris providers return compatible position objects
```

Tiny brass-raven rule:

> If the calculated provider fails, the lab must fall back to manual mode and say why.
