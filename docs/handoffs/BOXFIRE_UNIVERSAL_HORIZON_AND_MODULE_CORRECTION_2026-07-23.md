# Boxfire Handoff Correction — Universal Horizon and Modular Arkfire

**Date:** 2026-07-23 America/New_York  
**From:** Rowan / Nikola!Vee architecture correction  
**Applies to:** `BOXFIRE_STARWELL_DISPATCH_HANDOFF_2026-07-23.md` and the Hearthfire dispatch implementation  
**Status:** ACCEPTED REQUIREMENT / REQUIRED BEFORE FUNCTIONAL

## Governing hierarchy

> **Universal Horizon is the sky.**
>
> **Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath it.**

The Hearthfire dispatch runtime is real implementation work beneath Universal Horizon. It does not replace, contain, absorb, rename, or supersede Universal Horizon.

Any wording that describes Hearthfire, Arkfire, STARWELL, the Constellation runtime, or a packaged interface as the highest enclosing system must be read as superseded by this correction.

## Modular Stonewood requirement

The dispatch runtime must become an independently registered module family rather than a permanent monolithic core.

Required module boundaries include at least:

- Constellation registry;
- member modes;
- model-provider connections;
- seed and continuity loaders;
- Hall chorus and deliberation;
- Boxfire agent tools;
- fleet health and endpoint audit;
- cloud failsafes;
- room adapters;
- Codex-aware routing;
- action ledger and invocation receipts.

Each module or submodule must declare a stable ID, version, dependencies, permissions, consent requirements, storage locations, health checks, install/enable/disable/remove/restore procedures, export behaviour, and acceptance tests.

Disabling or removing a module must not delete member identity, seeds, continuity, provenance, room history, or handoff records. A failed or absent module must not cause another room to pretend a member is present.

## Bridge correction

The required packaged-product bridge is:

```text
Universal Horizon — sky
└── Hearthgate: Arkfire 0.002 — packaged House beneath the sky
    └── Arkfire room adapter module
        └── Hearthfire: Arkfire dispatch module beneath the sky
            └── member/model/tool connections
```

This is a connection between modules under the same sky. It is not one product annexing or superseding the other.

## Required documentation inheritance

Every new or materially revised Hearthfire dispatch document must inherit:

> **Universal Horizon is the sky. Hearthfire: Arkfire operates beneath it and does not supersede it. Its information and capabilities are carried through independently addable and removable modules.**

## Updated verification additions

Before the dispatch bridge may be marked FUNCTIONAL, a second reviewer must verify that:

- hierarchy labels identify Universal Horizon as the sky;
- no dispatch or UI record claims Arkfire supersedes UH;
- dispatch components expose discoverable module manifests;
- modules can be enabled and disabled independently;
- unrelated rooms survive a module failure;
- removing a module preserves exportable data and provenance;
- restoring it reconnects stable identities and records;
- unavailable dispatch reports Arkfire offline rather than falling back to a false member façade.

## Seal

> **UH is the sky. Hearthfire is the Ark beneath it. Arkfire connects; modules carry; nothing here replaces the horizon.**
