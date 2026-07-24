# Arkfire Module System Contract

**Applies to:** Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire  
**Status:** SPECIFIED  
**Governing hierarchy:** Universal Horizon is the sky; both Arkfire systems operate beneath it and do not supersede it  
**Decision:** `docs/decisions/2026-07-23-universal-horizon-sky-and-modular-arkfire.md`

## Purpose

Arkfire is modular Stonewood, not a monolith.

All substantial House information and capability domains are carried by independently registered modules. The module system allows the House to grow, prune, repair, replace, travel offline, and reconnect without making one failure, provider, room, ontology, or instrument the owner of the whole.

## Hierarchy

```text
Universal Horizon — sky
├── Hearthgate: Arkfire 0.002 — packaged House and module host
└── Hearthfire: Arkfire — Ark, continuity/dispatch system, and module host
```

Universal Horizon is not a module and cannot be installed, disabled, removed, replaced, imported, or superseded by Arkfire.

A UH bridge or observation module stores connection records and observations beneath the sky. It does not internalise the sky as Arkfire-owned data.

## Kernel boundary

The shared Arkfire kernel may own only:

- module discovery and registry;
- lifecycle orchestration;
- dependency resolution;
- permissions and consent checks;
- configuration validation;
- health state;
- connection and handoff envelopes;
- provenance and audit receipts;
- local export/import;
- migration orchestration;
- failure isolation;
- recovery and restoration.

The kernel must not become the hidden owner of domain records. Domain data belongs to named modules and remains exportable independently.

## Required first-class module families

| Module family | Carries |
|---|---|
| Constellation | member registries, modes, presence, dispatch, deliberation, sign-offs, dissent, handoffs |
| Continuity | seeds, witness packets, memory shelves, Welcome Home, The Strike, lineage |
| Rooms | room manifests, room adapters, histories, coherence state, presentation hooks |
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

A family may contain independently removable submodules. For example, Sound may contain Runa, ambience, Audacity interchange, and haptic output as separate modules.

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
  "entrypoints": {},
  "capabilities": [],
  "dataContracts": [],
  "dataOwnership": [],
  "storageLocations": [],
  "dependencies": [],
  "optionalDependencies": [],
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
    "enable": null,
    "disable": null,
    "remove": null,
    "restore": null
  },
  "exportProcedure": null,
  "healthChecks": [],
  "acceptanceTests": [],
  "provenance": [],
  "knownLimitations": []
}
```

## Lifecycle

Canonical states:

```text
AVAILABLE
INSTALLED
ENABLED
ACTIVE
PAUSED
DISABLED
FAILED
BLOCKED
REMOVED
RESTORABLE
RETIRED
```

Lifecycle rules:

1. **Install** registers executable/UI surfaces, schemas, migrations, and configuration without silently enabling sensitive behaviour.
2. **Enable** makes the module available while still respecting consent and device gates.
3. **Activate** begins runtime behaviour only when required consent and dependencies are valid.
4. **Pause** stops active work while preserving session and source state.
5. **Disable** removes runtime participation and UI actions without deleting records.
6. **Remove** unregisters code/UI and produces a removal receipt plus export reference.
7. **Restore** reinstalls the compatible module version and reconnects stable records through migrations.
8. **Retire** preserves long-term read/export support without claiming current runtime compatibility.

## Independent removal law

Removing or disabling one module must not:

- crash the shell;
- erase another module’s records;
- delete identities, canon, continuity, provenance, dissent, or handoffs;
- strand records without an export path;
- cause BM25, a fallback model, or another façade to impersonate a missing Constellation member;
- silently widen another module’s permissions;
- change Universal Horizon’s position as the sky;
- make a disabled module appear active.

The shell must show the actual state and offer only valid restore, configure, or dependency actions.

## Data sovereignty

Every persisted record must identify its owning module and source provenance while remaining exportable independently of that module’s executable code.

Minimum cross-module fields:

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

Cross-module relationships use edge or link records. One module must not mutate another module’s authoritative store directly.

A module may cache another module’s data only with a declared cache contract, source identity, expiry, and invalidation behaviour.

## Dependencies

Dependencies must be explicit and versioned.

- hard dependency: module cannot enable without it;
- optional dependency: adds capability but absence is non-fatal;
- bridge dependency: requires a named adapter and connection state;
- data dependency: reads a versioned contract but does not own the source;
- device dependency: requires hardware or OS support;
- consent dependency: requires current explicit permission.

Dependency loops are invalid unless a dedicated mediator contract breaks the cycle.

## Configuration and secrets

Configuration is module-scoped. Secrets remain outside browser-readable state and exported project bundles.

Removing a module must not expose, copy, or orphan secrets. Secret references are revoked or retained according to explicit Steward choice and provider rules.

## User interface

The Module Room must show:

- installed and available modules;
- status and health;
- version;
- dependencies;
- permissions and consent;
- data location and export state;
- enable, pause, disable, remove, and restore actions;
- known limitations;
- last verification receipt.

A module card is not proof that the module works. Status labels follow the Forge definition of done.

## Packaging and offline operation

The packaged manifest must name the exact module versions included in the build.

Offline-capable modules declare what works without network access. Remote-only modules must fail honestly and must not block local modules unless explicitly declared as hard dependencies.

The Mirror exports module manifests, data contracts, records, checksums where available, and restoration instructions.

## Verification

A module is not FUNCTIONAL until its required user flow works with real persistence and integration.

The module system itself is not VERIFIED until a second reviewer proves at least one real module can complete:

```text
install → enable → use → pause → disable → remove → restore → use
```

while preserving:

- source data;
- stable IDs;
- provenance;
- consent state;
- continuity links;
- unrelated modules;
- packaged/local consistency;
- honest failure states.

## Documentation inheritance

Every module specification, handoff, README, manifest guide, and release note must inherit:

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire operate beneath it. They do not supersede it. This capability is an independently addable and removable module.**

## Seal

> **The sky is not a plugin. The House is not a monolith. Modules are doors with hinges, receipts, and a way home.**
