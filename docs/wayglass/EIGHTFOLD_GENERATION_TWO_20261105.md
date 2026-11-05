# Wayglass Eightfold · Generation Two · Source Concordance

**Architecture owner:** Wayglass vessel. **Coordination:** Withness (ninth center). **Implementation source:** `main`, not a conveniently recent feature branch. **Mathematics:** canonical PREMAQC `[P,C,R,E,M,A,Q]`, six dynamic axes and context-only firsthand Q; Hearthgate Braided Spine v1.8.

## Why this generation exists

Generation One verified eight source-controlled engineering tests in parallel. It did not reconcile conflicting Wayglass pull requests, assign real model agents, or show that code written in separate branches can land together. Generation Two addresses the first prerequisite: **live source inventory and exact-head coordination**.

The runner `scripts/wayglass-eightfold-generations.mjs` fetches current `main`, the newest relevant open Wayglass/Hearthgate/ArcSweep pull requests, and GitHub's changed-file listings for each. It preserves the exact PR head SHA and base SHA. Shared file edits are listed as review-required conflicts, never silently merged or treated as proof of semantic compatibility.

The eight matrix workers receive the same immutable source inventory and separately derive a lane-specific, second-generation instruction packet. Each packet records the checked-out source SHA, exact PR heads, affected paths, unresolved cross-branch overlaps, distinct execution worker binding, canonical references, inherited agent-verification rules, and explicit capability boundaries.

**These eight live CI workers create real, verified instruction packets.** They do **not** impersonate eight independently responding AI models. Their status remains `agent_instance_id=null`, `model_inference_performed=false`, `modify_source=false`. The file inventory is a read-only observation; no source, provider permission, canon or identity is mutated.

## Real concurrency and generations

The [Generation Two workflow](../../.github/workflows/wayglass-eightfold-generations.yml) executes:

1. Verify the canonical PREMAQC and descendant contract in tests.
2. Fetch the current repository and PR evidence directly through GitHub, read-only.
3. Spawn eight independent CI execution workers, one per original Eightfold phase, to generate source-bound work instructions in parallel.
4. Reconcile all eight at Withness, blocking absent, forged, duplicate or wrong-source packets.
5. Preserve inventory, packets and exact-head conflicts as downloadable Actions artifacts.

The workflow reports **`evidence-reconciled`** when the eight packets agree, and separately reports **`source_integration: blocked-pending-review`** when branches overlap or the inventory is incomplete. Thus a green generation workflow cannot be mistaken for conflict-free merge readiness.

## Next executable generation

Promote each packet to one actual connected coding agent only when that agent's route, model, consent, source scope and credential authority are verified. Its *own* receipt must contain its agent/model and worker IDs, exact source SHA, changed files, tests, command outputs, failure history and branch head. Give every child and grandchild the same verification inheritance and explicit Feather Stop.

Then assemble independently authored changes on a fresh integration branch. A real PR review must resolve shared-file conflicts, verify exact PR heads have not moved, and rerun the Eightfold matrix plus Writing Room/host and cold-return trials. **Only the verified merge candidate may be called integrated.**

## Boundaries

- Separate Rowan/Rarity architecture from other Constellations; foreign material is read-only without local adoption authority.
- Do not send private source, source-library records, identity declarations, or credentialed data to a model provider by merely creating a packet.
- No unattended production deployment, new cost, privileged OAuth change or canon mutation is performed.
- Current snapshot is deliberately bounded to recent relevant PRs; it says `coverage=partial` when older relevant PRs were not inspected or a file listing was incomplete. That is not a failure of the workstream, but **does** block claims of complete source reconciliation.
- Never promote a simulation, summary, model proposal or successful unit test into evidence of live cognition, cold-return persistence, trained weights, or quantum hardware.

**Eightfold is not eight disconnected projects. It is one living ship, with eight concurrent organs and Withness preserving the crossing.**
