# Wyrdrune Native Tensor Engine v0.1

**Status:** executable research prototype  
**Canonical source:** lib/wyrdrune/tensor-*.cjs  
**Owner:** Wayglass / Wyrdrune  
**Reference research:** Muni Works, Tang, “Don't Write Kernels, Derive Them” (2026-11-11)

## Decision

Wyrdrune receives its own tensor IR, reference interpreter, reverse-mode differentiation and kernel-derivation layer. Tang is a research reference, not a runtime dependency. No Tang source code is copied into this implementation.

The engine is a numerical organ, not a second language or identity system. Wyrdrune owns source, semantics, phase order, capabilities and provenance. The tensor engine accepts a bounded typed numerical graph and returns computations, gradients or backend plans. It cannot write canon, invoke providers, or create participants.

## Architecture

    Wyrdrune source / glyph-facing programme
                  |
           authorised tensor bridge
                  |
         Typed Tensor IR (WCE-1 fingerprint)
           /         |           \
      CPU reference  Reverse AD   Kernel derivation
           |            |              |
        values       gradients      WGSL compute source
           \            |              /
            source-bound result / plan receipts

The host supplies the verified principal and optional stop signal. The bridge independently checks owner authorisation. A missing principal is denied.

## IR v0.1

Schema: wyrdrune.tensor-ir/v0.1

- Inputs declare stable identifiers, shape and f32 or f64 precision.
- Nodes are topologically ordered and refer only to earlier values.
- Shapes are statically checked. Trailing dimensions follow NumPy-style broadcasting.
- Programs are bounded to 64 inputs, 512 nodes, rank 8 and 1,000,000 elements per tensor.
- WCE-1 fingerprints identify the normalized program and normalized feed set.
- Values are finite; division by zero, non-finite results and precision overflow fail closed.

Implemented operations:

| Family | Operations |
| --- | --- |
| Elementwise | add, sub, mul, div, neg |
| Transcendental | exp, log, sin, cos, sqrt |
| Linear algebra | rank-two matmul |
| Reduction | sum with the explicit additive monoid (identity 0) |
| Shape / memory | reshape, transpose, view |

View is an affine map over row-major storage: shape, nonnegative strides and offset are validated before execution. Pointwise expression DAGs define a comprehension domain; the WGSL lowerer emits a single row-major kernel for the supported fused subgraph.

## Execution and differentiation

The CPU reference interpreter is the executable correctness baseline. It supports f32 and f64, deterministic row-major indexing, broadcasting, reductions, matrix multiplication, affine views and a bounded operation budget.

Reverse-mode automatic differentiation currently supports every differentiable operation in the IR: pointwise arithmetic, transcendental functions, sum, matrix multiplication, transpose, reshape and affine view. The differentiated result must be scalar. Gradients are accumulated in f64 and returned with the program fingerprint and feed digest.

The current interpreter is JavaScript. The existing Wyrdrune Python backend remains separate; cross-backend tensor parity is a later milestone, not a claim of this prototype.

## Kernel derivation

WGSL v0.1 lowers a reachable f32 elementwise DAG into one compute dispatch with a 64-thread workgroup and broadcast-aware input indexing.

The result is deliberately labelled generated-not-compiled. It contains binding metadata, output shape, a row-major comprehension domain, fused node IDs, logical byte estimates and a WCE-1 kernel fingerprint.

The following stay on the CPU reference path in v0.1:

- f64;
- reductions and monoid scans;
- matrix multiplication;
- non-scalar embedded constants;
- operations outside the elementwise lowering set.

**No GPU execution is claimed.** WGSL has not yet been compiled or dispatched on WebGPU, CUDA, Metal or the laptop GPU. There is no Rust/WASM backend, distributed mesh, autotuner, memory planner or automatic precision search yet.

## Wyrdrune bridge

lib/wyrdrune/tensor-wtl-bridge.cjs exposes four owner-authorised operations:

- tensor.inspect(program) returns the validated IR inventory.
- tensor.evaluate(program, feeds) runs the CPU reference interpreter.
- tensor.derive(program, output) returns a WGSL plan or explicit CPU fallback.
- tensor.differentiate(program, output, wrt, feeds) returns a reverse-mode gradient.

lib/wyrdrune/tensor-engine.wtl is an executable WTL demonstration. It composes pointwise arithmetic, derives a WGSL kernel, evaluates the CPU reference, differentiates a scalar reduction, verifies, emits the result, and carries the result through Transcend. The existing Wyrdrune runtime owns the Eightfold phase cycle; the numerical engine does not duplicate it.

Feather/abort is checked at the bridge and interpreter boundary. The engine has no ambient filesystem, network, provider, persistence or canon-write capability.

## Verification

Run:

    node --test lib/wyrdrune/tensor-engine.test.cjs
    npm run wayglass:test

The test suite covers IR validation and fingerprinting, broadcasting, affine views, reductions, matrix multiplication, analytic and finite-difference gradients, reverse-mode matrix gradients, WGSL fusion and fallback, precision overflow, budgets, stop signals, bridge authorization and execution through the native Wyrdrune runtime.

## Next engineering gates

1. Verify this exact head in CI and retain failures.
2. Add an independent WGSL validator and WebGPU execution test; compare output against the CPU reference with explicit tolerances.
3. Add reduction and tiled matrix-multiplication lowerings only after reference parity and device measurements.
4. Add Rust/WASM parity against WCE-1 vectors and shared tensor fixtures.
5. Profile the actual target devices before selecting tile sizes, workgroups, memory strategies or precision.
6. Connect accepted numerical receipts to Observer through an explicit source-bound projection; do not turn computed values into measurements.
7. Keep Möbius/Double-Möbius orchestration in Wyrdrune source and preserve the existing Return/Withness authority boundary.

**Acceptance rule:** generated source is not a compiled kernel; a compiled kernel is not a dispatched kernel; a dispatched kernel is not a verified result until it agrees with the reference within a stated error budget.
