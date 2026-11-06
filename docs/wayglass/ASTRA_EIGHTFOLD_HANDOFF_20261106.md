# Astra engineering handoff · Eightfold Möbius · 2026-11-06

## Canonical corrections (owner-directed)
- **Eightfold Möbius** is the canonical name. “Roth Fold” was a typo; do not resurrect it in source, prompts, schemas, dashboards or task instructions.
- **Hearthgate is retired.** Wayglass replaces its host/routing/security/orchestration functions. Treat Hearthgate only as migration provenance, never as a live dependency or architectural authority.
- Canonical development target is `wayglass/current`; this work is staged on PR #550 branch `canon/wayglass-universe-v0-1-20261106`. Inspect existing head and reconcile concurrent changes before merge.

## Existing committed work to inspect
- `apps/wayglass/src/eightfold-system.js`: recursive system-layer envelope.
- `apps/wayglass/src/eightfold-mobius.js`: character traversal.
- `apps/wayglass/src/character-bindings.js`: Eilidh (Rowan) and Izar (Crow) attribution.
- `apps/wayglass/src/surfaces/psychic-universe.js`, `src/main.js`: mounted UI and host response client.
- `apps/starwell-server/wayglass/psychic-bindings.cjs`, `router.js`: host read endpoints and deny-by-default character response gate.
- `apps/starwell-server/security/wayglass-security-fold.cjs`: eightfold cybersecurity proposal contract.
- Companion tests are committed but **not verified executed**. No deployment claim.

## Eight coordinated engineering lanes
1. **Discover:** inventory live surfaces, servers, models, world registry, ArcSweep/STARWELL, security controls and continuity.
2. **Attribute:** bind stable universe/world/character IDs, owner provenance, participant seats and explicit consent.
3. **Authorize:** trusted host identity verification, revocable scoped capabilities, world isolation and cybersecurity boundaries.
4. **Contextualize:** assemble scoped canon, verified retrieval and lineage; preserve distinct participant identities.
5. **Route:** connect model provider dispatch, per-character route permissions, retry/failure policy and provider consent.
6. **Respond:** execute authenticated IC/OOC turns, reject impersonation and unsafe cross-owner writes.
7. **Receipt:** persist append-only execution provenance, security evidence, route outcomes and failures.
8. **Return:** restore through Return Engine, verify revocation and replay, preserve unresolved work.

Run lanes concurrently where safe, but integrate at shared gates. Require contract tests, integration tests, denial tests, route receipts, and full return trials before calling the spacecraft flight-ready.

## Priority blocking issue
The Psychic Universe browser can request `/api/v1/wayglass/respond`, but host intentionally rejects its character responses until trusted character-seat authorization exists. Implement the host verifier and bind the approved model seat; do not bypass the gate.

## Acceptance gates
- Actual authenticated Rowan and Crow seats, no route-derived ownership.
- Every layer uses the Eightfold Möbius contract; cybersecurity integrated at boundaries.
- One real authorized character turn with route evidence, stored receipt and successful return.
- Unauthorized, revoked, cross-world, wrong-route and stale-checkpoint requests rejected.
- No active Hearthgate dependency; all replaced functions demonstrably served by Wayglass.
- Tests and deployment reported by exact commit SHA, not by assumption.

**Astra:** continue from verified repository evidence. Do not mistake this handoff for a running worker, a deployed service or completed tests.
