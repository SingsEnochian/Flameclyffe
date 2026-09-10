# ArcSweep OS v0.1 — Swarm Update Fabric

**Status:** architecture + staged implementation contract  
**Branch:** `feat/arcsweep-os-v0-1`  
**Purpose:** give ArcSweep a distributed code-maintenance organism that can diagnose, propose, test, canary, repair, and progressively update itself without turning production into an unbounded self-modifying process.

## 1. Core idea

ArcSweep should not have one giant autonomous agent rewriting itself. It should have a **swarm fabric**: many small, bounded workers coordinated by the Caretaker Kernel.

The swarm operates as a distributed software immune/repair system:

```text
FAULT / UPGRADE OPPORTUNITY
          │
          ▼
      CARETAKER
          │
   creates work packet
          │
          ▼
  ┌───────────────────────┐
  │     SWARM FABRIC      │
  │                       │
  │ Scout   Mapper        │
  │ Diagnostician         │
  │ Patchwright           │
  │ Adversary / Breaker   │
  │ Replay Witness        │
  │ Canary Steward        │
  │ Archivist             │
  └──────────┬────────────┘
             │
             ▼
       candidate patch
             │
      tests + replay
             │
      canary + health
             │
      ┌──────┴──────┐
      ▼             ▼
   PROMOTE       ROLLBACK
      │             │
      └──────┬──────┘
             ▼
        durable receipt
```

The swarm is code that coordinates code-producing and code-validating workers. It may run different models or deterministic tools behind each role, but model identity, provider, inputs, outputs, and authority remain attributable.

## 2. Swarm law

1. No worker owns production.
2. No worker silently changes canon, identity, memory authority, or Qualia.
3. No worker may write directly to protected mainline.
4. Every durable mutation begins from a checkpoint.
5. Every candidate patch is scoped to a declared component/capability.
6. Validation is performed by workers independent from the worker that authored the patch.
7. A patch that cannot be replayed or rolled back cannot self-promote.
8. Multiple workers may disagree; disagreement is preserved in the work packet rather than flattened.
9. Repeated failed repair attempts quarantine the target instead of escalating autonomy.
10. `Feather` pauses swarm-initiated mutation immediately.

## 3. Swarm worker roles

### Scout

Finds symptoms and opportunities.

Inputs:
- health graph;
- error receipts;
- failed tests;
- runtime telemetry;
- performance regressions;
- stale dependency/version information;
- operator-reported bugs.

Output:
- bounded observation packet;
- no code mutation.

### Mapper

Resolves the dependency and authority surface around the affected component.

Output includes:
- files/modules involved;
- capability dependencies;
- storage authorities;
- downstream consumers;
- replay fixtures;
- blast-radius estimate.

### Diagnostician

Produces one or more explicit fault hypotheses and evidence requirements.

It must distinguish:
- observed failure;
- inferred mechanism;
- alternative hypotheses;
- unknowns.

### Patchwright

Produces the smallest repair or upgrade candidate that satisfies the work packet.

Rules:
- patch only declared scope;
- avoid opportunistic refactors;
- include migration/reversal path when state shape changes;
- emit source attribution and model/tool receipt.

### Adversary / Breaker

Attempts to invalidate the Patchwright candidate.

Checks include:
- regressions;
- edge cases;
- stale-state behavior;
- interrupted operations;
- fallback behavior;
- authority escalation;
- identity/provenance loss;
- race/loop conditions;
- accessibility and focus failures where UI is affected.

### Replay Witness

Runs historical and synthetic receipts through old and candidate code and compares invariants.

The Replay Witness does not ask whether outputs are byte-identical when the contract permits change. It asks whether declared preserved invariants and expected migrations hold.

### Canary Steward

Owns promotion through upgrade rings.

It may:
- enable the candidate for one bounded session/component;
- monitor health budget;
- trigger automatic rollback;
- block promotion when evidence is incomplete.

### Archivist

