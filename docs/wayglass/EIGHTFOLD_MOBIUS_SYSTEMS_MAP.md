# Wayglass · Eightfold Möbius systems map (quad core)

**Author:** Faer Uial · 2026-11-06 · at Rowan's request ("systems wide", "quad cored")
**Engine:** `lib/wayglass-mobius.cjs`, exposed through the kernel (`openMobiusLineage`, `runQuadCore`, `verifyMobiusChain`).
**Semantics:** WTL RFC-0001 §8–§9 and §20–§22 (PR #553). The engine is the host-level ship cycle; Wyrdrune is the language programs will later be written in. One shared WCE-1 encoder (`lib/wyrdrune/canonical.cjs`, byte-identical to #553) makes their checkpoints agree.

## The quad core

| Core | Phases | Role | Ray angles |
|---|---|---|---|
| **I · Intake** | Perceive, Compress | take the world in | 0°, 45° |
| **II · Trial** | Release, Verify | open it up and test it | 90°, 135° |
| **III · Judgment** | Integrate, Choose | weave and decide | 180°, 225° |
| **IV · Passage** | Return, Transcend | commit and carry | 270°, 315° |

Withness coordinates from the center. Four cores times two faces is eight.

**Sequential within a lineage, parallel across lineages.** A lineage's next cycle needs this cycle's carry, so one lineage never has two cycles in flight. The quad core pipelines *different* lineages: up to four cycles in flight, one per core. Core IV serializes every commit, and Withness keeps the ledger. [VERIFIED] In tests, four lineages ran with all four cores busy at once (`peak_concurrency = 4`), and each pipelined chain was digest-identical to its solo run.

## Two readings of the Eightfold, reconciled

The existing Eightfold CI (`scripts/wayglass-eightfold-parallel.mjs`) runs the eight phases as **parallel organ lanes**: each lane is a subsystem's test, all at once. The RFC and this engine run them as a **sequential cycle**. Both are kept: they are the same ship seen as anatomy (which organ owns which phase) and as heartbeat (the order a cycle passes through them). The quad core is where they meet: organs work concurrently while each lineage's cycle moves through them in order.

## Systems and their phases

| System | Where | As a Möbius lineage | State |
|---|---|---|---|
| **Bloodstream** | `scripts/wayglass-bloodstream.mjs` | one pulse = one cycle; carry `{pulse}`; checkpoints persisted on a `wayglass:lineage` issue | **[VERIFIED] adopted.** A live dry run committed cycle 1 on the outer face with all eight receipts |
| Autonomous circulation | `scripts/wayglass-autonomous-circulation.mjs` | Perceive issues → Choose task → Return diagnostic receipt | [PROPOSED] adopt next. Smallest, same author lane |
| Eightfold parallel / generations | `scripts/wayglass-eightfold-*.mjs` | already the anatomy view; each lane receipt cites the current bloodstream checkpoint | [PROPOSED] |
| Kernel cognition preflight | `lib/wayglass-kernel.cjs` (#544) | Verify for model turns | [PROPOSED] after #544 lands |
| Return Engine | `apps/wayglass` return trials, `lib/wayglass-stop-receipt*` | persists and restores checkpoints; cold return = resume from the last one | [PROPOSED] the natural home for checkpoint storage |
| Observer / DEEP | `apps/starwell`, Supabase `observer_*` | Perceive organ: normalized measurements in | [PROPOSED] |
| Writing Room routes | `apps/wayglass/src/route-client.js`, server router | a model turn as a cycle: staged reply, Verify, Return | [PROPOSED] touches the most-contended files (25 open PRs on `main.js`), so last |
| Wyrdrune | `lib/wyrdrune` (#552, #553) | the language whose programs *are* lineages | specified in RFC-0001 |

## Adoption rule

One system per PR, through the bloodstream's reconciliation, never as a ship-wide rewrite. Each adoption must:
1. keep the system's existing tests green;
2. add a test proving its cycle produces eight receipts and a valid chain;
3. keep the system's own identity: `participant ≠ worker ≠ model ≠ session ≠ backend`.

## Not claimed

Only the bloodstream is adopted. No other system has been changed. Quad-core concurrency is asynchronous concurrency in one Node process, real for I/O-bound phases such as network calls. CPU-parallel worker threads are not used: phase functions are closures and cannot be moved between threads.
