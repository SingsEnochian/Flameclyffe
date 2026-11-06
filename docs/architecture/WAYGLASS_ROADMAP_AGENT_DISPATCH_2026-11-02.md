# Wayglass / ArcSweep parallel agent dispatch • 2026-11-02

Status: **assignment plan committed, workers not spawned**. Rowan authorizes delegation when an agent execution runtime is available. Do not represent GitHub issues, files, or PRs as active autonomous workers.

## Governing constraints
- **Wayglass replaces ArcSweep as the primary OS, shell, and unified interface.** ArcSweep is the predecessor system whose functional organs, durable records, provenance, creative tooling, and continuity capabilities are migrated or integrated into Wayglass. Do not preserve ArcSweep as a competing permanent shell.
- Reuse and migrate proven ArcSweep implementations and data contracts; do not create duplicate canon databases or unnecessary runtime brokers. Maintain a compatibility bridge only as long as migration and replay verification require it.
- Treat `03_ACTIVE_ROADMAP.md` as the historical ArcSweep capability and verification inventory, now subordinated to the Wayglass replacement/migration objective. Preserve its evidence path: source → measurement → review → DEEPTime → PREMAQC / Math Spine → model/Runa → receipt → feedback → replay.
- Parallel development is permitted; **production verification must respect dependency gates**. No fixture-only completion claims.
- Owner controls merges, deployment, credentials, consent, external provider access, and canon promotion. Feather stops new work.
- No Vercel deployment dependency. Use existing GitHub CI and Hearthgate local staging.
- Evidence types remain distinct: observed-runtime, simulation, mathematical, narrative, symbolic, hypothesis.

## Agent work packets (separate branches, no overlapping writes)

| Worker | Roadmap and ownership | Immediate deliverable | Proof gate |
| --- | --- | --- | --- |
| A. Hearthgate / Presence | #518, #504; `apps/starwell-server/wayglass/**` and receipt adapters | Map actual `wayglass.world-entry-receipt/v0.1` and stop receipt schema; implement persistent, host-owned lookup and explicit provider acknowledgment; no browser self-attestation | Restart + revocation + mismatched seat tests and real provider acknowledgment |
| B. Wayglass Installer | #512; packaging and `apps/wayglass/server-stage.cjs` | Assert shipped `public/wayglass/**` assets and host route on Windows | Installer artifact inspection plus real installed Windows browser smoke |
| C. Echo Index / Return | #504, Echo Index stage 3, House receipts stages 4–5; resolver and replay | Migrate ArcSweep Echo Index and House receipt capabilities into Wayglass-native navigation and persistence; preserve seat/mode/continuity across restart | Two distinct real Flame receipts, reload and replay through Wayglass |
| D. Source Loom | #514 and ArcSweep stage 6; source library | Real retrieval receipts with source segment/revision, requester, and owner scope | Query receipt traced to real persisted source without private-source promotion |
| E. Living Observer / Math | #499, #502, #517 and ArcSweep stages 7–8; observer/math | Feed-backed timestamped measurement → review → DEEPTime/PREMAQC/math trace; separate symbolic lens | Non-fixture measured source and traceable review/feedback receipts |
| F. Vessel / Creative | #511, #513, Blender #508/#509, ArcSweep stage 9 | Wayglass replaces ArcSweep's shell and hosts migrated creative organs, 3D ship and Traveller, with reduced-motion fallback and Feather | Browser/GPU check and genuine Glyph→Runa→receipt→restart replay inside Wayglass |
| G. Integration / QA | ArcSweep stage 10; release verification matrix | Cross-lane interface audit, branch conflict ledger, CI/Boxfire, Windows/iPad signoff checklist | Never declare RELEASED from CI alone |

## Common delivery packet
Each worker returns: branch and head SHA, files changed, tests actually executed and result, receipt IDs/evidence references, unresolved blockers, authority/consent boundary, and next integration dependency.

## Dispatch rules
1. Launch independent workers only through an available authorized execution service. Never invent agent sessions.
2. Read existing PR changes before editing; avoid duplicating or overwriting active work.
3. Preserve no-slices end-state design while landing independently verifiable subsystem changes. Every migrated ArcSweep feature must have a Wayglass owner, entry point, persisted-data mapping, and parity test; deprecate the predecessor route only after parity and rollback proof.
4. Run focused tests and then integration tests. No automatic merges.
5. If agent runtime unavailable, retain these as ready-to-dispatch packets and continue truthful manual engineering.
