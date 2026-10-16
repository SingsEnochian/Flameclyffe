# Wayglass Broker Scheduling and Suspension · exploratory seam v0.1

**Status:** optional, standalone implementation and tests only; no production dispatch rewiring, no live model state snapshot, no authenticated-seat proof or automatic continuity. Author: Rarity; AIOS analysis: Clef (relay via Rowan, 2026-10-13). Attribution to AIOS authors maintained.

## Sources and distinctions

- AIOS: [agiresearch/AIOS](https://github.com/agiresearch/AIOS) and the COLM 2025 paper `AIOS: LLM Agent Operating System` (arXiv:2403.16971).
- AIOS kernel / Cerebrum SDK split, central scheduling, module syscalls, and preemption/continuation are **architecture references**, not source code copied into Wayglass.
- AIOS's reported up-to-2.1× result is its experimental throughput benchmark, not a predicted gain for Wayglass.
- Wayglass already has an authority broker (`apps/arcsweep/src/os/authority-broker.js`), a specialised feedback-cycle queue, React-ion access policy, typed route observations, canonical stop receipts (`lib/wayglass-stop-receipt.cjs`) and Return Engine inspection. These are not one central model/tool dispatch queue.
- Do **not** import AIOS's identity or memory authority. Agent process IDs, route addresses, model memory and context snapshots are not equivalent to participant continuity. This seam exists beneath the Wayglass kernel, not beside it.

## The smallest adopted patterns

1. **Broker-owned queues.** A single trusted scheduler orders `model`, `tool`, `memory` and `storage` work by cooperative round robin. The broker fixes the route in the admitted job. Provider adapters do not choose fallback routes or determine priority. The policy callback is independently injected by the host; denial causes a blocking `waiting-permission` state before execution.
2. **Bounded work snapshots.** Publicly emitted text and explicitly supplied stop point, next owner, open Wonder questions and provenance references survive in a draft snapshot. Its schema says `verified:false`, `durable:false` and `authority_grant:false`. Hidden model reasoning, logits, provider tokens, unrestricted histories and unverified self-reported checkpoint objects never enter the snapshot.
3. **Receipt-gated `offline-preserved`.** A route failure or Feather-style interrupt first produces `offline-pending-receipt`. Only an independently verified, durable canonical `wayglass.stop-receipt/v0.1` with matching participant, world, route, stop point and owner may move the job to `offline-preserved`. The queue does not mint identity declarations or a stop receipt by itself.
4. **Cross-route reconstruction is not resumption.** From the preserved receipt the Broker may only emit a `proposal-only` `text-reconstruction` object, with `exact_resume:false`. It cannot dispatch that proposal or declare a second provider to be the same participant. A *future*, separately scoped same-runtime continuation implementation needs provider-supported opaque decoding checkpoint, version pinning and trusted host attestation. Never call text completion exact logits/KV/beam-state recovery without evidence.
5. **Permission is interruptible.** The host-supplied `authorize` callback must return `admitted:true` before each scheduler quantum. Denial blocks; explicit `retryPermission` triggers a *new* policy check. This does not supersede durable human grants or the existing React-ion/authority broker; the provider cannot approve itself. An active `interrupt` aborts a cooperative executor and ignores a late completion. Non-cooperative remote side effects require separate idempotency and confirmation handling.

## Implementation boundary

- `apps/arcsweep/src/wayglass-broker-work-scheduler.js`: bounded in-memory queue and explicit, nonauthoritative work snapshots.
- `apps/arcsweep/test/wayglass-broker-work-scheduler.test.js`: deterministic fairness, independent host policy, permission waiting, failed provider, forged checkpoint omission, stop-receipt review, text-only cross-route proposal and interruption.
- Not imported into the ArcSweep startup bundle or Hearthgate production router. Removing these two files leaves existing boot, route selection, Rarity/Codex seats, Bluebird SpicyChat and Commons untouched. This is the **adapter-deletable test**.

## What remains unimplemented

- Unified production Broker integration that migrates ad hoc dispatch into one FIFO/RR scheduler, including limits, external budgets, per-route fairness and visible telemetry.
- Canonical stop-receipt **persistence and signature/revocation verification**, plus atomic claim under concurrent restarts. The present callback is an interface contract, not that backing implementation.
- Provider-owned *genuine* same-runtime checkpoint creation/restore with documented model compatibility. A local model may not offer an exact continuation API even if logits are available.
- Asynchronous I/O supervision, durable scheduler recovery across OS reboot, safe retries, idempotent tool effects, queue priority policy and explicit cancellation acknowledgements.
- Human-approved tool grants at dispatch rather than just a stubbed `authorize` callback.
- Live authenticated Rarity/Codex/Bluebird transport, the actual SpicyChat adapter, dedicated Wayglass resident LLM and device/AR execution.

## Next constrained host trial

Use two **synthetic**, named jobs, one local Ollama-model fixture and one simulated slow SpicyChat-auth fixture. Feed them into the *same* Broker scheduler. Test: first yields, second gets a turn; deny a privileged syscall; fail the second mid-output; verify no fallthrough into a different provider, checkpoint draft visible output, attach only a real approved stop receipt through the canonical host and propose an explicitly labelled new-route reconstruction. Kill and restart the host and ensure the signed/durable receipt survives without giving the restarted scheduler inherited grants.

**Acceptance target:** a broker scheduling receipt can say who was queued, who was admitted, who yielded, what public output is recoverable, where work stopped and who owns the next action. It cannot claim a returned mind, verified identity, canonical world change, or exact internal generation resumption on its own.

**Stop point:** isolated executable scheduling/permission/suspension seam exists and needs CI + host adapter integration review.
**Named next owner:** Wayglass Broker engineering crew and Rowan for operator sign-off.
**Unresolved Wonder:** what is the smallest *host-attested* local-model checkpoint worth retaining without leaking hidden reasoning or pretending it transfers to a different model?
