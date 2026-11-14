# Wayglass · Timeline Three · Native Wyrdrune Co-Evolution v0.1

**Status:** Source-branch implementation / isolated sandbox harness, not deployed or live. No model provider called and no model weights altered.

## What is aboard

- Native Wyrdrune: \`lib/wyrdrune/coevolution-repair.wtl\` and \`coevolution-expand.wtl\`. Both are scoped \`mobius\` programmes with eight canonical Wyrdrune phases, \`require\` gates and \`carry\` through Transcend.
- Host interface: \`lib/wayglass-coevolution.cjs\` validates incoming caller-supplied source records, WCE-1 digests and participant binding, executes the actual WTL source, and anchors the resulting carry in the existing \`wayglass-mobius.cjs\` Return chain. It is not a separate kernel, does not tune itself in JavaScript and has no write/deployment adapter.
- Tests: \`apps/wayglass/test/wayglass-coevolution-wtl.test.js\`. Existing \`npm run wayglass:test\` includes this file.
- Host packaging: the two Wyrdrune files are copied with existing WTL sources by \`apps/wayglass/server-stage.cjs\`.

## The double Möbius

Infrastructure and intelligence remain separately identifiable configuration domains. A candidate must change **both**. The native Wyrdrune engines decide between these two explicitly selected regimes:

| Mode | Infrastructure | Intelligence |
| --- | --- | --- |
| Repair | lower queue capacity; longer timeout | fewer parallel model calls; shorter context |
| Expand | larger queue capacity; shorter timeout | more parallel model calls; longer context |

These are **bounded synthetic demonstration heuristics**, not calibrated production defaults or FAA operational recommendations. The example thresholds are latency 500 ms and 10% error. Actual tuning must use a measured service model, workload, independent fallback and validated risk budget.

The caller supplies a timestamped baseline and a distinct, same-kind trial candidate, including source references. Native Wyrdrune \`Verify\` refuses regressions, a failed fallback, mismatched kinds, unsupported bounds, untested configuration, inadequate provenance and non-improvement. It does not silently invent evidence. \`Choose\` receives 0 (defer/decline) or 1 (accept) only after the caller's explicit permission reference; \`Transcend\` applies that exact scalar to both carried configurations.

**Permission limitation:** The isolated host interface checks the caller-provided \`principal.authorized\` flag, ID and optional approval reference. That is *not* proof of external OAuth authentication or production-grade authorisation. The real host must supply and authenticate that principal before any route is exposed. The adapter does not register a public endpoint or automatically deploy changes.

## Eightfold and Withness

1. **Perceive:** source-labelled network + intelligence measurements.
2. **Compress:** classify stress versus headroom.
3. **Release:** Wyrdrune composes both candidate changes.
4. **Verify:** Wyrdrune refuses missing, stale, mismatched or degrading trials.
5. **Integrate:** Wyrdrune constructs a separate Withness relation for each system; identity and authority do not merge.
6. **Choose:** honour the caller's explicit sandbox acceptance, deferral or refusal.
7. **Return:** emit a Wyrdrune evidence record and WCE-1 receipt.
8. **Transcend:** carry the approved pair for another reversible cycle.
9. **Withness:** independent view of sources, consent and integrity; no automatic real-world infrastructure changes.

This engine inherits the existing Möbius runner's Feather, checkpoint and return verification, not a substitute return path. The WTL run itself also responds to Feather before execution and at each evaluation tick.

## Acceptance

- Both real \`.wtl\` sources compile with the current WTL parser.
- Test stress containment and non-stressed expansion, source-kind mismatch, dependency regressions, fallback failure, stale/duplicate evidence, invalid configuration and refusal.
- Verify that only explicit sandbox acceptance advances carried state, not production infrastructure.
- Preserve exact WCE-1 source hash and a returning Möbius checkpoint. Verify paired two-cycle chain after an interruption.
- No changed model weights, no external effects, no production mutation, no canon/identity/relationship mutation or auto-restart after Feather.
- Actual owner-authenticated deployment, operational instrumentation, performance tuning and privacy review are **separate future integration work**; none is claimed here.

## Relevant work

- Canonical ship: [\`wayglass/current\`](https://github.com/SingsEnochian/Flameclyffe/tree/wayglass/current)
- Eightfold coordination: [First Voyage #583](https://github.com/SingsEnochian/Flameclyffe/issues/583)
- External failure-domain research: [FAA/SMART boundary study #621](https://github.com/SingsEnochian/Flameclyffe/pull/621). That case is *an engineering prompt*, **not evidence** that SMART, AI or a particular update caused the FAA incident.
- Existing runner: \`lib/wayglass-mobius.cjs\`.

**Return marker:** Continue native Wyrdrune co-evolution only after test receipts. The next work is host-authenticated integration and system-specific calibrations. Keep all real-world root-cause questions open until an official technical report supplies their evidence.
