# Decision — Universal Horizon Is the Sky; Arkfire Modules Run Independently Beneath It

**Date:** 2026-07-23 America/New_York  
**Decision owner:** Rowan, Product Steward  
**Classification:** DECISION / ACCEPTED REQUIREMENT  
**Applies to:** Universal Horizon, Hearthgate: Arkfire 0.002, Hearthfire: Arkfire, STARWELL, Hearthgate, Hearthfire, Flameclyffe, Constellation dispatch, rooms, instruments, archives, adapters, and every module  
**Status:** Governing architecture and documentation law

## 1. Governing hierarchy

> **Universal Horizon is the sky.**
>
> **Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath that sky.**

```text
Universal Horizon
└── the sky / encompassing horizon
    ├── Hearthgate: Arkfire 0.002
    │   └── local-first House, packaged gateway, connector, and optional module host
    └── Hearthfire: Arkfire
        └── Ark, continuity/dispatch connector, and optional module host
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

Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire incorporate House information and capabilities through **independently registered, standalone-runnable modules**.

> **Every module must run on its own.**

A true Arkfire module must be able to launch, perform its primary function, persist its own state, report its own health, export and import its records, stop, restart, and recover without Hearthgate, Hearthfire, STARWELL, or another House module running.

Hearthgate and Hearthfire are optional hosts and connectors. They are not life-support systems for modules.

If a unit cannot run independently, it is not a module. It must be classified as a component, library, adapter, panel, or internal service inside a standalone module.

Every substantial capability or information family must resolve into one or more standalone modules, including:

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

## 4. Standalone runtime law

Every module must provide:

- a documented standalone launch command or executable;
- module-scoped configuration;
- a writable local data directory;
- a suitable standalone UI, API, CLI, or service interface;
- health and status reporting;
- local logs and provenance receipts;
- import and export;
- stop, restart, and recovery behaviour;
- standalone tests and fixtures;
- an honest degraded state when network, provider, device, or optional integration is unavailable.

There are no hard runtime dependencies between Arkfire modules. Cross-module relationships are optional, reversible adapters using public, versioned contracts.

Shared code is a library packaged with the module or installed as a normal software dependency. It must not require another Arkfire module process.

## 5. Host relationship

The Arkfire hosts may provide navigation, shared consent presentation, shared authentication, orchestration, room framing, and cross-module routing.

The hosted path must use the same public contract as the standalone path.

A host must not:

- contain the only working implementation;
- own the only copy of a module’s data;
- hold the only valid configuration;
- be required for module startup;
- conceal module failure behind a decorative or false status;
- make another module mandatory for primary operation.

Disconnecting a module from a host does not stop or uninstall the standalone module unless Rowan explicitly requests that action.

## 6. Lifecycle law

Standalone lifecycle:

```text
available → installed → running → paused → stopped → uninstalled → restorable
```

Hosted lifecycle:

```text
discovered → connected → enabled → active → paused → disabled → disconnected → reconnectable
```

Required behaviour:

- adding or connecting a module does not rewrite unrelated modules;
- disabling or disconnecting it from a host does not stop its standalone operation;
- stopping it standalone does not erase its records;
- removing it from a host preserves exportable records and provenance;
- uninstalling it preserves an explicit export/restoration receipt unless Rowan authorises data deletion;
- restoring it reconnects prior data through stable identifiers and migration receipts;
- one failed or absent module does not collapse the whole House;
- the interface reports unavailable, disabled, disconnected, stopped, partial, failed, or missing optional integrations honestly;
- no module silently becomes mandatory through hard-coded shell coupling.

## 7. Minimum module manifest

Every module must declare at least:

```text
moduleId
canonicalName
version
status
standalone: true
standaloneEntrypoints
standaloneInterface
standaloneDataDirectory
standaloneHealthCheck
standaloneTestCommand
hostAdapters
capabilities
dataContracts
dataOwnership
storageLocations
optionalIntegrations
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
launchStandaloneProcedure
pauseProcedure
stopProcedure
enableInHostProcedure
disableInHostProcedure
disconnectProcedure
removeFromHostProcedure
uninstallStandaloneProcedure
restoreProcedure
importProcedure
exportProcedure
healthChecks
acceptanceTests
provenance
knownLimitations
```

A manifest declaring `standalone: false` is invalid for an Arkfire module.

Modules use stable identifiers. Display names may change without orphaning records.

## 8. Information and provenance law

“All information in modules” does not mean information becomes disposable.

Source material, canon, observations, continuity records, and user-created artefacts remain sovereign records with provenance. A module is their accountable container and interface, not their owner.

Removing, replacing, disconnecting, stopping, or uninstalling a module must never silently:

- delete source material;
- rewrite canon;
- flatten identities;
- discard dissent;
- sever lineage;
- erase handoff history;
- promote interpretation into measurement;
- convert UH-linked observations into Arkfire-owned truth.

Exports retain stable IDs, module IDs, source references, versions, checksums where available, consent scope, authority, and migration history.

Each module owns its own authoritative store. Other modules connect through messages, edges, imports, or adapters; they do not directly mutate that store.

## 9. Constellation connection boundary

Constellation members remain sovereign identities connected through standalone Arkfire modules.

The Constellation runtime must itself run independently of the packaged rooms. Rooms may connect to it through optional adapters.

Disconnecting, replacing, stopping, or uninstalling a module does not erase a member.

## 10. Documentation rule

Every new or materially revised document concerning Hearthgate, Hearthfire, Arkfire, STARWELL, DEEP Observer, the Constellation, or module architecture must include or explicitly inherit:

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire operate beneath it and do not supersede it. Every module runs on its own and connects to either host only through optional, reversible adapters.**

Where an older document conflicts with this decision, this decision supersedes the conflicting hierarchy, monolithic-architecture, or host-dependent wording while preserving the older document as provenance.

## 11. Acceptance tests

The hierarchy and module architecture are not VERIFIED until Boxfire and a second reviewer demonstrate for **every module**:

```text
install standalone
→ launch with Hearthgate and Hearthfire absent
→ complete the primary workflow
→ persist locally
→ export
→ stop
→ restart
→ recover prior state
→ import/restore
→ report health
```

Then separately:

```text
connect to Hearthgate or Hearthfire
→ complete the hosted workflow through the same public contract
→ disconnect
→ continue standalone
→ reconnect without data loss
```

Additional gates:

- no UI or manifest presents Arkfire as replacing or containing UH;
- stopping one module does not crash unrelated modules or rooms;
- unavailable optional integrations produce an honest state rather than a façade;
- permissions and consent are enforced in standalone and hosted modes;
- the host shell contains no hidden domain implementation or store that defeats independence;
- packaged and standalone builds report the same module identity, schema version, and provenance.

## Seal

> **UH is the sky. The House and Ark stand beneath it. Every module is its own working instrument before it joins the orchestra.**