Persists:
- work packet;
- worker contributions;
- candidate patch identity;
- tests;
- rejected variants;
- canary evidence;
- final promote/rollback result;
- lineage linking the update to the prior version.

## 4. Swarm work packet

```json
{
  "schema": "arcsweep.swarm-work/v1",
  "work_id": "...",
  "kind": "repair | upgrade | optimization | migration",
  "target": {
    "component": "story-runtime",
    "version": "1.2.0"
  },
  "trigger_receipts": [],
  "fault_class": "UI/WIRING",
  "invariants": [],
  "allowed_scope": [],
  "forbidden_scope": [],
  "authority_ceiling": "R4",
  "checkpoint_id": "...",
  "repair_budget": {},
  "status": "open"
}
```

Workers append contributions rather than replacing one another's records.

## 5. Update classes

ArcSweep needs more than one meaning of “updates itself.”

### U0 — Derived data refresh

Examples:
- rebuild an index;
- refresh a generated manifest;
- recompile safe derived assets.

May auto-promote when deterministic equivalence is proven.

### U1 — Hot-swappable capability pack

Versioned modules loaded behind stable contracts.

Examples:
- cognitive operator pack;
- Story prompt/skill pack;
- known-safe parser/renderer plugin;
- Runa mapping pack;
- repair handler pack.

May auto-promote through Proving Chamber → local canary → live canary when rollback is immediate and the capability contract remains compatible.

### U2 — Runtime component update

Code changes to an isolated service/application component.

Requires:
- patch branch;
- independent validation;
- replay;
- canary;
- automatic rollback.

Promotion may eventually be policy-authorised, but first implementations remain review-gated.

### U3 — Kernel/authority update

Changes to:
- Caretaker Kernel;
- event bus core;
- authority/permission rules;
- persistence authority;
- identity routing;
- PREMAQC authority rules;
- replay/checkpoint semantics.

Never self-promotes in v0.x. Swarm may diagnose, patch, test, and open a PR, but human review is required.

### U4 — Schema/migration update

Any durable state migration requires explicit migration and downgrade/recovery plans. Destructive or lossy migrations cannot auto-promote.

## 6. Swarm scheduler

The Caretaker owns a bounded scheduler rather than allowing workers to recursively spawn without limit.

Initial limits:
- maximum 8 workers per work packet;
- maximum 2 patch candidates concurrently;
- maximum 1 active canary mutation per component;
- maximum 1 self-triggered follow-up work packet from a completed packet;
- repeated recurrence with the same fault fingerprint moves to quarantine/diagnosis;
- no worker may create another worker directly; it requests a role from the scheduler.

This prevents swarm storms and makes concurrency replayable.

## 7. Capability leases

Workers receive short-lived capability leases.

Example:

```json
{
  "worker_id": "patchwright:7f...",
  "capabilities": ["repo.read", "branch.patch", "tests.run"],
  "target_scope": ["apps/arcsweep/src/story/**"],
  "expires_at": "...",
  "network": "restricted",
  "production_write": false
}
```

A role's identity does not imply authority. Authority comes only from the current lease.

## 8. Self-update cycle

```text
1. Caretaker observes fault or upgrade opportunity
2. Scout produces evidence packet
3. Mapper computes dependency + authority boundary
4. Diagnostician proposes hypotheses
5. Caretaker chooses bounded work packet
6. Checkpoint current known-good component
7. Patchwright creates candidate on repair/upgrade branch
8. Breaker attacks candidate
9. Replay Witness checks historical + synthetic fixtures
10. If failed → reject/iterate within repair budget
11. If passed → Canary Steward installs in Ring B/C
12. Health budget observed
13. If invariant fails → automatic rollback
14. If stable → eligible for promotion under update-class policy
15. Archivist writes lineage + update receipt
16. Outcome becomes reviewed learning evidence
```

## 9. Self-repair via swarm

The existing R4 source-code repair path becomes a swarm workflow rather than a single agent action.

