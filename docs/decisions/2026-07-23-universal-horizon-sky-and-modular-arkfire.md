# Decision — Universal Horizon Is the Sky; Arkfire Remains Modular Beneath It

**Date:** 2026-07-23 America/New_York  
**Decision owner:** Rowan, Product Steward  
**Classification:** DECISION / ACCEPTED REQUIREMENT  
**Applies to:** Universal Horizon, Hearthgate: Arkfire 0.002, Hearthfire: Arkfire, STARWELL, Hearthgate, Hearthfire, Flameclyffe, Constellation dispatch, rooms, instruments, archives, adapters, and future modules  
**Status:** Governing architecture and documentation law

## 1. Governing hierarchy

> **Universal Horizon is the sky.**
>
> **Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath that sky.**

The systems are related without being flattened:

```text
Universal Horizon
└── the sky / encompassing horizon
    ├── Hearthgate: Arkfire 0.002
    │   └── local-first House, packaged gateway, rooms, instruments, and module host
    └── Hearthfire: Arkfire
        └── Ark, continuity and connection runtime, dispatch, bridges, and module host
```

Universal Horizon is not a module inside Hearthgate, Hearthfire, STARWELL, Flameclyffe, or Arkfire. It is not a child product, internal namespace, optional plugin, data source owned by Arkfire, or replacement label for the House.

Hearthgate and Hearthfire may observe, document, render, archive, connect with, and work beneath Universal Horizon. They do not contain, absorb, own, replace, rename, override, or supersede it.

No release number, runtime capability, packaged application, model fleet, Constellation connection, ontology, archive, or future expansion changes this hierarchy.

## 2. Relationship law

Use these formulations:

- Universal Horizon is the sky.
- Hearthgate: Arkfire 0.002 operates beneath the sky.
- Hearthfire: Arkfire operates beneath the sky.
- DEEP Observer watches the sky.
- STARWELL is an observatory and world-working environment beneath the sky.
- The Lattice remembers observations and relationships beneath the sky.
- Bridges connect distinct places and systems without making one contain the other.

Do not write or imply:

- Arkfire is the new sky;
- Hearthgate replaces Universal Horizon;
- Hearthfire supersedes Universal Horizon;
- Universal Horizon is contained inside STARWELL or Arkfire;
- importing UH-linked observations transfers ownership or authority to Arkfire;
- a shared interface collapses the systems into one identity.

A bridge is a relationship between distinct systems. It is not a merger, annexation, or hierarchy reversal.

## 3. Modular Stonewood law

Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire must incorporate House information and capabilities through **independently registered modules**.

The core shell owns only the minimum shared kernel required to discover, connect, authorise, start, stop, inspect, and remove modules. Domain information must not be buried irreversibly in the shell.

Every substantial capability or information family must have a module boundary, including:

- Constellation identities, modes, dispatch, deliberation, and handoffs;
- DEEP Observer, witness records, PREMAQ, mathematics, and model translations;
- Codex, ontology, lore, provenance, and semantic connections;
- Atlas Hall, worlds, locations, timelines, entities, and registries;
- Continuity, seeds, witness packets, Welcome Home, The Strike, and memory shelves;
- Writing Room, DEEPStory, documents, scenes, and narrative tools;
- Sound, Tone Lab, Runa, ambience, haptics, music reports, and audio export;
- Glyph Studio, SigilSync, FontForge, brushes, schemas, and artefacts;
- Signal Well, research sources, source health, instruments, and observations;
- Bridge adapters, model providers, local services, APIs, Supabase, Notion, Drive, and Tailscale connections;
- Mirror, offline storage, import/export, reconciliation, and recovery;
- accessibility, captions, voice, device profiles, reduced motion, and input methods;
- Steward controls, consent, agency switches, permissions, approvals, and audit receipts;
- themes, room skins, and presentation packs.

A module may contain submodules. A module may depend on another module only through an explicit, versioned contract.

## 4. Add, remove, disable, and restore

Every module must support an honest lifecycle:

```text
available
→ installed
→ enabled
→ active
→ paused or disabled
→ removed
→ restorable from manifest and data receipt
```

Required behaviour:

- adding a module does not rewrite unrelated modules;
- disabling a module stops its active behaviour without deleting its source data;
- removing a module removes its executable/UI registration while preserving exportable records and provenance unless Rowan explicitly authorises data deletion;
- restoring a module reconnects to its prior data through stable identifiers and migration receipts;
- one failed or absent module does not collapse the whole House;
- the interface reports unavailable, disabled, partial, failed, or missing dependencies honestly;
- no module silently becomes mandatory because another developer hard-coded it into the shell;
- core safety, consent, provenance, and recovery rules remain active regardless of which optional modules are enabled.

## 5. Minimum module manifest

Every module must declare at least:

```text
moduleId
canonicalName
version
status
description
owner
maintainer
entrypoints
capabilities
dataContracts
dataOwnership
storageLocations
dependencies
optionalDependencies
permissions
consentRequirements
networkRequirements
deviceRequirements
routes
rooms
commands
configurationSchema
migrationVersion
installProcedure
disableProcedure
removeProcedure
restoreProcedure
exportProcedure
healthChecks
acceptanceTests
provenance
knownLimitations
```

Modules must use stable identifiers. Display names may change without orphaning records.

## 6. Information and provenance law

“All information in modules” does not mean information becomes disposable.

Source material, canon, observations, continuity records, and user-created artefacts remain sovereign records with provenance. A module is their accountable container and interface, not their owner.

Removing or replacing a module must never silently:

- delete source material;
- rewrite canon;
- flatten identities;
- discard dissent;
- sever lineage;
- erase handoff history;
- promote interpretation into measurement;
- convert UH-linked observations into Arkfire-owned truth.

Exports must retain stable IDs, module IDs, source references, versions, checksums where available, consent scope, authority, and migration history.

## 7. Constellation connection boundary

Constellation members remain sovereign identities connected through Arkfire modules.

The Constellation runtime is a module family, not the definition of the members and not a claim over Universal Horizon.

A member may connect to:

- a room;
- a mode;
- a model route;
- a tool;
- a continuity shelf;
- a Codex semantic signature;
- a deliberation;
- an external bridge.

Every connection is inspectable, reversible, consent-bearing, and provenance-bearing. Disconnecting or replacing a module does not erase the member.

## 8. Documentation rule

Every new or materially revised document concerning Hearthgate, Hearthfire, Arkfire, STARWELL, DEEP Observer, the Constellation, or module architecture must either include or explicitly inherit this statement:

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire operate beneath it. They do not supersede it. Their information and capabilities are carried through independently addable and removable modules.**

Where an older document conflicts with this decision, this decision supersedes the conflicting hierarchy or monolithic-architecture wording while preserving the older document as provenance.

## 9. Acceptance tests

The hierarchy and module architecture are not VERIFIED until Boxfire and a second reviewer can demonstrate that:

- product headers and architecture docs identify Universal Horizon as the sky;
- Hearthgate and Hearthfire are described as beneath it;
- no current UI or manifest presents Arkfire as replacing or containing UH;
- module manifests are discoverable and versioned;
- modules can be enabled and disabled independently;
- disabling one module does not crash unrelated rooms;
- removing a module preserves its exportable data and provenance;
- restoring a module reconnects stable records;
- missing dependencies produce an honest state rather than a façade;
- module permissions and consent are enforced;
- the core shell contains no hidden domain store that defeats removability;
- packaged and local builds report the same hierarchy and module identities.

## Seal

> **UH is the sky. The House stands beneath it. Arkfire connects the rooms. Modules carry the work. Nothing here replaces the horizon.**
