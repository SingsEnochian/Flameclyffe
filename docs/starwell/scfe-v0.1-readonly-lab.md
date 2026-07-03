# Starwell Concurrent Field Engine v0.2 Seed Read-Only Lab

## Status

Implemented as a standalone STARWELL lab entrypoint:

- `apps/starwell/scfe-lab.html`
- `apps/starwell/src/scfe-lab-main.jsx`
- `apps/starwell/src/components/scfe/SCFELab.jsx`
- `apps/starwell/src/components/scfe/GeometrySigil.jsx`
- `apps/starwell/src/scfe/`

The lab is included in `apps/starwell/vite.config.js` as `scfeLab`, so it participates in the STARWELL build without altering the primary `main.jsx` room map.

## Purpose

SCFE v0.2 seed creates one read-only Field Snapshot from one input moment.

The snapshot currently includes:

- manual slow-planet longitudes
- manual ephemeris adapter state
- Barbault-style Cyclic Index calculation
- all ten pairwise angular distances
- major aspect detection
- aspect export inside the Field Snapshot
- basket/cradle candidate detection
- configuration review flags and caution notes
- sacred geometry mapping
- visual geometry sigil
- DEEP seed vector
- somatic safety mode
- Hearthfire frequency protocol recommendation or suppression
- Terra Aeterna prompt
- agency-safe prompt
- preset buttons for safety/regression checks
- browser-local archive queue
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

The Local Archive Queue writes only to browser `localStorage`, keeps at most thirty entries, and does not sync anywhere.

## Data Contract

The core contract lives in:

```text
apps/starwell/src/scfe/contracts/field-snapshot.js
```

Schema version:

```text
scfe.field_snapshot.v0.1
```

The v0.2 seed preserves the v0.1 schema identifier while adding optional/forward-compatible sections for ephemeris and configuration review. A breaking schema rename should wait until the first calculated ephemeris provider is added.

The contract requires evidence labels for every interpretive layer:

- astronomy
- ephemeris
- Barbault index
- astrology
- sacred geometry
- DEEP
- somatic
- frequency
- Terra Aeterna
- agency

## Ephemeris Adapter

The manual ephemeris seam lives in:

```text
apps/starwell/src/scfe/ephemeris.js
```

Current provider:

```text
manual_longitudes
```

It converts manual longitude inputs into a provider-shaped state object with sign/degree data. Future calculated providers should write into the same shape so downstream modules do not care whether positions came from manual entry, an astronomy library, or a verified external ephemeris.

No live ephemeris lookup happens in this slice.

## Configuration Review

The review layer lives in:

```text
apps/starwell/src/scfe/configuration-review.js
```

It adds flags and notes such as:

- `basket_cradle_candidate`
- `opposition_axis_present`
- `harmonic_support_present`
- `wide_distribution_not_crisis_compression`

This is a caution layer. It prevents the UI from overclaiming candidate geometry before stricter topology validation exists.

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

The sigil is designed to be reduced-motion safe and non-interactive in v0.2 seed.

## Local Archive Queue

The local archive utilities live in:

```text
apps/starwell/src/scfe/local-archive.js
```

They provide:

- local snapshot save
- local queue read
- local queue clear
- max thirty stored entries

This queue is for review only. It is not canon, not synced, and not backend storage.

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
- configuration review: `candidate_needs_review`
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
- manual ephemeris adapter contract
- ten-distance Cyclic Index total
- basket/cradle candidate ingredients
- unified Field Snapshot creation
- configuration review status
- aspect export inside the snapshot
- somatic safety suppressing sound recommendations
- body-no fully pausing sound and agency
- local archive queue save/read/clear behaviour

## Build

The lab is included in the existing STARWELL build input list.

Run with:

```bash
npm run starwell:build
```

## Next Slice

SCFE v0.3 should add only after v0.2 seed review:

1. calculated ephemeris provider research and selection
2. stricter basket/cradle topology detector
3. interactive geometry canvas
4. explicit local archive restore/export controls
5. optional Supabase draft table behind explicit user save
6. actual Hearthfire audio prototype behind manual activation

No audio, sync, canon promotion, or database writes should happen automatically.
