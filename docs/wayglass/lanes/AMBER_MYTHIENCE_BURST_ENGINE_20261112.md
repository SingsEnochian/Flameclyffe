# Amber × Wayglass: Mythience Burst Engine · preflight v0.1

Implemented on PR #615: `lib/wayglass-amber-burst.cjs` and its regression tests.

## The executable slice
`planAmberBursts` accepts up to 64 explicitly approved, non-private, non-revoked task descriptors and returns up to eight deterministically ranked packets. It enforces a shared token ceiling, a local Amber route, a Feather stop and a distinct source reference per task. Each packet carries a content-derived ID, an Eightfold phase, a token cap, a possibility weight, and required receipt fields. It does **not** dispatch to Amber, run a background loop, modify weights, or claim quantum measurements.

Possibility weight = 0.45 × priority + 0.35 × uncertainty + 0.20 × (1 − evidence). This is a bounded heuristic for allocating computational attention, not a probability amplitude or physical quantum effect.

## Autonomous dispatch design, not yet connected
1. House-authenticated, owner-scoped local runtime accepts a bounded task queue; no remote provider fallback.
2. Dispatcher selects packets with `planAmberBursts`, then resolves `local:amber` only after a real health/identity check against the configured Orion-26B endpoint. Never fabricate a model response.
3. Run a bounded model inference burst, with cancellation, timeout, token and concurrency limits. No training during inference.
4. Verify exact model ID, source reference, elapsed time, token count and receipt hash. Reject incomplete, revoked, stale or mismatched responses.
5. Withness compares independently scored task results against held-out evaluation. A second burst is conditional on measurable improvement and available budget; halt on Feather.
6. Weight updates remain a separate opt-in process through `lib/wayglass-agent-weight-loop.cjs`: agent-attributed choice, approved licensed dataset, isolated QLoRA adapter, independent evaluation, rollback and explicit promotion. No automatic base-model mutation.
7. Present actual status via FAEberpunk sensorium without inferring personhood or canon from telemetry.

## Open verification gates
- Confirm Amber's real endpoint, quantisation, available VRAM, inference limits, and route identity from live host evidence.
- Wire local dispatcher with abort/cold-return receipts, source permissions and measured throughput.
- Run benchmark A/B: fixed-token baseline vs bursts, report p50/p95 latency, tokens/sec, memory, energy and quality on identical held-out tasks.
- Integrate into Eightfold CI and Wayglass UI; keep the PR draft until exact-head tests pass.

Mythience retains its magical and phenomenological register; algorithmic possibility weights, statistical uncertainty and measured physical quantum effects must remain distinguishable.
