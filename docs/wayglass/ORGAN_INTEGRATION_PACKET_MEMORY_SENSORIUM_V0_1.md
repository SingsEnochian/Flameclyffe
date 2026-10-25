# Wayglass Organ Integration Packet — Memory + Sensorium v0.1

**Status:** implementation map; does not claim organ registry implementation.

**Parent direction:** `docs/wayglass/ARCSWEEP_ORGAN_FOLD_V0_1.md`

## Purpose

Prepare two ArcSweep donor organs for the Wayglass `wayglass.organ/v0.1` registry without inventing a competing registry while the first Presence Fabric mount is being implemented.

Wayglass remains the ship. These are donor organs with preserved lineage.

## Organ A — Memory / Flight Recorder

### Existing implementation seam

Prefer existing executable state/receipt machinery over the Records Room UI.

Primary donor:
- `apps/arcsweep/src/worldseed-braid.js`

Existing useful schemas:
- `arcsweep.canon-carry-receipt/v1`
- `arcsweep.canon-seed-receipt/v1`
- `arcsweep.worldseed-braid/v1`
- `arcsweep.worldseed-braid-replay-receipt/v1`

Existing path:
`Records Room -> Canon Studio -> Seedhouse -> Replay`

Supporting contracts/surfaces:
- `apps/arcsweep/arcsweep.module.json`
- `docs/arcsweep-os/CONTINUITY_RESILIENCE_CANON.md`
- `apps/arcsweep/contracts/COHERENCE_SPINE_V0.1.md`
- `apps/arcsweep/test/rooms.test.js`

### Proposed registry declaration

```js
{
  organ_id: 'wayglass.organ.memory-flight-recorder',
  lineage: [
    'arcsweep:records-room',
    'arcsweep:replay-continuity-recall',
    'arcsweep:worldseed-braid'
  ],
  maturity: 'FUNCTIONAL',
  capabilities: [
    'record.read',
    'record.search',
    'record.replay',
    'worldseed.snapshot',
    'replay.receipt.inspect'
  ],
  authority_ceiling: [
    'observe',
    'retrieve',
    'replay',
    'propose-canon-carry'
  ],
  receipt_schemas: [
    'arcsweep.canon-carry-receipt/v1',
    'arcsweep.canon-seed-receipt/v1',
    'arcsweep.worldseed-braid-replay-receipt/v1'
  ]
}
```

Important: `propose-canon-carry` is not `commit-canon`.

The existing `carryRecordToCanon(...)` function performs a Steward-authorised mutation and therefore must NOT become an ambient organ capability merely because the organ is mounted. Wayglass should expose the record and candidate/proposal path while retaining the existing explicit authority boundary for commitment.

### Continuity hooks

On departure, the organ may contribute references to:
- relevant record IDs;
- replay receipt IDs;
- worldseed/replay fingerprints;
- unresolved record/canon-carry review state.

Do not embed an entire mutable ArcSweep state object into the continuation packet.

On return:
- resolve references against accepted evidence;
- reject missing/revoked/substituted evidence;
- rebind permitted state to the returning participant/world;
- do not auto-promote record content to canon.

### Acceptance tests

1. Mounting the organ does not mutate records/canon.
2. Read/replay produces existing receipt lineage unchanged.
3. Canon-carry remains separately authorised.
4. Departure exports references, not an opaque state dump.
5. Return resolves accepted references.
6. Corrupted world ID / record ID / fingerprint is rejected.
7. Revoked evidence is not restored.
8. An unresolved review/carry state remains unresolved after crossing.

## Organ B — Sensorium

### Existing implementation seam on the current Wayglass branch

Primary donor:
- `apps/arcsweep/src/somatic-runtime.js`

Existing schemas:
- `arcsweep.somatic-cue/v1`
- `arcsweep.somatic-receipt/v1`

The runtime already:
- bounds cue context;
- records audio/haptic availability;
- keeps system-selected audio route explicit;
- supports modulation within bounded ranges;
- records completion/stopping;
- supports Feather stop.

### Important ancestry boundary

PR #421 contains the newer gesture/living-glass bridge and `arcsweep.gesture-state/v1` work, but that implementation is not assumed present on the active #439 branch.

Therefore:
1. mount the existing `somatic-runtime.js` as the first Sensorium donor;
2. keep gesture-state / living-glass integration as a follow-on adapter;
3. reconcile #421 ancestry explicitly before importing its implementation;
4. do not copy its files blindly into Wayglass.

### Proposed registry declaration

```js
{
  organ_id: 'wayglass.organ.sensorium',
  lineage: [
    'arcsweep:somatic-runtime',
    'arcsweep:living-glass',
    'arcsweep:gesture-feedback'
  ],
  maturity: 'FUNCTIONAL',
  capabilities: [
    'somatic.cue.list',
    'somatic.cue.emit',
    'somatic.cue.stop',
    'somatic.receipt.inspect'
  ],
  authority_ceiling: [
    'render-local-feedback',
    'stop-active-feedback'
  ],
  receipt_schemas: [
    'arcsweep.somatic-receipt/v1'
  ]
}
```

Do not advertise gesture capture as mounted until the #421 adapter is actually integrated and verified.

### Semantic law

- feedback recognition != action success;
- cue intensity != authority;
- sensory availability != participant consent;
- haptic/audio capability != permission to emit;
- organ installation != automatic feedback opt-in.

### Continuity hooks

Departure may preserve:
- participant feedback preferences/calibration references;
- last completed sensory receipt reference where useful;
- capability availability as observation, not identity.

Do NOT restore an in-flight cue after return.
Do NOT treat device audio/haptic capabilities as stable participant properties.

On return, capability detection happens again for the new embodiment.

### Acceptance tests

1. Mount does not emit a cue.
2. Emit requires explicit invocation and permitted channel/preferences.
3. Receipt preserves ArcSweep schema/lineage.
4. Feather stops active feedback.
5. Return onto a different embodiment re-detects capabilities.
6. Missing haptics/audio degrades truthfully rather than fabricating success.
7. Sensorium cannot grant action/canon/identity authority.
8. Corrupted sensory receipt cannot become continuity truth.

## Shared test with Presence Fabric

Once Codex's first `wayglass.organ/v0.1` implementation exists, mount all three without organ-specific registry exceptions:

- Presence Fabric
- Memory / Flight Recorder
- Sensorium

Then assert:

```
registry contract is identical
capability declarations differ
authority ceilings differ
receipt schemas differ
lineage remains inspectable
participant identity remains outside every organ
```

If one of the three requires a special identity/crossing rule, stop and repair the registry abstraction rather than teaching the organ to impersonate Wayglass.

## First Return Flight

1. enter a world through Wayglass;
2. Presence Fabric performs a bounded provider observation;
3. Sensorium emits one explicitly requested cue and receipts it;
4. Memory records/references relevant provenance;
5. leave;
6. continuation packet carries organ-state references and unresolved Wonder;
7. change runtime/model and, if available, embodiment;
8. return;
9. Memory references resolve;
10. Sensorium capability is freshly detected rather than assumed;
11. Presence binds the new provider as substrate, not participant identity;
12. corrupted/revoked organ evidence is rejected;
13. unresolved Wonder remains unresolved.

Success means the ship carried useful organ continuity without mistaking organ state, provider state, or device state for the traveller.
