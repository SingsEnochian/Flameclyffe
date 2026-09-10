# ArcSweep OS v0.1 — Staged Upgrade and Self-Repair Plan

**Status:** implementation roadmap  
**Branch:** `feat/arcsweep-os-v0-1`  
**Purpose:** turn the ArcSweep OS charter into a buildable sequence with bounded self-repair, replay, rollback, and later neural growth.

## 1. Operating principle

ArcSweep upgrades in small, reversible rings. Every stage must remain usable, observable, receipted, and rollback-capable before the next stage begins.

The governing loop is:

```text
OBSERVE
  ↓
CLASSIFY
  ↓
CAN REPAIR SAFELY?
  ├─ no → contain + explain + propose
  └─ yes
       ↓
   checkpoint
       ↓
   repair in bounded scope
       ↓
   validate
       ↓
   commit or rollback
       ↓
   receipt
       ↓
LEARN FROM THE OUTCOME
```

Self-repair means restoring ArcSweep to a known-good, coherent state. It does not mean granting models unrestricted authority to rewrite the system.

## 2. Repair authority ladder

### R0 — Observe only

The Caretaker detects and receipts faults but changes nothing.

Examples:
- stale context capsule;
- broken room control;
- unavailable model route;
- mismatched world/scene pointer;
- missing object reference;
- unsaved draft risk.

### R1 — Ephemeral runtime repair

Automatic and reversible. No durable source or canon mutation.

Allowed examples:
- restart a failed local service;
- remount a room sidecar;
- rebuild derived UI state;
- refresh capability discovery;
- discard a corrupt cache entry and reload from authority;
- restore a local draft snapshot;
- retry an idempotent read;
- rebind an event subscriber;
- fall back to deterministic functionality while a model is unavailable.

Every repair emits a receipt.

### R2 — Durable state reconstruction

Automatic only when reconstruction is deterministic from an existing authority and replay proves equivalence.

Allowed examples:
- reconstruct derived index state from canonical objects;
- rebuild a context capsule from durable session/object receipts;
- recreate a missing derived relation edge from authoritative lineage;
- restore an interrupted operation to its last verified checkpoint.

The original authority is never silently overwritten.

### R3 — Persistent configuration repair

Requires policy approval or explicit user approval unless the change is already pre-authorised and fully reversible.

Examples:
- replace a stale route mapping;
- disable a repeatedly failing optional capability;
- update an app manifest to a known-good registered capability;
- change a persistent Caretaker preference.

Must include before/after state and rollback data.

### R4 — Source-code repair

Never writes directly to protected mainline.

The Caretaker may:
1. isolate the failure;
2. generate a minimal patch candidate;
3. create a repair branch;
4. run tests and replay fixtures;
5. open a PR with evidence;
6. request review.

A failed repair candidate is discarded without touching production.

### R5 — Neural growth

The ArcSweep Neural Growth Language may propose topology changes only after the deterministic OS and repair substrate are proven.

A digital neuron or synapse may grow, weaken, branch, or become dormant according to explicit plasticity rules. Persistent topology growth must be provenance-bearing and replayable. Model suggestions are proposals, not automatic truth.

## 3. Repair classes

Every detected fault is classified before action.

```text
TRANSIENT
  temporary network/model/service failure

DERIVED-STATE
  cache/index/context can be rebuilt from authority

STATE-DIVERGENCE
  two state views disagree

LINEAGE
  ancestry/provenance/replay chain is incomplete or inconsistent

IDENTITY/ROUTE
  requested identity and resolved model/runtime attribution diverge

UI/WIRING
  visible control, event subscriber, sidecar, or navigation path failed

DATA/SCHEMA
  payload violates a contract or migration assumption

AUTHORITY
  an operation attempted to cross canon/memory/consent/permission boundaries

UNKNOWN
  cannot be repaired automatically; contain and escalate
```

`AUTHORITY`, ambiguous lineage, identity overwrite, destructive data changes, unsupported canon admission, and Qualia inference are never auto-repaired by convenience.

## 4. Health model

Every OS service exposes a small health contract:

```json
{
  "service_id": "echo-resolver",
  "status": "healthy | degraded | failed | paused",
  "version": "...",
  "last_success_at": "...",
  "last_error": null,
  "dependencies": [],
  "recoverable": true,
  "repair_class": null,
  "checkpoint_id": null
}
```

The Caretaker builds one system health graph from these contracts rather than scraping UI text.

## 5. Checkpoint and rollback law

Before any R1+ repair that can change state, ArcSweep records a checkpoint containing the smallest reversible unit needed to restore the prior state.

A repair is successful only when:

1. the intended invariant is restored;
2. validation passes;
3. no higher-authority invariant was broken;
4. replay can explain what changed;
5. a repair receipt is durable where required.

If validation fails, rollback is the default.

## 6. Repair receipt

