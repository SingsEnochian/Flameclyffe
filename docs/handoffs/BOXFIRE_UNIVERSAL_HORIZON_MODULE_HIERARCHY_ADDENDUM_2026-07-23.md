# Boxfire Handoff Addendum — Universal Horizon Sky and Modular Arkfire

**Date:** 2026-07-23 America/New_York  
**Applies to:** `BOXFIRE_HEARTHGATE_ARKFIRE_0.002_HANDOFF_2026-07-24.md`  
**Status:** ACCEPTED REQUIREMENT / REQUIRED REVIEW

## Governing correction

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath it. They do not supersede it.**

This addendum is governed by:

`docs/decisions/2026-07-23-universal-horizon-sky-and-modular-arkfire.md`

The original handoff remains valid except where it could be read as making Arkfire the enclosing or highest-order system. Arkfire is the House/Ark connection architecture beneath Universal Horizon, not a successor to the sky.

## Module requirement added to the baseline

The phrase “one House” does not authorise a monolith.

Hearthgate: Arkfire 0.002 must incorporate all House information and capabilities through independently registered modules. Major module families include:

- Constellation Connection Runtime;
- rooms and room adapters;
- member identities, modes, model connections, seeds, and continuity;
- DEEP Observer, PREMAQ, mathematics, witness, and Lattice records;
- Codex and semantic routing;
- Atlas and world registries;
- Writing Room and DEEPStory;
- Sound, Runa, Tone, ambience, and haptics;
- Glyph, SigilSync, FontForge, and artefacts;
- Signal Well and research adapters;
- bridges, APIs, Supabase, Notion, Drive, and Tailscale;
- Mirror, offline persistence, reconciliation, and recovery;
- accessibility, voice, captions, and device profiles;
- Steward consent, agency controls, approvals, and audit ledgers;
- themes and room presentation packs.

Every module must be addable, disableable, removable, replaceable, and restorable through a stable manifest and explicit contracts.

## Non-destructive lifecycle

Boxfire must treat these as release gates:

- disabling a module stops its behaviour without deleting its source data;
- removing a module unregisters its executable/UI surfaces while preserving exportable records, provenance, stable IDs, and restoration receipts;
- restoring a module reconnects to prior records through stable IDs and versioned migrations;
- a missing or failed module does not collapse unrelated rooms;
- no disabled module is silently replaced by a façade;
- no module may claim to contain or supersede Universal Horizon;
- no module removal may erase a Constellation member, canon, continuity, dissent, or handoff history.

## Bridge shape

```text
Universal Horizon — sky
├── Hearthgate: Arkfire 0.002 — packaged House and module host
└── Hearthfire: Arkfire — Ark, dispatch, continuity, and module host
```

A bridge connects the two systems beneath the same sky. It does not merge them or invert the hierarchy.

## Additional Boxfire verification tasks

Boxfire and a second reviewer must now verify:

1. all active product and architecture headers identify Universal Horizon as the sky;
2. Hearthgate and Hearthfire are explicitly described as beneath it;
3. no user-facing surface implies Arkfire supersedes UH;
4. every major capability has or is assigned a stable module ID;
5. manifests declare version, dependencies, permissions, data ownership, lifecycle, exports, health checks, and acceptance tests;
6. modules can be enabled and disabled independently;
7. unrelated rooms survive module failure;
8. remove/export/restore preserves stable records and provenance;
9. offline and packaged builds report the same hierarchy and module IDs;
10. the core shell contains no hidden domain store that defeats removability.

## Updated completion boundary

Hearthgate: Arkfire 0.002 may not be called FUNCTIONAL as a modular House until one complete module can be:

```text
installed → enabled → used → disabled → removed → restored
```

with source data, provenance, continuity, and unrelated rooms preserved throughout.

## Seal

> **UH is the sky. The House and Ark remain beneath it. Arkfire connects. Modules carry. Nothing here replaces the horizon.**