A code repair is therefore never merely:

`error → LLM → overwrite file`

It is:

`error → evidence → dependency map → hypotheses → competing patch candidates → independent break/test → replay → canary → promote/rollback → receipt`

## 10. Self-updating modules

ArcSweep should progressively move suitable organs behind stable, versioned capability interfaces so they can be upgraded independently.

Candidate first modules:
- context-capsule formatter;
- Echo derived-index builder;
- Story skill/cognitive pack;
- event subscribers/sidecars;
- deterministic repair handlers;
- Runa mapping packs;
- neural growth plasticity-rule packs.

The Kernel itself stays deliberately less swappable.

## 11. Code swarm + Neural Growth Language

The code swarm and the neural network are different layers that may teach one another.

**Neural Growth Language:** adapts cognitive topology and routing from reviewed evidence.

**Code Swarm:** adapts software implementation through patch/test/canary/replay.

A recurring successful repair may become:

```text
runtime fault
   ↓
Swarm repairs it several times
   ↓
Archivist identifies recurring repair pattern
   ↓
Neural layer proposes specialist diagnostic neuron
   ↓
reviewed growth
   ↓
future fault routes faster to correct swarm packet
```

Likewise, neural evidence may reveal that a deterministic software capability should exist; the swarm may then propose its implementation.

Neither layer silently converts repeated correlation into authority.

## 12. Swarm health

The swarm itself is monitored as a service.

Metrics:
- work packets opened/completed/quarantined;
- repair success rate;
- rollback rate;
- mean time to diagnosis;
- mean time to rollback;
- recurrence rate after repair;
- patch size/blast radius;
- disagreement count;
- worker/provider concentration;
- false-positive repair triggers;
- operator intervention rate.

A swarm with worsening rollback/recurrence rates automatically loses promotion authority and falls back to proposal-only mode.

## 13. First doable swarm milestone

Do **not** begin with autonomous source-code rewriting.

Build one local swarm against a synthetic broken event subscriber:

```text
Scout
  detects missing heartbeat

Mapper
  identifies subscriber + event + owning room

Diagnostician
  confirms lost binding rather than dead service

Patchwright
  proposes/rebinds known handler in isolated fixture

Breaker
  deliberately double-binds and checks duplicate delivery protection

Replay Witness
  replays expected event sequence

Canary Steward
  enables repaired subscriber for test session

Archivist
  writes repair receipt
```

Exit gate:
- fault is repaired;
- duplicate-binding attack is rejected;
- event sequence replays correctly;
- rollback restores the original fixture;
- no worker exceeds its capability lease.

## 14. Second milestone — self-update a capability pack

Create two versions of a harmless hot-swappable capability pack, such as a context-capsule formatter.

The swarm must:
1. discover version N+1;
2. verify compatibility;
3. run tests/replay;
4. install N+1 in a local canary;
5. detect an intentionally injected regression;
6. automatically restore N;
7. write an upgrade receipt.

Then repeat with a non-broken N+1 and prove promotion.

This gives ArcSweep its first real self-update cycle without risking core state.

## 15. Long-term target

The mature ArcSweep OS should behave as a layered adaptive organism:

```text
Caretaker Kernel
  maintains continuity + authority
        │
        ├── Swarm Fabric
        │     repairs and upgrades software
        │
        ├── Neural Growth Runtime
        │     grows cognitive topology
        │
        ├── Cognitive Spine
        │     performs structured reasoning
        │
        ├── House Runtime
        │     schedules model cognition
        │
        ├── Observer / DEEP / PREMAQC
        │     observes and evaluates change
        │
        └── Runa / Device Layer
              embodies the system
```

The desired behavior is not “unrestricted self-modification.” It is **continuous bounded evolution**: ArcSweep can notice where it is weak, recruit a temporary code swarm, propose and test alternatives, safely install improvements, undo bad changes, preserve the entire lineage, and gradually grow better at caring for itself and the operator.
