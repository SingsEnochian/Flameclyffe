# Starwell Concurrent Field Engine v0.1 Read-Only Lab

## Status

Implemented as a standalone STARWELL lab entrypoint:

- `apps/starwell/scfe-lab.html`
- `apps/starwell/src/scfe-lab-main.jsx`
- `apps/starwell/src/components/scfe/SCFELab.jsx`
- `apps/starwell/src/scfe/`

The lab is included in `apps/starwell/vite.config.js` as `scfeLab`, so it participates in the STARWELL build without altering the primary `main.jsx` room map.

## Purpose

SCFE v0.1 creates one read-only Field Snapshot from one input moment.

The snapshot currently includes:

- manual slow-planet longitudes
- Barbault-style Cyclic Index calculation
- all ten pairwise angular distances
- major aspect detection
- basket/cradle candidate detection
- sacred geometry mapping
- DEEP seed vector
- somatic safety mode
- Hearthfire frequency protocol recommendation or suppression
- Terra Aeterna prompt
- agency-safe prompt
- copy/export JSON controls

## Safety and Consent Boundaries

This slice is intentionally read-only.

It does not:

- write to Supabase
- sync to Notion
- mark Terra Aeterna outputs as canon
- generate or play audio
- make medical claims
- present astrological symbolism as deterministic prediction

Somatic safety can suppress frequency protocol recommendations. Migraine mode yields `low_light_silent`; body-no yields `paused`.

## Data Contract

The core contract lives in:

```text
apps/starwell/src/scfe/contracts/field-snapshot.js
```

Schema version:

```text
scfe.field_snapshot.v0.1
```

The contract requires evidence labels for every interpretive layer:

- astronomy
- Barbault index
- astrology
- sacred geometry
- DEEP
- somatic
- frequency
- Terra Aeterna
- agency

## First Test Case

The default lab values use a July 20, 2026 manual-longitude test case:

```json
{
  "jupiter": 126,
  "saturn": 14,
  "uranus": 62,
  "neptune": 4,
  "pluto": 307
}
```

Expected kernel output:

- Cyclic Index: `832`
- compression label: `wide_distribution`
- basket/cradle candidate: present when opposition + enough trine/sextile relationships exist
- geometry: `cradle_vessel`
- DEEP field label: `threshold_vessel`

## Tests

Tests live in:

```text
apps/starwell/test/scfe.test.js
```

Run with:

```bash
npm run starwell:test
```

The tests cover:

- shortest angular distance
- ten-distance Cyclic Index total
- basket/cradle candidate ingredients
- unified Field Snapshot creation
- somatic safety suppressing sound recommendations

## Build

The lab is included in the existing STARWELL build input list.

Run with:

```bash
npm run starwell:build
```

## Next Slice

SCFE v0.2 should add only after v0.1 review:

1. ephemeris adapter
2. stronger configuration detector
3. visual geometry canvas
4. local JSON archive queue
5. optional Supabase draft table behind explicit user save
6. actual Hearthfire audio prototype behind manual activation

No audio, sync, canon promotion, or database writes should happen automatically.