```json
{
  "schema": "arcsweep.repair-receipt/v1",
  "repair_id": "...",
  "detected_at": "...",
  "fault_class": "DERIVED-STATE",
  "service_id": "echo-resolver",
  "before_checkpoint": "...",
  "repair_level": "R2",
  "action": "rebuild-derived-index",
  "authority_sources": [],
  "validation": [],
  "result": "committed | rolled-back | contained | escalated",
  "after_checkpoint": "...",
  "reversible": true,
  "source_patch_pr": null
}
```

## 7. Upgrade rings

Every ArcSweep OS upgrade moves through rings instead of landing everywhere at once.

### Ring A — Proving Chamber

- isolated test fixture;
- synthetic and historical failure cases;
- no production mutation;
- deterministic replay required.

### Ring B — Local operator session

- one operator/device/session;
- verbose Caretaker receipts;
- automatic rollback enabled;
- feature flag available.

### Ring C — ArcSweep live canary

- one bounded live workflow;
- real objects and runtime events;
- repair budget enforced;
- no silent authority escalation.

### Ring D — Default ArcSweep path

Only after Ring C produces stable evidence.

## 8. Repair budget

The Caretaker must not enter repair loops.

Initial policy:

- maximum 1 automatic repair attempt per identical fault fingerprint per session;
- maximum 3 automatic repairs for one service before it becomes `degraded`;
- repeated recurrence after a successful repair escalates to diagnosis instead of repeated mutation;
- source-code repair is proposal-only;
- user may pause all autonomous repair with `Feather`.

## 9. Staged implementation

Each stage is independently shippable and has an explicit exit gate.

### Stage 0 — Freeze the baseline and build the proving harness

Build:
- capture current ArcSweep mainline/runtime contract versions;
- define OS version manifest;
- add feature flags for OS organs;
- create repair receipt schema;
- create synthetic failure fixtures;
- create one historical regression fixture from a real ArcSweep failure;
- add checkpoint/rollback test helper.

Exit gate:
- one deliberately injected fault is detected, contained, receipted, and rolled back without changing current ArcSweep behaviour.

### Stage 1 — Kernel + event bus + context continuity

Build:
- OS session object;
- typed event bus;
- capability registry;
- application lifecycle contract;
- room-transition context capsules;
- checkpoint service;
- Caretaker R0 observer.

Exit gate:
- navigate Room A → Room B → Room C and prove world/project/current-goal continuity while each transition produces a replayable receipt.

### Stage 2 — Caretaker runtime repair R1

Build:
- service health registry;
- fault classifier;
- repair budget;
- deterministic repair handlers for safe runtime faults;
- degraded-mode state;
- rollback executor.

First repair handlers:
- remount failed sidecar;
- rebuild stale derived UI state;
- restore draft snapshot;
- rebind failed event subscription;
- mark model outage and preserve deterministic room functionality.

Exit gate:
- inject each supported fault and prove automatic recovery plus rollback on a deliberately bad repair.

### Stage 3 — Persistent Guide shell

Build:
- one Guide identity/session across rooms;
- Silent / Whisper / Companion / Hands-on modes;
- Guide access to kernel context capsules and Caretaker findings;
- navigation capability calls;
- `Feather` system pause;
- session resume after reload/reconnect.

Exit gate:
- Guide follows a three-room workflow without greeting as a new session, losing the active goal, or crossing a permission boundary.

### Stage 4 — Echo object space + R2 reconstruction

Build:
- stable logical object IDs;
- Echo resolver over existing authorities;
- relation traversal;
- deep links;
- derived-index rebuild;
- orphan/reference diagnostics;
- deterministic object-state reconstruction from receipts.

Exit gate:
- delete or corrupt a derived Echo index in the Proving Chamber and rebuild it to replay-equivalent state without mutating canonical sources.

### Stage 5 — Cognitive Spine

Build:
- shared cognitive skill bank;
- operator registry;
- cognitive envelope compiler;
- visible reasoning receipts;
- multi-pass worker orchestration;
- evaluation harness for relate / invariant / mechanise / formalise / falsify / boundary-test / least-damage transition.

Exit gate:
- same reasoning task is replayed across at least two model routes and produces attributable candidate/decision receipts without hidden-reasoning persistence.

### Stage 6 — Story generation as an OS application

Build:
- scene context assembler;
- story generation capability;
- longform generation path;
- world/canon/participant-knowledge gates;
- proposal vs canon boundary;
- generation replay and interruption recovery.

Exit gate:
- generate, interrupt, resume, and replay one scene while preserving POV, tense, chronology, agency, knowledge boundaries, model attribution, and proposal status.

### Stage 7 — PREMAQC + Observer/DEEP closed circulation

Build:
- PREMAQC transition receipts;
- Observer event handoff;
- DEEPTime lineage;
- candidate evaluation hooks;
- state-divergence diagnostics;
- R2 recovery from last verified transition.

