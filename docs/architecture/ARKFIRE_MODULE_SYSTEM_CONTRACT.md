# Arkfire Module System Contract

**Applies to:** Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire  
**Status:** SPECIFIED  
**Governing hierarchy:** Universal Horizon is the sky; both Arkfire systems operate beneath it and do not supersede it  
**Decision:** `docs/decisions/2026-07-23-universal-horizon-sky-and-modular-arkfire.md`

## Purpose

Arkfire is modular Stonewood, not a monolith.

All substantial House information and capability domains are carried by independently registered, **standalone-runnable modules**. Hearthgate and Hearthfire are hosts, connectors, and shared-room environments. They are not life-support systems required to keep a module alive.

> **Every Arkfire module must be able to launch, perform its primary function, persist its own state, report health, export its records, stop, and restart without Hearthgate, Hearthfire, STARWELL, or another House module running.**

If a unit cannot run by itself, it is a component, library, adapter, panel, or internal service—not a module.

## Hierarchy

```text
Universal Horizon — sky
├── Hearthgate: Arkfire 0.002 — packaged House and optional module host
└── Hearthfire: Arkfire — Ark, continuity/dispatch system, and optional module host
```

Universal Horizon is not a module and cannot be installed, disabled, removed, replaced, imported, or superseded by Arkfire.

A UH bridge or observation module stores connection records and observations beneath the sky. It does not internalise the sky as Arkfire-owned data.

## Standalone runtime law

Every module, including every unit named as a submodule, must provide:

- its own documented launch command or executable entrypoint;
- its own configuration boundary;
- its own writable local data directory;
- its own suitable interface: UI, API, CLI, service endpoint, or a deliberate combination;
- its own health and status report;
- its own logs and provenance receipts;
- its own import and export path;
- its own stop and restart behaviour;
- its own tests and fixtures;
- its own honest degraded state when a network, device, provider, or optional bridge is unavailable;
- a documented way to run without either Arkfire host.

A standalone module may use operating-system facilities, a language runtime, or an external service inherent to its purpose. It may not require another House module to perform its **primary** function.

Examples:

- Codex must browse, edit under its own permissions, persist, import, and export without Atlas or Arkfire.
- Signal Well must launch, inspect local recordings, preserve receipts, and report remote-source outages without STARWELL.
- Runa must generate/play/export its supported tone work without the full Sound Room.
- Glyph Studio must draw, save, export, and report compiler availability without Hearthgate.
- Constellation dispatch must expose its registry, health, and dispatch interface without the packaged rooms.
- A room module must launch its own room surface and local history without the whole House shell.

If a proposed “submodule” cannot satisfy this law, it must be reclassified as an internal component of the nearest standalone module.

## Host relationship

Hearthgate and Hearthfire discover and connect modules through public contracts. A host may provide navigation, shared authentication, shared consent presentation, cross-module routing, and a common visual frame, but the hosted path must call the same public interface used by the standalone path.

The host must not:

- contain a secret second implementation of the module;
- own the only copy of module data;
- be the only place configuration exists;
- be required for module startup;
- replace the module’s health report with a decorative badge;
- make cross-module access mandatory for primary operation.

## Kernel boundary

The optional Arkfire host kernel may own only:

- module discovery and registry;
- lifecycle orchestration inside the host;
- adapter discovery;
- permissions and consent checks for hosted connections;
- configuration validation for host connections;
- hosted health aggregation;
- connection and handoff envelopes;
- provenance and audit receipts for host-mediated actions;
- local export/import orchestration;
- migration orchestration;
- failure isolation;
- recovery and restoration.

The kernel must not become the hidden owner of domain records. Domain data belongs to named standalone modules and remains exportable independently.

## Required first-class module families

| Module family | Carries |
|---|---|
| Constellation | member registries, modes, presence, dispatch, deliberation, sign-offs, dissent, handoffs |
| Continuity | seeds, witness packets, memory shelves, Welcome Home, The Strike, lineage |
| Rooms | room manifests, room surfaces, histories, coherence state, presentation hooks |
| Models | local/cloud provider connections, model availability, invocation receipts, fallbacks |
| Observer | first-hand witness, DEEP channels, PREMAQ, mathematics, Lattice links, model translations |
| Codex | ontology, lore, terms, aliases, semantic edges, provenance, revision history |
| Atlas | worlds, locations, entities, starmap, timelines, registries |
| Writing | documents, rich text, tags, DEEPStory, scenes, exports |
| Sound | ambience, Tone Lab, Runa, music reports, audio export, haptic mappings |
| Glyph | drawing, brushes, schema, SigilSync, FontForge, artefacts |
| Signal Well | source registry, source health, recording, research adapters, observations |
| Bridges | Supabase, Notion, Drive, Tailscale, APIs, local services, external systems |
| Mirror | offline snapshots, imports, exports, reconciliation, checksums, recovery |
| Accessibility | captions, voice, hearing routes, stylus, keyboard, reduced motion, device profiles |
| Steward | consent, agency controls, permissions, approvals, ingestion gates, QA and audit |
| Themes | room skins, palettes, typography, motion and low-GPU presentation packs |

Every listed family must resolve into one or more standalone modules. Shared code beneath them is a library or component, not a module.

## Module manifest

Every module must have one canonical, machine-readable manifest.

Minimum shape:

