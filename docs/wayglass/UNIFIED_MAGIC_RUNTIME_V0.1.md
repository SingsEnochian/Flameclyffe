# Wayglass Unified Magic Runtime v0.1 — integration handoff

Implementation status: feature-branch integration candidate for SingsEnochian/Flameclyffe `wayglass/current`; no merge, deployment or live-browser claim. The native WTL adapter was exercised against the available canonical WTL runtime, producing eight native phase receipts, nine magic journal events and a stored Return.

## End-to-end contract

Use one trusted runtime instance per host with an owner-controlled durable JSONL journal. The eight named engines process a bounded numerical law experiment; Withness seals the actual Return. Events have an attributed cell, reality, run ID, phase, engine, timestamp, measured elapsed time (where measured), result, sequence, prior hash and content hash. The journal detects altered records on restart; it is integrity evidence, not a signature or external timestamp.

The caller must bind cell identity from its authenticated session or Nursery scheduler, never infer it from arbitrary request text. This standalone runtime accepts an identity supplied by its trusted caller and does not authenticate it itself. No external actuators or device access are supplied. Embodiment is a proposed output only, and metaphysical interpretation remains distinct from measured execution.

## Shipwide wiring to implement on canonical branch

| Surface | Integration |
|---|---|
| WTL `lib/wyrdrune/` | Fixed scoped native programme invokes `magic.run` once in Return. Candidate laws are bounded typed parameter sets, not arbitrary equation compilation. |
| Möbius Nursery / Garden | Scheduler invokes trusted `runtime.run` for named cells, retaining actual cell identity; bind Feather and budget, propagate parent run and fork IDs. |
| Host `apps/starwell-server/wayglass/router.js` | House-gated run, telemetry and receipt endpoints; private durable journal, bounded input and cursor reads; cell calls bind identity via trusted internal adapter only. |
| Living Observer | Display actual event counts, durations, divergence, open branches, failures and freshness; never invent a sample when disconnected. |
| Watercolour | Map actual event stream to colour, spread and motion; separate this trace from the existing independently sourced PREMAQC axes. |
| PREMAQC | Preserve sourced readings and feed separate magic-event provenance; do not manufacture axis measurements from symbolic values. |
| Universal Codex | Store receipt, law versions and open questions as attributable entries, preserving prior receipts. |
| Mythience / Worldsmith | Treat proposed laws as scoped to their owning reality; require adoption before persistent mutation. |

## Acceptance gates

1. All eight engines execute with real timings, stable law IDs and explicit scope; reference-only blend has exactly zero divergence.
2. Invalid input refuses execution; Feather preserves stopped state; journal restart verifies and rejects tampering.
3. After canonical integration, a real Nursery cell invokes the WTL capability, produces a host receipt, reaches Observer/Watercolour, and persists in Codex without overwriting sibling possibilities.
4. Test authentication, failure, restart, stale stream, scope and cancellation. Run Wayglass host/frontend tests and contract checks, then browser acceptance. No promotion before these gates.

The local tests establish gates 1–2 and the native WTL capability crossing, not live shipwide acceptance. The Garden is absent from the observed canonical remote tree and must be reconciled; a trusted scheduler can call the native adapter with an attributed principal once that integration is present. No diagnostic identity is a claim of a live Nursery inhabitant.
