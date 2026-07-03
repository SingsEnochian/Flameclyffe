# Starwell Concurrent Field Engine v0.1 Read-Only Lab

## Status

Implemented as a standalone STARWELL lab entrypoint:

- `apps/starwell/scfe-lab.html`
- `apps/starwell/src/scfe-lab-main.jsx`
- `apps/starwell/src/components/scfe/SCFELab.jsx`
- `apps/starwell/src/components/scfe/GeometrySigil.jsx`
- `apps/starwell/src/scfe/`

The lab is included in `apps/starwell/vite.config.js` as `scfeLab`, so it participates in the STARWELL build without altering the primary `main.jsx` room map.

## Purpose

SCFE v0.1 creates one read-only Field Snapshot from one input moment.

The snapshot currently includes:

- manual slow-planet longitudes
- Barbault-style Cyclic Index calculation
- all ten pairwise angular distances
- major aspect detection
- aspect export inside the Field Snapshot
- basket/cradle candidate detection
- sacred geometry mapping
- visual geometry sigil
- DEEP seed vector
- somatic safety mode
- Hearthfire frequency protocol recommendation or suppression
- Terra Aeterna prompt
- agency-safe prompt
- preset buttons for safety/regression checks
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

Manual longitudes must be finite numbers within `0 <= value < 360`. Out-of-range values fail loudly so incorrect field math does not enter exported snapshots.

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

## Lab Presets

The lab includes four manual presets:

1. `July 2026 threshold` — default Barbault basket/cradle candidate.
2. `Body-no pause` — tests somatic veto, sound suppression, and rest-only agency.
3. `Migraine low-light` — tests low-light silent mode and protocol suppression.
4. `Stable alpha work` — tests an available-body state that can receive alpha grounding guidance.

These are UI convenience presets only. They do not write to storage.

## Visual Sigil

`GeometrySigil.jsx` renders a simple SVG aspect map from the exported aspect list.

The sigil is a visual guide only. The JSON snapshot remains the source of truth.

Current visual grammar:

- opposition → bright axis
- trine → flow line
- sextile → dashed gate line
- square/quincunx → pressure/hinge line
- basket/cradle candidate → vessel curve
- slow planets → labelled nodes

The sigil is designed to be reduced-motion safe and non-interactive in v0.1.

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
- manual longitude validation
- ten-distance Cyclic Index total
- basket/cradle candidate ingredients
- unified Field Snapshot creation
- aspect export inside the snapshot
- somatic safety suppressing sound recommendations
- body-no fully pausing sound and agency

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
3. interactive geometry canvas
4. local JSON archive queue
5. optional Supabase draft table behind explicit user save
6. actual Hearthfire audio prototype behind manual activation

No audio, sync, canon promotion, or database writes should happen automatically.
