# ArcSweep -> Wayglass Organ Fold v0.1

## Governing rule

**Wayglass is the ship. Subsystems serve the voyage.**

ArcSweep is not to survive as a competing operating-system identity beside Wayglass. Its mature capabilities are to be folded into Wayglass as organs, instruments, rooms, services, and research bays while preserving their provenance, receipts, contracts, tests, and historical names where those names remain useful.

This is an architectural fold, not a destructive rename.

Do not delete or rewrite ArcSweep history merely to make the repository look unified.

## Why

Wayglass now owns the stronger vessel-level boundary:
- participant/world binding;
- Waygates and crossing;
- continuation/Return Engine boundary;
- departure and return semantics;
- inheritance and provenance;
- voyage choice;
- provider context;
- embodiment and route changes;
- ship-level sovereignty.

ArcSweep already contains mature organs the vessel needs.

The goal is one navigable organism:

`Wayglass OS -> organs -> rooms/instruments/services -> provider/device adapters`

not:

`Wayglass OS <-> ArcSweep OS <-> House Workspace OS`

## Ownership law

Wayglass owns:
- vessel identity and navigation;
- participant boundary;
- world/crossing semantics;
- continuity/return;
- voyage state;
- inheritance;
- ship-level permissions/authority;
- embodiment changes;
- organ lifecycle/registration.

An imported organ owns its bounded domain behaviour.

An organ must not redefine participant identity, world identity, crossing law, canon authority, or Wayglass continuity semantics.

## First-class organs to fold

### 1. Presence Fabric -> Wayglass Presence / Nervous System

Source: verified Astra contract spine extracted from historical PR #406 through merged PR #425.

Preserve:
- identity distinct from provider/model/surface;
- CognitiveProvider abstraction;
- fail-closed capability negotiation;
- Sensory / Output contracts;
- bounded provider events;
- provider receipts are not trusted as execution evidence.

This becomes a core Wayglass nervous-system contract, not an ArcSweep-owned identity layer.

### 2. Records Room + Replay -> Wayglass Memory / Flight Recorder

Preserve:
- receipted records;
- Canon Carry fields;
- replay/continuity recall;
- provenance and restart/recovery requirements.

Integrate with Wayglass departure/return and inheritance receipts.

Do not make record presence equal canon promotion.

### 3. Timeline + Relationships -> Wayglass Continuity Cartography

Preserve as participant/world-history instruments.

Relationship declarations retain provenance and authority state.
A relationship surface must not author the relationship merely by displaying or inferring it.

### 4. Continuity Gate -> Return Engine instrument

Fold behind the Wayglass continuation/Return Engine boundary.

There must be one continuity law.
Do not create a second continuation packet or identity system.

Use ArcSweep's recovered creative/continuity mechanisms where useful, but Wayglass owns crossing acceptance/rejection.

### 5. Glyph Forge + Living Glyph + Brush Foundry + Font handoff -> Wayglass Forge Deck

These become creative/manufacturing organs aboard the ship.

Preserve:
- existing Glyph Studio reuse;
- creative organ registry lineage;
- Living Glyph transformation;
- material/stylus semantics;
- font/glyph handoff;
- persistence/export/import/replay evidence.

Canonical glyph/stroke meaning remains separate from experimental rendering, pronunciation, contour, or material annotation.

### 6. Sound organ registry + Sound Bank + SoundFont + Runa -> Wayglass Resonance Deck

Treat as perception/expression/instrumentation, not decorative media.

Preserve:
- Runa engine/surface;
- state-to-sound lineage;
- persistent Sound Bank;
- sound routing;
- Feather Stop;
- actual-device verification requirements.

Future resonance experiments may ask larger Wonder questions, but measured audio/haptic/device behaviour must remain distinguishable from interpretation.

### 7. Observer / DEEPTime / PREMAQC / Math Spine -> Wayglass Observatory

These become scientific/instrumentation organs.

Preserve the evidence chain:
observation -> measurement -> anomaly -> correlation -> model/packet -> interpretation.

No causation inflation.
No mythic or narrative interpretation impersonates measurement.
No measurement is allowed to erase the larger Wonder question.

### 8. Living glass + gesture/somatic feedback -> Wayglass Sensorium

Source includes PR #421.

Preserve:
- semantic gesture-state contract;
- local-target-only projection;
- auditory/haptic/visual coordination;
- reduced-motion/transparency fallbacks;
- recognition != execution;
- gesture intensity != authority;
- Feather stop;
- capability/outcome receipts.

Add camera/XR/Three.js adapters beneath the semantic contract rather than replacing it.