Exit gate:
- one real ArcSweep interaction flows through event → observation → PREMAQC transition → feedback → next state and replays identically from durable receipts.

### Stage 8 — ArcSweep Neural Growth Language v0.1

Build the smallest real digital-growth runtime.

Neuron fields:
- id;
- type/function;
- activation state;
- scope;
- provenance;
- lineage;
- authority;
- health;
- version.

Synapse fields:
- source;
- target;
- relation type;
- weight;
- evidence count;
- inhibition/excitation role;
- provenance;
- temporal validity.

Required operations:
- create neuron;
- connect two neurons;
- activate;
- strengthen/decay an edge from reviewed evidence;
- spawn one child specialization;
- inhibit a competing path;
- mark a weak path dormant;
- reconstruct topology from lineage receipts.

Exit gate:
- one seed neuron grows a verified specialization after repeated approved examples, one weak path becomes dormant, and the complete topology is replayable from origin.

### Stage 9 — Neural self-repair

Build:
- topology health rules;
- broken-reference repair;
- orphan reconnection proposals;
- corrupted derived-weight reconstruction;
- runaway-activation inhibition;
- conflicting-path quarantine;
- growth rollback;
- topology comparison against last known-good checkpoint.

Exit gate:
- damage a test network in four known ways and restore coherent topology without fabricating missing evidence or erasing lineage.

### Stage 10 — Runa + device embodiment

Build:
- multimodal compositor capability contract;
- sound/haptic/glyph render requests;
- Guide speech input/output hooks;
- touch/Pencil/gesture capability discovery;
- per-device degraded behaviour.

Exit gate:
- one ArcSweep object produces coordinated visual + audio + haptic/glyph manifestations while all render paths remain separately attributable and interruptible.

### Stage 11 — Self-upgrading ArcSweep

Build a bounded updater, not an unrestricted self-modifier.

Capabilities:
- detect new compatible OS/app contract versions;
- stage migration in Proving Chamber;
- run replay and regression suite;
- create migration checkpoint;
- canary the upgrade;
- roll back automatically on failed invariants;
- record upgrade receipt;
- propose source repair PRs when code changes are needed.

Exit gate:
- upgrade one OS service from version N to N+1 in canary, inject a regression, and prove automatic rollback to N with no loss of active work.

## 10. Upgrade receipt

```json
{
  "schema": "arcsweep.upgrade-receipt/v1",
  "upgrade_id": "...",
  "from_version": "...",
  "to_version": "...",
  "components": [],
  "checkpoint_id": "...",
  "ring": "B",
  "tests": [],
  "replay_verified": true,
  "canary_verified": false,
  "result": "promoted | rolled-back | blocked",
  "rollback_available": true
}
```

## 11. What ArcSweep may repair automatically first

Start small.

Version 0.1 should automatically repair only:

1. stale derived UI state;
2. lost event subscriptions;
3. interrupted local drafts;
4. broken room sidecar mount;
5. recoverable model-route degradation without identity misattribution;
6. derived Echo index corruption when authoritative sources remain intact.

Everything else is detect + contain + explain until proven safe.

## 12. What ArcSweep must never silently repair

- canon by changing the source to remove a conflict;
- identity by substituting another model/participant and relabelling it;
- Qualia by inference;
- missing evidence by fabrication;
- destructive data loss by pretending reconstruction is original data;
- permission/consent failures by widening authority;
- an ambiguous lineage by choosing whichever branch is convenient;
- production source code by direct unreviewed mutation.

## 13. First build slice

The first coding slice is intentionally small:

```text
os-version manifest
+ typed event bus
+ session/context capsule
+ checkpoint helper
+ service health record
+ repair receipt
+ Caretaker R0 observer
+ one R1 repair handler
+ one rollback test
```

Recommended first repair proof: deliberately detach one known sidecar/event subscriber in the Proving Chamber, let the Caretaker detect the missing health heartbeat, remount/rebind it, validate the restored event path, and emit a repair receipt.

If that works, ArcSweep has its first genuine self-repair reflex.

## 14. Definition of done for ArcSweep OS v0.1

ArcSweep OS v0.1 is not "done" because every dreamed feature exists. It is done when:

- the kernel preserves session and context across rooms;
- the Caretaker detects system health and performs a bounded set of reversible repairs;
- the Guide remains continuous across navigation;
- Echo resolves logical objects without competing authority;
- the Cognitive Spine is invokable and receipted;
- Story generation is an OS capability with continuity gates;
- one PREMAQC/Observer/DEEP loop is genuinely durable and replayable;
- the Neural Growth Language can grow and replay one verified specialization;
- every autonomous mutation has a checkpoint, validation path, receipt, and rollback;
- source-code self-repair remains PR-mediated rather than silent production mutation.

That is the first living ArcSweep OS: able to operate, remember, create, detect injury, restore itself within bounded authority, and grow new cognitive structure without losing its lineage.
