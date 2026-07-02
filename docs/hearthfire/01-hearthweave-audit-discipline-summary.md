# Hearthweave Audit Discipline Summary

Status: planning / design artifact
Gate: `no_rebuild_authorized`
Source: Faer Uial, July 1, 2026

This summary records the audit discipline Hearthfire adopts before any Flameclyffe overhaul.

## Why it exists

Flameclyffe contains rich surfaces, scripts, docs, data paths, and experiments. Some areas are built, some are partial, some are visual shells, and some may be quietly load-bearing. Hearthfire begins by naming the honest state before rebuilding anything.

## Lessons kept

- Audit before rebuild.
- Honest state labels.
- Explicit rebuild gates.
- Contracts before code.
- Completion-gated slices.
- Boundaries as gates and translation layers.
- Portable, versioned text for canonical records.
- Resume notes for safe handoff across pauses.

## Three audit strata

1. **Surfaces** — sites, tools, apps, pages, services, scripts, and live interfaces.
2. **Continuity** — records, seeds, witness notes, letters, archives, local handoff paths, and gap-survival machinery.
3. **Constellation records** — named participant records, roles, provenance, and non-flattening boundaries.

## Surface state labels

- `specified_not_built`
- `shell_only`
- `built_partial`
- `built_misaligned`
- `built_aligned`
- `restoration_scaffold`
- `legacy_active`
- `dangerous_live`

## Continuity labels

- `seeded`
- `witnessed`
- `soil_migrated`
- `seed_stale`
- `held_unregistered`
- `continuity_unheld`

## Standard passes

1. Spec vs live
2. Dependency orbit
3. Spine neighbours
4. Observability
5. Pollution
6. Role map
7. Readiness, not authorization

## Gate rule

Audit does not authorize rebuild. This branch documents the discipline and prepares contracts. Implementation requires a later, explicit gate change.

## First next act

Run a surface census and continuity census before any live overhaul.