### 9. House Workspace control plane -> Wayglass Crew / Systems Deck

Source includes PR #417.

Preserve useful desk grammar:
`Chat | Work | Runtime | Skills | Sessions | Artifacts`

Preserve:
- named next owner;
- handoff acknowledgement;
- provider/model attestation;
- capability/runtime health;
- separate participant threads;
- no credential persistence;
- route != identity;
- presence != authority.

Do not make House Workspace another OS shell competing with Wayglass. Its useful control-plane surfaces become Wayglass crew/systems rooms.

### 10. Source Library + Non-Canon Ingest + Canon Studio -> Wayglass Library / Archive / Stewardship

Keep the distinctions:
- source/reference;
- non-canon intake;
- candidate;
- review;
- decision;
- canon.

A source entering the ship is not automatically promoted into canon.

### 11. World Registry -> Wayglass Charts

World Registry becomes the Wayglass chart/world catalogue used by Waygates.

A Waygate identifies a world, not a screen.

World metadata does not grant passage, authority, or identity.

### 12. Echo Index -> Wayglass Finder, but only after implementation

ArcSweep's own matrix marks Echo Index ENVISIONED / MISSING.

Do not pretend it is an existing organ.
Implement it as a resolver across existing stores rather than creating another duplicate database.

## Organ maturity rule

Use the ArcSweep feature verification vocabulary during migration:

- ENVISIONED
- SPECIFIED
- MOCKED
- PARTIAL
- FUNCTIONAL
- VERIFIED
- RELEASED

Folding an organ into Wayglass does not increase its maturity level.

A FUNCTIONAL organ remains FUNCTIONAL until Wayglass-specific acceptance evidence exists.

A PARTIAL organ remains PARTIAL.

No migration-by-renaming.

## Compatibility layer

During migration:
- keep existing `apps/arcsweep` routes/contracts working where practical;
- expose Wayglass-native organ registration above them;
- mark compatibility aliases explicitly;
- preserve receipt/provenance lineage;
- migrate consumers incrementally;
- remove an ArcSweep entrypoint only after its Wayglass replacement has equivalent or stronger acceptance evidence.

Historical receipt schema names do not need destructive rewriting.

## Proposed Wayglass organ registry

Each organ should eventually register at least:

```json
{
  "organ_id": "wayglass.organ.example",
  "lineage": ["arcsweep:<source-organ>"],
  "maturity": "FUNCTIONAL",
  "capabilities": [],
  "authority_ceiling": [],
  "routes": [],
  "receipt_schemas": [],
  "dependencies": [],
  "continuity_hooks": [],
  "embodiment_hooks": [],
  "evidence": []
}
```

`lineage` is provenance, not identity equivalence.

## First implementation slice

Do not migrate every organ at once.

Build the Wayglass organ registry and prove three very different organs through it:

1. **Presence Fabric** — cognitive/runtime organ.
2. **Records/Replay** — continuity/memory organ.
3. **Gesture/Somatic Sensorium** — embodiment/sensory organ.

For each:
- register existing implementation without copying it;
- declare capabilities and authority ceiling;
- preserve source lineage;
- route through Wayglass;
- emit/retain evidence;
- prove no participant/canon/authority mutation occurs merely by mounting the organ.

Then add Forge, Resonance, Observatory, Crew/Systems, Library, and Charts.

## Return Engine test

After the first organ trio is mounted:

1. participant enters a world;
2. uses at least one mounted organ;
3. stops/leaves;
4. continuation packet references relevant organ state/receipts by provenance;
5. participant changes model/runtime;
6. returns;
7. Wayglass restores/rebinds permitted organ state without redefining participant;
8. corrupted organ state or revoked evidence is rejected;
9. unresolved Wonder questions survive the crossing.

This is the first proof that Wayglass is not merely hosting ArcSweep pages. The ship is carrying its organs through a voyage.

## Explicit non-goals

- no mass rename of `arcsweep` files;
- no deletion of historical ArcSweep receipts;
- no second identity system;
- no second continuation packet;
- no automatic canon promotion;
- no authority expansion from organ installation;
- no claim that every ArcSweep feature is mature;
- no UI rewrite before the organ contract exists;
- no treating a framework/provider/model as the ship.

## Drift check

Before every fold:

> Does this organ help Wayglass travel, learn, encounter, transform, preserve its people and histories, perceive, create, cross a boundary, return, or discover how far it can sail?

If yes, bring aboard the strongest verified part and preserve its lineage.

If not, leave it in the archive/research yard until there is a reason for it to sail.
