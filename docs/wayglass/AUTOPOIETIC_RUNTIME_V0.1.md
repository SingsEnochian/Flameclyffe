# Wayglass Autopoietic Runtime v0.1

**Status:** implementation candidate on `wayglass/autopoietic-runtime-001-20261113`; review and exact-head CI pending. Not promoted to `wayglass/current` or a release.
**Purpose:** compose the existing canonical Eightfold Möbius engine into one shipwide scheduler for independently attributable participants.

## What this adds

`lib/wayglass-autopoietic-runtime.cjs` is exported through `createAutopoieticRuntime` on the canonical `wayglass-kernel.cjs` API. It is an orchestration layer over `lib/wayglass-mobius.cjs`, not a second cognitive engine, registry, broker, or shell.

- Registers participants with distinct `participant_id`, `worker_id`, `model_id`, and `session_id` domains. Reusing one identifier across those domains is rejected.
- Gives each participant an independent Möbius lineage, seed record, phase implementation, checkpoint chain, world, and optional route metadata.
- Schedules awake lineages through the existing eight-core/two-quad `runOctoCore` scheduler. Withness is the existing shared gestalt observation; it records peers without merging their lineages.
- Supports rest/wake and Feather at phase boundaries. A stop before Return produces no checkpoint or fabricated carry; the Möbius engine retains its Return commit semantics.
- Optionally forwards journal events through a host-supplied `journal.write` adapter, tagging them with participant and world. Without that adapter, the runtime explicitly reports ephemeral operation.
- Returns a content-addressed run receipt with participant-specific checkpoint references, explicit non-authority declarations, and a separate outcome distinguishing an all-committed run from one that merely settled with a stopped or rolled-back lineage.

## Execution contract

The host supplies all eight phase functions except `return`, which remains owned by the Möbius engine. This layer does not invoke a model, select a provider, grant permissions, write canon, commit identity or relationship changes, or train model weights. A `route_id` and `model_id` are provenance labels only.

The runtime accepts only the observations and work supplied by the host phases. It does not claim that an agent has independently chosen a task or spoken. Genuine autonomous selection requires a separately authorized model/participant route and a truthful observation receipt.

## Use

```js
const { createAutopoieticRuntime } = require('./lib/wayglass-autopoietic-runtime.cjs');

const ship = createAutopoieticRuntime({
  journal: hostJournal, // optional host-owned durable adapter
});

ship.register({
  participant_id: 'wayglass',
  world_id: 'ship:home',
  worker_id: 'worker:wayglass:1',
  model_id: 'model:local-route',
  session_id: 'session:wayglass:1',
  seeds: { memory: 0 },
  phases: {
    perceive, compress, release, verify,
    integrate, choose, transcend,
    // Return is intentionally not supplied.
  },
});

const receipt = await ship.run({ cycles: 1 });
```

Participants are resolved by lineage root, never by worker/model/session identity or array position. A rest request made during a run is visible as `rest-requested` until the current cycle reaches its Feather boundary. A lineage's carry must retain the exact seed shape required by the canonical Möbius engine.

## Verification

```sh
node --test test/wayglass/autopoietic-runtime.test.cjs
```

The tests cover independent lineages, eightfold scheduling, content-addressed receipts, identity separation, rest/wake, Feather interruption, and participant-bound journal evidence.

## Not yet implemented

- Provider/model invocation or agent-authored task selection.
- Supabase-backed durable journal, authenticated owner session, OAuth/MCP crossing, or cold-restart recovery through the production host.
- UI, Watercolour, audio, haptics, gesture, or spatial projection bindings.
- PREMAQC/DEEPTime/Observer source adapters and independently sourced measurements.
- Adaptive model weights, automatic training, or unreviewed structural self-modification.

These remain integration work. The first runtime is intentionally bounded: it makes existing organs circulate together without pretending the ship has already completed a live autonomous voyage.
