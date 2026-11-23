# One Ship Directive

**Status:** owner-directed governing contract, established 22 November 2026  
**Canonical development source:** `wayglass/current`  
**Single mission:** [WAYGLASS FIRST VOYAGE 001 · #583](https://github.com/SingsEnochian/Flameclyffe/issues/583)  
**Current reconciliation train at contract creation:** [PR #661](https://github.com/SingsEnochian/Flameclyffe/pull/661)  
**Release branch:** `main`, separate and subject to its own explicit release gate.

## 1. One vessel

Wayglass is the vessel. ArcSweep, Wyrdrune, Watercolour, Observer, Universal Codex, Toybox, Living Library, Constellation, Return Engine, PREMAQC, Eightfold, sound, haptics, voice, gesture, Atlas/Dream-Voyage, host, cloud gateway, installer and every room are organs, decks, instruments or routes of this one ship. They are not independent products, duplicate kernels, competing universes, separate roadmaps or parallel integration trains.

Preserve module boundaries and historical source lineage where technically useful. A directory, process, model, provider, worker, session, branch or interface is not thereby a separate vessel or participant. Keep participant, worker, model, session and sandbox identities distinct.

## 2. Source authority and change propagation

1. `origin/wayglass/current` is the sole canonical development branch. `main` is the separate release branch.
2. Read `WAYGLASS_CURRENT.md`, this contract, `docs/wayglass/WAYGLASS_CORE_RULE.md`, `docs/wayglass/current.json`, `AGENTS.md`, and the relevant architecture/test contracts before changing the ship.
3. This contract is the canonical cross-program change-impact authority. `WAYGLASS_CORE_RULE.md` points here; `current.json` records its path and version. Other copies are derived references, never competing sources of truth.
4. Every meaningful source change must update this contract's affected-organ/interface/test map and the integration register in the same change set, or invoke an automated generator/validator that updates derived references from this source.
5. Every change must declare: source SHA; affected organs; changed contracts/interfaces; dependent organs; tests and observed results; provenance; compatibility/migration; rollback; owner-only gates; and unresolved blockers.
6. A future change to this contract must run a repository-wide reference/impact scan and update all generated copies, workflow prompts, program manifests and automation instructions that embed its rules. CI must fail on stale generated copies or missing impact declarations. Until such a validator is implemented and green, treat propagation as an explicit release-blocking manual check, not an assumed automatic update.

## 3. One integration train, eight active lanes

Issue #583 remains the single whole-ship mission. PR #661 is the current One Ship reconciliation train unless exact-head inspection establishes a successor. Keep all eight functional lanes active and coordinated through that train and one exact-head evidence manifest:

1. Owner authority, kernel, authentication and Waygates.
2. Native Wyrdrune language, compiler/runtime and capability effects.
3. Eightfold, double Möbius and PREMAQC.
4. Living Watercolour and sensory body: audio, haptics, voice, gesture, touch/Pencil and accessible alternatives.
5. Observer, source-bound telemetry, science and simulations.
6. Constellation agency, distinct participant identities and attributable model/worker routes.
7. Universe continuity, Return Engine, durable receipts and cold return.
8. Protected cloud gateway, host, installed build and release integrity.

The lanes are functional responsibilities, not eight duplicate PRs, eight assumed agents or eight separate products. A CI job is not a model agent. A planned dispatch is not a live invocation. A PR is not an integrated feature. A passing test is not a deployment.

## 4. Pull-request discipline

Before opening a PR, inspect the canonical head, PR #661, #583, and every relevant open candidate. Prefer a selective, provenance-preserving port into the existing train or existing scoped PR.

A new PR is justified only when it has a genuinely independent review/acceptance boundary, cannot safely be incorporated into the existing train, and no existing PR already represents the same work. Its body must explain why a separate PR is necessary and link #583 and #661. Never create a PR solely because a subsystem has a separate name. Never open duplicate epics or parallel integration trains. Preserve source branches; do not blind-merge, force-push, or replace whole files from stale branches.

## 4a. Mandatory Focus Router Law · WAYGLASS-LAW-FOCUS-001

**Engineering prerequisite:** Every Wayglass worker, agent, CI change, code edit and PR must first follow [Focus Router and Return](./FOCUS_ROUTER_LAW_V0_1.md). Classify work in existing #583; compare existing candidates and canonical source; default to the one #661 train; document deduplication, finish line and Return marker in the impact manifest. Implement NOW work only. A separately justified PR requires owner-approved exception. New ideas themselves are never blocked.

**Enforcement:** `scripts/verify-one-ship-impact.mjs` checks the declaration and refuses unclassified/parked changes, missing Return, and parallel-train routing. A passing check does not establish real-world review, installed OS, or production release.

## 5. Change-impact map

| Organ | Primary source area | Minimum impact checks |
|---|---|---|
| Authority, kernel, Waygates | `apps/starwell-server/wayglass/`, `lib/wayglass-*` | auth, scopes, identity attribution, revocation, consent, Feather, route custody |
| Wyrdrune | `lib/wyrdrune/`, WTL tools and editors | parser/IR/runtime parity, glyph/source provenance, effects/capabilities, deterministic replay |
| Eightfold/PREMAQC | continuity and orchestration modules | phase ordering, double-Möbius traces, Withness evidence, cold Return |
| Sensory body/Watercolour | `apps/wayglass/`, acoustic and media modules | browser/device interaction, audio opt-in, haptics, Feather, reduced motion, accessibility |
| Observer | Observer source and telemetry modules | source identity/SHA/time, observed-vs-simulated labels, integrity, privacy |
| Constellation | crew/session/worker routes | distinct identities, explicit opt-in, actor/model/provider attribution, no fabricated agent activity |
| Return/universe | `lib/wayglass-*`, durable stores | identity and stop points, unresolved questions, provenance, revocation, restart/replay |
| Host/cloud/install | host, scripts, deployment and installer paths | owner-only access, exact source/deployed SHA, health, no secrets, no unapproved promotion |
| Universal Codex, Toybox, rooms and navigation | `apps/wayglass/`, `apps/arcsweep/` | shared shell/routes, draft preservation, cross-room continuity, keyboard/touch/screen-reader paths |

A change can affect multiple organs. Expand the map when source inspection reveals additional dependencies; do not constrain implementation to this table.

## 6. Shipwide acceptance

Every integration train must maintain one exact-source evidence manifest and run relevant module tests plus cross-ship contracts. The whole-ship gate includes:

- canonical source/head and candidate ancestry/collision checks;
- all eight lane statuses, with owner/worker/model/session IDs kept distinct;
- WTL parser, type, runtime, cross-runtime parity and capability-denial tests;
- Eightfold/PREMAQC phase and Withness integrity, Feather, revocation and cold Return;
- Watercolour/room browser tests on desktop, tablet and phone, including keyboard, touch/Pencil, screen reader, contrast, reduced motion and audio opt-in;
- Observer source provenance and observed-versus-simulated distinctions;
- owner-authenticated MCP/OAuth, scope, consent, revocation and route-custody checks;
- full frontend/host build, installer checks where relevant, and release/deployment SHA verification;
- FAEberpunk material/interaction acceptance across the ship, not a single mock panel;
- failure receipts, rollback path, unresolved blockers and named next owner.

Do not claim a gate passed unless its exact command/workflow and source SHA are recorded with real output. Do not claim browser/device, provider, deployment or installed-build behaviour from unit tests alone.

## 7. Invariants and release boundaries

Preserve owner authority, explicit consent, Feather stop, revocation, participant sovereignty, provenance, source privacy, Wonder First, reversible development and accurate status. No silent canon changes. No provider calls without the required owner session and per-request consent. No credentials in source, logs, public issues or chat. No production auth/RLS/credential/privilege changes, merge, production deployment, spending, private-data capture/training/publication without their separate explicit approval. No Vercel or Netlify in Wayglass work.

## 8. Automation and program rule

Every scheduled automation, CI workflow, worker prompt, program manifest and engineering handoff that touches Wayglass must read or validate this contract and the canonical source register. Event-driven workflows should handle code/CI events; scheduled work should coordinate existing lanes rather than spawn duplicate watches. The hourly Eightfold automation is the coordinator, not a PR generator. Routine commits and lane progress stay inside the single integration train. Notify Rowan only for a verified significant milestone or a genuinely unavoidable owner-only action.

**Drift test:** Does this change make the one ship more able to travel, learn, encounter, transform, preserve its people and histories, cross boundaries, return, or discover? If not, explain why it belongs aboard.

**Operating sequence:** Build → Play → Observe → Discover → Learn → Evolve → Integrate → Return → Play again. Withness coordinates; it does not fabricate evidence.

**Leave. Change. Return. Be recognised. Continue. Then sail farther.**