```json
{
  "schemaVersion": "arkfire.module/v1",
  "moduleId": "arkfire.example",
  "canonicalName": "Example Module",
  "version": "0.1.0",
  "status": "SPECIFIED",
  "owner": "Rowan",
  "maintainers": [],
  "description": "",
  "standalone": true,
  "standaloneEntrypoints": {},
  "standaloneInterface": [],
  "standaloneDataDirectory": null,
  "standaloneHealthCheck": null,
  "standaloneTestCommand": null,
  "hostAdapters": [],
  "capabilities": [],
  "dataContracts": [],
  "dataOwnership": [],
  "storageLocations": [],
  "optionalIntegrations": [],
  "permissions": [],
  "consentRequirements": [],
  "networkRequirements": [],
  "deviceRequirements": [],
  "routes": [],
  "rooms": [],
  "commands": [],
  "configurationSchema": null,
  "migrationVersion": null,
  "lifecycle": {
    "install": null,
    "launchStandalone": null,
    "enableInHost": null,
    "pause": null,
    "disableInHost": null,
    "removeFromHost": null,
    "uninstallStandalone": null,
    "restore": null
  },
  "importProcedure": null,
  "exportProcedure": null,
  "healthChecks": [],
  "acceptanceTests": [],
  "provenance": [],
  "knownLimitations": []
}
```

A manifest declaring `standalone: false` is invalid for an Arkfire module.

## Lifecycle

A module has two related but distinct lifecycles.

Standalone lifecycle:

```text
AVAILABLE → INSTALLED → RUNNING → PAUSED → STOPPED → UNINSTALLED → RESTORABLE
```

Hosted lifecycle:

```text
DISCOVERED → CONNECTED → ENABLED → ACTIVE → PAUSED → DISABLED → DISCONNECTED → RECONNECTABLE
```

Hosting and standalone execution must not be conflated. Disconnecting a module from Hearthgate or Hearthfire does not stop or uninstall its standalone process unless Rowan explicitly requests that action.

## Independent execution and removal law

Running, stopping, disconnecting, disabling, removing, or uninstalling one module must not:

- crash either host or another module;
- prevent that module from running standalone when merely disconnected from a host;
- erase another module’s records;
- delete identities, canon, continuity, provenance, dissent, or handoffs;
- strand records without an export path;
- cause BM25, a fallback model, or another façade to impersonate a missing Constellation member;
- silently widen another module’s permissions;
- change Universal Horizon’s position as the sky;
- make a disabled or stopped module appear active.

The host and the standalone module must each show the actual state.

## Data sovereignty

Every persisted record must identify its owning module and source provenance while remaining exportable independently of that module’s executable code.

Minimum record fields:

```text
recordId
moduleId
schemaVersion
createdAt
updatedAt
sourceProvenance
consentScope
authority
continuityRefs
exportState
```

Each module owns its own authoritative store. Cross-module relationships use edge, message, or adapter records. One module must not directly mutate another module’s authoritative store.

A module may cache another module’s data only through an optional adapter with source identity, version, expiry, and invalidation behaviour.

## Integration law

There are **no hard runtime dependencies between Arkfire modules**.

Allowed relationships:

- optional integration: enhances capability but absence is non-fatal;
- bridge adapter: connects two standalone modules through a versioned public contract;
- data import: receives an exported, versioned record without owning the source;
- device capability: enables hardware-specific behaviour while preserving a runnable degraded state;
- external provider: supplies remote data or inference while the module still launches and reports provider unavailability honestly;
- consent connection: permits an action but is not required for the module to start and show its status.

Shared implementation code must be packaged as a versioned library inside the module’s distributable or installed as an ordinary declared software dependency. It must not require another Arkfire module process.

Dependency loops between modules are invalid.

## Configuration and secrets

Configuration is module-scoped and must be usable in standalone mode. Host-specific configuration is an adapter overlay, not the only configuration source.

Secrets remain outside browser-readable state and exported project bundles. Disconnecting or uninstalling a module must not expose, copy, or orphan secrets.

## User interface

Every module must provide a suitable standalone interface for its primary capability. A visual module requires a standalone visual surface; a headless service requires a documented API/CLI and status surface.

The Arkfire Module Room must show:

- standalone launch availability;
- standalone and hosted status separately;
- version and build identity;
- optional integrations;
- permissions and consent;
- data location and export state;
- connect, enable, pause, disable, disconnect, remove-from-host, launch-standalone, stop, and restore actions where applicable;
- known limitations;
- last standalone verification receipt;
- last hosted verification receipt.

A module card is not proof that the module works.

## Packaging and offline operation

Every module must be distributable and testable separately from Hearthgate and Hearthfire.

A module package must include its manifest, launch path, configuration template, schemas, migrations, tests, export/import instructions, and health check.

Modules whose purpose includes remote data may require a network for fresh readings, but they must still launch offline, expose cached/local material where permitted, and report the remote source as unavailable rather than failing to start.

The Mirror exports module manifests, data contracts, records, checksums where available, and restoration instructions.

## Verification

A module is not FUNCTIONAL until it passes its **standalone** primary user flow with real persistence.

Hosted integration is a separate criterion and cannot substitute for standalone verification.

Every module must independently prove:

```text
install standalone
→ launch with both Arkfire hosts absent
→ complete primary workflow
→ persist locally
→ export
→ stop
→ restart
→ recover prior state
→ import/restore
→ report health
```

Then, separately:

```text
connect to host
→ complete hosted workflow through the same public contract
→ disconnect
→ continue standalone
→ reconnect without data loss
```

The module system is not VERIFIED until **each module**, not merely one example module, has standalone and hosted receipts from a second reviewer.

## Documentation inheritance

Every module specification, handoff, README, manifest guide, and release note must inherit:

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire operate beneath it and do not supersede it. This module runs on its own and may connect to either host through an optional, reversible adapter.**

## Seal

> **The sky is not a plugin. The House is not life support. Every module is its own working instrument before it joins the orchestra.**
