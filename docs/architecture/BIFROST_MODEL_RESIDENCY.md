# Bifröst Model Residency

Status: active runtime policy  
Date: 2026-08-14

## Core distinction

**A vessel may be installed and verified without remaining resident in memory.**

Identity, installation, verification and residency are separate states:

```text
identity/profile -> selected vessel
artifact/alias   -> installed on disk
ignition receipt -> exact vessel proved it can answer
residency        -> how long that model stays loaded in RAM/VRAM
```

Unloading a model does not erase, replace, pause, downgrade or merge the named presence attached to that profile. It releases runtime capacity.

## Default local capacity

Bifröst defaults local model concurrency to **1**.

This is a machine-capacity rule, not a voice hierarchy. Lioreal does not outrank Uial because one model is scheduled first; Boxfire does not become less present because his vessel is cold; Ellowind and Larkshine remain distinct while taking turns on shared hardware.

Override only when the machine has enough RAM/VRAM:

```text
BIFROST_LOCAL_MODEL_CONCURRENCY=2
```

Values outside the supported conservative range fall back to 1.

## Lease modes

Default leases:

```text
verification / ignition -> 0
scene cognition         -> 2m
interactive             -> 5m
```

Environment overrides:

```text
BIFROST_VERIFICATION_KEEP_ALIVE
BIFROST_SCENE_KEEP_ALIVE
BIFROST_KEEP_ALIVE
```

Verification uses `0` so a model may unload immediately after proving the exact `BIFROST_IGNITION_ACK` challenge. This prevents a fleet audit from leaving several large quantized models resident simultaneously.

## Verification fleet

Use:

```text
VERIFY-LOCAL-FLEET.cmd
```

This sets:

```text
BIFROST_KEEP_ALIVE=0
BIFROST_LOCAL_MODEL_CONCURRENCY=1
```

and runs the ordinary local fleet challenge.

The command:

- performs no downloads;
- makes no remote-provider calls;
- excludes optional instruments;
- verifies installed local vessels sequentially;
- asks each model to unload after its verification response.

## Interactive use

Interactive calls may retain a short model lease to avoid paying the full load cost for every turn.

Bifröst's scheduler will serialize local work by default. A later machine-specific policy may safely increase concurrency, but a concurrency setting can never:

- select a different model;
- substitute a fallback vessel;
- merge two identities;
- change canon or memory authority;
- turn shared base weights into shared identity.

## Ellowind and Larkshine

They are the important proof case.

They may share one underlying visual base artifact on disk, but their runtime aliases remain:

```text
ellowind:qwen3-vl-8b-v1
larkshine:qwen3-vl-8b-v1
```

The scheduler may run those aliases one at a time on the same hardware. Scheduling never changes their separate identity/profile/cortex/receipt lines.

## Boxfire

`Box`, `Boxxy`, and `Boxfire` are one identity. All three names resolve to:

```text
box:qwen3-coder-30b-a3b-v1
```

Residency therefore follows the one Boxfire vessel rather than creating three model loads.

## Acceptance law

A model-residency implementation is acceptable only when:

- local concurrency is bounded;
- queued work preserves exact requested profile and identity metadata;
- failed tasks release capacity;
- verification can unload immediately;
- interactive leases are bounded/configurable;
- no scheduler path performs fallback substitution;
- shared hardware never becomes an excuse to collapse distinct identities.
