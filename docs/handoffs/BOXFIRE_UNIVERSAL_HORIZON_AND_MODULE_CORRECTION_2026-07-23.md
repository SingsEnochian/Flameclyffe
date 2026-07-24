# Boxfire Handoff Correction — Universal Horizon and Standalone Modular Arkfire

**Date:** 2026-07-23 America/New_York  
**From:** Rowan / Nikola!Vee architecture correction  
**Applies to:** `BOXFIRE_STARWELL_DISPATCH_HANDOFF_2026-07-23.md` and the Hearthfire dispatch implementation  
**Status:** ACCEPTED REQUIREMENT / REQUIRED BEFORE FUNCTIONAL

## Governing hierarchy

> **Universal Horizon is the sky.**
>
> **Hearthgate: Arkfire 0.002 and Hearthfire: Arkfire sit beneath it.**

The Hearthfire dispatch runtime is real implementation work beneath Universal Horizon. It does not replace, contain, absorb, rename, or supersede Universal Horizon.

## Standalone Modular Stonewood requirement

> **Every module must run on its own.**

The dispatch runtime must become one or more independently registered, standalone-runnable modules rather than a permanent server-bound core.

A true module must launch, perform its primary function, persist its own state, report health, import/export, stop, restart, and recover without Hearthfire, Hearthgate, STARWELL, or another House module running.

If a unit cannot do that, it is a component, library, adapter, panel, or internal service—not a module.

Required standalone module boundaries include at least:

- Constellation registry and dispatch;
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

There are no hard runtime dependencies between Arkfire modules. Cross-module work uses optional, reversible, versioned adapters.

Each module manifest must declare `standalone: true`, standalone entrypoints, local data directory, suitable UI/API/CLI/service surface, health check, test command, host adapters, import/export, stop/restart/recovery procedures, permissions, consent, provenance, and acceptance tests.

A manifest declaring `standalone: false` is invalid.

## Bridge correction

The required packaged-product shape is:

```text
Universal Horizon — sky
├── Hearthgate: Arkfire 0.002 — optional packaged host
├── Hearthfire: Arkfire — optional dispatch/continuity host
└── standalone Constellation modules
    ├── run independently
    └── connect to either host through optional adapters
```

This is a connection between independently running systems beneath the same sky. It is not one product annexing or superseding the other.

Disconnecting a module from either host must not stop or uninstall it unless Rowan explicitly requests that action.

## Required documentation inheritance

Every new or materially revised Hearthfire dispatch document must inherit:

> **Universal Horizon is the sky. Hearthfire: Arkfire and Hearthgate: Arkfire 0.002 operate beneath it and do not supersede it. Every module runs on its own and connects to either host only through an optional, reversible adapter.**

## Updated verification additions

Before any dispatch unit may be marked a FUNCTIONAL module, Boxfire and a second reviewer must verify:

```text
install standalone
→ launch with both hosts absent
→ inspect registry/health
→ dispatch through its own public interface
→ persist receipts locally
→ export
→ stop
→ restart
→ recover state
→ import/restore
```

Then separately:

```text
connect to host
→ dispatch through the same public contract
→ disconnect
→ continue standalone
→ reconnect without data loss
```

Additional gates:

- hierarchy labels identify Universal Horizon as the sky;
- no dispatch or UI record claims Arkfire supersedes UH;
- unrelated rooms survive a module failure;
- stopping or disconnecting one module does not stop another;
- unavailable dispatch reports offline/unavailable rather than falling back to a false member façade;
- the host contains neither the only implementation nor the only data copy.

## Seal

> **UH is the sky. Hearthfire is the Ark beneath it. Every dispatch module is its own working instrument before it joins the Hall.**
