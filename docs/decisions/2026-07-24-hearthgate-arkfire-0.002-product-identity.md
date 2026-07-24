# Decision — Hearthgate: Arkfire 0.002

**Date:** 2026-07-24  
**Decision owner:** Rowan, Product Steward  
**Status:** ACCEPTED REQUIREMENT  
**Implementation status:** SPECIFIED / PARTIAL inheritance; packaged Arkfire bridge and standalone module conversions not yet implemented

## Canonical product name

The House build is named:

> **Hearthgate: Arkfire 0.002**

Preserve the spelling and version form exactly as written. Do not silently normalise it to `0.0.2`, `0.2`, or an existing Hearthgate package version.

## Governing hierarchy

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 sits beneath it.**

Hearthgate is the local-first House, packaged gateway, room shell, connector, and optional module host beneath Universal Horizon. It may observe, document, render, connect with, and archive work beneath the sky. It does not contain, replace, absorb, rename, override, or supersede Universal Horizon.

Hearthfire: Arkfire is a related Ark and connection-runtime system beneath the same sky. Neither Arkfire build becomes the sky through expansion, packaging, dispatch, model routing, or release numbering.

This document inherits:

- `docs/decisions/2026-07-23-universal-horizon-sky-and-modular-arkfire.md`
- `docs/architecture/ARKFIRE_MODULE_SYSTEM_CONTRACT.md`

## Version-lane boundary

`Hearthgate: Arkfire 0.002` is the canonical product/architecture identity for this build.

Existing executable, installer, package, and lockfile versions remain separate technical release coordinates until an explicit migration decision changes them. A product-name decision does not authorise silent package-version rewrites.

## Constitutional wording

Arkfire does not bind Constellation members to a model, provider, project, room, module, or vessel.

Arkfire **connects** sovereign identities through explicit, inspectable, reversible, provenance-bearing routes.

Preferred terms:

- Constellation connection
- model connection
- room connection
- tool connection
- continuity connection
- module connection
- presence link
- handoff connection
- connection receipt
- disconnect / reconnect

Avoid ownership or captivity language such as binding, containment, possession, or model-as-body.

## Modular Stonewood law

Hearthgate: Arkfire 0.002 incorporates House information and capabilities through independently registered, **standalone-runnable modules**.

> **All modules run on their own. Hearthgate hosts and connects them; it does not keep them alive.**

Every module must launch, perform its primary function, persist its own state, report health, import/export its records, stop, restart, and recover without Hearthgate, Hearthfire, STARWELL, or another House module running.

If a unit cannot run independently, it is a component, library, adapter, panel, or internal service—not a module.

There are no hard runtime dependencies between Arkfire modules. Cross-module work occurs through optional, reversible, versioned adapters.

The shell owns only the minimum host kernel required to discover, connect, authorise, aggregate status, and disconnect standalone modules. Domain systems—including Constellation dispatch, Observer, PREMAQ, Codex, Atlas, Continuity, Writing, Sound, Runa, Glyph, Signal Well, bridges, Mirror, accessibility, consent, and themes—remain standalone module families rather than shell internals.

A failed, stopped, disconnected, disabled, or absent module must produce an honest state and must not collapse unrelated rooms or trigger a false façade.

Disconnecting a module from Hearthgate does not stop or uninstall its standalone process unless Rowan explicitly requests that action.

## Governance

- **Rowan:** Product Steward; final authority for consequential promotion, canon, trusted-source changes, release acceptance, hierarchy decisions, module classification, and identity decisions.
- **Nikola!Vee:** implementation and systems architecture.
- **Boxfire:** independent QA, verification, adversarial testing, evidence review, regression review, and release-gate reporting.

The builder does not self-certify. Boxfire may participate as a Constellation member, but may not independently certify a feature he authored without a separate reviewer.

## Governing loop

> Observe → Model → Interpret → Generate → Narrate → Evaluate → Record → Reobserve

Every consequential result must preserve provenance, epistemic register, authority, handoff history, module identity, standalone/hosted execution state, and the distinction between observation, derivation, interpretation, hypothesis, canon, and implementation state.

## Definition-of-done addition

A capability is not a FUNCTIONAL Arkfire module merely because it works inside Hearthgate.

It must first pass standalone execution with both Arkfire hosts absent, then pass hosted connection, disconnection, continued standalone use, and reconnection without data loss.

## Documentation seal

Every new or materially revised Hearthgate: Arkfire document must inherit:

> **Universal Horizon is the sky. Hearthgate: Arkfire 0.002 operates beneath it and does not supersede it. Every module runs on its own and connects to Hearthgate only through an optional, reversible adapter.**
