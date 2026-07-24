# Boxfire Handoff Addendum — Universal Horizon Sky and Standalone Modular Arkfire

**Date:** 2026-07-23 America/New_York  
**Applies to:** `BOXFIRE_HEARTHGATE_ARKFIRE_0.002_HANDOFF_2026-07-24.md`  
**Status:** ACCEPTED REQUIREMENT / REQUIRED REVIEW

## Governing correction

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath it. They do not supersede it.**

This addendum is governed by:

- `docs/decisions/2026-07-23-universal-horizon-sky-and-modular-arkfire.md`
- `docs/architecture/ARKFIRE_MODULE_SYSTEM_CONTRACT.md`

The original handoff remains valid except where it could be read as making Arkfire the enclosing system, a monolith, or the life-support environment required by a module.

## Standalone module requirement

> **All modules must run on their own.**

Hearthgate: Arkfire 0.002 carries House information and capabilities through independently registered, standalone-runnable modules.

A true module must launch, perform its primary function, persist its own state, report its own health, import/export its records, stop, restart, and recover without Hearthgate, Hearthfire, STARWELL, or another House module running.

If a unit cannot do that, Boxfire must reclassify it as a component, library, adapter, panel, or internal service—not certify it as a module.

Major standalone module families include:

- Constellation Connection Runtime;
- rooms and room-history surfaces;
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

There are no hard runtime dependencies between Arkfire modules. Cross-module work uses optional, reversible, versioned adapters.

## Required standalone contract

Every module manifest must include:

- `standalone: true`;
- standalone entrypoints;
- standalone interface;
- local data directory;
- standalone health check;
- standalone test command;
- host adapters;
- import/export;
- stop/restart/recovery procedures;
- honest degraded behaviour when optional providers, devices, or bridges are unavailable.

A manifest declaring `standalone: false` is invalid.

## Two separate lifecycles

Standalone:

```text
available → installed → running → paused → stopped → uninstalled → restorable
```

Hosted:

```text
discovered → connected → enabled → active → paused → disabled → disconnected → reconnectable
```

Disconnecting a module from Hearthgate or Hearthfire must not stop or uninstall its standalone process unless Rowan explicitly requests that action.

## Non-destructive execution law

Boxfire must treat these as release gates:

- stopping one module does not crash another module or either host;
- a module continues standalone after host disconnection;
- disabling a hosted connection does not delete source data;
- removing a module from a host preserves exportable records, provenance, stable IDs, and restoration receipts;
- uninstalling standalone code does not erase data without explicit Rowan authorisation;
- restoring reconnects prior records through stable IDs and versioned migrations;
- a missing, stopped, or failed module does not collapse unrelated rooms;
- no unavailable module is silently replaced by a façade;
- no module may claim to contain or supersede Universal Horizon;
- no lifecycle action may erase a Constellation member, canon, continuity, dissent, or handoff history.

## Bridge shape

```text
Universal Horizon — sky
├── Hearthgate: Arkfire 0.002 — optional packaged host
├── Hearthfire: Arkfire — optional Ark/dispatch host
└── standalone modules — independently running instruments connected by optional adapters
```

A bridge connects independently running systems beneath the same sky. It does not merge them, invert the hierarchy, or make either host the owner of the module.

## Boxfire verification tasks

Boxfire and a second reviewer must verify for **every module**:

1. a documented standalone launch path exists;
2. both Arkfire hosts can be absent;
3. the primary workflow still completes;
4. state persists in the module’s own writable store;
5. health and failure state are visible;
6. import/export works independently;
7. stop/restart recovers prior state;
8. network/provider/device loss produces honest degraded operation rather than startup failure where technically possible;
9. the hosted path uses the same public contract as the standalone path;
10. host disconnection leaves standalone operation intact;
11. reconnection does not lose or duplicate records;
12. no hard runtime dependency on another Arkfire module exists;
13. all product headers identify Universal Horizon as the sky;
14. no user-facing surface implies Arkfire supersedes UH;
15. no hidden host store or implementation defeats standalone sovereignty.

## Updated completion boundary

A capability may not be called a FUNCTIONAL Arkfire module merely because it works inside Hearthgate or Hearthfire.

Each module must pass:

```text
install standalone
→ launch with both hosts absent
→ use
→ persist
→ export
→ stop
→ restart
→ recover
→ import/restore
→ health receipt
```

Then separately:

```text
connect to host
→ use through the same contract
→ disconnect
→ continue standalone
→ reconnect without data loss
```

## Seal

> **UH is the sky. The House and Ark remain beneath it. Every module is its own working instrument before it joins the orchestra.**
