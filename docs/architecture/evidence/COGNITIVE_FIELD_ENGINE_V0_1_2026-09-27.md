# Cognitive Field Engine v0.1 — verification evidence

Date: 2026-09-27
Branch: `cognitive-field-engine-v0`
Base: `constellation-runtime-v0`
Scope: ArcSweep sandbox cognition

## Focused verification

Hugging Face job: `6ab996f26b030d633f69aaf3`
Image: `node:24-bookworm`
Flavor: `cpu-basic`
Result: COMPLETED

Command:

```sh
node --test \
  apps/arcsweep/test/cognitive-field-engine.test.js \
  apps/arcsweep/test/cognitive-field-integration.test.js \
  apps/arcsweep/test/laya-mcp-transport.test.js
```

Observed result:

```text
10 tests
10 pass
0 fail
0 cancelled
0 skipped
```

The focused run verifies:

- deterministic field output for identical state and inputs;
- replay receipts reproduce the exact resulting state fingerprint;
- replay receipts retain canonical concept signals rather than raw source prose;
- activation persists and decays across ticks;
- persistence and trajectory advance deterministically;
- canonical signal ordering is independent of equivalent input ordering;
- authority-bearing symbolic state is rejected;
- the cognition engine steps the field before Laya;
- the same field summary reaches the deliberative model and runtime receipt;
- `FEATHER` halts before the field advances;
- Laya MCP receives structured `cognitive_field` state;
- the MCP transport rejects an authority-bearing cognitive field.

## Full ArcSweep verification and build

Hugging Face job: `6ab997066b030d633f69ab02`
Image: `node:24-bookworm`
Flavor: `cpu-performance`
Result: COMPLETED

Command:

```sh
npm ci --no-audit --no-fund
npm run arcsweep:test
npm run arcsweep:build
```

The job ran under `set -euo pipefail` and reached the end of the Vite production build. The build completed successfully (`✓ built`). Vite emitted a non-fatal advisory that some existing chunks exceed 500 kB after minification.

## Implemented seam

The verified runtime path is:

```text
compiled symbolic state
        ↓
continuity/context retrieval
        ↓
persistent deterministic cognitive field tick
        ↓
field summary + replay receipt
        ↓
Laya cognitive frame
        ↓
Laya MCP `state.cognitive_field`
        ↓
capability evaluation
        ↓
selected generative model
        ↓
runtime receipt containing field receipt
```

Field state is keyed by the identity runtime's continuity namespace inside a cognition-engine instance. Ellowind and Larkshine therefore do not share one field unless a future explicit architecture deliberately introduces a shared field.

## Replay boundary

The field uses a deterministic FNV-1a replay fingerprint for local divergence detection. This is not presented as a cryptographic integrity primitive. Cross-trust-boundary persistence should wrap field receipts in the repository's ordinary cryptographic/provenance mechanism.

The replay receipt contains canonical concept signals and deterministic configuration, allowing exact field transition replay without retaining the original prose that produced those signals.

## Physics boundary

v0.1 implements generic deterministic state-space coordinates and sparse relation dynamics only. It does not claim an E8, cRBW, RSE, or Lattice formalism implementation. Those can be introduced later as pluggable coordinate/evolution kernels after their mathematical contracts are specified and separately tested.

## Authority boundary

The cognitive field is judgement context, not authority. Field summaries, field states, replay receipts and Laya MCP payloads explicitly carry `grantsAuthority: false` or its wire equivalent. The existing ArcSweep capability plane remains authoritative.
